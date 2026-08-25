from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field

from app.domains.inbody.schemas import InBodyMeasurement, SegmentalMeasurement


class MistralExtractedInBody(BaseModel):
    scan_date: date | None = None
    measurements: list[InBodyMeasurement] = Field(default_factory=list)
    segmental_measurements: list[SegmentalMeasurement] = Field(default_factory=list)
    review_flags: list[str] = Field(default_factory=list)
