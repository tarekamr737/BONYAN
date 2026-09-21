from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.account_deletion import AccountDeletionService
from app.core.assessment_integration import AssessmentService
from app.core.auth import CurrentUserDep
from app.core.config import Settings, get_settings
from app.core.database import get_db_session
from app.core.passwords import PasswordHasher
from app.core.profile_integration import ConnectedProfileRepository
from app.core.rate_limit import limit_avatar, limit_login, limit_registration
from app.core.storage import PrivateObjectStorage, get_private_object_storage
from app.domains.users.auth_service import AuthService
from app.domains.users.coaching_schemas import AssessmentOverview, AssessmentRequest, HistoryView
from app.domains.users.profile_photo import PROFILE_PHOTO_UPLOAD_LIMIT, ProfilePhotoService
from app.domains.users.repository import SqlAlchemyAccountRepository
from app.domains.users.schemas import (
    AccessTokenView,
    AuthCredentials,
    EmailRegistrationStarted,
    EmailVerificationRequest,
    GoogleTokenRequest,
    ProfileUpdate,
    UserProfileView,
)
from app.domains.users.service import ProfileService

router = APIRouter(tags=["users"])


async def get_profile_service(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ProfileService:
    return ProfileService(ConnectedProfileRepository(session))


ProfileServiceDep = Annotated[ProfileService, Depends(get_profile_service)]


async def get_auth_service(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthService:
    return AuthService(SqlAlchemyAccountRepository(session), PasswordHasher(), settings)


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]


@router.post("/auth/register", response_model=EmailRegistrationStarted, status_code=202)
async def register(
    request: AuthCredentials,
    service: AuthServiceDep,
    _: Annotated[None, Depends(limit_registration)],
) -> EmailRegistrationStarted:
    return await service.start_email_registration(request)


@router.post("/auth/verify-email", response_model=AccessTokenView, status_code=201)
async def verify_email(
    request: EmailVerificationRequest,
    service: AuthServiceDep,
    _: Annotated[None, Depends(limit_login)],
) -> AccessTokenView:
    return await service.verify_email_registration(request)


@router.post("/auth/google", response_model=AccessTokenView)
async def google_login(
    request: GoogleTokenRequest,
    service: AuthServiceDep,
    _: Annotated[None, Depends(limit_login)],
) -> AccessTokenView:
    return await service.login_with_google(request)


@router.post("/auth/login", response_model=AccessTokenView)
async def login(
    request: AuthCredentials,
    service: AuthServiceDep,
    _: Annotated[None, Depends(limit_login)],
) -> AccessTokenView:
    return await service.login(request)


@router.get("/me", response_model=UserProfileView)
async def get_me(current_user: CurrentUserDep, service: ProfileServiceDep) -> UserProfileView:
    return await service.get(current_user.id)


@router.patch("/me", response_model=UserProfileView)
async def update_me(
    request: ProfileUpdate,
    current_user: CurrentUserDep,
    service: ProfileServiceDep,
) -> UserProfileView:
    return await service.update(current_user.id, request)


@router.put("/me/photo", response_model=UserProfileView)
async def upload_profile_photo(
    photo: Annotated[UploadFile, File()],
    current_user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    storage: Annotated[PrivateObjectStorage, Depends(get_private_object_storage)],
    _: Annotated[None, Depends(limit_avatar)],
) -> UserProfileView:
    content = await photo.read(PROFILE_PHOTO_UPLOAD_LIMIT)
    return await ProfilePhotoService(session, storage).save(
        current_user.id,
        content,
        photo.content_type or "application/octet-stream",
    )


@router.get("/me/photo")
async def get_profile_photo(
    current_user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    storage: Annotated[PrivateObjectStorage, Depends(get_private_object_storage)],
) -> Response:
    photo = await ProfilePhotoService(session, storage).read(current_user.id)
    return Response(
        content=photo.content,
        media_type=photo.media_type,
        headers={
            "Cache-Control": "private, max-age=300",
            "Last-Modified": photo.updated_at.strftime("%a, %d %b %Y %H:%M:%S GMT"),
        },
    )


@router.delete("/me/photo", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile_photo(
    current_user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    storage: Annotated[PrivateObjectStorage, Depends(get_private_object_storage)],
) -> Response:
    await ProfilePhotoService(session, storage).delete(current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(
    current_user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    storage: Annotated[PrivateObjectStorage, Depends(get_private_object_storage)],
) -> Response:
    await AccountDeletionService(session, storage).delete(current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me/assessment", response_model=AssessmentOverview)
async def assessment_overview(
    current_user: CurrentUserDep, session: Annotated[AsyncSession, Depends(get_db_session)]
) -> AssessmentOverview:
    return await AssessmentService(session).overview(current_user.id)


@router.get("/me/history", response_model=list[HistoryView])
async def assessment_history(
    current_user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 30,
) -> list[HistoryView]:
    return await AssessmentService(session).history(current_user.id, offset, limit)


@router.get("/me/history/{record_id}", response_model=HistoryView)
async def assessment_detail(
    record_id: UUID,
    current_user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> HistoryView:
    return await AssessmentService(session).detail(current_user.id, record_id)


@router.post("/me/assessments", response_model=HistoryView, status_code=201)
async def save_assessment(
    request: AssessmentRequest,
    current_user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> HistoryView:
    return await AssessmentService(session).save(current_user.id, request)
