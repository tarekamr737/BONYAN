from __future__ import annotations

from datetime import UTC, date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Annotated
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator


class AuthCredentials(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=3, max_length=254)
    password: SecretStr = Field(min_length=12, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized.count("@") != 1 or any(character.isspace() for character in normalized):
            raise ValueError("email must be valid")
        local_part, domain = normalized.split("@")
        if not local_part or "." not in domain or domain.startswith(".") or domain.endswith("."):
            raise ValueError("email must be valid")
        return normalized


class AccessTokenView(BaseModel):
    access_token: str
    expires_in: int
    token_type: str = "bearer"


class Sex(StrEnum):
    FEMALE = "female"
    MALE = "male"
    UNSPECIFIED = "unspecified"


class TrainingGoal(StrEnum):
    STRENGTH = "strength"
    HYPERTROPHY = "hypertrophy"
    FAT_LOSS = "fat_loss"
    GENERAL_FITNESS = "general_fitness"


class ExperienceLevel(StrEnum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class PreferredUnits(StrEnum):
    METRIC = "metric"
    IMPERIAL = "imperial"


class ProfileFields(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str | None = Field(default=None, max_length=120)
    preferred_language: str = Field(default="en", min_length=2, max_length=16)
    date_of_birth: date | None = None
    sex: Sex | None = None
    height_cm: Annotated[Decimal | None, Field(default=None, ge=80, le=250)]
    training_goal: TrainingGoal | None = None
    experience_level: ExperienceLevel | None = None
    available_training_days: Annotated[int | None, Field(default=None, ge=2, le=6)]
    available_equipment: list[str] = Field(default_factory=list, max_length=20)
    preferred_units: PreferredUnits = PreferredUnits.METRIC
    timezone: str = Field(default="UTC", min_length=1, max_length=64)
    onboarding_completed: bool = False

    @field_validator("display_name")
    @classmethod
    def normalize_display_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = " ".join(value.split())
        return normalized or None

    @field_validator("preferred_language")
    @classmethod
    def normalize_language(cls, value: str) -> str:
        normalized = value.strip().replace("_", "-").lower()
        if not normalized or any(
            not part.isalnum() or len(part) > 8 for part in normalized.split("-")
        ):
            raise ValueError("preferred_language must be a valid language tag")
        return normalized

    @field_validator("date_of_birth")
    @classmethod
    def reject_future_birth_date(cls, value: date | None) -> date | None:
        if value is not None and value > datetime.now(UTC).date():
            raise ValueError("date_of_birth cannot be in the future")
        return value

    @field_validator("available_equipment")
    @classmethod
    def normalize_equipment(cls, value: list[str]) -> list[str]:
        normalized = sorted({item.strip().lower() for item in value if item.strip()})
        if any(len(item) > 40 for item in normalized):
            raise ValueError("equipment names cannot exceed 40 characters")
        return normalized

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: str) -> str:
        normalized = value.strip()
        try:
            ZoneInfo(normalized)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("timezone must be a valid IANA timezone") from exc
        return normalized


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str | None = Field(default=None, max_length=120)
    preferred_language: str | None = Field(default=None, min_length=2, max_length=16)
    date_of_birth: date | None = None
    sex: Sex | None = None
    height_cm: Annotated[Decimal | None, Field(default=None, ge=80, le=250)]
    training_goal: TrainingGoal | None = None
    experience_level: ExperienceLevel | None = None
    available_training_days: Annotated[int | None, Field(default=None, ge=2, le=6)]
    available_equipment: list[str] | None = Field(default=None, max_length=20)
    preferred_units: PreferredUnits | None = None
    timezone: str | None = Field(default=None, min_length=1, max_length=64)
    onboarding_completed: bool | None = None

    @field_validator("display_name")
    @classmethod
    def normalize_display_name(cls, value: str | None) -> str | None:
        return ProfileFields.normalize_display_name(value)

    @field_validator("preferred_language")
    @classmethod
    def normalize_language(cls, value: str | None) -> str | None:
        return None if value is None else ProfileFields.normalize_language(value)

    @field_validator("date_of_birth")
    @classmethod
    def reject_future_birth_date(cls, value: date | None) -> date | None:
        return ProfileFields.reject_future_birth_date(value)

    @field_validator("available_equipment")
    @classmethod
    def normalize_equipment(cls, value: list[str] | None) -> list[str] | None:
        return None if value is None else ProfileFields.normalize_equipment(value)

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: str | None) -> str | None:
        return None if value is None else ProfileFields.validate_timezone(value)


class UserProfileView(ProfileFields):
    model_config = ConfigDict(from_attributes=True)

    created_at: datetime | None = None
    updated_at: datetime | None = None
