from sqlalchemy import delete, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.game.models import (
    AwardLedger,
    Challenge,
    Friendship,
    GameEvent,
    GameIdentity,
    ProgressSnapshot,
    RewardClaim,
    WeeklyTargets,
)


async def delete_game_account_data(session: AsyncSession, owner: str):
    for model in (
        RewardClaim,
        AwardLedger,
        GameEvent,
        ProgressSnapshot,
        WeeklyTargets,
        GameIdentity,
    ):
        await session.execute(delete(model).where(model.owner_id == owner))
    await session.execute(
        delete(Friendship).where(or_(Friendship.member_a == owner, Friendship.member_b == owner))
    )
    await session.execute(
        delete(Challenge).where(or_(Challenge.creator_id == owner, Challenge.recipient_id == owner))
    )
