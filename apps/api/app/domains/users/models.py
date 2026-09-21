from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"
    __table_args__ = (
        CheckConstraint(
            "available_training_days IS NULL OR available_training_days BETWEEN 2 AND 6",
            name="training_days_range",
        ),
        CheckConstraint(
            "height_cm IS NULL OR height_cm BETWEEN 80 AND 250",
            name="height_cm_range",
        ),
        CheckConstraint(
            "sex IS NULL OR sex IN ('female', 'male', 'unspecified')",
            name="sex_value",
        ),
        CheckConstraint(
            "training_goal IS NULL OR training_goal IN "
            "('strength', 'hypertrophy', 'fat_loss', 'general_fitness', 'military_preparation')",
            name="training_goal_value",
        ),
        CheckConstraint(
            "experience_level IS NULL OR experience_level IN "
            "('beginner', 'intermediate', 'advanced')",
            name="experience_level_value",
        ),
        CheckConstraint(
            "preferred_units IN ('metric', 'imperial')",
            name="preferred_units_value",
        ),
    )

    owner_id: Mapped[str] = mapped_column(String(120), primary_key=True)
    display_name: Mapped[str | None] = mapped_column(String(120))
    preferred_language: Mapped[str] = mapped_column(String(16), default="en", server_default="en")
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    sex: Mapped[str | None] = mapped_column(String(20))
    height_cm: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    training_goal: Mapped[str | None] = mapped_column(String(40))
    coaching: Mapped[dict] = mapped_column(JSONB, default=dict, server_default=text("'{}'::jsonb"))
    experience_level: Mapped[str | None] = mapped_column(String(40))
    available_training_days: Mapped[int | None] = mapped_column(Integer)
    available_equipment: Mapped[list[str]] = mapped_column(
        JSONB, default=list, server_default=text("'[]'::jsonb")
    )
    preferred_units: Mapped[str] = mapped_column(
        String(10), default="metric", server_default="metric"
    )
    timezone: Mapped[str] = mapped_column(String(64), default="UTC", server_default="UTC")
    onboarding_completed: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false")
    )
    profile_photo_object_key: Mapped[str | None] = mapped_column(String(512))
    profile_photo_media_type: Mapped[str | None] = mapped_column(String(64))
    profile_photo_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    @property
    def has_profile_photo(self) -> bool:
        return bool(self.profile_photo_object_key)


class UserAccount(Base):
    __tablename__ = "user_accounts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class EmailVerificationChallenge(Base):
    __tablename__ = "email_verification_challenges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email: Mapped[str] = mapped_column(String(254), index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    code_digest: Mapped[str] = mapped_column(String(64))
    attempts: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ProfileHistoryRecord(Base):
    __tablename__ = "profile_history"
    __table_args__ = (
        UniqueConstraint("owner_id", "request_id", name="uq_profile_history_request"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    owner_id: Mapped[str] = mapped_column(String(120), index=True)
    request_id: Mapped[UUID] = mapped_column(Uuid, default=uuid4)
    kind: Mapped[str] = mapped_column(String(32))
    snapshot: Mapped[dict] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
