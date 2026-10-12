from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import case, func, select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.domains.game.models import AwardLedger, GameEvent, ProgressSnapshot, Season, WeeklyTargets
from app.domains.game.rules import RULES_VERSION, season_bounds, week_start
from app.domains.users.repository import SqlAlchemyProfileRepository


class GameRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def lock(self, owner: str):
        await self.session.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
            {"key": f"game:{owner}"},
        )

    async def season(self, now: datetime) -> Season:
        day = now.date()
        existing = await self.session.scalar(
            select(Season)
            .where(Season.starts_at <= day, Season.ends_at > day)
            .order_by(Season.starts_at.desc())
            .limit(1)
        )
        if existing:
            return existing
        await self.session.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended('game-season', 0))")
        )
        existing = await self.session.scalar(
            select(Season).where(Season.starts_at <= day, Season.ends_at > day).limit(1)
        )
        if existing:
            return existing
        start, end = season_bounds(day, get_settings().game_season_days)
        await self.session.execute(
            insert(Season)
            .values(id=str(start), starts_at=start, ends_at=end, rules_version=RULES_VERSION)
            .on_conflict_do_nothing()
        )
        return await self.session.get(Season, str(start))

    async def targets(self, owner: str, now: datetime) -> WeeklyTargets:
        week = week_start(now)
        profile = await SqlAlchemyProfileRepository(self.session).get(owner)
        values = {
            "owner_id": owner,
            "week_start": week,
            "timezone": profile.timezone if profile else "UTC",
            "workout_days": max(
                2, min(6, (profile.available_training_days if profile else None) or 3)
            ),
            "experience": (profile.experience_level if profile else None) or "beginner",
            "goal": (profile.training_goal if profile else None) or "general_fitness",
            "league_opt_in": False,
        }
        await self.session.execute(insert(WeeklyTargets).values(**values).on_conflict_do_nothing())
        return await self.session.scalar(
            select(WeeklyTargets)
            .where(WeeklyTargets.owner_id == owner, WeeklyTargets.week_start == week)
            .with_for_update()
        )

    async def source(self, owner: str, source: str) -> GameEvent | None:
        return await self.session.scalar(
            select(GameEvent).where(GameEvent.owner_id == owner, GameEvent.source_key == source)
        )

    async def credited(
        self, owner: str, kind: str, week: date | None, day: date | None = None
    ) -> int:
        statement = (
            select(func.count())
            .select_from(GameEvent)
            .where(
                GameEvent.owner_id == owner, GameEvent.kind == kind, GameEvent.eligible.is_(True)
            )
        )
        if week:
            statement = statement.where(GameEvent.week_start == week)
        if day:
            statement = statement.where(GameEvent.local_day == day)
        return (await self.session.scalar(statement)) or 0

    async def append(
        self,
        owner: str,
        source: str,
        category: str,
        day: date,
        targets: WeeklyTargets,
        eligible: bool,
        evidence: dict,
        xp: int,
        points: int,
    ) -> GameEvent:
        event = GameEvent(
            owner_id=owner,
            source_key=source,
            kind=category,
            local_day=day,
            week_start=targets.week_start,
            timezone=targets.timezone,
            version=RULES_VERSION,
            evidence=evidence,
            eligible=eligible,
        )
        self.session.add(event)
        await self.session.flush()
        if eligible:
            self.session.add(
                AwardLedger(
                    owner_id=owner, event_id=event.id, category=category, xp=xp, points=points
                )
            )
            await self.session.flush()
        return event

    async def awards(self, owner: str, week: date | None = None) -> list[AwardLedger]:
        statement = (
            select(AwardLedger)
            .join(GameEvent, GameEvent.id == AwardLedger.event_id)
            .where(AwardLedger.owner_id == owner)
        )
        if week:
            statement = statement.where(GameEvent.week_start == week)
        return list(
            await self.session.scalars(statement.order_by(AwardLedger.created_at, AwardLedger.id))
        )

    async def badge_evidence(self, owners: list[str]) -> list[dict]:
        if not owners:
            return []
        result = await self.session.execute(
            select(
                AwardLedger.owner_id,
                GameEvent.week_start.label("week"),
                AwardLedger.category,
                func.sum(AwardLedger.xp).label("xp"),
                func.sum(case((AwardLedger.xp > 0, 1), (AwardLedger.xp < 0, -1), else_=0)).label(
                    "count"
                ),
            )
            .join(GameEvent, GameEvent.id == AwardLedger.event_id)
            .where(AwardLedger.owner_id.in_(owners), GameEvent.owner_id == AwardLedger.owner_id)
            .group_by(AwardLedger.owner_id, GameEvent.week_start, AwardLedger.category)
        )
        return [dict(row) for row in result.mappings()]

    async def revoke(self, owner: str, source: str) -> None:
        await self.lock(owner)
        original = await self.source(owner, source)
        if original is None or await self.source(owner, f"revoke:{source}"):
            return
        award = await self.session.scalar(
            select(AwardLedger).where(AwardLedger.event_id == original.id)
        )
        if award is None:
            return
        event = GameEvent(
            owner_id=owner,
            source_key=f"revoke:{source}",
            kind="revocation",
            local_day=original.local_day,
            week_start=original.week_start,
            timezone=original.timezone,
            version=RULES_VERSION,
            evidence={"reverses_event": str(original.id)},
            eligible=False,
        )
        self.session.add(event)
        await self.session.flush()
        self.session.add(
            AwardLedger(
                owner_id=owner,
                event_id=event.id,
                reverses_id=award.id,
                category=award.category,
                xp=-award.xp,
                points=-award.points,
            )
        )
        await self.session.flush()

    async def snapshot(self, owner: str, evidence_hash: str, result: dict):
        await self.session.execute(
            insert(ProgressSnapshot)
            .values(id=uuid4(), owner_id=owner, evidence_hash=evidence_hash, result=result)
            .on_conflict_do_nothing()
        )

    async def history(self, owner: str, before: UUID | None, limit: int):
        statement = select(GameEvent).where(GameEvent.owner_id == owner)
        if before:
            previous = await self.session.scalar(
                select(GameEvent).where(GameEvent.id == before, GameEvent.owner_id == owner)
            )
            if previous:
                statement = statement.where(
                    (GameEvent.created_at < previous.created_at)
                    | ((GameEvent.created_at == previous.created_at) & (GameEvent.id < previous.id))
                )
        return list(
            await self.session.scalars(
                statement.order_by(GameEvent.created_at.desc(), GameEvent.id.desc()).limit(limit)
            )
        )

    async def progress_history(self, owner: str, limit: int):
        return list(
            await self.session.scalars(
                select(ProgressSnapshot)
                .where(ProgressSnapshot.owner_id == owner)
                .order_by(ProgressSnapshot.created_at.desc(), ProgressSnapshot.id.desc())
                .limit(limit)
            )
        )
