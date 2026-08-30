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
from app.core.providers.mocks import MockLLMProvider
from app.domains.inbody.contracts import InBodyTrainingAdapter
from app.domains.inbody.repository import InBodyRepository
from app.domains.training.coach.service import CoachService
from app.domains.training.coach.tools import CoachToolExecutor
from app.domains.training.repository import TrainingRepository
from app.domains.training.schemas import (
    CoachMessageRequest,
    CoachMessageResponse,
    ExerciseMediaAccessResponse,
    GeneratePlanRequest,
    LoggedSetInput,
    SubstituteExerciseRequest,
    WorkoutPlan,
    WorkoutSessionResponse,
)
from app.domains.training.service import TrainingService
from app.integrations.musclewiki.client import MuscleWikiClient
from app.integrations.musclewiki.media import MuscleWikiMediaRelay, MuscleWikiMediaSigner

router = APIRouter(prefix="/training", tags=["training"])


async def get_training_service(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> TrainingService:
    return TrainingService(
        TrainingRepository(session),
        MuscleWikiClient(settings=settings),
        InBodyTrainingAdapter(InBodyRepository(session)),
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


def get_musclewiki_media_relay() -> MuscleWikiMediaRelay:
    return MuscleWikiMediaRelay()


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


@router.get("/exercises/{exercise_id}/media", response_model=ExerciseMediaAccessResponse)
async def get_exercise_media_access(
    exercise_id: str,
    current_user: CurrentUserDep,
    service: TrainingServiceDep,
) -> ExerciseMediaAccessResponse:
    access = await service.get_exercise_media_access(
        user_id=current_user.id, exercise_id=exercise_id
    )
    if access is None:
        raise AppError("musclewiki_media_unavailable", "Exercise media is unavailable.", 404)
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
) -> CoachMessageResponse:
    coach = CoachService(
        llm_provider=MockLLMProvider(settings.chat_model),
        tool_executor=CoachToolExecutor(service),
    )
    return await coach.respond(
        user_id=current_user.id, message=request.message, tool_calls=request.tool_calls
    )
