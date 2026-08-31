from __future__ import annotations

from typing import Protocol
from uuid import UUID

from sqlalchemy import select, tuple_
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.avatar.contracts import AvatarState
from app.domains.avatar.models import AvatarRecord


class AvatarRepository(Protocol):
    async def add(self, avatar: AvatarRecord) -> None: ...

    async def get_for_owner(self, avatar_id: UUID, owner_id: str) -> AvatarRecord | None: ...

    async def list_for_owner(self, owner_id: str) -> list[AvatarRecord]: ...

    async def list_public_for_references(
        self, references: list[tuple[str, UUID]]
    ) -> list[AvatarRecord]: ...

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

    async def list_for_owner(self, owner_id: str) -> list[AvatarRecord]:
        statement = (
            select(AvatarRecord)
            .where(AvatarRecord.owner_id == owner_id)
            .order_by(AvatarRecord.created_at.desc(), AvatarRecord.id.desc())
        )
        return list((await self._session.scalars(statement)).all())

    async def list_public_for_references(
        self, references: list[tuple[str, UUID]]
    ) -> list[AvatarRecord]:
        if not references:
            return []
        statement = select(AvatarRecord).where(
            tuple_(AvatarRecord.owner_id, AvatarRecord.id).in_(references),
            AvatarRecord.state == AvatarState.APPROVED,
            AvatarRecord.is_public.is_(True),
        )
        return list((await self._session.scalars(statement)).all())

    async def save(self, avatar: AvatarRecord) -> None:
        self._session.add(avatar)
        await self._session.flush()

    async def delete(self, avatar: AvatarRecord) -> None:
        await self._session.delete(avatar)
        await self._session.flush()
