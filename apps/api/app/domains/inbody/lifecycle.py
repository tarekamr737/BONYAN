from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.storage import PrivateObjectStorage
from app.domains.inbody.models import InBodyScan


async def delete_inbody_account_data(
    session: AsyncSession,
    storage: PrivateObjectStorage,
    user_id: str,
) -> None:
    object_keys = list(
        await session.scalars(
            select(InBodyScan.storage_key).where(InBodyScan.owner_id == user_id)
        )
    )
    for key in object_keys:
        await storage.delete(key=key)
    await session.execute(delete(InBodyScan).where(InBodyScan.owner_id == user_id))
