from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol
from uuid import UUID, uuid4

from sqlalchemy import delete, func, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.community.contracts import ReactionKind
from app.domains.community.models import CommunityPost, PostReaction, PostReport


@dataclass(frozen=True, slots=True)
class ReactionSummary:
    counts: dict[ReactionKind, int]
    viewer_reaction: ReactionKind | None


class CommunityRepository(Protocol):
    async def add_post(self, post: CommunityPost) -> None: ...

    async def get_post(self, post_id: UUID) -> CommunityPost | None: ...

    async def delete_post(self, post: CommunityPost) -> None: ...

    async def list_posts(
        self,
        *,
        before_created_at: datetime | None,
        before_id: UUID | None,
        limit: int,
    ) -> list[CommunityPost]: ...

    async def set_reaction(self, reaction: PostReaction) -> None: ...

    async def remove_reaction(self, post_id: UUID, user_id: str) -> None: ...

    async def reaction_summaries(
        self, post_ids: list[UUID], viewer_id: str
    ) -> dict[UUID, ReactionSummary]: ...

    async def add_report(self, report: PostReport) -> None: ...


class SqlAlchemyCommunityRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add_post(self, post: CommunityPost) -> None:
        self._session.add(post)
        await self._session.flush()

    async def get_post(self, post_id: UUID) -> CommunityPost | None:
        return await self._session.get(CommunityPost, post_id)

    async def delete_post(self, post: CommunityPost) -> None:
        await self._session.delete(post)
        await self._session.flush()

    async def list_posts(
        self,
        *,
        before_created_at: datetime | None,
        before_id: UUID | None,
        limit: int,
    ) -> list[CommunityPost]:
        statement = select(CommunityPost)
        if before_created_at is not None and before_id is not None:
            statement = statement.where(
                or_(
                    CommunityPost.created_at < before_created_at,
                    (
                        (CommunityPost.created_at == before_created_at)
                        & (CommunityPost.id < before_id)
                    ),
                )
            )
        statement = statement.order_by(
            CommunityPost.created_at.desc(), CommunityPost.id.desc()
        ).limit(limit)
        return list((await self._session.scalars(statement)).all())

    async def set_reaction(self, reaction: PostReaction) -> None:
        statement = (
            insert(PostReaction)
            .values(
                id=reaction.id,
                post_id=reaction.post_id,
                user_id=reaction.user_id,
                reaction=reaction.reaction,
                created_at=reaction.created_at,
                updated_at=reaction.updated_at,
            )
            .on_conflict_do_update(
                constraint="uq_post_reaction_post_user",
                set_={"reaction": reaction.reaction, "updated_at": reaction.updated_at},
            )
        )
        await self._session.execute(statement)
        await self._session.flush()

    async def remove_reaction(self, post_id: UUID, user_id: str) -> None:
        await self._session.execute(
            delete(PostReaction).where(
                PostReaction.post_id == post_id,
                PostReaction.user_id == user_id,
            )
        )
        await self._session.flush()

    async def reaction_summaries(
        self, post_ids: list[UUID], viewer_id: str
    ) -> dict[UUID, ReactionSummary]:
        summaries = {
            post_id: ReactionSummary(counts={}, viewer_reaction=None) for post_id in post_ids
        }
        if not post_ids:
            return summaries

        counts_statement = (
            select(PostReaction.post_id, PostReaction.reaction, func.count(PostReaction.id))
            .where(PostReaction.post_id.in_(post_ids))
            .group_by(PostReaction.post_id, PostReaction.reaction)
        )
        for post_id, reaction, count in (await self._session.execute(counts_statement)).all():
            current = summaries[post_id]
            summaries[post_id] = ReactionSummary(
                counts={**current.counts, reaction: count},
                viewer_reaction=current.viewer_reaction,
            )

        viewer_statement = select(PostReaction.post_id, PostReaction.reaction).where(
            PostReaction.post_id.in_(post_ids),
            PostReaction.user_id == viewer_id,
        )
        for post_id, reaction in (await self._session.execute(viewer_statement)).all():
            current = summaries[post_id]
            summaries[post_id] = ReactionSummary(
                counts=current.counts,
                viewer_reaction=reaction,
            )
        return summaries

    async def add_report(self, report: PostReport) -> None:
        statement = (
            insert(PostReport)
            .values(
                id=report.id or uuid4(),
                post_id=report.post_id,
                reporter_id=report.reporter_id,
                reason=report.reason,
                note=report.note,
                status=report.status,
                created_at=report.created_at,
            )
            .on_conflict_do_nothing(constraint="uq_post_report_post_reporter")
        )
        await self._session.execute(statement)
        await self._session.flush()
