"""Coordinate profile changes with training without coupling domain repositories."""

from sqlalchemy import update

from app.domains.training.models import WorkoutPlanRecord
from app.domains.users.models import UserProfile
from app.domains.users.repository import SqlAlchemyProfileRepository


class ConnectedProfileRepository(SqlAlchemyProfileRepository):
    async def upsert(self, owner_id: str, values: dict[str, object]) -> UserProfile:
        previous = await self.get(owner_id)
        keys = (
            "training_goal",
            "experience_level",
            "available_training_days",
            "available_equipment",
        )
        before = {key: getattr(previous, key, None) for key in keys}
        profile = await super().upsert(owner_id, values)
        if any(before[key] != getattr(profile, key) for key in keys):
            await self._session.execute(
                update(WorkoutPlanRecord)
                .where(WorkoutPlanRecord.owner_id == owner_id, WorkoutPlanRecord.status == "active")
                .values(status="archived")
            )
        return profile
