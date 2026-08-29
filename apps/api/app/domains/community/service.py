from __future__ import annotations

import base64
import binascii
from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.core.errors import AppError
from app.domains.avatar.contracts import AvatarIdentityReader
from app.domains.community.contracts import (
    CommunityActor,
    ReactionKind,
    ReportStatus,
)
from app.domains.community.models import CommunityPost, PostReaction, PostReport
from app.domains.community.repository import CommunityRepository, ReactionSummary
from app.domains.community.schemas import (
    CommunityFeedView,
    CommunityPostView,
    CreatePostRequest,
    PostAuthorView,
    ReactionSummaryView,
    ReportPostRequest,
)


class CommunityService:
    def __init__(
        self,
        repository: CommunityRepository,
        avatar_reader: AvatarIdentityReader,
    ) -> None:
        self._repository = repository
        self._avatar_reader = avatar_reader

    async def create_post(
        self, actor: CommunityActor, request: CreatePostRequest
    ) -> CommunityPostView:
        if request.avatar_id is not None:
            identity = await self._avatar_reader.get_community_identity(
                actor.user_id, request.avatar_id
            )
            if identity is None:
                raise AppError(
                    code="avatar_not_available",
                    message="Choose an approved avatar that is enabled for community use.",
                    status_code=409,
                )

        now = datetime.now(UTC)
        post = CommunityPost(
            id=uuid4(),
            owner_id=actor.user_id,
            author_display_name=actor.display_name,
            post_type=request.post_type,
            caption=request.caption,
            avatar_id=request.avatar_id,
            created_at=now,
            updated_at=now,
        )
        await self._repository.add_post(post)
        return await self._to_view(
            post,
            actor.user_id,
            ReactionSummary(counts={}, viewer_reaction=None),
        )

    async def feed(
        self, actor: CommunityActor, *, cursor: str | None, limit: int
    ) -> CommunityFeedView:
        before_created_at, before_id = self._decode_cursor(cursor)
        posts = await self._repository.list_posts(
            before_created_at=before_created_at,
            before_id=before_id,
            limit=limit + 1,
        )
        has_more = len(posts) > limit
        visible_posts = posts[:limit]
        summaries = await self._repository.reaction_summaries(
            [post.id for post in visible_posts], actor.user_id
        )
        items = [
            await self._to_view(
                post,
                actor.user_id,
                summaries.get(
                    post.id, ReactionSummary(counts={}, viewer_reaction=None)
                ),
            )
            for post in visible_posts
        ]
        next_cursor = None
        if has_more and visible_posts:
            last = visible_posts[-1]
            next_cursor = self._encode_cursor(last.created_at, last.id)
        return CommunityFeedView(items=items, next_cursor=next_cursor)

    async def delete_post(self, actor: CommunityActor, post_id: UUID) -> None:
        post = await self._require_post(post_id)
        if post.owner_id != actor.user_id:
            raise AppError(
                code="post_delete_forbidden",
                message="You can only delete your own posts.",
                status_code=403,
            )
        await self._repository.delete_post(post)

    async def set_reaction(
        self, actor: CommunityActor, post_id: UUID, reaction: ReactionKind
    ) -> ReactionSummaryView:
        await self._require_post(post_id)
        now = datetime.now(UTC)
        await self._repository.set_reaction(
            PostReaction(
                id=uuid4(),
                post_id=post_id,
                user_id=actor.user_id,
                reaction=reaction,
                created_at=now,
                updated_at=now,
            )
        )
        return await self._reaction_view(post_id, actor.user_id)

    async def remove_reaction(
        self, actor: CommunityActor, post_id: UUID
    ) -> ReactionSummaryView:
        await self._require_post(post_id)
        await self._repository.remove_reaction(post_id, actor.user_id)
        return await self._reaction_view(post_id, actor.user_id)

    async def report_post(
        self, actor: CommunityActor, post_id: UUID, request: ReportPostRequest
    ) -> None:
        await self._require_post(post_id)
        await self._repository.add_report(
            PostReport(
                id=uuid4(),
                post_id=post_id,
                reporter_id=actor.user_id,
                reason=request.reason,
                note=request.note,
                status=ReportStatus.PENDING,
                created_at=datetime.now(UTC),
            )
        )

    async def _reaction_view(self, post_id: UUID, viewer_id: str) -> ReactionSummaryView:
        summary = (
            await self._repository.reaction_summaries([post_id], viewer_id)
        ).get(post_id, ReactionSummary(counts={}, viewer_reaction=None))
        return ReactionSummaryView(
            counts=summary.counts,
            viewer_reaction=summary.viewer_reaction,
        )

    async def _require_post(self, post_id: UUID) -> CommunityPost:
        post = await self._repository.get_post(post_id)
        if post is None:
            raise AppError(
                code="community_post_not_found",
                message="Community post not found.",
                status_code=404,
            )
        return post

    async def _to_view(
        self,
        post: CommunityPost,
        viewer_id: str,
        reactions: ReactionSummary,
    ) -> CommunityPostView:
        avatar_url = None
        if post.avatar_id is not None:
            identity = await self._avatar_reader.get_community_identity(
                post.owner_id, post.avatar_id
            )
            avatar_url = identity.image_url if identity else None
        return CommunityPostView(
            id=post.id,
            post_type=post.post_type,
            caption=post.caption,
            author=PostAuthorView(
                display_name=post.author_display_name,
                avatar_url=avatar_url,
            ),
            reactions=ReactionSummaryView(
                counts=reactions.counts,
                viewer_reaction=reactions.viewer_reaction,
            ),
            created_at=post.created_at,
            can_delete=post.owner_id == viewer_id,
        )

    @staticmethod
    def _encode_cursor(created_at: datetime, post_id: UUID) -> str:
        raw = f"{created_at.isoformat()}|{post_id}".encode()
        return base64.urlsafe_b64encode(raw).decode().rstrip("=")

    @staticmethod
    def _decode_cursor(cursor: str | None) -> tuple[datetime | None, UUID | None]:
        if cursor is None:
            return None, None
        try:
            padded = cursor + "=" * (-len(cursor) % 4)
            timestamp, post_id = base64.urlsafe_b64decode(padded).decode().split("|", 1)
            created_at = datetime.fromisoformat(timestamp)
            if created_at.tzinfo is None:
                raise ValueError("cursor timestamp must include a timezone")
            return created_at, UUID(post_id)
        except (binascii.Error, ValueError, UnicodeDecodeError) as exc:
            raise AppError(
                code="invalid_feed_cursor",
                message="The feed cursor is invalid.",
                status_code=400,
            ) from exc
