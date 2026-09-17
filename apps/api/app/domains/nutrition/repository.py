from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

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
