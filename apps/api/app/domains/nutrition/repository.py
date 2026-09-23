from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.domains.nutrition.models import FoodLogRecord
from app.domains.training.models import WorkoutSessionRecord
from app.domains.training.schemas import WorkoutSessionStatus


class NutritionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def save_food(self, *, owner_id: str, values: dict[str, object]) -> FoodLogRecord:
        record = FoodLogRecord(owner_id=owner_id, **values)
        self.session.add(record)
        await self.session.flush()
        return record

    async def save_reviewed_food(
        self, *, owner_id: str, request_id: UUID, values: dict[str, object]
    ) -> FoodLogRecord:
        # The existing primary key makes retrying a confirmation idempotent.
        await self.session.execute(
            insert(FoodLogRecord)
            .values(id=request_id, owner_id=owner_id, **values)
            .on_conflict_do_nothing(index_elements=[FoodLogRecord.id])
        )
        result = await self.session.execute(
            select(FoodLogRecord).where(
                FoodLogRecord.id == request_id, FoodLogRecord.owner_id == owner_id
            )
        )
        record = result.scalar_one_or_none()
        if record is None:
            raise AppError("food_confirmation_conflict", "Please review the meal again.", 409)
        return record

    async def list_food_between(
        self, *, owner_id: str, start: datetime, end: datetime
    ) -> list[FoodLogRecord]:
        result = await self.session.execute(
            select(FoodLogRecord)
            .where(
                FoodLogRecord.owner_id == owner_id,
                FoodLogRecord.logged_at >= start,
                FoodLogRecord.logged_at < end,
            )
            .order_by(FoodLogRecord.logged_at.desc())
        )
        return list(result.scalars())

    async def list_recent_food(
        self, *, owner_id: str, limit: int = 50
    ) -> list[FoodLogRecord]:
        result = await self.session.execute(
            select(FoodLogRecord)
            .where(FoodLogRecord.owner_id == owner_id)
            .order_by(FoodLogRecord.logged_at.desc(), FoodLogRecord.id.desc())
            .limit(limit)
        )
        return list(result.scalars())

    async def session_counts_between(
        self, *, owner_id: str, start: datetime, end: datetime
    ) -> tuple[int, int]:
        result = await self.session.execute(
            select(WorkoutSessionRecord.status, func.count(WorkoutSessionRecord.id))
            .where(
                WorkoutSessionRecord.owner_id == owner_id,
                WorkoutSessionRecord.started_at >= start,
                WorkoutSessionRecord.started_at < end,
            )
            .group_by(WorkoutSessionRecord.status)
        )
        counts = {str(status): int(count) for status, count in result.all()}
        return (
            counts.get(WorkoutSessionStatus.COMPLETED.value, 0),
            counts.get(WorkoutSessionStatus.ACTIVE.value, 0),
        )
