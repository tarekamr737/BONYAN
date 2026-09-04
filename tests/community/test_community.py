from __future__ import annotations

import asyncio
from datetime import datetime
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError

from app.core.errors import AppError
from app.domains.avatar.contracts import AvatarCommunityIdentity
from app.domains.community.contracts import (
    CommunityActor,
    PostType,
    ReactionKind,
    ReportReason,
)
from app.domains.community.models import CommunityPost, PostReaction, PostReport
from app.domains.community.repository import ReactionSummary
from app.domains.community.schemas import CreatePostRequest, ReportPostRequest
from app.domains.community.service import CommunityService


class FakeAvatarIdentityReader:
    def __init__(self) -> None:
        self.identities: dict[tuple[str, UUID], AvatarCommunityIdentity] = {}
        self.single_reads = 0
        self.batch_reads = 0

    async def get_community_identity(
        self, owner_id: str, avatar_id: UUID
    ) -> AvatarCommunityIdentity | None:
        self.single_reads += 1
        return self.identities.get((owner_id, avatar_id))

    async def get_community_identities(
        self, references: list[tuple[str, UUID]]
    ) -> dict[tuple[str, UUID], AvatarCommunityIdentity]:
        self.batch_reads += 1
        return {
            reference: self.identities[reference]
            for reference in dict.fromkeys(references)
            if reference in self.identities
        }


class FakeCommunityRepository:
    def __init__(self) -> None:
        self.posts: dict[UUID, CommunityPost] = {}
        self.reactions: dict[tuple[UUID, str], PostReaction] = {}
        self.reports: dict[tuple[UUID, str], PostReport] = {}

    async def add_post(self, post: CommunityPost) -> None:
        self.posts[post.id] = post

    async def get_post(self, post_id: UUID) -> CommunityPost | None:
        return self.posts.get(post_id)

    async def delete_post(self, post: CommunityPost) -> None:
        self.posts.pop(post.id, None)
        self.reactions = {
            key: value for key, value in self.reactions.items() if key[0] != post.id
        }
        self.reports = {
            key: value for key, value in self.reports.items() if key[0] != post.id
        }

    async def list_posts(
        self,
        *,
        before_created_at: datetime | None,
        before_id: UUID | None,
        limit: int,
    ) -> list[CommunityPost]:
        posts = sorted(
            self.posts.values(), key=lambda post: (post.created_at, post.id), reverse=True
        )
        if before_created_at is not None and before_id is not None:
            posts = [
                post
                for post in posts
                if (post.created_at, post.id) < (before_created_at, before_id)
            ]
        return posts[:limit]

    async def set_reaction(self, reaction: PostReaction) -> None:
        self.reactions[(reaction.post_id, reaction.user_id)] = reaction

    async def remove_reaction(self, post_id: UUID, user_id: str) -> None:
        self.reactions.pop((post_id, user_id), None)

    async def reaction_summaries(
        self, post_ids: list[UUID], viewer_id: str
    ) -> dict[UUID, ReactionSummary]:
        output: dict[UUID, ReactionSummary] = {}
        for post_id in post_ids:
            counts: dict[ReactionKind, int] = {}
            viewer_reaction = None
            for (candidate_post_id, user_id), record in self.reactions.items():
                if candidate_post_id != post_id:
                    continue
                counts[record.reaction] = counts.get(record.reaction, 0) + 1
                if user_id == viewer_id:
                    viewer_reaction = record.reaction
            output[post_id] = ReactionSummary(
                counts=counts,
                viewer_reaction=viewer_reaction,
            )
        return output

    async def add_report(self, report: PostReport) -> None:
        self.reports.setdefault((report.post_id, report.reporter_id), report)


def make_service() -> tuple[
    CommunityService, FakeCommunityRepository, FakeAvatarIdentityReader
]:
    repository = FakeCommunityRepository()
    avatar_reader = FakeAvatarIdentityReader()
    return CommunityService(repository, avatar_reader), repository, avatar_reader


def test_create_post_uses_only_an_explicitly_public_approved_avatar() -> None:
    async def scenario() -> None:
        service, repository, avatar_reader = make_service()
        actor = CommunityActor(user_id="owner", display_name="Mariam Adel")
        avatar_id = uuid4()
        avatar_reader.identities[(actor.user_id, avatar_id)] = AvatarCommunityIdentity(
            avatar_id=avatar_id,
            image_url="https://private-storage.test/signed-avatar",
        )

        view = await service.create_post(
            actor,
            CreatePostRequest(
                post_type=PostType.MILESTONE,
                caption="Eight weeks of staying patient.",
                avatar_id=avatar_id,
            ),
        )

        assert view.author.avatar_url.endswith("signed-avatar")
        assert view.can_delete is True
        assert repository.posts[view.id].avatar_id == avatar_id
        serialized = view.model_dump(mode="json")
        assert "source" not in str(serialized).lower()
        assert "inbody" not in str(serialized).lower()

    asyncio.run(scenario())


def test_unapproved_avatar_is_blocked_from_post_creation() -> None:
    async def scenario() -> None:
        service, _, _ = make_service()
        actor = CommunityActor(user_id="owner", display_name="Owner")

        with pytest.raises(AppError) as error:
            await service.create_post(
                actor,
                CreatePostRequest(caption="A private milestone", avatar_id=uuid4()),
            )
        assert error.value.code == "avatar_not_available"

    asyncio.run(scenario())


def test_private_measurements_are_rejected_as_post_fields() -> None:
    with pytest.raises(ValidationError):
        CreatePostRequest.model_validate(
            {
                "caption": "A deliberate milestone",
                "body_fat_percentage": 12.4,
                "raw_inbody_report": "private",
            }
        )


def test_delete_own_post_and_forbid_cross_user_delete() -> None:
    async def scenario() -> None:
        service, repository, _ = make_service()
        owner = CommunityActor(user_id="owner", display_name="Owner")
        stranger = CommunityActor(user_id="stranger", display_name="Stranger")
        post = await service.create_post(owner, CreatePostRequest(caption="Kept showing up."))

        with pytest.raises(AppError) as error:
            await service.delete_post(stranger, post.id)
        assert error.value.code == "post_delete_forbidden"
        assert post.id in repository.posts

        await service.delete_post(owner, post.id)
        assert post.id not in repository.posts

    asyncio.run(scenario())


def test_reactions_are_idempotent_and_change_in_place() -> None:
    async def scenario() -> None:
        service, repository, _ = make_service()
        author = CommunityActor(user_id="author", display_name="Author")
        viewer = CommunityActor(user_id="viewer", display_name="Viewer")
        post = await service.create_post(author, CreatePostRequest(caption="First pull-up."))

        first = await service.set_reaction(viewer, post.id, ReactionKind.SUPPORT)
        duplicate = await service.set_reaction(viewer, post.id, ReactionKind.SUPPORT)
        changed = await service.set_reaction(viewer, post.id, ReactionKind.INSPIRED)

        assert first.counts == {ReactionKind.SUPPORT: 1}
        assert duplicate.counts == {ReactionKind.SUPPORT: 1}
        assert changed.counts == {ReactionKind.INSPIRED: 1}
        assert changed.viewer_reaction is ReactionKind.INSPIRED
        assert len(repository.reactions) == 1

        removed = await service.remove_reaction(viewer, post.id)
        assert removed.counts == {}
        assert removed.viewer_reaction is None

    asyncio.run(scenario())


def test_feed_is_recent_first_and_cursor_paginated() -> None:
    async def scenario() -> None:
        service, _, _ = make_service()
        actor = CommunityActor(user_id="owner", display_name="Owner")
        created = []
        for index in range(5):
            created.append(
                await service.create_post(actor, CreatePostRequest(caption=f"Milestone {index}"))
            )

        first = await service.feed(actor, cursor=None, limit=2)
        second = await service.feed(actor, cursor=first.next_cursor, limit=2)
        third = await service.feed(actor, cursor=second.next_cursor, limit=2)

        all_ids = [item.id for page in (first, second, third) for item in page.items]
        assert len(all_ids) == 5
        assert len(set(all_ids)) == 5
        assert first.items[0].created_at >= first.items[1].created_at
        assert first.next_cursor is not None
        assert second.next_cursor is not None
        assert third.next_cursor is None
        assert set(all_ids) == {item.id for item in created}

    asyncio.run(scenario())


def test_feed_batches_avatar_identity_reads() -> None:
    async def scenario() -> None:
        service, _, avatar_reader = make_service()
        actor = CommunityActor(user_id="owner", display_name="Owner")
        for index in range(3):
            avatar_id = uuid4()
            avatar_reader.identities[(actor.user_id, avatar_id)] = AvatarCommunityIdentity(
                avatar_id=avatar_id,
                image_url=f"https://private-storage.test/avatar-{index}",
            )
            await service.create_post(
                actor,
                CreatePostRequest(caption=f"Milestone {index}", avatar_id=avatar_id),
            )

        avatar_reader.single_reads = 0
        feed = await service.feed(actor, cursor=None, limit=20)

        assert avatar_reader.single_reads == 0
        assert avatar_reader.batch_reads == 1
        assert all(item.author.avatar_url for item in feed.items)

    asyncio.run(scenario())


def test_reporting_is_idempotent_per_reporter() -> None:
    async def scenario() -> None:
        service, repository, _ = make_service()
        author = CommunityActor(user_id="author", display_name="Author")
        reporter = CommunityActor(user_id="reporter", display_name="Reporter")
        post = await service.create_post(author, CreatePostRequest(caption="A post"))
        request = ReportPostRequest(reason=ReportReason.PRIVACY, note="Contains my photo")

        await service.report_post(reporter, post.id, request)
        await service.report_post(reporter, post.id, request)

        assert len(repository.reports) == 1
        report = next(iter(repository.reports.values()))
        assert report.reason is ReportReason.PRIVACY
        assert report.note == "Contains my photo"

    asyncio.run(scenario())


def test_invalid_pagination_cursor_is_rejected_safely() -> None:
    async def scenario() -> None:
        service, _, _ = make_service()
        actor = CommunityActor(user_id="owner", display_name="Owner")

        with pytest.raises(AppError) as error:
            await service.feed(actor, cursor="not-a-cursor", limit=20)
        assert error.value.code == "invalid_feed_cursor"

    asyncio.run(scenario())
