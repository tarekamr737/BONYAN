from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class FoodLogRecord(Base):
    __tablename__ = "nutrition_food_logs"
    __table_args__ = (Index("ix_nutrition_food_owner_logged", "owner_id", "logged_at"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    meal_type: Mapped[str] = mapped_column(String(32), nullable=False)
    calories: Mapped[int] = mapped_column(Integer, nullable=False)
    protein_g: Mapped[float] = mapped_column(Numeric(7, 2), nullable=False)
    carbs_g: Mapped[float] = mapped_column(Numeric(7, 2), nullable=False)
    fat_g: Mapped[float] = mapped_column(Numeric(7, 2), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(24), nullable=False, default="ai")
    logged_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
