from __future__ import annotations

from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.training.models import WorkoutPlanRecord, WorkoutSessionRecord
from app.domains.training.schemas import PlanStatus, WorkoutSessionStatus


class TrainingRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def save_plan(self, *, owner_id: str, plan: dict[str, object]) -> WorkoutPlanRecord:
        if plan["status"] == PlanStatus.ACTIVE:
            await self.archive_active_plans(owner_id=owner_id)
        record = WorkoutPlanRecord(owner_id=owner_id, **plan)
        self.session.add(record)
        await self.session.flush()
        return record

    async def archive_active_plans(self, *, owner_id: str) -> None:
        await self.session.execute(
            update(WorkoutPlanRecord)
            .where(
                WorkoutPlanRecord.owner_id == owner_id,
                WorkoutPlanRecord.status == PlanStatus.ACTIVE,
            )
            .values(status=PlanStatus.ARCHIVED)
        )

    async def get_plan(self, *, owner_id: str, plan_id: UUID) -> WorkoutPlanRecord | None:
        result = await self.session.execute(
            select(WorkoutPlanRecord).where(
                WorkoutPlanRecord.owner_id == owner_id, WorkoutPlanRecord.id == plan_id
            )
        )
        return result.scalar_one_or_none()

    async def get_active_plan(self, *, owner_id: str) -> WorkoutPlanRecord | None:
        result = await self.session.execute(
            select(WorkoutPlanRecord)
            .where(
                WorkoutPlanRecord.owner_id == owner_id,
                WorkoutPlanRecord.status == PlanStatus.ACTIVE,
            )
            .order_by(WorkoutPlanRecord.created_at.desc())
        )
        return result.scalars().first()

    async def create_session(
        self, *, owner_id: str, plan_id: UUID, day_key: str
    ) -> WorkoutSessionRecord:
        record = WorkoutSessionRecord(
            owner_id=owner_id,
            plan_id=plan_id,
            day_key=day_key,
            status=WorkoutSessionStatus.ACTIVE,
            logged_sets=[],
            summary={},
        )
        self.session.add(record)
        await self.session.flush()
        return record

    async def get_session(self, *, owner_id: str, session_id: UUID) -> WorkoutSessionRecord | None:
        result = await self.session.execute(
            select(WorkoutSessionRecord).where(
                WorkoutSessionRecord.owner_id == owner_id, WorkoutSessionRecord.id == session_id
            )
        )
        return result.scalar_one_or_none()

    async def list_sessions(self, *, owner_id: str, limit: int = 10) -> list[WorkoutSessionRecord]:
        result = await self.session.execute(
            select(WorkoutSessionRecord)
            .where(WorkoutSessionRecord.owner_id == owner_id)
            .order_by(WorkoutSessionRecord.started_at.desc())
            .limit(limit)
        )
        return list(result.scalars())
