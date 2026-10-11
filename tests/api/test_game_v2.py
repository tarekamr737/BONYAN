import asyncio
import os
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.errors import AppError
from app.domains.game.lifecycle import delete_game_account_data
from app.domains.game.models import AwardLedger
from app.domains.game.repository import GameRepository
from app.domains.game.rules import mission_reward, progress_score, season_bounds, week_start
from app.domains.game.schemas import CheckInRequest
from app.domains.game.service import GameService
from app.domains.users.models import UserProfile


@pytest.mark.parametrize("days", range(2, 7))
def test_workout_points_normalize_to_feasible_schedule_and_stop_at_cap(days):
    assert sum(mission_reward("workout", count, days)[1] for count in range(20)) == 40
    assert mission_reward("workout", days, days) == (0, 0)


def test_missing_dimensions_are_unknown_and_low_coverage_is_unranked():
    empty = progress_score({})
    assert empty.value is None and empty.coverage == 0 and not empty.ranked
    partial = progress_score({"training": 90, "nutrition": None})
    assert partial.value == 90 and partial.coverage == 35 and not partial.ranked
    covered = progress_score({"training": 80, "personal_goal": 40})
    assert covered.coverage == 60 and covered.ranked
    assert progress_score({"training": float("nan")}).value is None


def test_client_dates_and_raw_body_scores_cannot_enter_checkins():
    for field in ("date", "weight", "xp", "points", "timezone"):
        with pytest.raises(ValidationError):
            CheckInRequest.model_validate({"kind": "checkin", field: 999})


def test_seasons_and_week_use_server_time_and_stable_boundaries():
    start, end = season_bounds(datetime(2026, 10, 11, tzinfo=UTC).date())
    assert (end - start).days == 28
    assert week_start(datetime(2026, 10, 11, 23, tzinfo=UTC)).isoformat() == "2026-10-05"


@pytest.mark.skipif(
    not os.getenv("BONYAN_V2_TEST_DATABASE_URL"), reason="requires disposable PostgreSQL"
)
def test_database_award_concurrency_daily_caps_revocation_and_frozen_targets():
    asyncio.run(_scenario())


async def _scenario():
    engine = create_async_engine(os.environ["BONYAN_V2_TEST_DATABASE_URL"])
    factory = async_sessionmaker(engine, expire_on_commit=False)
    owner = f"game-test-{uuid4()}"
    try:
        async with factory.begin() as db:
            db.add(
                UserProfile(
                    owner_id=owner,
                    timezone="Africa/Cairo",
                    available_training_days=2,
                    training_goal="strength",
                    experience_level="beginner",
                    coaching={"pushups": 10, "pushups_target": 20},
                )
            )

        async def award(source):
            async with factory.begin() as db:
                return await GameService(GameRepository(db)).record(
                    owner, source, "workout", eligible=True
                )

        first, retry = await asyncio.gather(award("workout:first"), award("workout:first"))
        assert first.id == retry.id
        other = await award("workout:second")
        assert not other.eligible
        async with factory.begin() as db:
            service = GameService(GameRepository(db))
            overview = await service.overview(owner)
            assert overview["xp"] == 20 and overview["mission_points"] == 20
            assert overview["progress_score"].coverage == 60
            assert (
                await db.scalar(
                    select(func.count())
                    .select_from(AwardLedger)
                    .where(AwardLedger.owner_id == owner)
                )
                == 1
            )
            profile = await db.get(UserProfile, owner)
            profile.available_training_days = 6
            profile.timezone = "Pacific/Honolulu"
            await db.flush()
            frozen = await service.repository.targets(owner, datetime.now(UTC))
            assert frozen.workout_days == 2 and frozen.timezone == "Africa/Cairo"
            await service.repository.revoke(owner, "workout:first")
            await service.repository.revoke(owner, "workout:first")
            reversed_overview = await service.overview(owner)
            assert reversed_overview["xp"] == 0 and reversed_overview["mission_points"] == 0
            assert (
                await db.scalar(
                    select(func.count())
                    .select_from(AwardLedger)
                    .where(AwardLedger.owner_id == owner)
                )
                == 2
            )
            # A repeated upload/scan check-in never receives rank points.
            await service.check_in(owner, "checkin")
            assert (await service.overview(owner))["mission_points"] == 0
            old = SimpleNamespace(
                id=uuid4(),
                owner_id=owner,
                status="completed",
                prescription_snapshot={"prescriptions": [{"sets": 2}]},
                logged_sets=[{"reps": 10}, {"reps": 10}],
                started_at=datetime.now(UTC) - timedelta(days=20),
                completed_at=datetime.now(UTC) - timedelta(days=20),
            )
            assert not (await service.workout_completed(owner, old)).eligible
            with pytest.raises(AppError):
                await service.workout_completed("wrong-user", old)
            assert await service.repository.credited("wrong-user", "workout", None) == 0
    finally:
        async with factory.begin() as db:
            await delete_game_account_data(db, owner)
            await db.execute(delete(UserProfile).where(UserProfile.owner_id == owner))
        await engine.dispose()
