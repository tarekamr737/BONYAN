from __future__ import annotations

from uuid import UUID

from fastapi import status

from app.core.errors import AppError
from app.domains.training.engine.planner import WorkoutPlanner
from app.domains.training.engine.progression import decide_progression
from app.domains.training.engine.rules import normalize_equipment
from app.domains.training.engine.substitutions import choose_substitution
from app.domains.training.repository import TrainingRepository
from app.domains.training.schemas import (
    GeneratePlanRequest,
    LoggedSet,
    LoggedSetInput,
    PlanningContext,
    PlanStatus,
    SubstituteExerciseRequest,
    WorkoutPlan,
    WorkoutSessionResponse,
    WorkoutSessionStatus,
)
from app.integrations.musclewiki.provider import ExerciseSearchFilters, MuscleWikiExerciseProvider


class TrainingService:
    def __init__(
        self, repository: TrainingRepository, exercise_provider: MuscleWikiExerciseProvider
    ) -> None:
        self.repository = repository
        self.exercise_provider = exercise_provider
        self.planner = WorkoutPlanner(exercise_provider)

    async def generate_plan(self, *, user_id: str, request: GeneratePlanRequest) -> WorkoutPlan:
        plan = await self.planner.generate(
            PlanningContext.model_validate(request), activate=request.activate
        )
        record = await self.repository.save_plan(
            owner_id=user_id,
            plan={
                "status": plan.status,
                "goal": plan.goal,
                "experience": plan.experience,
                "days_per_week": plan.days_per_week,
                "session_duration_minutes": plan.session_duration_minutes,
                "equipment": plan.equipment,
                "generation_snapshot": plan.generation_snapshot,
                "days": [day.model_dump(mode="json") for day in plan.days],
            },
        )
        return self._plan_response(record)

    async def get_current_plan(self, *, user_id: str) -> WorkoutPlan | None:
        record = await self.repository.get_active_plan(owner_id=user_id)
        return self._plan_response(record) if record else None

    async def start_session(
        self, *, user_id: str, plan_id: UUID, day_key: str
    ) -> WorkoutSessionResponse:
        plan = await self._owned_plan(user_id=user_id, plan_id=plan_id)
        if not any(day["key"] == day_key for day in plan.days):
            raise AppError(
                "training_day_not_found", "Workout day not found.", status.HTTP_404_NOT_FOUND
            )
        return self._session_response(
            await self.repository.create_session(owner_id=user_id, plan_id=plan_id, day_key=day_key)
        )

    async def log_set(
        self, *, user_id: str, session_id: UUID, logged_set: LoggedSetInput
    ) -> WorkoutSessionResponse:
        session = await self._owned_session(user_id=user_id, session_id=session_id)
        if session.status != WorkoutSessionStatus.ACTIVE:
            raise AppError(
                "session_completed", "This workout is already complete.", status.HTTP_409_CONFLICT
            )
        sets = list(session.logged_sets)
        sets = [
            item
            for item in sets
            if not (
                item["prescription_index"] == logged_set.prescription_index
                and item["set_number"] == logged_set.set_number
            )
        ]
        sets.append(logged_set.model_dump(mode="json"))
        session.logged_sets = sorted(
            sets, key=lambda item: (item["prescription_index"], item["set_number"])
        )
        return self._session_response(session)

    async def remove_set(
        self, *, user_id: str, session_id: UUID, prescription_index: int, set_number: int
    ) -> WorkoutSessionResponse:
        session = await self._owned_session(user_id=user_id, session_id=session_id)
        session.logged_sets = [
            item
            for item in session.logged_sets
            if not (
                item["prescription_index"] == prescription_index
                and item["set_number"] == set_number
            )
        ]
        return self._session_response(session)

    async def complete_session(self, *, user_id: str, session_id: UUID) -> WorkoutSessionResponse:
        session = await self._owned_session(user_id=user_id, session_id=session_id)
        session.status = WorkoutSessionStatus.COMPLETED
        session.summary = {
            "sets": len(session.logged_sets),
            "volume_kg": round(
                sum(item["reps"] * item["weight_kg"] for item in session.logged_sets), 2
            ),
        }
        return self._session_response(session)

    async def substitute(self, *, user_id: str, request: SubstituteExerciseRequest) -> WorkoutPlan:
        plan = await self._owned_plan(user_id=user_id, plan_id=request.plan_id)
        plan_schema = self._plan_response(plan)
        day = next((item for item in plan_schema.days if item.key == request.day_key), None)
        if day is None or request.prescription_index >= len(day.prescriptions):
            raise AppError(
                "training_prescription_not_found", "Exercise not found.", status.HTTP_404_NOT_FOUND
            )
        original = day.prescriptions[request.prescription_index]
        equipment = normalize_equipment(request.available_equipment or plan_schema.equipment)
        page = await self.exercise_provider.search_exercises(
            ExerciseSearchFilters(muscles=tuple(original.muscles), equipment=equipment),
            page=1,
            page_size=20,
        )
        replacement = choose_substitution(original, list(page.items), available_equipment=equipment)
        if replacement is None:
            raise AppError(
                "substitution_not_available",
                "No compatible substitution is available.",
                status.HTTP_409_CONFLICT,
            )
        day.prescriptions[request.prescription_index] = original.model_copy(
            update={
                "musclewiki_id": replacement.id,
                "name": replacement.name,
                "muscles": list(replacement.muscles),
                "equipment": list(replacement.equipment),
            }
        )
        plan.days = [item.model_dump(mode="json") for item in plan_schema.days]
        return self._plan_response(plan)

    async def _owned_plan(self, *, user_id: str, plan_id: UUID):
        plan = await self.repository.get_plan(owner_id=user_id, plan_id=plan_id)
        if plan is None:
            raise AppError(
                "training_plan_not_found", "Workout plan not found.", status.HTTP_404_NOT_FOUND
            )
        return plan

    async def _owned_session(self, *, user_id: str, session_id: UUID):
        session = await self.repository.get_session(owner_id=user_id, session_id=session_id)
        if session is None:
            raise AppError(
                "training_session_not_found",
                "Workout session not found.",
                status.HTTP_404_NOT_FOUND,
            )
        return session

    def _plan_response(self, record) -> WorkoutPlan:
        return WorkoutPlan(
            id=record.id,
            status=PlanStatus(record.status),
            goal=record.goal,
            experience=record.experience,
            days_per_week=record.days_per_week,
            session_duration_minutes=record.session_duration_minutes,
            equipment=record.equipment,
            generation_snapshot=record.generation_snapshot,
            days=record.days,
            created_at=record.created_at,
            updated_at=record.updated_at,
        )

    def _session_response(self, record) -> WorkoutSessionResponse:
        return WorkoutSessionResponse(
            id=record.id,
            plan_id=record.plan_id,
            day_key=record.day_key,
            status=WorkoutSessionStatus(record.status),
            started_at=record.started_at,
            completed_at=record.completed_at,
            logged_sets=[LoggedSet.model_validate(item) for item in record.logged_sets],
            summary=record.summary,
        )


def progression_for_prescription(
    prescription, logged_sets, *, current_weight_kg: float, recent_failures: int = 0
):
    return decide_progression(
        prescription,
        logged_sets,
        current_weight_kg=current_weight_kg,
        recent_failures=recent_failures,
    )
