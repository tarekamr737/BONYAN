from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Integer,
    Numeric,
    String,
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
            "('strength', 'hypertrophy', 'fat_loss', 'general_fitness')",
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
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
