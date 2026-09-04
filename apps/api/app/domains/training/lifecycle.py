from __future__ import annotations

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.training.models import WorkoutPlanRecord, WorkoutSessionRecord


async def delete_training_account_data(session: AsyncSession, user_id: str) -> None:
    await session.execute(
        delete(WorkoutSessionRecord).where(WorkoutSessionRecord.owner_id == user_id)
    )
    await session.execute(
        delete(WorkoutPlanRecord).where(WorkoutPlanRecord.owner_id == user_id)
    )
