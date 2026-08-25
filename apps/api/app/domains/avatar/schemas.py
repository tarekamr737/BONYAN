from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.domains.avatar.contracts import AvatarState


class CreateAvatarRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    style: str = Field(default="respectful athletic body figure", min_length=3, max_length=160)

    @field_validator("style")
    @classmethod
    def normalize_style(cls, value: str) -> str:
        return " ".join(value.split())


class AvatarPublicationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    enabled: bool


class AvatarView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    state: AvatarState
    style: str
    preview_url: str | None
    approved: bool
    public_in_community: bool
    failure_code: str | None
    measurement_source: str
    measurements_recorded_at: datetime
    created_at: datetime
    updated_at: datetime


class AvatarListView(BaseModel):
    items: list[AvatarView]


class AvatarMeasurementStatusView(BaseModel):
    available: bool
    source: str | None
    recorded_at: datetime | None
    body_fat_available: bool = False
    muscle_mass_available: bool = False
