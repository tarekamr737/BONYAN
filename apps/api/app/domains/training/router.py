from __future__ import annotations

import asyncio
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUserDep
from app.core.config import Settings, get_settings
from app.core.database import get_db_session
from app.core.errors import AppError
from app.core.providers.contracts import LLMProvider
from app.core.providers.mocks import MockLLMProvider
from app.core.rate_limit import limit_coach, limit_media_token
from app.core.time import local_day_bounds
from app.domains.inbody.contracts import InBodyTrainingAdapter
from app.domains.inbody.repository import InBodyRepository
from app.domains.nutrition.repository import NutritionRepository
from app.domains.training.coach.service import CoachService
from app.domains.training.coach.tools import CoachToolExecutor
from app.domains.training.repository import TrainingRepository
from app.domains.training.schemas import (
    CoachMessageRequest,
    CoachMessageResponse,
    CoachMessageView,
    ExerciseMediaAccessResponse,
    ExerciseSearchItem,
    ExerciseSearchResponse,
    GeneratePlanRequest,
    LoggedSetInput,
    ManualPlanRequest,
    SubstituteExerciseRequest,
    WorkoutPlan,
    WorkoutSessionResponse,
)
from app.domains.training.service import TrainingService
from app.domains.users.repository import SqlAlchemyProfileRepository
from app.integrations.exercisedb.client import ExerciseDbClient
from app.integrations.exercises.provider import ExerciseProvider, ExerciseSearchFilters
from app.integrations.llm.production import ProductionLLMProvider
from app.integrations.musclewiki.client import MuscleWikiClient
from app.integrations.musclewiki.media import MuscleWikiMediaRelay, MuscleWikiMediaSigner

router = APIRouter(prefix="/training", tags=["training"])


def get_exercise_provider(settings: Settings) -> ExerciseProvider:
    if settings.exercise_provider == "exercisedb":
        return ExerciseDbClient(base_url=settings.exercisedb_base_url)
    return MuscleWikiClient(settings=settings)


async def get_training_service(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> TrainingService:
    return TrainingService(
        TrainingRepository(session),
        get_exercise_provider(settings),
        InBodyTrainingAdapter(InBodyRepository(session)),
        SqlAlchemyProfileRepository(session),
    )


TrainingServiceDep = Annotated[TrainingService, Depends(get_training_service)]


def get_musclewiki_media_signer(
    settings: Annotated[Settings, Depends(get_settings)],
) -> MuscleWikiMediaSigner:
    secret = (
        settings.auth_jwt_secret.get_secret_value().encode("utf-8")
        if settings.auth_jwt_secret
        else b"development-musclewiki-media-secret"
    )
    return MuscleWikiMediaSigner(secret)


def get_musclewiki_media_relay(
    settings: Annotated[Settings, Depends(get_settings)],
) -> MuscleWikiMediaRelay:
    api_key = settings.musclewiki_api_key
    return MuscleWikiMediaRelay(api_key.get_secret_value() if api_key else None)


def get_llm_provider(settings: Settings) -> LLMProvider:
    if settings.chat_provider == "mock":
        return MockLLMProvider(settings.chat_model)
    api_key = settings.chat_api_key
    if api_key is None:
        raise RuntimeError("CHAT_API_KEY validation did not run")
    return ProductionLLMProvider(
        provider=settings.chat_provider,
        api_key=api_key.get_secret_value(),
        model=settings.chat_model,
        base_url=settings.chat_base_url,
        timeout_seconds=settings.chat_timeout_seconds,
    )


@router.post("/plans", response_model=WorkoutPlan, status_code=status.HTTP_201_CREATED)
async def generate_plan(
    request: GeneratePlanRequest,
    current_user: CurrentUserDep,
    service: TrainingServiceDep,
) -> WorkoutPlan:
    return await service.generate_plan(user_id=current_user.id, request=request)


@router.get("/plans/current", response_model=WorkoutPlan | None)
async def get_current_plan(
    current_user: CurrentUserDep, service: TrainingServiceDep
) -> WorkoutPlan | None:
    return await service.get_current_plan(user_id=current_user.id)


@router.get("/plans/{plan_id}", response_model=WorkoutPlan)
async def get_plan(
    plan_id: UUID, current_user: CurrentUserDep, service: TrainingServiceDep
) -> WorkoutPlan:
    return await service.get_plan(user_id=current_user.id, plan_id=plan_id)


@router.post("/plans/{plan_id}/activate", response_model=WorkoutPlan)
async def activate_plan(
    plan_id: UUID, current_user: CurrentUserDep, service: TrainingServiceDep
) -> WorkoutPlan:
    return await service.activate_plan(user_id=current_user.id, plan_id=plan_id)


@router.get("/sessions/{session_id}", response_model=WorkoutSessionResponse)
async def get_session(
    session_id: UUID, current_user: CurrentUserDep, service: TrainingServiceDep
) -> WorkoutSessionResponse:
    return await service.get_session(user_id=current_user.id, session_id=session_id)


@router.get("/sessions", response_model=list[WorkoutSessionResponse])
async def list_sessions(
    current_user: CurrentUserDep,
    service: TrainingServiceDep,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
) -> list[WorkoutSessionResponse]:
    return await service.list_recent_sessions(user_id=current_user.id, limit=limit)


@router.post("/plans/manual", response_model=WorkoutPlan, status_code=status.HTTP_201_CREATED)
async def create_manual_plan(
    request: ManualPlanRequest,
    current_user: CurrentUserDep,
    service: TrainingServiceDep,
) -> WorkoutPlan:
    return await service.create_manual_plan(user_id=current_user.id, request=request)


@router.get("/exercises", response_model=ExerciseSearchResponse)
async def search_exercises(
    current_user: CurrentUserDep,
    service: TrainingServiceDep,
    query: Annotated[str | None, Query(min_length=1, max_length=80)] = None,
    page: Annotated[int, Query(ge=1, le=20)] = 1,
    page_size: Annotated[int, Query(ge=1, le=40)] = 20,
) -> ExerciseSearchResponse:
    del current_user
    result = await service.search_exercises(
        ExerciseSearchFilters(query=query), page=page, page_size=page_size
    )
    return ExerciseSearchResponse(
        items=[
            ExerciseSearchItem(
                id=item.id,
                name=item.name,
                muscles=list(item.muscles),
                equipment=list(item.equipment),
                difficulty=item.difficulty,
            )
            for item in result.items
        ],
        page=result.page,
        page_size=result.page_size,
        total=result.total,
        next_page=result.next_page,
    )


@router.post(
    "/sessions", response_model=WorkoutSessionResponse, status_code=status.HTTP_201_CREATED
)
async def start_session(
    plan_id: UUID,
    day_key: Annotated[str, Query(min_length=1, max_length=80)],
    current_user: CurrentUserDep,
    service: TrainingServiceDep,
) -> WorkoutSessionResponse:
    return await service.start_session(user_id=current_user.id, plan_id=plan_id, day_key=day_key)


@router.post("/sessions/{session_id}/sets", response_model=WorkoutSessionResponse)
async def log_set(
    session_id: UUID,
    logged_set: LoggedSetInput,
    current_user: CurrentUserDep,
    service: TrainingServiceDep,
) -> WorkoutSessionResponse:
    return await service.log_set(
        user_id=current_user.id, session_id=session_id, logged_set=logged_set
    )


@router.delete("/sessions/{session_id}/sets", response_model=WorkoutSessionResponse)
async def remove_set(
    session_id: UUID,
    prescription_index: Annotated[int, Query(ge=0, le=20)],
    set_number: Annotated[int, Query(ge=1, le=12)],
    current_user: CurrentUserDep,
    service: TrainingServiceDep,
) -> WorkoutSessionResponse:
    return await service.remove_set(
        user_id=current_user.id,
        session_id=session_id,
        prescription_index=prescription_index,
        set_number=set_number,
    )


@router.post("/sessions/{session_id}/complete", response_model=WorkoutSessionResponse)
async def complete_session(
    session_id: UUID,
    current_user: CurrentUserDep,
    service: TrainingServiceDep,
) -> WorkoutSessionResponse:
    return await service.complete_session(user_id=current_user.id, session_id=session_id)


@router.post("/substitutions", response_model=WorkoutPlan)
async def substitute_exercise(
    request: SubstituteExerciseRequest,
    current_user: CurrentUserDep,
    service: TrainingServiceDep,
) -> WorkoutPlan:
    return await service.substitute(user_id=current_user.id, request=request)


@router.post("/substitutions/preview", response_model=WorkoutPlan)
async def preview_substitution(
    request: SubstituteExerciseRequest,
    current_user: CurrentUserDep,
    service: TrainingServiceDep,
) -> WorkoutPlan:
    return await service.substitute(user_id=current_user.id, request=request, preview=True)


@router.get("/exercises/{exercise_id}/media", response_model=ExerciseMediaAccessResponse)
async def get_exercise_media_access(
    exercise_id: str,
    current_user: CurrentUserDep,
    service: TrainingServiceDep,
    _: Annotated[None, Depends(limit_media_token)],
) -> ExerciseMediaAccessResponse:
    access = await service.get_exercise_media_access(
        user_id=current_user.id, exercise_id=exercise_id
    )
    if access is None:
        raise AppError("exercise_media_unavailable", "Exercise media is unavailable.", 404)
    return ExerciseMediaAccessResponse(url=access.url, expires_at=access.expires_at)


@router.get("/media", include_in_schema=False)
async def read_exercise_media(
    token: Annotated[str, Query(min_length=1)],
    current_user: CurrentUserDep,
    signer: Annotated[MuscleWikiMediaSigner, Depends(get_musclewiki_media_signer)],
    relay: Annotated[MuscleWikiMediaRelay, Depends(get_musclewiki_media_relay)],
    range_header: Annotated[str | None, Header(alias="Range")] = None,
) -> StreamingResponse:
    verified = signer.verify(token, user_id=current_user.id)
    upstream = await asyncio.to_thread(relay.open, verified.provider_url, range_header=range_header)
    return StreamingResponse(
        upstream.body,
        status_code=upstream.status_code,
        headers=upstream.headers,
    )


@router.post("/coach", response_model=CoachMessageResponse)
async def coach_message(
    request: CoachMessageRequest,
    current_user: CurrentUserDep,
    service: TrainingServiceDep,
    settings: Annotated[Settings, Depends(get_settings)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    _: Annotated[None, Depends(limit_coach)],
) -> CoachMessageResponse:
    profile_repository = SqlAlchemyProfileRepository(session)
    inbody_provider = InBodyTrainingAdapter(InBodyRepository(session))
    profile = await profile_repository.get(current_user.id)
    nutrition = NutritionRepository(session)
    start, end, _ = local_day_bounds(profile.timezone if profile else "UTC")
    foods = await nutrition.list_food_between(
        owner_id=current_user.id, start=start, end=end
    )
    repository = TrainingRepository(session)
    history = await repository.list_coach_messages(owner_id=current_user.id, limit=12)
    user_context = {
        "goal": profile.training_goal if profile else None,
        "experience": profile.experience_level if profile else None,
        "available_training_days": profile.available_training_days if profile else None,
        "available_equipment": profile.available_equipment if profile else [],
        "has_training_limitations": (
            bool((profile.coaching or {}).get("limitations")) if profile else False
        ),
        "today_nutrition": {
            "meals_logged": len(foods),
            "calories": sum(item.calories for item in foods),
            "protein_g": round(sum(float(item.protein_g) for item in foods), 1),
        },
        "recent_conversation": [
            {"role": item.role, "content": item.content} for item in history
        ],
    }
    coach = CoachService(
        llm_provider=get_llm_provider(settings),
        tool_executor=CoachToolExecutor(
            service,
            profile_repository=profile_repository,
            inbody_provider=inbody_provider,
        ),
    )
    response = await coach.respond(
        user_id=current_user.id, message=request.message, user_context=user_context
    )
    await repository.add_coach_message(
        owner_id=current_user.id, role="user", content=request.message
    )
    await repository.add_coach_message(
        owner_id=current_user.id,
        role="coach",
        content=response.response,
        model=response.model,
    )
    return response


@router.get("/coach/messages", response_model=list[CoachMessageView])
async def coach_messages(
    current_user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[CoachMessageView]:
    records = await TrainingRepository(session).list_coach_messages(
        owner_id=current_user.id, limit=limit
    )
    return [CoachMessageView.model_validate(item) for item in records]
