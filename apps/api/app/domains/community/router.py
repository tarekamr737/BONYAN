from collections.abc import Callable
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status

from app.domains.community.contracts import CommunityActor
from app.domains.community.schemas import (
    CommunityFeedView,
    CommunityPostView,
    CreatePostRequest,
    ReactionRequest,
    ReactionSummaryView,
    ReportAcceptedView,
    ReportPostRequest,
)
from app.domains.community.service import CommunityService


def create_community_router(
    service: CommunityService,
    get_current_actor: Callable[..., Any],
) -> APIRouter:
    router = APIRouter(prefix="/community", tags=["community"])
    CurrentActor = Annotated[CommunityActor, Depends(get_current_actor)]

    @router.get("/feed", response_model=CommunityFeedView)
    async def get_feed(
        actor: CurrentActor,
        cursor: str | None = None,
        limit: int = Query(default=20, ge=1, le=50),
    ) -> CommunityFeedView:
        return await service.feed(actor, cursor=cursor, limit=limit)

    @router.post(
        "/posts", response_model=CommunityPostView, status_code=status.HTTP_201_CREATED
    )
    async def create_post(
        payload: CreatePostRequest,
        actor: CurrentActor,
    ) -> CommunityPostView:
        return await service.create_post(actor, payload)

    @router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
    async def delete_post(
        post_id: UUID,
        actor: CurrentActor,
    ) -> Response:
        await service.delete_post(actor, post_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    @router.post("/posts/{post_id}/reactions", response_model=ReactionSummaryView)
    async def set_reaction(
        post_id: UUID,
        payload: ReactionRequest,
        actor: CurrentActor,
    ) -> ReactionSummaryView:
        return await service.set_reaction(actor, post_id, payload.reaction)

    @router.delete("/posts/{post_id}/reactions", response_model=ReactionSummaryView)
    async def remove_reaction(
        post_id: UUID,
        actor: CurrentActor,
    ) -> ReactionSummaryView:
        return await service.remove_reaction(actor, post_id)

    @router.post(
        "/posts/{post_id}/reports",
        response_model=ReportAcceptedView,
        status_code=status.HTTP_202_ACCEPTED,
    )
    async def report_post(
        post_id: UUID,
        payload: ReportPostRequest,
        actor: CurrentActor,
    ) -> ReportAcceptedView:
        await service.report_post(actor, post_id, payload)
        return ReportAcceptedView()

    return router
