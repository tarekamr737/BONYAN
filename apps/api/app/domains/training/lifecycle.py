from __future__ import annotations

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.training.models import CoachMessageRecord, WorkoutPlanRecord, WorkoutSessionRecord
from app.domains.training.substitution_models import (
    SessionSubstitutionEvent,
    SessionSubstitutionProposal,
)


async def delete_training_account_data(session: AsyncSession, user_id: str) -> None:
    for model in (SessionSubstitutionEvent, SessionSubstitutionProposal):
        await session.execute(delete(model).where(model.owner_id == user_id))
    await session.execute(delete(CoachMessageRecord).where(CoachMessageRecord.owner_id == user_id))
    await session.execute(
        delete(WorkoutSessionRecord).where(WorkoutSessionRecord.owner_id == user_id)
    )
    await session.execute(delete(WorkoutPlanRecord).where(WorkoutPlanRecord.owner_id == user_id))
