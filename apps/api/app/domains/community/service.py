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
from app.domains.users.privacy import PrivacyRepository


class CommunityService:
    def __init__(
        self,
        repository: CommunityRepository,
        avatar_reader: AvatarIdentityReader,
        *,
        privacy: PrivacyRepository | None = None,
    ) -> None:
        self._repository = repository
        self._avatar_reader = avatar_reader
        self._privacy = privacy

    async def create_post(
        self, actor: CommunityActor, request: CreatePostRequest
    ) -> CommunityPostView:
        avatar_url = None
        if self._privacy:
            # The owner's explicit publish action authorizes this post; revocation hides all.
            await self._privacy.update(actor.user_id, {"posts": True})
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
            avatar_url = identity.image_url

        now = datetime.now(UTC)
        post = CommunityPost(
            id=uuid4(),
            owner_id=actor.user_id,
            author_display_name=actor.display_name,
            post_type=request.post_type,
            caption=request.caption,
            sharing_confirmed=True,
            avatar_id=request.avatar_id,
            created_at=now,
            updated_at=now,
        )
        await self._repository.add_post(post)
        return self._to_view(
            post,
            actor.user_id,
            ReactionSummary(counts={}, viewer_reaction=None),
            avatar_url=avatar_url,
        )

    async def feed(
        self, actor: CommunityActor, *, cursor: str | None, limit: int
    ) -> CommunityFeedView:
        before_created_at, before_id = self._decode_cursor(cursor)
        posts = await self._repository.list_posts(
            before_created_at=before_created_at,
            before_id=before_id,
            limit=limit + 1,
            **({"viewer_id": actor.user_id} if self._privacy else {}),
        )
        has_more = len(posts) > limit
        visible_posts = posts[:limit]
        summaries = await self._repository.reaction_summaries(
            [post.id for post in visible_posts], actor.user_id
        )
        avatar_references = [
            (post.owner_id, post.avatar_id) for post in visible_posts if post.avatar_id is not None
        ]
        identities = await self._avatar_reader.get_community_identities(avatar_references)
        public_names = {}
        if self._privacy:
            for owner in {post.owner_id for post in visible_posts}:
                public_names[owner] = (await self._privacy.get(owner)).display_name
        items = [
            self._to_view(
                post,
                actor.user_id,
                summaries.get(post.id, ReactionSummary(counts={}, viewer_reaction=None)),
                avatar_url=(
                    identities[(post.owner_id, post.avatar_id)].image_url
                    if post.avatar_id is not None and (post.owner_id, post.avatar_id) in identities
                    else None
                ),
                author_name="BONYAN member"
                if self._privacy and not public_names.get(post.owner_id)
                else None,
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
        await self._require_post(post_id, actor.user_id)
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

    async def remove_reaction(self, actor: CommunityActor, post_id: UUID) -> ReactionSummaryView:
        await self._require_post(post_id, actor.user_id)
        await self._repository.remove_reaction(post_id, actor.user_id)
        return await self._reaction_view(post_id, actor.user_id)

    async def report_post(
        self, actor: CommunityActor, post_id: UUID, request: ReportPostRequest
    ) -> None:
        await self._require_post(post_id, actor.user_id)
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
        summary = (await self._repository.reaction_summaries([post_id], viewer_id)).get(
            post_id, ReactionSummary(counts={}, viewer_reaction=None)
        )
        return ReactionSummaryView(
            counts=summary.counts,
            viewer_reaction=summary.viewer_reaction,
        )

    async def _require_post(self, post_id: UUID, viewer: str | None = None) -> CommunityPost:
        post = await self._repository.get_post(post_id)
        if post and viewer and getattr(post, "moderation_hidden", False):
            post = None
        if post and viewer and self._privacy:
            permission = await self._privacy.get(post.owner_id)
            if not permission.posts or await self._privacy.blocked(viewer, post.owner_id):
                post = None
        if post is None:
            raise AppError(
                code="community_post_not_found",
                message="Community post not found.",
                status_code=404,
            )
        return post

    def _to_view(
        self,
        post: CommunityPost,
        viewer_id: str,
        reactions: ReactionSummary,
        *,
        avatar_url: str | None,
        author_name: str | None = None,
    ) -> CommunityPostView:
        return CommunityPostView(
            id=post.id,
            post_type=post.post_type,
            caption=post.caption,
            author=PostAuthorView(
                user_id=post.owner_id,
                display_name=author_name or post.author_display_name,
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
