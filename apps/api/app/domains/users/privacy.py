"""Explicit, revocable sharing permissions; no body measurements in public contracts."""

from datetime import datetime
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy import DateTime, String, delete, func, select
from sqlalchemy.dialects.postgresql import JSONB, insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from app.core.auth import CurrentUserDep
from app.core.database import Base, get_db_session
from app.core.errors import AppError


class PrivacyPreferences(Base):
    __tablename__ = "privacy_preferences"
    owner_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    permissions: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PrivacyAudit(Base):
    __tablename__ = "privacy_audit"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    owner_id: Mapped[str] = mapped_column(String(128), index=True)
    changes: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class UserBlock(Base):
    __tablename__ = "community_user_blocks"
    owner_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    blocked_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SharingPermissions(BaseModel):
    model_config = ConfigDict(extra="forbid")
    display_name: bool = False
    avatar: bool = False
    badges: bool = False
    progress: bool = False
    posts: bool = False


class PrivacyRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get(self, owner: str) -> SharingPermissions:
        values = await self.session.scalar(
            select(PrivacyPreferences.permissions).where(PrivacyPreferences.owner_id == owner)
        )
        return SharingPermissions.model_validate(values or {})

    async def update(self, owner: str, values: dict) -> SharingPermissions:
        await self.session.execute(
            insert(PrivacyPreferences)
            .values(owner_id=owner, permissions={})
            .on_conflict_do_nothing()
        )
        row = await self.session.scalar(
            select(PrivacyPreferences).where(PrivacyPreferences.owner_id == owner).with_for_update()
        )
        previous = SharingPermissions.model_validate(row.permissions or {})
        merged = SharingPermissions.model_validate({**previous.model_dump(), **values})
        changed = {
            key: value
            for key, value in merged.model_dump().items()
            if getattr(previous, key) != value
        }
        row.permissions = merged.model_dump()
        row.updated_at = func.now()
        if changed:
            self.session.add(PrivacyAudit(owner_id=owner, changes=changed))
        await self.session.flush()
        return merged

    async def block(self, owner: str, other: str, enabled: bool):
        if owner == other:
            raise AppError("cannot_block_self", "You cannot block yourself.", 400)
        if enabled:
            await self.session.execute(
                insert(UserBlock).values(owner_id=owner, blocked_id=other).on_conflict_do_nothing()
            )
        else:
            await self.session.execute(
                delete(UserBlock).where(UserBlock.owner_id == owner, UserBlock.blocked_id == other)
            )

    async def blocked(self, owner: str, other: str) -> bool:
        return bool(
            await self.session.scalar(
                select(UserBlock.owner_id)
                .where(
                    ((UserBlock.owner_id == owner) & (UserBlock.blocked_id == other))
                    | ((UserBlock.owner_id == other) & (UserBlock.blocked_id == owner))
                )
                .limit(1)
            )
        )


router = APIRouter(prefix="/users/me/privacy", tags=["privacy"])
DB = Annotated[AsyncSession, Depends(get_db_session)]


@router.get("", response_model=SharingPermissions)
async def get_privacy(user: CurrentUserDep, db: DB):
    return await PrivacyRepository(db).get(user.id)


@router.put("", response_model=SharingPermissions)
async def update_privacy(payload: SharingPermissions, user: CurrentUserDep, db: DB):
    result = await PrivacyRepository(db).update(user.id, payload.model_dump(exclude_unset=True))
    await db.commit()
    return result


@router.get("/blocks", response_model=list[str])
async def blocks(user: CurrentUserDep, db: DB):
    return list(await db.scalars(select(UserBlock.blocked_id).where(UserBlock.owner_id == user.id)))


@router.put("/blocks/{other}")
async def block(other: str, user: CurrentUserDep, db: DB):
    await PrivacyRepository(db).block(user.id, other, True)
    return {"blocked": True}


@router.delete("/blocks/{other}")
async def unblock(other: str, user: CurrentUserDep, db: DB):
    await PrivacyRepository(db).block(user.id, other, False)
    return {"blocked": False}
