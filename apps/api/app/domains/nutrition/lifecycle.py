from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.nutrition.models import FoodLogRecord


async def delete_nutrition_account_data(session: AsyncSession, user_id: str) -> None:
    await session.execute(delete(FoodLogRecord).where(FoodLogRecord.owner_id == user_id))
