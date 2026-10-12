from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import case, func, or_, select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.game.models import (
    AwardLedger,
    Challenge,
    Friendship,
    GameEvent,
    GameIdentity,
    League,
    WeeklyTargets,
)
from app.domains.users.models import UserProfile


class GameCommunityRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def join(self, target: WeeklyTargets, season_id: str):
        if target.league_id:
            target.league_opt_in = True
            return
        bucket = (
            f"league:{target.week_start}:{target.goal}:{target.experience}:{target.workout_days}"
        )
        await self.session.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"), {"key": bucket}
        )
        leagues = list(
            await self.session.scalars(
                select(League)
                .where(
                    League.week_start == target.week_start,
                    League.goal == target.goal,
                    League.experience == target.experience,
                    League.workout_days == target.workout_days,
                )
                .order_by(League.cohort.desc())
            )
        )
        league = leagues[0] if leagues else None
        count = (
            await self.session.scalar(
                select(func.count())
                .select_from(WeeklyTargets)
                .where(WeeklyTargets.league_id == league.id)
            )
            if league
            else 0
        )
        if league is None or count >= 50:
            league = League(
                season_id=season_id,
                week_start=target.week_start,
                goal=target.goal,
                experience=target.experience,
                workout_days=target.workout_days,
                cohort=(league.cohort + 1) if league else 1,
            )
            self.session.add(league)
            await self.session.flush()
        target.league_id = league.id
        target.league_opt_in = True
        target.joined_at = datetime.now(UTC)

    async def identity(self, owner: str):
        await self.session.execute(
            insert(GameIdentity)
            .values(owner_id=owner, invite_code=uuid4())
            .on_conflict_do_nothing()
        )
        return await self.session.get(GameIdentity, owner)

    async def identity_by_code(self, code: UUID):
        return await self.session.scalar(
            select(GameIdentity).where(GameIdentity.invite_code == code)
        )

    async def friendships(self, owner: str):
        return list(
            await self.session.scalars(
                select(Friendship)
                .where(or_(Friendship.member_a == owner, Friendship.member_b == owner))
                .order_by(Friendship.created_at.desc())
                .limit(100)
            )
        )

    async def friendship(self, owner: str, id: UUID):
        return await self.session.scalar(
            select(Friendship)
            .where(
                Friendship.id == id, or_(Friendship.member_a == owner, Friendship.member_b == owner)
            )
            .with_for_update()
        )

    async def invite(self, owner: str, other: str):
        a, b = sorted([owner, other])
        await self.session.execute(
            insert(Friendship)
            .values(
                id=uuid4(),
                member_a=a,
                member_b=b,
                inviter_id=owner,
                recipient_id=other,
                status="pending",
            )
            .on_conflict_do_nothing()
        )
        return await self.session.scalar(
            select(Friendship).where(Friendship.member_a == a, Friendship.member_b == b)
        )

    async def participants(self, target: WeeklyTargets, mode: str, friends: list[str]):
        query = select(WeeklyTargets).where(
            WeeklyTargets.week_start == target.week_start, WeeklyTargets.league_opt_in.is_(True)
        )
        if mode == "friends":
            query = query.where(WeeklyTargets.owner_id.in_([target.owner_id, *friends]))
        else:
            query = query.where(WeeklyTargets.league_id == target.league_id)
        return list(await self.session.scalars(query.limit(100)))

    async def scores(self, participants: list[str], week, all_time: bool = False):
        query = (
            select(
                AwardLedger.owner_id,
                AwardLedger.category,
                func.sum(AwardLedger.points).label("points"),
                func.sum(case((AwardLedger.xp > 0, 1), (AwardLedger.xp < 0, -1), else_=0)).label(
                    "count"
                ),
                func.max(AwardLedger.created_at).label("last_earned"),
            )
            .join(GameEvent, GameEvent.id == AwardLedger.event_id)
            .where(AwardLedger.owner_id.in_(participants))
        )
        if not all_time:
            query = query.where(GameEvent.week_start == week)
        return list(
            (
                await self.session.execute(
                    query.group_by(AwardLedger.owner_id, AwardLedger.category)
                )
            ).mappings()
        )

    async def profiles(self, owners: list[str]):
        return {
            profile.owner_id: profile
            for profile in await self.session.scalars(
                select(UserProfile).where(UserProfile.owner_id.in_(owners))
            )
        }

    async def challenges(self, owner: str):
        return list(
            await self.session.scalars(
                select(Challenge)
                .where(or_(Challenge.creator_id == owner, Challenge.recipient_id == owner))
                .order_by(Challenge.starts_at.desc())
                .limit(50)
            )
        )

    async def challenge(self, owner: str, id: UUID):
        return await self.session.scalar(
            select(Challenge)
            .where(
                Challenge.id == id,
                or_(Challenge.creator_id == owner, Challenge.recipient_id == owner),
            )
            .with_for_update()
        )

    async def challenge_points(self, challenge: Challenge, owner: str):
        return max(
            0,
            (
                await self.session.scalar(
                    select(func.sum(AwardLedger.points)).where(
                        AwardLedger.owner_id == owner,
                        AwardLedger.category == challenge.category,
                        AwardLedger.created_at >= challenge.starts_at,
                        AwardLedger.created_at < challenge.ends_at,
                    )
                )
            )
            or 0,
        )
