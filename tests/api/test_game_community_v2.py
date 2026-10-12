import asyncio
import os
from uuid import uuid4

import pytest
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.errors import AppError
from app.domains.game.community_repository import GameCommunityRepository
from app.domains.game.community_service import GameCommunityService
from app.domains.game.lifecycle import delete_game_account_data
from app.domains.game.repository import GameRepository
from app.domains.game.service import GameService
from app.domains.users.models import UserProfile
from app.domains.users.privacy import PrivacyAudit, PrivacyPreferences, PrivacyRepository, UserBlock

pytestmark = pytest.mark.skipif(
    not os.getenv("BONYAN_V2_TEST_DATABASE_URL"), reason="requires disposable PostgreSQL"
)


def test_league_privacy_comparable_cohorts_and_challenge_authorization():
    asyncio.run(_scenario())


async def _scenario():
    engine = create_async_engine(os.environ["BONYAN_V2_TEST_DATABASE_URL"])
    factory = async_sessionmaker(engine, expire_on_commit=False)
    owners = [f"social-test-{uuid4()}" for _ in range(3)]
    a, b, different = owners
    try:
        async with factory.begin() as db:
            for owner in owners:
                db.add(
                    UserProfile(
                        owner_id=owner,
                        display_name="Private name",
                        timezone="Africa/Cairo",
                        available_training_days=2 if owner != different else 5,
                        training_goal="strength",
                        experience_level="beginner",
                        coaching={"pushups": 10, "pushups_target": 20},
                    )
                )
            await db.flush()
            service = GameCommunityService(GameCommunityRepository(db))
            assert not (await service.league(a, "weekly")).opted_in
            for owner in owners:
                await service.opt_in(owner, True)
                await GameService(GameRepository(db)).record(
                    owner, "workout:test", "workout", eligible=True
                )
            league = await service.league(a, "weekly")
            assert len(league.participants) == 2
            assert league.personal_rank is not None
            assert all(
                entry.display_name == "BONYAN member"
                and entry.avatar_url is None
                and entry.progress_score is None
                and entry.badges == []
                for entry in league.participants
            )
            await PrivacyRepository(db).update(
                b, {"display_name": True, "progress": True, "badges": True}
            )
            shared = await service.league(a, "weekly")
            assert any(
                entry.display_name == "Private name"
                and entry.progress_score is not None
                and entry.badges == ["first_workout"]
                for entry in shared.participants
            )
            code = (await service.friends(b)).invite_code
            await service.invite_friend(a, code)
            invitation = (await service.friends(b)).items[0]
            with pytest.raises(AppError):
                await service.reply_friend(a, invitation.id, True)
            with pytest.raises(AppError):
                await service.create_challenge(a, invitation.id, "workout")
            await service.reply_friend(b, invitation.id, True)
            challenge = await service.create_challenge(a, invitation.id, "workout")
            assert (await service.create_challenge(a, invitation.id, "workout")).id == challenge.id
            with pytest.raises(AppError):
                await service.reply_challenge(a, challenge.id, True)
            with pytest.raises(AppError):
                await service.reply_challenge(different, challenge.id, True)
            await service.reply_challenge(b, challenge.id, True)
            await service.reply_challenge(b, challenge.id, True)
            challenges = await service.challenges(a)
            assert challenges[0].status == "active" and challenges[0].my_points == 0
            friends = await service.league(a, "friends")
            assert len(friends.participants) == 2
            await PrivacyRepository(db).block(b, a, True)
            assert not (await service.friends(a)).items
            assert not (await service.challenges(a))
            assert len((await service.league(a, "weekly")).participants) == 1
            await service.opt_in(a, False)
            assert not (await service.league(a, "weekly")).participants
    finally:
        async with factory.begin() as db:
            for owner in owners:
                await delete_game_account_data(db, owner)
            for model in (UserProfile, PrivacyAudit, PrivacyPreferences, UserBlock):
                await db.execute(delete(model).where(model.owner_id.in_(owners)))
        await engine.dispose()
