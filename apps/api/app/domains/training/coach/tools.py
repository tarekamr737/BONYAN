from __future__ import annotations

from uuid import UUID

from fastapi import status
from pydantic import BaseModel, Field, ValidationError

from app.core.errors import AppError
from app.core.providers.contracts import LLMToolDefinition
from app.domains.inbody.contracts import LatestInBodyProvider
from app.domains.training.coach.schemas import CoachToolCall, CoachToolName, CoachToolResult
from app.domains.training.schemas import GeneratePlanRequest, LoggedSetInput
from app.domains.training.service import TrainingService
from app.domains.training.substitution_schemas import PreviewSessionSubstitution
from app.domains.training.substitution_service import SessionSubstitutionService
from app.domains.users.repository import ProfileRepository
from app.integrations.exercises.provider import ExerciseSearchFilters


class SearchExercisesArgs(BaseModel):
    query: str | None = Field(default=None, max_length=120)
    muscles: list[str] = Field(default_factory=list, max_length=8)
    equipment: list[str] = Field(default_factory=list, max_length=8)


class ExerciseDetailsArgs(BaseModel):
    exercise_id: str = Field(min_length=1, max_length=120)


class LogWorkoutArgs(LoggedSetInput):
    session_id: UUID


class PreviewSubstitutionArgs(PreviewSessionSubstitution):
    session_id: UUID


class CoachToolExecutor:
    def __init__(
        self,
        training_service: TrainingService,
        *,
        profile_repository: ProfileRepository | None = None,
        inbody_provider: LatestInBodyProvider | None = None,
        substitution_service: SessionSubstitutionService | None = None,
    ) -> None:
        self.training_service = training_service
        self.profile_repository = profile_repository
        self.inbody_provider = inbody_provider
        self.substitution_service = substitution_service

    @staticmethod
    def definitions() -> tuple[LLMToolDefinition, ...]:
        empty_parameters = {
            "type": "object",
            "properties": {},
            "additionalProperties": False,
        }
        models = {
            CoachToolName.GET_PROFILE: (
                "Read the user's fitness preferences and profile settings.",
                empty_parameters,
            ),
            CoachToolName.GET_LATEST_INBODY: (
                "Read the user's latest confirmed InBody measurements, if available.",
                empty_parameters,
            ),
            CoachToolName.GET_CURRENT_PLAN: (
                "Read the user's current workout plan summary.",
                empty_parameters,
            ),
            CoachToolName.GET_TRAINING_HISTORY: (
                "Read the user's five most recent workout sessions.",
                empty_parameters,
            ),
            CoachToolName.GET_ACTIVE_SESSION: (
                "Read the owner's active canonical workout and logged sets. Never guess an ID.",
                empty_parameters,
            ),
            CoachToolName.PREVIEW_SESSION_SUBSTITUTION: (
                "Preview a safe alternative for an authorized active session exercise. "
                "Busy today means session scope; missing gym equipment needs separate "
                "explicit persistent approval. Never approves or changes the workout.",
                PreviewSubstitutionArgs.model_json_schema(),
            ),
            CoachToolName.SEARCH_EXERCISES: (
                "Search exercises by optional query, muscle, and equipment filters.",
                SearchExercisesArgs.model_json_schema(),
            ),
            CoachToolName.GET_EXERCISE_DETAILS: (
                "Read details for one exercise returned by the catalog.",
                ExerciseDetailsArgs.model_json_schema(),
            ),
            CoachToolName.GENERATE_WORKOUT_PLAN: (
                "Generate a deterministic BONYAN workout plan from validated preferences.",
                GeneratePlanRequest.model_json_schema(),
            ),
        }
        return tuple(
            LLMToolDefinition(
                name=name.value,
                description=description,
                parameters=_strict_schema(parameters),
            )
            for name, (description, parameters) in models.items()
        )

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
        if call.name == CoachToolName.GET_PROFILE:
            profile = (
                await self.profile_repository.get(user_id)
                if self.profile_repository is not None
                else None
            )
            return {"profile": _profile_summary(profile) if profile else None}
        if call.name == CoachToolName.GET_LATEST_INBODY:
            latest = (
                await self.inbody_provider.get_latest_inbody(user_id)
                if self.inbody_provider is not None
                else None
            )
            return {"latest_confirmed_inbody": latest}
        if call.name == CoachToolName.GET_CURRENT_PLAN:
            plan = await self.training_service.get_current_plan(user_id=user_id)
            return {"plan": _plan_summary(plan) if plan else None}
        if call.name == CoachToolName.GET_TRAINING_HISTORY:
            sessions = await self.training_service.list_recent_sessions(user_id=user_id, limit=5)
            return {"sessions": [_session_summary(item) for item in sessions]}
        if call.name == CoachToolName.GET_ACTIVE_SESSION:
            sessions = await self.training_service.list_recent_sessions(user_id=user_id, limit=20)
            active = next((item for item in sessions if item.status == "active"), None)
            return {"session": active.model_dump(mode="json") if active else None}
        if call.name == CoachToolName.PREVIEW_SESSION_SUBSTITUTION:
            if self.substitution_service is None:
                raise AppError(
                    "substitution_not_available", "Alternative previews are unavailable.", 503
                )
            args = PreviewSubstitutionArgs.model_validate(call.arguments)
            request = PreviewSessionSubstitution.model_validate(
                args.model_dump(exclude={"session_id"})
            )
            proposal = await self.substitution_service.preview(user_id, args.session_id, request)
            return {"proposal": proposal.model_dump(mode="json"), "requires_approval": True}
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
            # Model output never authorizes activation; the owner reviews the draft in-app.
            args = args.model_copy(update={"activate": False})
            plan = await self.training_service.generate_plan(user_id=user_id, request=args)
            return {"plan": _plan_summary(plan), "requires_approval": True}
        if call.name == CoachToolName.LOG_WORKOUT:
            raise AppError(
                "coach_approval_required", "Log your actual sets using the workout controls.", 409
            )
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


def _profile_summary(profile) -> dict[str, object]:
    return {
        "training_goal": profile.training_goal,
        "experience_level": profile.experience_level,
        "available_training_days": profile.available_training_days,
        "available_equipment": list(profile.available_equipment or []),
        "preferred_language": profile.preferred_language,
        "timezone": profile.timezone,
        "has_training_limitations": bool(
            (getattr(profile, "coaching", None) or {}).get("limitations")
        ),
        "training_limitations": (getattr(profile, "coaching", None) or {}).get("limitations"),
    }


def _session_summary(session) -> dict[str, object]:
    return {
        "id": str(session.id),
        "day_key": session.day_key,
        "status": session.status,
        "logged_set_count": len(session.logged_sets),
        "summary": session.summary,
    }


def _strict_schema(schema: dict[str, object]) -> dict[str, object]:
    return _normalize_schema_node(schema)


def _normalize_schema_node(value):
    if isinstance(value, list):
        return [_normalize_schema_node(item) for item in value]
    if not isinstance(value, dict):
        return value

    normalized = {
        key: _normalize_schema_node(item)
        for key, item in value.items()
        if key not in {"default", "title"}
    }
    if normalized.get("type") == "object":
        normalized["additionalProperties"] = False
        properties = normalized.get("properties")
        if isinstance(properties, dict):
            normalized["required"] = list(properties)
    return normalized
