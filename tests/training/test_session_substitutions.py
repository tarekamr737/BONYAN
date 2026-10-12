"""Opt-in real PostgreSQL transaction checks; use only a disposable test database."""

import asyncio
import os
from copy import deepcopy
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from test_provider_and_coach import FakeProvider

from app.core.errors import AppError
from app.domains.game.lifecycle import delete_game_account_data
from app.domains.training.coach.schemas import CoachToolCall, CoachToolName
from app.domains.training.coach.tools import CoachToolExecutor
from app.domains.training.models import WorkoutPlanRecord, WorkoutSessionRecord
from app.domains.training.repository import TrainingRepository
from app.domains.training.schemas import GeneratePlanRequest, LoggedSetInput
from app.domains.training.service import TrainingService
from app.domains.training.substitution_models import (
    SessionSubstitutionEvent,
    SessionSubstitutionProposal,
)
from app.domains.training.substitution_repository import SubstitutionRepository
from app.domains.training.substitution_schemas import (
    ApproveSessionSubstitution,
    PreviewSessionSubstitution,
)
from app.domains.training.substitution_service import SessionSubstitutionService
from app.integrations.exercises.provider import ExerciseDetails

URL = os.getenv("BONYAN_V2_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not URL, reason="requires disposable BONYAN_V2_TEST_DATABASE_URL")


class Catalog(FakeProvider):
    async def get_exercise(self, exercise_id):
        return ExerciseDetails(
            id=exercise_id,
            name="Test movement",
            muscles=(exercise_id.rsplit("-", 1)[0],),
            equipment=("bodyweight",),
            difficulty="beginner",
        )


def test_real_database_substitution_transactions():
    asyncio.run(_scenario())


async def _scenario():
    engine = create_async_engine(URL)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    owner = f"v2-test-{uuid4()}"

    def services(db):
        training = TrainingService(TrainingRepository(db), Catalog())
        return training, SessionSubstitutionService(training, SubstitutionRepository(db))

    try:
        async with factory.begin() as db:
            training, substitutions = services(db)
            plan = await training.generate_plan(
                user_id=owner, request=GeneratePlanRequest(days_per_week=2)
            )
            workout = await training.start_session(user_id=owner, plan_id=plan.id, day_key="day-1")
            original = deepcopy(workout.prescription_snapshot)
            result = await CoachToolExecutor(training, substitution_service=substitutions).execute(
                user_id=owner,
                call=CoachToolCall(
                    name=CoachToolName.PREVIEW_SESSION_SUBSTITUTION,
                    arguments={"session_id": str(workout.id), "prescription_index": 0},
                ),
            )
            assert result.result["requires_approval"] is True
            pending = await substitutions.pending(owner, workout.id)
            assert len(pending) == 1
            proposal = pending[0]
            with pytest.raises(AppError):
                await substitutions.pending("wrong-owner", workout.id)
            unchanged = await training.get_session(user_id=owner, session_id=workout.id)
            assert unchanged.prescription_snapshot == original
            assert unchanged.version == 0

        async def approve(key="test-approval-key"):
            async with factory.begin() as db:
                _, substitutions = services(db)
                return await substitutions.approve(
                    owner,
                    proposal.id,
                    ApproveSessionSubstitution(idempotency_key=key, expected_version=0),
                )

        # Two simultaneous retries must produce one audit event and one version increment.
        first, second = await asyncio.gather(approve(), approve())
        assert first.event_id == second.event_id
        assert first.session.version == second.session.version == 1
        assert (
            first.session.prescription_snapshot.prescriptions[0].exercise_id
            == proposal.candidate.exercise_id
        )
        async with factory.begin() as db:
            training, substitutions = services(db)
            source = await training.get_plan(user_id=owner, plan_id=plan.id)
            assert source.days[0] == original
            assert (
                await db.scalar(
                    select(func.count())
                    .select_from(SessionSubstitutionEvent)
                    .where(SessionSubstitutionEvent.owner_id == owner)
                )
                == 1
            )
            with pytest.raises(AppError) as denied:
                await substitutions.approve(
                    "another-owner",
                    proposal.id,
                    ApproveSessionSubstitution(
                        idempotency_key="other-user-key", expected_version=0
                    ),
                )
            assert denied.value.code == "proposal_not_found"
            with pytest.raises(AppError) as replayed:
                await substitutions.approve(
                    owner,
                    proposal.id,
                    ApproveSessionSubstitution(
                        idempotency_key="different-retry-key", expected_version=0
                    ),
                )
            assert replayed.value.code == "proposal_replayed"
            undone = await substitutions.undo(owner, proposal.id)
            assert undone.session.prescription_snapshot == original

        # Existing sets retain original attribution; remaining sets use the replacement.
        async with factory.begin() as db:
            training, substitutions = services(db)
            logged = await training.log_set(
                user_id=owner,
                session_id=workout.id,
                logged_set=LoggedSetInput(prescription_index=0, set_number=1, reps=10, weight_kg=0),
            )
            replacement = await substitutions.preview(
                owner, workout.id, PreviewSessionSubstitution(prescription_index=0)
            )
            with pytest.raises(AppError) as confirmation:
                await substitutions.approve(
                    owner,
                    replacement.id,
                    ApproveSessionSubstitution(
                        idempotency_key="remaining-sets-key", expected_version=logged.version
                    ),
                )
            assert confirmation.value.code == "logged_sets_confirmation"
            result = await substitutions.approve(
                owner,
                replacement.id,
                ApproveSessionSubstitution(
                    idempotency_key="remaining-sets-key",
                    expected_version=logged.version,
                    acknowledge_logged_sets=True,
                ),
            )
            assert (
                result.session.logged_sets[0].exercise_id == original.prescriptions[0].exercise_id
            )
            after = await training.log_set(
                user_id=owner,
                session_id=workout.id,
                logged_set=LoggedSetInput(prescription_index=0, set_number=2, reps=10, weight_kg=0),
            )
            assert after.logged_sets[1].exercise_id == replacement.candidate.exercise_id
            with pytest.raises(AppError) as started:
                await substitutions.undo(owner, replacement.id)
            assert started.value.code == "undo_unavailable"
            stale = await substitutions.preview(
                owner, workout.id, PreviewSessionSubstitution(prescription_index=1)
            )
            await training.log_set(
                user_id=owner,
                session_id=workout.id,
                logged_set=LoggedSetInput(prescription_index=1, set_number=1, reps=10, weight_kg=0),
            )
            with pytest.raises(AppError) as conflict:
                await substitutions.approve(
                    owner,
                    stale.id,
                    ApproveSessionSubstitution(
                        idempotency_key="stale-proposal-key",
                        expected_version=stale.expected_version,
                    ),
                )
            assert conflict.value.code == "proposal_stale"
            expired = await substitutions.preview(
                owner, workout.id, PreviewSessionSubstitution(prescription_index=1)
            )
            record = await substitutions.repository.proposal(owner, expired.id)
            record.expires_at = datetime.now(UTC) - timedelta(seconds=1)
            with pytest.raises(AppError) as expiry:
                await substitutions.approve(
                    owner,
                    expired.id,
                    ApproveSessionSubstitution(
                        idempotency_key="expired-proposal-key",
                        expected_version=expired.expected_version,
                    ),
                )
            assert expiry.value.code == "proposal_expired"

        # An audit write failure rolls the entire approval back, including snapshot and status.
        async with factory.begin() as db:
            training, substitutions = services(db)
            before = await training.get_session(user_id=owner, session_id=workout.id)
            rollback = await substitutions.preview(
                owner, workout.id, PreviewSessionSubstitution(prescription_index=1)
            )
        with pytest.raises(RuntimeError, match="audit failure"):
            async with factory.begin() as db:
                _, substitutions = services(db)

                async def fail(**values):
                    raise RuntimeError("audit failure")

                substitutions.repository.event = fail
                await substitutions.approve(
                    owner,
                    rollback.id,
                    ApproveSessionSubstitution(
                        idempotency_key="rollback-key",
                        expected_version=rollback.expected_version,
                        acknowledge_logged_sets=True,
                    ),
                )
        async with factory.begin() as db:
            training, substitutions = services(db)
            persisted = await training.get_session(user_id=owner, session_id=workout.id)
            assert persisted.version == before.version
            assert persisted.prescription_snapshot == before.prescription_snapshot
            record = await substitutions.repository.proposal(owner, rollback.id)
            assert record.status == "pending" and record.approval_key is None
            completed = await training.complete_session(user_id=owner, session_id=workout.id)
            assert (
                await training.complete_session(user_id=owner, session_id=workout.id) == completed
            )
            with pytest.raises(AppError):
                await substitutions.approve(
                    owner,
                    rollback.id,
                    ApproveSessionSubstitution(
                        idempotency_key="completed-key", expected_version=rollback.expected_version
                    ),
                )
    finally:
        async with factory.begin() as db:
            await delete_game_account_data(db, owner)
            for model in [
                SessionSubstitutionEvent,
                SessionSubstitutionProposal,
                WorkoutSessionRecord,
                WorkoutPlanRecord,
            ]:
                await db.execute(delete(model).where(model.owner_id == owner))
        await engine.dispose()
