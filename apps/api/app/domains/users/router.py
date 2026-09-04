from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.account_deletion import AccountDeletionService
from app.core.auth import CurrentUserDep
from app.core.config import Settings, get_settings
from app.core.database import get_db_session
from app.core.passwords import PasswordHasher
from app.core.rate_limit import limit_login, limit_registration
from app.core.storage import PrivateObjectStorage, get_private_object_storage
from app.domains.users.auth_service import AuthService
from app.domains.users.repository import SqlAlchemyAccountRepository, SqlAlchemyProfileRepository
from app.domains.users.schemas import (
    AccessTokenView,
    AuthCredentials,
    ProfileUpdate,
    UserProfileView,
)
from app.domains.users.service import ProfileService

router = APIRouter(tags=["users"])


async def get_profile_service(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ProfileService:
    return ProfileService(SqlAlchemyProfileRepository(session))


ProfileServiceDep = Annotated[ProfileService, Depends(get_profile_service)]


async def get_auth_service(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthService:
    return AuthService(SqlAlchemyAccountRepository(session), PasswordHasher(), settings)


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]


@router.post("/auth/register", response_model=AccessTokenView, status_code=201)
async def register(
    request: AuthCredentials,
    service: AuthServiceDep,
    _: Annotated[None, Depends(limit_registration)],
) -> AccessTokenView:
    return await service.register(request)


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


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(
    current_user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    storage: Annotated[PrivateObjectStorage, Depends(get_private_object_storage)],
) -> Response:
    await AccountDeletionService(session, storage).delete(current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
