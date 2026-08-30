from __future__ import annotations

from uuid import UUID

from fastapi import status
from pydantic import BaseModel, Field, ValidationError

from app.core.errors import AppError
from app.domains.training.coach.schemas import CoachToolCall, CoachToolName, CoachToolResult
from app.domains.training.schemas import GeneratePlanRequest, LoggedSetInput
from app.domains.training.service import TrainingService
from app.integrations.musclewiki.provider import ExerciseSearchFilters


class SearchExercisesArgs(BaseModel):
    query: str | None = Field(default=None, max_length=120)
    muscles: list[str] = Field(default_factory=list, max_length=8)
    equipment: list[str] = Field(default_factory=list, max_length=8)


class ExerciseDetailsArgs(BaseModel):
    exercise_id: str = Field(min_length=1, max_length=120)


class LogWorkoutArgs(LoggedSetInput):
    session_id: UUID


class CoachToolExecutor:
    def __init__(self, training_service: TrainingService) -> None:
        self.training_service = training_service

    async def execute(self, *, user_id: str, call: CoachToolCall) -> CoachToolResult:
        try:
            result = await self._execute_validated(user_id=user_id, call=call)
        except ValidationError as exc:
            raise AppError(
                "invalid_coach_tool_call",
                "Coach tool arguments are invalid.",
                status.HTTP_400_BAD_REQUEST,
            ) from exc
        return CoachToolResult(name=call.name, result=result)

    async def _execute_validated(self, *, user_id: str, call: CoachToolCall) -> dict[str, object]:
        if call.name == CoachToolName.GET_CURRENT_PLAN:
            plan = await self.training_service.get_current_plan(user_id=user_id)
            return {"plan": _plan_summary(plan) if plan else None}
        if call.name == CoachToolName.GET_TRAINING_HISTORY:
            sessions = await self.training_service.list_recent_sessions(user_id=user_id, limit=5)
            return {
                "sessions": [_session_summary(item) for item in sessions]
            }
        if call.name == CoachToolName.SEARCH_EXERCISES:
            args = SearchExercisesArgs.model_validate(call.arguments)
            page = await self.training_service.search_exercises(
                ExerciseSearchFilters(
                    query=args.query,
                    muscles=tuple(args.muscles),
                    equipment=tuple(args.equipment),
                ),
                page=1,
                page_size=8,
            )
            return {"items": [item.__dict__ for item in page.items]}
        if call.name == CoachToolName.GET_EXERCISE_DETAILS:
            args = ExerciseDetailsArgs.model_validate(call.arguments)
            item = await self.training_service.get_exercise_details(args.exercise_id)
            return {"exercise": item.__dict__}
        if call.name == CoachToolName.GENERATE_WORKOUT_PLAN:
            args = GeneratePlanRequest.model_validate(call.arguments)
            plan = await self.training_service.generate_plan(user_id=user_id, request=args)
            return {"plan": _plan_summary(plan)}
        if call.name == CoachToolName.LOG_WORKOUT:
            args = LogWorkoutArgs.model_validate(call.arguments)
            session = await self.training_service.log_set(
                user_id=user_id,
                session_id=args.session_id,
                logged_set=LoggedSetInput.model_validate(args),
            )
            return {"session": _session_summary(session)}
        raise AppError(
            "invalid_coach_tool_call", "Coach tool is not supported.", status.HTTP_400_BAD_REQUEST
        )


def _plan_summary(plan) -> dict[str, object]:
    return {
        "id": str(plan.id),
        "status": plan.status,
        "goal": plan.goal,
        "experience": plan.experience,
        "days_per_week": plan.days_per_week,
        "days": [
            {
                "key": day.key,
                "name": day.name,
                "estimated_minutes": day.estimated_minutes,
                "exercise_count": len(day.prescriptions),
            }
            for day in plan.days
        ],
    }


def _session_summary(session) -> dict[str, object]:
    return {
        "id": str(session.id),
        "day_key": session.day_key,
        "status": session.status,
        "logged_set_count": len(session.logged_sets),
        "summary": session.summary,
    }
