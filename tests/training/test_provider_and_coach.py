from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.core.errors import AppError
from app.core.providers.contracts import (
    LLMRequest,
    LLMResponse,
)
from app.core.providers.contracts import (
    LLMToolCall as ProviderToolCall,
)
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


def test_coach_tool_definitions_use_recursive_strict_schemas() -> None:
    def assert_strict(value: object) -> None:
        if isinstance(value, list):
            for item in value:
                assert_strict(item)
            return
        if not isinstance(value, dict):
            return
        assert "default" not in value
        assert "title" not in value
        if value.get("type") == "object":
            assert value["additionalProperties"] is False
            assert value["required"] == list(value.get("properties", {}))
        for item in value.values():
            assert_strict(item)

    for definition in CoachToolExecutor.definitions():
        assert_strict(definition.parameters)


class FakeInBodyProvider:
    def __init__(self, latest: dict[str, float | str | None] | None) -> None:
        self.latest = latest

    async def get_latest_inbody(self, user_id: str) -> dict[str, float | str | None] | None:
        return self.latest if user_id == "user-1" else None


class FakeProfileRepository:
    async def get(self, owner_id: str):
        if owner_id != "user-1":
            return None
        return SimpleNamespace(
            training_goal="strength",
            experience_level="beginner",
            available_training_days=3,
            available_equipment=["dumbbell"],
            preferred_language="ar-EG",
            timezone="Africa/Cairo",
        )


class FakeRepository:
    async def lock_plan_activation(self, *, owner_id: str) -> None:
        pass

    async def lock_session_start(self, *, owner_id: str, plan_id, day_key: str) -> None:
        pass

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
        return LLMResponse(text=f"ok {request.prompt[:8]}", model="TBD")


class ToolCallingLLM:
    def __init__(self) -> None:
        self.requests: list[LLMRequest] = []

    async def complete(self, request: LLMRequest) -> LLMResponse:
        self.requests.append(request)
        if not request.tool_results:
            return LLMResponse(
                text="",
                model="gpt-5.6-terra",
                tool_calls=(
                    ProviderToolCall(
                        call_id="call-plan",
                        name=CoachToolName.GENERATE_WORKOUT_PLAN.value,
                        arguments={"days_per_week": 2, "equipment": ["bodyweight"]},
                    ),
                ),
            )
        return LLMResponse(text="Your validated plan is ready.", model="gpt-5.6-terra")


class InBodyToolCallingLLM:
    async def complete(self, request: LLMRequest) -> LLMResponse:
        if not request.tool_results:
            assert any(tool.name == CoachToolName.GET_LATEST_INBODY for tool in request.tools)
            return LLMResponse(
                text="",
                model="sovereigneg-test",
                tool_calls=(
                    ProviderToolCall(
                        call_id="call-inbody",
                        name=CoachToolName.GET_LATEST_INBODY.value,
                        arguments={},
                    ),
                ),
            )
        assert request.tool_results[0].output["result"]["latest_confirmed_inbody"] == {
            "weight": 75.0,
            "scan_date": "2026-09-16",
        }
        return LLMResponse(text="I used your confirmed assessment.", model="sovereigneg-test")


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


def test_training_blocks_plans_and_sessions_when_limitations_are_recorded() -> None:
    from app.domains.training.schemas import ManualExerciseInput, ManualPlanRequest

    class RestrictedProfileRepository:
        async def get(self, owner_id: str):
            return SimpleNamespace(coaching={"limitations": "Knee injury"})

    service, _ = make_service()
    existing_plan = run(service.generate_plan(user_id="user-1", request=GeneratePlanRequest()))
    service.profile_repository = RestrictedProfileRepository()

    actions = [
        service.generate_plan(user_id="user-1", request=GeneratePlanRequest()),
        service.create_manual_plan(
            user_id="user-1",
            request=ManualPlanRequest(
                name="Restricted", exercises=[ManualExerciseInput(exercise_id="squat")]
            ),
        ),
        service.activate_plan(user_id="user-1", plan_id=existing_plan.id),
        service.start_session(
            user_id="user-1", plan_id=existing_plan.id, day_key=existing_plan.days[0].key
        ),
    ]
    for action in actions:
        with pytest.raises(AppError) as error:
            run(action)
        assert error.value.code == "training_limitations_require_review"


def test_manual_plan_uses_provider_exercises_and_is_startable() -> None:
    from app.domains.training.schemas import ManualExerciseInput, ManualPlanRequest

    service, _ = make_service()
    plan = run(
        service.create_manual_plan(
            user_id="user-1",
            request=ManualPlanRequest(
                name="Focused session",
                exercises=[ManualExerciseInput(exercise_id="squat")],
            ),
        )
    )

    assert plan.generation_snapshot == {"source": "manual", "exercise_count": 1}
    assert plan.days[0].prescriptions[0].exercise_id == "squat"
    session = run(service.start_session(user_id="user-1", plan_id=plan.id, day_key="manual-day-1"))
    assert session.status == WorkoutSessionStatus.ACTIVE


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


def test_coach_profile_and_confirmed_inbody_tools_are_owner_scoped() -> None:
    service, _ = make_service()
    executor = CoachToolExecutor(
        service,
        profile_repository=FakeProfileRepository(),
        inbody_provider=FakeInBodyProvider(
            {"weight": 75.0, "percent_body_fat": 20.0, "scan_date": "2026-09-16"}
        ),
    )

    profile = run(
        executor.execute(
            user_id="user-1",
            call=CoachToolCall(name=CoachToolName.GET_PROFILE),
        )
    )
    inbody = run(
        executor.execute(
            user_id="user-1",
            call=CoachToolCall(name=CoachToolName.GET_LATEST_INBODY),
        )
    )
    other_user = run(
        executor.execute(
            user_id="user-2",
            call=CoachToolCall(name=CoachToolName.GET_LATEST_INBODY),
        )
    )

    assert profile.result["profile"] == {
        "training_goal": "strength",
        "experience_level": "beginner",
        "available_training_days": 3,
        "available_equipment": ["dumbbell"],
        "preferred_language": "ar-EG",
        "timezone": "Africa/Cairo",
        "has_training_limitations": False,
    }
    assert inbody.result["latest_confirmed_inbody"]["weight"] == 75.0
    assert other_user.result["latest_confirmed_inbody"] is None


def test_coach_returns_confirmed_inbody_only_after_provider_requests_tool() -> None:
    service, _ = make_service()
    coach = CoachService(
        llm_provider=InBodyToolCallingLLM(),
        tool_executor=CoachToolExecutor(
            service,
            inbody_provider=FakeInBodyProvider(
                {"weight": 75.0, "scan_date": "2026-09-16"}
            ),
        ),
    )

    response = run(
        coach.respond(user_id="user-1", message="Use my latest assessment for training progress")
    )

    assert response.response == "I used your confirmed assessment."
    assert response.tool_results[0]["name"] == CoachToolName.GET_LATEST_INBODY


def test_coach_uses_mock_llm_and_validated_tool_results() -> None:
    service, _ = make_service()
    provider = ToolCallingLLM()
    coach = CoachService(llm_provider=provider, tool_executor=CoachToolExecutor(service))

    response = run(
        coach.respond(
            user_id="user-1",
            message="generate my workout plan",
        )
    )

    assert response.model == "gpt-5.6-terra"
    assert response.response == "Your validated plan is ready."
    assert response.tool_results[0]["name"] == CoachToolName.GENERATE_WORKOUT_PLAN
    plan_result = response.tool_results[0]["result"]["plan"]
    assert plan_result["days"][0]["exercise_count"] > 0
    assert "prescriptions" not in str(plan_result)
    assert len(provider.requests) == 2
    assert provider.requests[0].tools
    assert provider.requests[1].tool_results[0].call_id == "call-plan"


def test_coach_accepts_egyptian_arabic_training_scope() -> None:
    service, _ = make_service()
    coach = CoachService(llm_provider=EchoLLM(), tool_executor=CoachToolExecutor(service))

    response = run(coach.respond(user_id="user-1", message="عايز خطة تمرين للجيم"))

    assert response.model == "TBD"


def test_coach_accepts_nutrition_scope_and_includes_authorized_context() -> None:
    class ContextLLM:
        async def complete(self, request: LLMRequest):
            assert '"goal": "fat_loss"' in request.prompt
            assert '"meals_logged": 1' in request.prompt
            return LLMResponse(text="Keep the next meal protein-led.", model="test")

    service, _ = make_service()
    coach = CoachService(llm_provider=ContextLLM(), tool_executor=CoachToolExecutor(service))
    response = run(
        coach.respond(
            user_id="user-1",
            message="What should I eat next?",
            user_context={"goal": "fat_loss", "today_nutrition": {"meals_logged": 1}},
        )
    )

    assert response.response == "Keep the next meal protein-led."


@pytest.mark.parametrize("message", ["Why hold this weight?", "Find a swap"])
def test_coach_accepts_its_mobile_suggested_prompts(message: str) -> None:
    service, _ = make_service()
    coach = CoachService(llm_provider=EchoLLM(), tool_executor=CoachToolExecutor(service))

    response = run(coach.respond(user_id="user-1", message=message))

    assert response.model == "TBD"


@pytest.mark.parametrize("message", ["hi coach", "hi coch", "hello"])
def test_coach_accepts_conversational_openers(message: str) -> None:
    service, _ = make_service()
    coach = CoachService(llm_provider=EchoLLM(), tool_executor=CoachToolExecutor(service))

    response = run(coach.respond(user_id="user-1", message=message))

    assert response.model == "TBD"


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


def test_draft_requires_owner_approval_and_preserves_previous_plan():
    service, repository = make_service()
    active = run(service.generate_plan(user_id="user-1", request=GeneratePlanRequest()))
    draft = run(service.generate_plan(
        user_id="user-1", request=GeneratePlanRequest(activate=False)
    ))
    assert run(service.get_current_plan(user_id="user-1")).id == active.id
    with pytest.raises(AppError):
        run(service.activate_plan(user_id="other", plan_id=draft.id))
    approved = run(service.activate_plan(user_id="user-1", plan_id=draft.id))
    assert approved.status == PlanStatus.ACTIVE
    assert repository.plans[active.id].status == PlanStatus.ARCHIVED
    assert run(service.activate_plan(user_id="user-1", plan_id=draft.id)).id == draft.id


def test_coach_cannot_activate_a_plan_even_when_model_requests_it():
    service, _ = make_service()
    executor = CoachToolExecutor(service)
    result = run(executor.execute(user_id="user-1", call=CoachToolCall(
        name=CoachToolName.GENERATE_WORKOUT_PLAN,
        arguments=GeneratePlanRequest(activate=True).model_dump(mode="json"),
    )))
    assert result.result["requires_approval"] is True
    assert result.result["plan"]["status"] == PlanStatus.DRAFT
    assert run(service.get_current_plan(user_id="user-1")) is None


def test_alternative_preview_does_not_change_the_saved_plan():
    service, repository = make_service()
    plan = run(service.generate_plan(user_id="user-1", request=GeneratePlanRequest()))
    before = repository.plans[plan.id].days[0]["prescriptions"][0]["exercise_id"]
    request = SubstituteExerciseRequest(
        plan_id=plan.id, day_key=plan.days[0].key, prescription_index=0
    )
    preview = run(service.substitute(user_id="user-1", request=request, preview=True))
    assert repository.plans[plan.id].days[0]["prescriptions"][0]["exercise_id"] == before
    assert preview.days[0].prescriptions[0].exercise_id != before
