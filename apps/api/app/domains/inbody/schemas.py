from __future__ import annotations

from datetime import date, datetime
from enum import StrEnum
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class InBodyScanStatus(StrEnum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    REVIEW_REQUIRED = "review_required"
    CONFIRMED = "confirmed"
    FAILED = "failed"
    DELETED = "deleted"


class InBodyMetricKey(StrEnum):
    HEIGHT = "height"
    WEIGHT = "weight"
    SKELETAL_MUSCLE_MASS = "skeletal_muscle_mass"
    BODY_FAT_MASS = "body_fat_mass"
    BODY_FAT_PERCENTAGE = "body_fat_percentage"
    BMI = "bmi"
    TOTAL_BODY_WATER = "total_body_water"
    VISCERAL_FAT_LEVEL = "visceral_fat_level"
    INBODY_SCORE = "inbody_score"


CONFIRMABLE_STATUSES = {
    InBodyScanStatus.REVIEW_REQUIRED,
}


class SourceLocation(BaseModel):
    page: int | None = Field(default=None, ge=1)
    label: str | None = Field(default=None, max_length=120)


class MeasurementMetadata(BaseModel):
    confidence: Annotated[float, Field(ge=0, le=1)] | None = None
    source: SourceLocation | None = None
    flags: list[str] = Field(default_factory=list)
    user_edited: bool = False


class InBodyMeasurement(BaseModel):
    key: InBodyMetricKey
    value: float | None = None
    unit: str | None = Field(default=None, max_length=24)
    metadata: MeasurementMetadata = Field(default_factory=MeasurementMetadata)

    @field_validator("unit")
    @classmethod
    def normalize_unit_label(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class SegmentalMeasurement(BaseModel):
    segment: Literal["left_arm", "right_arm", "trunk", "left_leg", "right_leg"]
    metric: str = Field(min_length=1, max_length=80)
    value: float | None = None
    unit: str | None = Field(default=None, max_length=24)
    metadata: MeasurementMetadata = Field(default_factory=MeasurementMetadata)


class InBodyResult(BaseModel):
    scan_date: date | None = None
    measurements: list[InBodyMeasurement] = Field(default_factory=list)
    segmental_measurements: list[SegmentalMeasurement] = Field(default_factory=list)
    review_flags: list[str] = Field(default_factory=list)


class InBodyScanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: InBodyScanStatus
    filename: str
    content_type: str
    created_at: datetime
    updated_at: datetime
    confirmed_at: datetime | None = None
    failure_code: str | None = None
    failure_message: str | None = None
    result: InBodyResult | None = None


class ReviewUpdate(BaseModel):
    scan_date: date | None = None
    measurements: list[InBodyMeasurement] = Field(default_factory=list)
    segmental_measurements: list[SegmentalMeasurement] = Field(default_factory=list)


class UploadResponse(BaseModel):
    scan: InBodyScanResponse
    duplicate: bool = False


class InBodyHistoryResponse(BaseModel):
    scans: list[InBodyScanResponse]


class LatestInBodyResponse(BaseModel):
    scan: InBodyScanResponse | None
