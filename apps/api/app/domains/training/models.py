from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class WorkoutPlanRecord(Base):
    __tablename__ = "training_workout_plans"
    __table_args__ = (
        Index("ix_training_plans_owner_status_created", "owner_id", "status", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(40), nullable=False)
    goal: Mapped[str] = mapped_column(String(40), nullable=False)
    experience: Mapped[str] = mapped_column(String(40), nullable=False)
    days_per_week: Mapped[int] = mapped_column(nullable=False)
    session_duration_minutes: Mapped[int] = mapped_column(nullable=False)
    equipment: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    generation_snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    days: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class WorkoutSessionRecord(Base):
    __tablename__ = "training_workout_sessions"
    __table_args__ = (
        Index("ix_training_sessions_owner_status_started", "owner_id", "status", "started_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("training_workout_plans.id"), nullable=False, index=True
    )
    day_key: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False)
    logged_sets: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    summary: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
