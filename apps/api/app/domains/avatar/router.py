from collections.abc import Callable
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, Response, status

from app.domains.avatar.contracts import BodyAvatarPresentation
from app.domains.avatar.schemas import (
    AvatarListView,
    AvatarMeasurementStatusView,
    AvatarPublicationRequest,
    AvatarView,
    CreateAvatarRequest,
    ManualBodyMeasurementsRequest,
)
from app.domains.avatar.service import AvatarService


def create_avatar_router(
    service: AvatarService,
    get_current_user_id: Callable[..., Any],
) -> APIRouter:
    router = APIRouter(prefix="/avatars", tags=["avatars"])
    CurrentUserId = Annotated[str, Depends(get_current_user_id)]

    @router.get("", response_model=AvatarListView)
    async def list_avatars(user_id: CurrentUserId) -> AvatarListView:
        return await service.list_owned(user_id)

    @router.post("", response_model=AvatarView, status_code=status.HTTP_201_CREATED)
    async def create_avatar(
        payload: CreateAvatarRequest, user_id: CurrentUserId
    ) -> AvatarView:
        return await service.create(user_id, payload)

    @router.get("/measurement-status", response_model=AvatarMeasurementStatusView)
    async def get_measurement_status(
        user_id: CurrentUserId,
        presentation: BodyAvatarPresentation = BodyAvatarPresentation.MEN,
    ) -> AvatarMeasurementStatusView:
        return await service.measurement_status(user_id, presentation)

    @router.put("/manual-measurements", status_code=status.HTTP_204_NO_CONTENT)
    async def save_manual_measurements(
        payload: ManualBodyMeasurementsRequest, user_id: CurrentUserId
    ) -> Response:
        await service.save_manual_measurements(user_id, payload)
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    @router.get("/{avatar_id}", response_model=AvatarView)
    async def get_avatar(
        avatar_id: UUID, user_id: CurrentUserId
    ) -> AvatarView:
        return await service.get(user_id, avatar_id)

    @router.post("/{avatar_id}/approve", response_model=AvatarView)
    async def approve_avatar(
        avatar_id: UUID, user_id: CurrentUserId
    ) -> AvatarView:
        return await service.approve(user_id, avatar_id)

    @router.post("/{avatar_id}/reject", response_model=AvatarView)
    async def reject_avatar(
        avatar_id: UUID, user_id: CurrentUserId
    ) -> AvatarView:
        return await service.reject(user_id, avatar_id)

    @router.post("/{avatar_id}/regenerate", response_model=AvatarView)
    async def regenerate_avatar(
        avatar_id: UUID, user_id: CurrentUserId
    ) -> AvatarView:
        return await service.regenerate(user_id, avatar_id)

    @router.put("/{avatar_id}/community-use", response_model=AvatarView)
    async def set_community_use(
        avatar_id: UUID,
        payload: AvatarPublicationRequest,
        user_id: CurrentUserId,
    ) -> AvatarView:
        return await service.set_public_use(user_id, avatar_id, enabled=payload.enabled)

    @router.delete("/{avatar_id}", status_code=status.HTTP_204_NO_CONTENT)
    async def delete_avatar(
        avatar_id: UUID, user_id: CurrentUserId
    ) -> Response:
        await service.delete(user_id, avatar_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    return router
