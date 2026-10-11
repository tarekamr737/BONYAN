"""Owner-scoped, versioned exercise proposals and immutable approval audit."""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SessionSubstitutionProposal(Base):
    __tablename__ = "training_substitution_proposals"
    __table_args__ = (
        Index("ix_substitution_owner_session", "owner_id", "session_id"),
        UniqueConstraint("owner_id", "approval_key", name="uq_substitution_owner_approval"),
        CheckConstraint("scope IN ('session','plan','equipment')", name="substitution_scope"),
        CheckConstraint(
            "status IN ('pending','approved','rejected','undone')", name="substitution_status"
        ),
    )
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    owner_id: Mapped[str] = mapped_column(String(120), nullable=False)
    session_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("training_workout_sessions.id"), nullable=False
    )
    prescription_index: Mapped[int] = mapped_column(nullable=False)
    expected_version: Mapped[int] = mapped_column(nullable=False)
    scope: Mapped[str] = mapped_column(String(16), nullable=False)
    reason: Mapped[str] = mapped_column(String(24), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    original: Mapped[dict] = mapped_column(JSONB, nullable=False)
    candidate: Mapped[dict] = mapped_column(JSONB, nullable=False)
    available_equipment: Mapped[list] = mapped_column(JSONB, nullable=False)
    media_available: Mapped[bool] = mapped_column(nullable=False)
    approval_key: Mapped[str | None] = mapped_column(String(120))
    result: Mapped[dict | None] = mapped_column(JSONB)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SessionSubstitutionEvent(Base):
    __tablename__ = "training_substitution_events"
    __table_args__ = (Index("ix_substitution_event_owner_session", "owner_id", "session_id"),)
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    owner_id: Mapped[str] = mapped_column(String(120), nullable=False)
    session_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("training_workout_sessions.id"), nullable=False
    )
    proposal_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("training_substitution_proposals.id"), nullable=False
    )
    action: Mapped[str] = mapped_column(String(20), nullable=False)
    version: Mapped[int] = mapped_column(nullable=False)
    details: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
