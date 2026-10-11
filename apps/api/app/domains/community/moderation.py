from datetime import UTC, datetime
from typing import Annotated, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUserDep
from app.core.config import Settings, get_settings
from app.core.database import get_db_session
from app.core.errors import AppError
from app.domains.community.contracts import ReportStatus
from app.domains.community.models import CommunityPost, ModerationAudit, PostReport


class DecisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    decision: Literal["hide", "dismiss", "restore"]


class ReportView(BaseModel):
    id: UUID
    post_id: UUID
    caption: str
    reason: str
    note: str | None
    created_at: datetime


class ModerationPage(BaseModel):
    items: list[ReportView]
    next_cursor: UUID | None


class ModerationRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def pending(self, before: UUID | None, limit: int):
        query = (
            select(PostReport, CommunityPost.caption)
            .join(CommunityPost)
            .where(PostReport.status == ReportStatus.PENDING)
        )
        if before:
            previous = await self.session.get(PostReport, before)
            if previous is None:
                raise AppError("invalid_cursor", "This report cursor is unavailable.", 400)
            query = query.where(
                (PostReport.created_at < previous.created_at)
                | ((PostReport.created_at == previous.created_at) & (PostReport.id < previous.id))
            )
        return (
            await self.session.execute(
                query.order_by(PostReport.created_at.desc(), PostReport.id.desc()).limit(limit)
            )
        ).all()

    async def locked(self, id: UUID):
        report = await self.session.scalar(
            select(PostReport).where(PostReport.id == id).with_for_update()
        )
        post = (
            await self.session.scalar(
                select(CommunityPost).where(CommunityPost.id == report.post_id).with_for_update()
            )
            if report
            else None
        )
        return report, post


class ModerationService:
    def __init__(self, repository: ModerationRepository, moderators: str):
        self.repository = repository
        self.moderators = {value.strip() for value in moderators.split(",") if value.strip()}

    def authorized(self, user: str):
        if user not in self.moderators:
            raise AppError("forbidden", "Moderator access is required.", 403)

    async def pending(self, user: str, before: UUID | None, limit: int):
        self.authorized(user)
        rows = await self.repository.pending(before, limit + 1)
        return ModerationPage(
            items=[
                ReportView(
                    id=report.id,
                    post_id=report.post_id,
                    caption=caption,
                    reason=report.reason,
                    note=report.note,
                    created_at=report.created_at,
                )
                for report, caption in rows[:limit]
            ],
            next_cursor=rows[limit - 1][0].id if len(rows) > limit else None,
        )

    async def decide(self, user: str, id: UUID, decision: str):
        self.authorized(user)
        report, post = await self.repository.locked(id)
        if report is None or post is None:
            raise AppError("not_found", "This report is unavailable.", 404)
        hidden = decision == "hide"
        if report.status == ReportStatus.REVIEWED and (
            decision == "dismiss" or post.moderation_hidden == hidden
        ):
            return
        report.status = ReportStatus.REVIEWED
        if decision != "dismiss":
            post.moderation_hidden = hidden
        self.repository.session.add(
            ModerationAudit(
                id=uuid4(),
                report_id=report.id,
                post_id=post.id,
                post_owner_id=post.owner_id,
                moderator_id=user,
                decision=decision,
                created_at=datetime.now(UTC),
            )
        )
        await self.repository.session.flush()


router = APIRouter(prefix="/community/moderation", tags=["community-moderation"])
DB = Annotated[AsyncSession, Depends(get_db_session)]
Config = Annotated[Settings, Depends(get_settings)]


@router.get("/role")
async def role(user: CurrentUserDep, config: Config):
    return {
        "can_moderate": user.id in {value.strip() for value in config.moderator_user_ids.split(",")}
    }


@router.get("/reports", response_model=ModerationPage)
async def reports(
    user: CurrentUserDep,
    db: DB,
    config: Config,
    before: UUID | None = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
):
    return await ModerationService(ModerationRepository(db), config.moderator_user_ids).pending(
        user.id, before, limit
    )


@router.post("/reports/{id}/decision")
async def decision(
    id: UUID, request: DecisionRequest, user: CurrentUserDep, db: DB, config: Config
):
    await ModerationService(ModerationRepository(db), config.moderator_user_ids).decide(
        user.id, id, request.decision
    )
    await db.commit()
    return {"saved": True}
