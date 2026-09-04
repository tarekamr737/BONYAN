from __future__ import annotations

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.users.models import UserAccount, UserProfile


async def delete_user_account_data(session: AsyncSession, user_id: str) -> None:
    await session.execute(delete(UserProfile).where(UserProfile.owner_id == user_id))
    await session.execute(delete(UserAccount).where(UserAccount.id == user_id))
