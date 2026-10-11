from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import Date, DateTime, ForeignKey, Index, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class GameEvent(Base):
    __tablename__ = "game_events"
    __table_args__ = (
        UniqueConstraint("owner_id", "source_key", name="uq_game_owner_source"),
        Index("ix_game_owner_week", "owner_id", "week_start"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    owner_id: Mapped[str] = mapped_column(String(128), nullable=False)
    source_key: Mapped[str] = mapped_column(String(160), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    local_day: Mapped[date] = mapped_column(Date, nullable=False)
    week_start: Mapped[date] = mapped_column(Date, nullable=False)
    timezone: Mapped[str] = mapped_column(String(80), nullable=False)
    version: Mapped[str] = mapped_column(String(32), nullable=False)
    evidence: Mapped[dict] = mapped_column(JSONB, nullable=False)
    eligible: Mapped[bool] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AwardLedger(Base):
    __tablename__ = "game_award_ledger"
    __table_args__ = (
        UniqueConstraint("event_id", name="uq_award_event"),
        UniqueConstraint("reverses_id", name="uq_award_reversal"),
        Index("ix_award_owner_created", "owner_id", "created_at"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    owner_id: Mapped[str] = mapped_column(String(128), nullable=False)
    event_id: Mapped[UUID] = mapped_column(ForeignKey("game_events.id"), nullable=False)
    reverses_id: Mapped[UUID | None] = mapped_column(ForeignKey("game_award_ledger.id"))
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    xp: Mapped[int] = mapped_column(nullable=False)
    points: Mapped[int] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class WeeklyTargets(Base):
    __tablename__ = "game_weekly_targets"
    owner_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    week_start: Mapped[date] = mapped_column(Date, primary_key=True)
    timezone: Mapped[str] = mapped_column(String(80), nullable=False)
    workout_days: Mapped[int] = mapped_column(nullable=False)
    experience: Mapped[str] = mapped_column(String(32), nullable=False)
    goal: Mapped[str] = mapped_column(String(40), nullable=False)
    league_opt_in: Mapped[bool] = mapped_column(nullable=False, default=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ProgressSnapshot(Base):
    __tablename__ = "progress_score_snapshots"
    __table_args__ = (
        UniqueConstraint("owner_id", "evidence_hash", name="uq_progress_owner_evidence"),
        Index("ix_progress_owner_created", "owner_id", "created_at"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    owner_id: Mapped[str] = mapped_column(String(128), nullable=False)
    evidence_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    result: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
