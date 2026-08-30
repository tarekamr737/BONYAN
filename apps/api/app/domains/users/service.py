from __future__ import annotations

from dataclasses import dataclass

from app.core.errors import AppError
from app.domains.users.repository import ProfileRepository
from app.domains.users.schemas import ProfileFields, ProfileUpdate, UserProfileView


@dataclass(slots=True)
class ProfileService:
    repository: ProfileRepository

    async def get(self, owner_id: str) -> UserProfileView:
        profile = await self.repository.get(owner_id)
        if profile is None:
            return UserProfileView()
        return UserProfileView.model_validate(profile)

    async def update(self, owner_id: str, request: ProfileUpdate) -> UserProfileView:
        existing = await self.get(owner_id)
        changes = request.model_dump(exclude_unset=True, mode="python")
        existing_fields = existing.model_dump(exclude={"created_at", "updated_at"}, mode="python")
        candidate = ProfileFields.model_validate({**existing_fields, **changes})
        if candidate.onboarding_completed:
            self._require_onboarding_fields(candidate)
        profile = await self.repository.upsert(owner_id, changes)
        return UserProfileView.model_validate(profile)

    @staticmethod
    def _require_onboarding_fields(profile: ProfileFields) -> None:
        required = {
            "display_name": profile.display_name,
            "training_goal": profile.training_goal,
            "experience_level": profile.experience_level,
            "available_training_days": profile.available_training_days,
            "available_equipment": profile.available_equipment or None,
        }
        missing = [field for field, value in required.items() if value is None]
        if missing:
            raise AppError(
                "onboarding_incomplete",
                "Complete the required profile fields before finishing onboarding.",
                422,
            )
