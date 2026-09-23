from __future__ import annotations

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class CoachingPreferences(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    military_subtype: Literal["military_college", "other", "undecided"] | None = None
    target_date: date | None = None
    body_data_source: Literal["manual", "inbody"] | None = None
    focus: Literal["consistency", "endurance", "strength", "body_composition"] | None = None
    fitness_level: Literal["starting", "building", "established"] | None = None
    active_days_per_week: int | None = Field(default=None, ge=0, le=7)
    running_minutes: float | None = Field(default=None, ge=0, le=180)
    running_target_minutes: float | None = Field(default=None, gt=0, le=180)
    pushups: int | None = Field(default=None, ge=0, le=200)
    pushups_target: int | None = Field(default=None, gt=0, le=200)
    situps: int | None = Field(default=None, ge=0, le=300)
    situps_target: int | None = Field(default=None, gt=0, le=300)
    pullups: int | None = Field(default=None, ge=0, le=100)
    pullups_target: int | None = Field(default=None, gt=0, le=100)
    limitations: str | None = Field(default=None, max_length=500)
    target_weight_kg: float | None = Field(default=None, ge=30, le=350)


class BodyMeasurements(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    height_cm: float | None = Field(default=None, ge=80, le=250)
    weight_kg: float | None = Field(default=None, ge=30, le=350)
    body_fat_percentage: float | None = Field(default=None, ge=2, le=70)
    skeletal_muscle_mass_kg: float | None = Field(default=None, ge=5, le=150)

    @model_validator(mode="after")
    def coherent_mass(self) -> BodyMeasurements:
        if (
            self.weight_kg is not None
            and self.skeletal_muscle_mass_kg is not None
            and self.skeletal_muscle_mass_kg >= self.weight_kg
        ):
            raise ValueError("Muscle mass must be lower than total weight.")
        return self


class AssessmentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    request_id: UUID
    source: Literal["manual", "inbody"]
    measurements: BodyMeasurements | None = None
    inbody_scan_id: UUID | None = None

    @model_validator(mode="after")
    def source_matches_payload(self) -> AssessmentRequest:
        if self.source == "manual":
            if self.inbody_scan_id is not None or self.measurements is None:
                raise ValueError("Enter your measurements for a manual assessment.")
            if self.measurements.weight_kg is None or self.measurements.height_cm is None:
                raise ValueError("Add your height and weight.")
        elif self.inbody_scan_id is None or self.measurements is not None:
            raise ValueError("Choose a confirmed InBody report.")
        return self


class ScoreDimension(BaseModel):
    key: str
    value: int
    weight: float
    basis: str


class CoachingScore(BaseModel):
    version: str = "personal-targets-v1"
    value: int | None
    coverage: int
    dimensions: list[ScoreDimension]
    missing: list[str]
    strongest: str | None
    improve: str | None
    recommendation: str


class HistoryView(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    kind: str
    snapshot: dict[str, object]
    created_at: datetime


class AssessmentOverview(BaseModel):
    score: CoachingScore
    latest: HistoryView | None
    completion: int
    missing_profile: list[str]
