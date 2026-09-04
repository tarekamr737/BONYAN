from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.storage import PrivateObjectStorage
from app.domains.avatar.models import AvatarRecord, manual_body_metrics


async def delete_avatar_account_data(
    session: AsyncSession,
    storage: PrivateObjectStorage,
    user_id: str,
) -> None:
    object_keys = list(
        await session.scalars(
            select(AvatarRecord.generated_object_key).where(
                AvatarRecord.owner_id == user_id,
                AvatarRecord.generated_object_key.is_not(None),
            )
        )
    )
    for key in object_keys:
        await storage.delete(key=key)
    await session.execute(delete(AvatarRecord).where(AvatarRecord.owner_id == user_id))
    await session.execute(
        delete(manual_body_metrics).where(manual_body_metrics.c.owner_id == user_id)
    )
