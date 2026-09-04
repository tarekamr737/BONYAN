from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domains.avatar.contracts import AvatarState, BodyAvatarPresentation, BodyAvatarStyle


class CreateAvatarRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    style: BodyAvatarStyle = BodyAvatarStyle.CINEMATIC_3D
    presentation: BodyAvatarPresentation = BodyAvatarPresentation.MEN
    source_photo_id: UUID | None = None


class AvatarSourcePhotoView(BaseModel):
    id: UUID


class AvatarPublicationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    enabled: bool


class ManualBodyMeasurementsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    height_cm: float = Field(ge=100, le=240)
    weight_kg: float = Field(ge=30, le=350)
    body_fat_percentage: float | None = Field(default=None, ge=2, le=70)
    skeletal_muscle_mass_kg: float | None = Field(default=None, ge=5, le=150)

    @model_validator(mode="after")
    def validate_muscle_mass(self) -> ManualBodyMeasurementsRequest:
        if (
            self.skeletal_muscle_mass_kg is not None
            and self.skeletal_muscle_mass_kg >= self.weight_kg
        ):
            raise ValueError("skeletal muscle mass must be lower than body weight")
        return self


class AvatarView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    state: AvatarState
    style: str
    presentation: str
    shape_profile: str
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
    shape_profile: str | None = None
