from __future__ import annotations

from typing import Protocol
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.avatar.models import AvatarRecord


class AvatarRepository(Protocol):
    async def add(self, avatar: AvatarRecord) -> None: ...

    async def get_for_owner(self, avatar_id: UUID, owner_id: str) -> AvatarRecord | None: ...

    async def save(self, avatar: AvatarRecord) -> None: ...

    async def delete(self, avatar: AvatarRecord) -> None: ...


class SqlAlchemyAvatarRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, avatar: AvatarRecord) -> None:
        self._session.add(avatar)
        await self._session.flush()

    async def get_for_owner(self, avatar_id: UUID, owner_id: str) -> AvatarRecord | None:
        statement = select(AvatarRecord).where(
            AvatarRecord.id == avatar_id,
            AvatarRecord.owner_id == owner_id,
        )
        return await self._session.scalar(statement)

    async def save(self, avatar: AvatarRecord) -> None:
        self._session.add(avatar)
        await self._session.flush()

    async def delete(self, avatar: AvatarRecord) -> None:
        await self._session.delete(avatar)
        await self._session.flush()
