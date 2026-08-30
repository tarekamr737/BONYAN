from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUserDep
from app.core.database import get_db_session
from app.domains.users.repository import SqlAlchemyProfileRepository
from app.domains.users.schemas import ProfileUpdate, UserProfileView
from app.domains.users.service import ProfileService

router = APIRouter(tags=["users"])


async def get_profile_service(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ProfileService:
    return ProfileService(SqlAlchemyProfileRepository(session))


ProfileServiceDep = Annotated[ProfileService, Depends(get_profile_service)]


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
