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
        if changes.get("home_tour_completed") and not existing.home_tour_completed:
            from datetime import UTC, datetime

            changes["home_tour_completed_at"] = datetime.now(UTC)
        if "coaching" in changes:
            changes["coaching"] = (
                {
                    **existing.coaching.model_dump(mode="json"),
                    **request.coaching.model_dump(mode="json", exclude_unset=True),
                }
                if request.coaching
                else {}
            )
            changes["coaching"]["body_data_source"] = existing.coaching.body_data_source
        if "training_goal" in changes and changes["training_goal"] != existing.training_goal:
            coaching = dict(changes.get("coaching", existing.coaching.model_dump(mode="json")))
            if changes["training_goal"] != "military_preparation":
                coaching.update(
                    military_subtype=None,
                    target_date=None,
                    situps=None,
                    situps_target=None,
                    pullups=None,
                    pullups_target=None,
                    limitations=None,
                )
            if changes["training_goal"] != "fat_loss":
                coaching["target_weight_kg"] = None
            changes["coaching"] = coaching
        existing_fields = existing.model_dump(
            exclude={
                "created_at",
                "updated_at",
                "has_profile_photo",
                "profile_photo_updated_at",
            },
            mode="python",
        )
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
        if (
            profile.training_goal == "military_preparation"
            and not profile.coaching.military_subtype
        ):
            missing.append("military_subtype")
        if missing:
            raise AppError(
                "onboarding_incomplete",
                "Complete the required profile fields before finishing onboarding.",
                422,
            )
