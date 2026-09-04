from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, Column, DateTime, Enum, Float, String, Table, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.domains.avatar.contracts import AvatarState

manual_body_metrics = Table(
    "avatar_manual_body_metrics",
    Base.metadata,
    Column("owner_id", String(128), primary_key=True),
    Column("height_cm", Float, nullable=False),
    Column("weight_kg", Float, nullable=False),
    Column("body_fat_percentage", Float, nullable=True),
    Column("skeletal_muscle_mass_kg", Float, nullable=True),
    Column("recorded_at", DateTime(timezone=True), nullable=False),
)


class AvatarRecord(Base):
    __tablename__ = "avatars"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    owner_id: Mapped[str] = mapped_column(String(128), index=True)
    generated_object_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    generated_media_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    state: Mapped[AvatarState] = mapped_column(
        Enum(AvatarState, native_enum=False, length=32), index=True
    )
    style: Mapped[str] = mapped_column(String(160))
    presentation: Mapped[str] = mapped_column(String(16))
    shape_profile: Mapped[str] = mapped_column(String(16))
    provider_model: Mapped[str] = mapped_column(String(160), default="TBD")
    measurement_source: Mapped[str] = mapped_column(String(32))
    measurements_recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    failure_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
