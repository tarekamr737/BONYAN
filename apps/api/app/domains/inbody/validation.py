from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import PurePosixPath

from app.domains.inbody.schemas import InBodyMeasurement, InBodyMetricKey

MAX_IMAGE_BYTES = 8 * 1024 * 1024
MAX_PDF_BYTES = 12 * 1024 * 1024
MAX_UPLOAD_BYTES = max(MAX_IMAGE_BYTES, MAX_PDF_BYTES)
MAX_PDF_PAGES = 25
SUPPORTED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
}

_UNIT_ALIASES = {
    "kgs": "kg",
    "kilogram": "kg",
    "kilograms": "kg",
    "lbs": "lb",
    "pounds": "lb",
    "cm.": "cm",
    "%": "%",
    "percent": "%",
    "percentage": "%",
    "score": "score",
    "level": "level",
}

_EXPECTED_UNITS = {
    InBodyMetricKey.HEIGHT: {"cm", "in"},
    InBodyMetricKey.WEIGHT: {"kg", "lb"},
    InBodyMetricKey.SKELETAL_MUSCLE_MASS: {"kg", "lb"},
    InBodyMetricKey.BODY_FAT_MASS: {"kg", "lb"},
    InBodyMetricKey.BODY_FAT_PERCENTAGE: {"%"},
    InBodyMetricKey.BMI: {None},
    InBodyMetricKey.TOTAL_BODY_WATER: {"l", "kg"},
    InBodyMetricKey.VISCERAL_FAT_LEVEL: {"level"},
    InBodyMetricKey.INBODY_SCORE: {"score"},
}

_PLAUSIBLE_RANGES = {
    InBodyMetricKey.HEIGHT: (90, 250),
    InBodyMetricKey.WEIGHT: (20, 350),
    InBodyMetricKey.SKELETAL_MUSCLE_MASS: (5, 80),
    InBodyMetricKey.BODY_FAT_MASS: (1, 160),
    InBodyMetricKey.BODY_FAT_PERCENTAGE: (1, 75),
    InBodyMetricKey.BMI: (8, 80),
    InBodyMetricKey.TOTAL_BODY_WATER: (5, 120),
    InBodyMetricKey.VISCERAL_FAT_LEVEL: (1, 30),
    InBodyMetricKey.INBODY_SCORE: (1, 150),
}


@dataclass(frozen=True)
class FileValidationResult:
    content_hash: str
    byte_size: int


def normalize_unit(unit: str | None) -> str | None:
    if unit is None:
        return None
    compact = unit.strip().lower()
    if not compact:
        return None
    return _UNIT_ALIASES.get(compact, compact)


def is_supported_upload(content_type: str, byte_size: int, content: bytes) -> bool:
    if content_type not in SUPPORTED_CONTENT_TYPES:
        return False
    byte_limit = MAX_PDF_BYTES if content_type == "application/pdf" else MAX_IMAGE_BYTES
    if byte_size <= 0 or byte_size > byte_limit:
        return False
    if content_type == "application/pdf":
        page_count = len(re.findall(rb"/Type\s*/Page\b", content))
        return content.startswith(b"%PDF") and page_count <= MAX_PDF_PAGES
    if content_type == "image/png":
        return content.startswith(b"\x89PNG\r\n\x1a\n")
    if content_type == "image/jpeg":
        return content.startswith(b"\xff\xd8\xff")
    if content_type == "image/webp":
        return content.startswith(b"RIFF") and content[8:12] == b"WEBP"
    return False


def normalize_upload_filename(filename: str) -> str:
    normalized = filename.strip().replace("\\", "/")
    basename = PurePosixPath(normalized).name
    if (
        not basename
        or basename in {".", ".."}
        or len(basename) > 255
        or any(ord(character) < 32 for character in basename)
    ):
        return "inbody-report"
    return basename


def validate_measurement(measurement: InBodyMeasurement) -> InBodyMeasurement:
    flags = list(dict.fromkeys(measurement.metadata.flags))
    unit = normalize_unit(measurement.unit)

    if measurement.value is None:
        flags.append("missing")
    else:
        if measurement.value < 0:
            flags.append("negative_value")
        min_value, max_value = _PLAUSIBLE_RANGES[measurement.key]
        if not (min_value <= measurement.value <= max_value):
            flags.append("implausible_value")

    expected = _EXPECTED_UNITS[measurement.key]
    if unit not in expected:
        flags.append("unknown_unit")

    if measurement.metadata.confidence is not None and measurement.metadata.confidence < 0.8:
        flags.append("low_confidence")

    unique_flags = list(dict.fromkeys(flags))
    return measurement.model_copy(
        update={
            "unit": unit,
            "metadata": measurement.metadata.model_copy(update={"flags": unique_flags}),
        },
        deep=True,
    )
