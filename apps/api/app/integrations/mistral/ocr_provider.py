from __future__ import annotations

import re
from typing import Protocol

from app.domains.inbody.schemas import (
    InBodyMeasurement,
    InBodyMetricKey,
    InBodyResult,
    MeasurementMetadata,
)
from app.domains.inbody.validation import normalize_unit
from app.integrations.mistral.client import MistralOcrClient


class OcrProvider(Protocol):
    async def extract(
        self,
        *,
        content: bytes,
        content_type: str,
        filename: str,
    ) -> InBodyResult: ...


class MistralOcrProvider:
    def __init__(self, client: MistralOcrClient | None = None) -> None:
        self.client = client or MistralOcrClient()

    async def extract(self, *, content: bytes, content_type: str, filename: str) -> InBodyResult:
        raw = await self.client.extract_document(
            content=content,
            content_type=content_type,
            filename=filename,
        )
        return map_mistral_ocr_to_inbody(raw)


_FIELD_PATTERNS = {
    InBodyMetricKey.HEIGHT: re.compile(
        r"height\s*[:\-]?\s*(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>cm|in)",
        re.I,
    ),
    InBodyMetricKey.WEIGHT: re.compile(
        r"weight\s*[:\-]?\s*(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>kg|lb|lbs)",
        re.I,
    ),
    InBodyMetricKey.SKELETAL_MUSCLE_MASS: re.compile(
        r"skeletal\s+muscle\s+mass\s*[:\-]?\s*(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>kg|lb|lbs)",
        re.I,
    ),
    InBodyMetricKey.BODY_FAT_MASS: re.compile(
        r"body\s+fat\s+mass\s*[:\-]?\s*(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>kg|lb|lbs)",
        re.I,
    ),
    InBodyMetricKey.BODY_FAT_PERCENTAGE: re.compile(
        r"(?:percent\s+body\s+fat|body\s+fat\s+percentage|pbf)\s*[:\-]?\s*(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>%|percent)?",
        re.I,
    ),
    InBodyMetricKey.BMI: re.compile(r"\bbmi\s*[:\-]?\s*(?P<value>\d+(?:\.\d+)?)", re.I),
    InBodyMetricKey.TOTAL_BODY_WATER: re.compile(
        r"total\s+body\s+water\s*[:\-]?\s*(?P<value>\d+(?:\.\d+)?)\s*(?P<unit>l|kg)",
        re.I,
    ),
    InBodyMetricKey.VISCERAL_FAT_LEVEL: re.compile(
        r"visceral\s+fat\s+level\s*[:\-]?\s*(?P<value>\d+(?:\.\d+)?)", re.I
    ),
    InBodyMetricKey.INBODY_SCORE: re.compile(
        r"inbody\s+score\s*[:\-]?\s*(?P<value>\d+(?:\.\d+)?)", re.I
    ),
}


def map_mistral_ocr_to_inbody(raw: dict[str, object]) -> InBodyResult:
    if "measurements" in raw:
        return InBodyResult.model_validate(raw)

    text = _extract_text(raw)
    measurements: list[InBodyMeasurement] = []
    for key, pattern in _FIELD_PATTERNS.items():
        match = pattern.search(text)
        if not match:
            measurements.append(InBodyMeasurement(key=key, value=None, unit=None))
            continue
        unit = match.groupdict().get("unit")
        measurements.append(
            InBodyMeasurement(
                key=key,
                value=float(match.group("value")),
                unit=normalize_unit(unit) or _default_unit(key),
                metadata=MeasurementMetadata(confidence=None),
            )
        )
    return InBodyResult(measurements=measurements)


def _extract_text(raw: dict[str, object]) -> str:
    pages = raw.get("pages")
    if isinstance(pages, list):
        return "\n".join(
            str(page.get("markdown") or page.get("text") or "")
            for page in pages
            if isinstance(page, dict)
        )
    return str(raw.get("text") or raw.get("markdown") or "")


def _default_unit(key: InBodyMetricKey) -> str | None:
    if key in {InBodyMetricKey.BMI}:
        return None
    if key == InBodyMetricKey.BODY_FAT_PERCENTAGE:
        return "%"
    if key == InBodyMetricKey.VISCERAL_FAT_LEVEL:
        return "level"
    if key == InBodyMetricKey.INBODY_SCORE:
        return "score"
    return None
