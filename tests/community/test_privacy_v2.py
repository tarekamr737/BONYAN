import asyncio
import os
from uuid import uuid4

import pytest
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.errors import AppError
from app.domains.community.contracts import CommunityActor, ReactionKind, ReportReason
from app.domains.community.models import CommunityPost, ModerationAudit
from app.domains.community.moderation import ModerationRepository, ModerationService
from app.domains.community.repository import SqlAlchemyCommunityRepository
from app.domains.community.schemas import CreatePostRequest, ReportPostRequest
from app.domains.community.service import CommunityService
from app.domains.users.privacy import (
    PrivacyAudit,
    PrivacyPreferences,
    PrivacyRepository,
    SharingPermissions,
    UserBlock,
)

from .test_community import FakeAvatarIdentityReader


def test_all_public_permissions_default_private():
    assert not any(SharingPermissions().model_dump().values())


@pytest.mark.skipif(
    not os.getenv("BONYAN_V2_TEST_DATABASE_URL"), reason="requires disposable PostgreSQL"
)
def test_database_privacy_revocation_blocking_and_read_only_masks():
    asyncio.run(_scenario())


async def _scenario():
    engine = create_async_engine(os.environ["BONYAN_V2_TEST_DATABASE_URL"])
    factory = async_sessionmaker(engine, expire_on_commit=False)
    owner, other = f"privacy-{uuid4()}", f"privacy-{uuid4()}"
    actor, viewer = CommunityActor(owner, "Private name"), CommunityActor(other, "Viewer")
    try:
        async with factory.begin() as db:
            privacy = PrivacyRepository(db)
            service = CommunityService(
                SqlAlchemyCommunityRepository(db), FakeAvatarIdentityReader(), privacy=privacy
            )
            post = await service.create_post(
                actor, CreatePostRequest(caption="A sustainable training milestone")
            )
            feed = await service.feed(viewer, cursor=None, limit=10)
            own = next(item for item in feed.items if item.id == post.id)
            assert own.author.display_name == "BONYAN member"
            stored = await db.scalar(select(CommunityPost).where(CommunityPost.id == post.id))
            assert stored.author_display_name == "Private name"
            await service.report_post(
                viewer, post.id, ReportPostRequest(reason=ReportReason.PRIVACY)
            )
            moderation = ModerationService(ModerationRepository(db), "authorized-moderator")
            with pytest.raises(AppError):
                await moderation.pending(other, None, 10)
            reports = await moderation.pending("authorized-moderator", None, 50)
            report = next(item for item in reports.items if item.post_id == post.id)
            with pytest.raises(AppError):
                await moderation.decide(other, report.id, "hide")
            await moderation.decide("authorized-moderator", report.id, "hide")
            await moderation.decide("authorized-moderator", report.id, "hide")
            assert (
                await db.scalar(
                    select(func.count())
                    .select_from(ModerationAudit)
                    .where(ModerationAudit.post_id == post.id)
                )
                == 1
            )
            assert not any(
                item.id == post.id
                for item in (await service.feed(viewer, cursor=None, limit=50)).items
            )
            with pytest.raises(AppError):
                await service.set_reaction(viewer, post.id, ReactionKind.SUPPORT)
            await moderation.decide("authorized-moderator", report.id, "restore")
            assert any(
                item.id == post.id
                for item in (await service.feed(viewer, cursor=None, limit=50)).items
            )
            await privacy.update(owner, {"display_name": True})
            assert (
                next(
                    item
                    for item in (await service.feed(viewer, cursor=None, limit=10)).items
                    if item.id == post.id
                ).author.display_name
                == "Private name"
            )
            await privacy.block(other, owner, True)
            assert not any(
                item.id == post.id
                for item in (await service.feed(viewer, cursor=None, limit=10)).items
            )
            with pytest.raises(AppError):
                await service.set_reaction(viewer, post.id, ReactionKind.SUPPORT)
            await privacy.block(other, owner, False)
            await privacy.update(owner, {"posts": False, "display_name": False})
            assert not any(
                item.id == post.id
                for item in (await service.feed(viewer, cursor=None, limit=10)).items
            )
            with pytest.raises(AppError):
                await service.report_post(viewer, post.id, None)
    finally:
        async with factory.begin() as db:
            await db.execute(
                delete(ModerationAudit).where(ModerationAudit.post_owner_id.in_([owner, other]))
            )
            for model in (CommunityPost, PrivacyAudit, PrivacyPreferences, UserBlock):
                await db.execute(delete(model).where(model.owner_id.in_([owner, other])))
        await engine.dispose()
