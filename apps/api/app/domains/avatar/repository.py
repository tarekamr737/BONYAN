from __future__ import annotations

from typing import Protocol
from uuid import UUID

from sqlalchemy import func, select, text, tuple_
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.avatar.contracts import AvatarState
from app.domains.avatar.models import AvatarRecord, AvatarSourcePhotoRecord


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

    async def enforce_generation_budget(self, owner: str, limit: int) -> None:
        from app.core.errors import AppError

        await self._session.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
            {"key": f"avatar-budget:{owner}"},
        )
        count = await self._session.scalar(
            select(func.count())
            .select_from(AvatarRecord)
            .where(
                AvatarRecord.owner_id == owner,
                AvatarRecord.created_at >= func.date_trunc("day", func.now()),
            )
        )
        if count >= limit:
            raise AppError(
                "avatar_budget_reached", "Daily generation limit reached. Try tomorrow.", 429
            )

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

    async def list_public_for_owners(self, owners: list[str]):
        return list(
            await self._session.scalars(
                select(AvatarRecord)
                .where(
                    AvatarRecord.owner_id.in_(owners),
                    AvatarRecord.is_public.is_(True),
                    AvatarRecord.state == AvatarState.APPROVED,
                )
                .order_by(AvatarRecord.updated_at.desc())
            )
        )

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


class SqlAlchemyAvatarSourcePhotoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, source_photo: AvatarSourcePhotoRecord) -> None:
        self._session.add(source_photo)
        await self._session.flush()

    async def get_for_owner(
        self, source_photo_id: UUID, owner_id: str
    ) -> AvatarSourcePhotoRecord | None:
        statement = select(AvatarSourcePhotoRecord).where(
            AvatarSourcePhotoRecord.id == source_photo_id,
            AvatarSourcePhotoRecord.owner_id == owner_id,
        )
        return await self._session.scalar(statement)

    async def delete(self, source_photo: AvatarSourcePhotoRecord) -> None:
        await self._session.delete(source_photo)
        await self._session.flush()
