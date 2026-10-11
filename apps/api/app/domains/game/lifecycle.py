from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.game.models import AwardLedger, GameEvent, ProgressSnapshot, WeeklyTargets


async def delete_game_account_data(session: AsyncSession, owner: str):
    for model in (AwardLedger, GameEvent, ProgressSnapshot, WeeklyTargets):
        await session.execute(delete(model).where(model.owner_id == owner))
