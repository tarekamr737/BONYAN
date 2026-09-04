from __future__ import annotations

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.community.models import CommunityPost, PostReaction, PostReport


async def delete_community_account_data(session: AsyncSession, user_id: str) -> None:
    await session.execute(delete(PostReport).where(PostReport.reporter_id == user_id))
    await session.execute(delete(PostReaction).where(PostReaction.user_id == user_id))
    await session.execute(delete(CommunityPost).where(CommunityPost.owner_id == user_id))
