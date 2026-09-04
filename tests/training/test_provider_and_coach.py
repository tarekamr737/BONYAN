from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.core.errors import AppError
from app.core.providers.contracts import LLMRequest
from app.domains.training.coach.schemas import CoachToolCall, CoachToolName
from app.domains.training.coach.service import CoachService
from app.domains.training.coach.tools import CoachToolExecutor
from app.domains.training.schemas import (
    GeneratePlanRequest,
    LoggedSetInput,
    PlanStatus,
    SubstituteExerciseRequest,
    WorkoutSessionStatus,
)
from app.domains.training.service import TrainingService
from app.integrations.musclewiki.client import MuscleWikiClient
from app.integrations.musclewiki.errors import MuscleWikiInvalidResponseError
from app.integrations.musclewiki.provider import (
    ExerciseDetails,
    ExerciseSearchFilters,
    ExerciseSearchPage,
)


class FakeProvider:
    async def search_exercises(
        self, filters: ExerciseSearchFilters, *, page: int = 1, page_size: int = 20
    ) -> ExerciseSearchPage:
        muscle = filters.muscles[0] if filters.muscles else "chest"
        return ExerciseSearchPage(
            items=(
                ExerciseDetails(
                    id=f"{muscle}-a",
                    name=f"{muscle.title()} Exercise",
                    muscles=(muscle,),
                    equipment=(filters.equipment[0] if filters.equipment else "bodyweight",),
                    difficulty="beginner",
                ),
                ExerciseDetails(
                    id=f"{muscle}-b",
                    name=f"{muscle.title()} Backup",
                    muscles=(muscle,),
                    equipment=(filters.equipment[0] if filters.equipment else "bodyweight",),
                    difficulty="beginner",
                ),
            ),
            page=page,
            page_size=page_size,
        )

    async def get_exercise(self, exercise_id: str) -> ExerciseDetails:
        return ExerciseDetails(
            id=exercise_id,
            name="Exercise",
            muscles=("chest",),
            equipment=("bodyweight",),
            difficulty="beginner",
        )

    async def get_media_access(self, exercise_id: str, *, user_id: str):
        return None


class FakeInBodyProvider:
    def __init__(self, latest: dict[str, float | str | None] | None) -> None:
        self.latest = latest

    async def get_latest_inbody(self, user_id: str) -> dict[str, float | str | None] | None:
        return self.latest if user_id == "user-1" else None


class FakeRepository:
    def __init__(self) -> None:
        self.plans: dict[uuid.UUID, SimpleNamespace] = {}
        self.sessions: dict[uuid.UUID, SimpleNamespace] = {}

    async def save_plan(self, *, owner_id: str, plan: dict[str, object]) -> SimpleNamespace:
        record = SimpleNamespace(
            id=uuid.uuid4(),
            owner_id=owner_id,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
            **plan,
        )
        if record.status == PlanStatus.ACTIVE:
            await self.archive_active_plans(owner_id=owner_id)
        self.plans[record.id] = record
        return record

    async def archive_active_plans(self, *, owner_id: str) -> None:
        for plan in self.plans.values():
            if plan.owner_id == owner_id and plan.status == PlanStatus.ACTIVE:
                plan.status = PlanStatus.ARCHIVED

    async def get_plan(self, *, owner_id: str, plan_id: uuid.UUID) -> SimpleNamespace | None:
        plan = self.plans.get(plan_id)
        return plan if plan and plan.owner_id == owner_id else None

    async def get_active_plan(self, *, owner_id: str) -> SimpleNamespace | None:
        return next(
            (
                plan
                for plan in self.plans.values()
                if plan.owner_id == owner_id and plan.status == PlanStatus.ACTIVE
            ),
            None,
        )

    async def create_session(
        self, *, owner_id: str, plan_id: uuid.UUID, day_key: str
    ) -> SimpleNamespace:
        session = SimpleNamespace(
            id=uuid.uuid4(),
            owner_id=owner_id,
            plan_id=plan_id,
            day_key=day_key,
            status=WorkoutSessionStatus.ACTIVE,
            logged_sets=[],
            summary={},
            started_at=datetime.now(UTC),
            completed_at=None,
        )
        self.sessions[session.id] = session
        return session

    async def get_session(self, *, owner_id: str, session_id: uuid.UUID) -> SimpleNamespace | None:
        session = self.sessions.get(session_id)
        return session if session and session.owner_id == owner_id else None

    async def list_sessions(self, *, owner_id: str, limit: int = 10) -> list[SimpleNamespace]:
        return [item for item in self.sessions.values() if item.owner_id == owner_id][:limit]


class FailingLLM:
    async def complete(self, request: LLMRequest):
        raise TimeoutError("llm down")


class EchoLLM:
    async def complete(self, request: LLMRequest):
        return SimpleNamespace(text=f"ok {request.prompt[:8]}", model="TBD")


class HangingLLM:
    async def complete(self, request: LLMRequest):
        await asyncio.Event().wait()


def run(coro):
    return asyncio.run(coro)


def make_service() -> tuple[TrainingService, FakeRepository]:
    repo = FakeRepository()
    return TrainingService(repo, FakeProvider()), repo


def make_service_with_inbody(
    latest: dict[str, float | str | None] | None,
) -> tuple[TrainingService, FakeRepository]:
    repo = FakeRepository()
    return TrainingService(repo, FakeProvider(), FakeInBodyProvider(latest)), repo


def test_invalid_musclewiki_response_is_rejected() -> None:
    client = MuscleWikiClient(settings=SimpleNamespace(musclewiki_api_key=None))

    with pytest.raises(MuscleWikiInvalidResponseError):
        client._parse_exercise({"name": "Missing id"})


def test_generate_plan_request_rejects_client_owned_inbody_context() -> None:
    with pytest.raises(ValidationError):
        GeneratePlanRequest.model_validate({"latest_inbody": {"weight": 90}})


def test_service_adds_latest_confirmed_inbody_server_side() -> None:
    service, _ = make_service_with_inbody({"weight": 82})

    plan = run(service.generate_plan(user_id="user-1", request=GeneratePlanRequest()))

    assert plan.generation_snapshot["optional_inbody_used"] is True


def test_service_preserves_no_inbody_fallback() -> None:
    service, _ = make_service_with_inbody(None)

    plan = run(service.generate_plan(user_id="user-1", request=GeneratePlanRequest()))

    assert plan.generation_snapshot["optional_inbody_used"] is False


def test_service_rejects_cross_user_mutations() -> None:
    service, _ = make_service()
    plan = run(
        service.generate_plan(user_id="user-1", request=GeneratePlanRequest(days_per_week=2))
    )

    with pytest.raises(AppError):
        run(service.start_session(user_id="user-2", plan_id=plan.id, day_key="day-1"))


def test_service_rejects_cross_user_reads_logs_removes_completes_and_substitutions() -> None:
    service, _ = make_service()
    plan = run(
        service.generate_plan(user_id="user-1", request=GeneratePlanRequest(days_per_week=2))
    )
    session = run(service.start_session(user_id="user-1", plan_id=plan.id, day_key="day-1"))
    logged_set = LoggedSetInput(
        prescription_index=0,
        set_number=1,
        reps=10,
        weight_kg=20,
        completed=True,
    )

    assert run(service.get_current_plan(user_id="user-2")) is None
    assert run(service.list_recent_sessions(user_id="user-2")) == []
    with pytest.raises(AppError):
        run(service.log_set(user_id="user-2", session_id=session.id, logged_set=logged_set))
    with pytest.raises(AppError):
        run(
            service.remove_set(
                user_id="user-2",
                session_id=session.id,
                prescription_index=0,
                set_number=1,
            )
        )
    with pytest.raises(AppError):
        run(service.complete_session(user_id="user-2", session_id=session.id))
    with pytest.raises(AppError):
        run(
            service.substitute(
                user_id="user-2",
                request=SubstituteExerciseRequest(
                    plan_id=plan.id,
                    day_key="day-1",
                    prescription_index=0,
                    available_equipment=["bodyweight"],
                ),
            )
        )


def test_session_logging_and_completion_are_deterministic() -> None:
    service, _ = make_service()
    plan = run(
        service.generate_plan(user_id="user-1", request=GeneratePlanRequest(days_per_week=2))
    )
    session = run(service.start_session(user_id="user-1", plan_id=plan.id, day_key="day-1"))

    session = run(
        service.log_set(
            user_id="user-1",
            session_id=session.id,
            logged_set=LoggedSetInput(
                prescription_index=0,
                set_number=1,
                reps=10,
                weight_kg=20,
                completed=True,
            ),
        )
    )
    completed = run(service.complete_session(user_id="user-1", session_id=session.id))

    assert completed.status == WorkoutSessionStatus.COMPLETED
    assert completed.summary["sets"] == 1
    assert completed.summary["volume_kg"] == 200
    assert completed.completed_at is not None


def test_session_logging_rejects_unprescribed_exercise_or_set() -> None:
    service, _ = make_service()
    plan = run(
        service.generate_plan(user_id="user-1", request=GeneratePlanRequest(days_per_week=2))
    )
    session = run(service.start_session(user_id="user-1", plan_id=plan.id, day_key="day-1"))

    with pytest.raises(AppError):
        run(
            service.log_set(
                user_id="user-1",
                session_id=session.id,
                logged_set=LoggedSetInput(
                    prescription_index=20,
                    set_number=1,
                    reps=10,
                    weight_kg=20,
                ),
            )
        )
    with pytest.raises(AppError):
        run(
            service.log_set(
                user_id="user-1",
                session_id=session.id,
                logged_set=LoggedSetInput(
                    prescription_index=0,
                    set_number=9,
                    reps=10,
                    weight_kg=20,
                ),
            )
        )


def test_completed_session_cannot_be_edited_or_completed_again() -> None:
    service, _ = make_service()
    plan = run(
        service.generate_plan(user_id="user-1", request=GeneratePlanRequest(days_per_week=2))
    )
    session = run(service.start_session(user_id="user-1", plan_id=plan.id, day_key="day-1"))
    completed = run(service.complete_session(user_id="user-1", session_id=session.id))

    with pytest.raises(AppError):
        run(
            service.log_set(
                user_id="user-1",
                session_id=completed.id,
                logged_set=LoggedSetInput(
                    prescription_index=0,
                    set_number=1,
                    reps=10,
                    weight_kg=20,
                ),
            )
        )
    with pytest.raises(AppError):
        run(
            service.remove_set(
                user_id="user-1",
                session_id=completed.id,
                prescription_index=0,
                set_number=1,
            )
        )
    with pytest.raises(AppError):
        run(service.complete_session(user_id="user-1", session_id=completed.id))


def test_invalid_coach_tool_call_is_rejected() -> None:
    service, _ = make_service()
    executor = CoachToolExecutor(service)

    with pytest.raises(AppError):
        run(
            executor.execute(
                user_id="user-1",
                call=CoachToolCall(
                    name=CoachToolName.GENERATE_WORKOUT_PLAN,
                    arguments={"days_per_week": 99},
                ),
            )
        )


def test_coach_uses_mock_llm_and_validated_tool_results() -> None:
    service, _ = make_service()
    coach = CoachService(llm_provider=EchoLLM(), tool_executor=CoachToolExecutor(service))

    response = run(
        coach.respond(
            user_id="user-1",
            message="generate my workout plan",
            tool_calls=[
                CoachToolCall(
                    name=CoachToolName.GENERATE_WORKOUT_PLAN,
                    arguments={"days_per_week": 2, "equipment": ["bodyweight"]},
                )
            ],
        )
    )

    assert response.model == "TBD"
    assert response.tool_results[0]["name"] == CoachToolName.GENERATE_WORKOUT_PLAN
    plan_result = response.tool_results[0]["result"]["plan"]
    assert plan_result["days"][0]["exercise_count"] > 0
    assert "prescriptions" not in str(plan_result)


def test_coach_llm_outage_does_not_mutate_without_valid_tool() -> None:
    service, repo = make_service()
    coach = CoachService(llm_provider=FailingLLM(), tool_executor=CoachToolExecutor(service))

    with pytest.raises(AppError) as raised:
        run(coach.respond(user_id="user-1", message="help with my workout"))

    assert raised.value.code == "coach_unavailable"
    assert raised.value.status_code == 503
    assert repo.plans == {}


def test_coach_enforces_provider_timeout() -> None:
    service, _ = make_service()
    coach = CoachService(
        llm_provider=HangingLLM(),
        tool_executor=CoachToolExecutor(service),
        provider_timeout_seconds=0.01,
    )

    with pytest.raises(AppError) as raised:
        run(coach.respond(user_id="user-1", message="help with my workout"))

    assert raised.value.code == "coach_unavailable"
    assert raised.value.status_code == 503


def test_coach_rejects_out_of_scope_medical_question() -> None:
    service, _ = make_service()
    coach = CoachService(llm_provider=EchoLLM(), tool_executor=CoachToolExecutor(service))

    with pytest.raises(AppError):
        run(coach.respond(user_id="user-1", message="diagnose my knee injury"))
