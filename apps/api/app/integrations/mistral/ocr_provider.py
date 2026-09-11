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

    raw_text = _extract_text(raw)
    table_facts = _extract_markdown_table_facts(raw_text)
    key_value_facts = _extract_key_value_facts(raw_text)
    text = _normalize_ocr_text(f"{table_facts}\n{key_value_facts}\n{raw_text}")
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
    _derive_missing_bmi(measurements)
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


def _normalize_ocr_text(text: str) -> str:
    without_markdown_separators = re.sub(r"[*_`|#]+", " ", text)
    return re.sub(r"\s+", " ", without_markdown_separators)


_TABLE_FIELD_ALIASES = {
    InBodyMetricKey.HEIGHT: {"height"},
    InBodyMetricKey.WEIGHT: {"weight"},
    InBodyMetricKey.SKELETAL_MUSCLE_MASS: {"skeletal muscle mass", "smm"},
    InBodyMetricKey.BODY_FAT_MASS: {"body fat mass", "bfm"},
    InBodyMetricKey.BODY_FAT_PERCENTAGE: {
        "percent body fat",
        "body fat percentage",
        "pbf",
    },
    InBodyMetricKey.BMI: {"bmi"},
    InBodyMetricKey.TOTAL_BODY_WATER: {"total body water", "tbw"},
    InBodyMetricKey.VISCERAL_FAT_LEVEL: {"visceral fat level"},
    InBodyMetricKey.INBODY_SCORE: {"inbody score"},
}
_TABLE_CANONICAL_LABELS = {
    InBodyMetricKey.HEIGHT: "height",
    InBodyMetricKey.WEIGHT: "weight",
    InBodyMetricKey.SKELETAL_MUSCLE_MASS: "skeletal muscle mass",
    InBodyMetricKey.BODY_FAT_MASS: "body fat mass",
    InBodyMetricKey.BODY_FAT_PERCENTAGE: "pbf",
    InBodyMetricKey.BMI: "bmi",
    InBodyMetricKey.TOTAL_BODY_WATER: "total body water",
    InBodyMetricKey.VISCERAL_FAT_LEVEL: "visceral fat level",
    InBodyMetricKey.INBODY_SCORE: "inbody score",
}
_TABLE_NUMBER = re.compile(r"(?<![\w.])\d+(?:\.\d+)?")
_TABLE_UNIT = re.compile(r"(?<!\w)(cm|in|kg|lb|lbs|l|%)(?!\w)", re.I)


def _extract_markdown_table_facts(text: str) -> str:
    blocks: list[list[list[str]]] = []
    current: list[list[str]] = []
    for line in text.splitlines():
        if "|" not in line:
            if current:
                blocks.append(current)
                current = []
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) >= 2 and not all(re.fullmatch(r"\s*:?-{3,}:?\s*", cell) for cell in cells):
            current.append(cells)
    if current:
        blocks.append(current)

    candidates: dict[InBodyMetricKey, list[tuple[int, str, str | None]]] = {}
    for rows in blocks:
        for row_index, cells in enumerate(rows):
            for column_index, cell in enumerate(cells):
                key = _table_field_key(cell)
                if key is None:
                    continue
                following = cells[column_index + 1 :]
                numeric_cells = [
                    (candidate, list(_TABLE_NUMBER.finditer(candidate)))
                    for candidate in following
                    if not _is_unit_only_cell(candidate)
                    and _TABLE_NUMBER.search(candidate) is not None
                ]
                priority = len(numeric_cells)
                if numeric_cells:
                    _, matches = numeric_cells[-1]
                    value = matches[0].group(0)
                    unit_source = " ".join(following)
                else:
                    value = ""
                    selected_cell = ""
                    for later_row in rows[row_index + 1 :]:
                        if column_index < len(later_row):
                            selected_cell = later_row[column_index]
                            value_match = _TABLE_NUMBER.search(selected_cell)
                            if value_match:
                                value = value_match.group(0)
                                break
                    if not value:
                        continue
                    priority = 0
                    unit_source = selected_cell
                unit_match = _TABLE_UNIT.search(unit_source)
                candidates.setdefault(key, []).append(
                    (priority, value, unit_match.group(1) if unit_match else _default_unit(key))
                )

    facts: list[str] = []
    for key, options in candidates.items():
        reliable_options = [option for option in options if option[0] <= 8]
        if not reliable_options:
            continue
        _, value, unit = min(reliable_options, key=lambda option: option[0])
        facts.append(f"{_TABLE_CANONICAL_LABELS[key]}: {value} {unit or ''}")
    return "\n".join(facts)


def _is_unit_only_cell(cell: str) -> bool:
    normalized = re.sub(r"[()\s]", "", cell.lower())
    return normalized in {
        "%",
        "cm",
        "in",
        "kg",
        "lb",
        "lbs",
        "l",
        "kg/m2",
        "kg/m²",
    }


def _table_field_key(cell: str) -> InBodyMetricKey | None:
    normalized = re.sub(r"[^a-z%]+", " ", cell.lower()).strip()
    for key, aliases in _TABLE_FIELD_ALIASES.items():
        if any(
            normalized == alias
            or normalized.startswith(f"{alias} ")
            or normalized.endswith(f" {alias}")
            for alias in aliases
        ):
            return key
    return None


_KEY_VALUE_FIELDS = {
    InBodyMetricKey.HEIGHT: ("height_cm", "cm"),
    InBodyMetricKey.WEIGHT: ("weight_kg", "kg"),
    InBodyMetricKey.SKELETAL_MUSCLE_MASS: ("skeletal_muscle_mass_kg", "kg"),
    InBodyMetricKey.BODY_FAT_MASS: ("body_fat_mass_kg", "kg"),
    InBodyMetricKey.BODY_FAT_PERCENTAGE: ("percent_body_fat", "%"),
    InBodyMetricKey.BMI: ("bmi_kg_m2", None),
    InBodyMetricKey.TOTAL_BODY_WATER: ("total_body_water_l", "l"),
    InBodyMetricKey.INBODY_SCORE: ("inbody_score", "score"),
}


def _extract_key_value_facts(text: str) -> str:
    facts: list[str] = []
    for key, (source_label, unit) in _KEY_VALUE_FIELDS.items():
        match = re.search(
            rf"(?im)^\s*{re.escape(source_label)}\s*:\s*(\d+(?:\.\d+)?)\s*$",
            text,
        )
        if match:
            facts.append(
                f"{_TABLE_CANONICAL_LABELS[key]}: {match.group(1)} {unit or ''}"
            )
    return "\n".join(facts)


def _derive_missing_bmi(measurements: list[InBodyMeasurement]) -> None:
    by_key = {measurement.key: measurement for measurement in measurements}
    bmi = by_key.get(InBodyMetricKey.BMI)
    height = by_key.get(InBodyMetricKey.HEIGHT)
    weight = by_key.get(InBodyMetricKey.WEIGHT)
    if (
        bmi is None
        or bmi.value is not None
        or height is None
        or height.value is None
        or height.value <= 0
        or weight is None
        or weight.value is None
    ):
        return
    height_metres = height.value / 100
    derived = round(weight.value / (height_metres * height_metres), 1)
    measurements[measurements.index(bmi)] = bmi.model_copy(
        update={
            "value": derived,
            "metadata": bmi.metadata.model_copy(update={"flags": ["derived"]}),
        },
        deep=True,
    )


def _default_unit(key: InBodyMetricKey) -> str | None:
    if key == InBodyMetricKey.HEIGHT:
        return "cm"
    if key in {
        InBodyMetricKey.WEIGHT,
        InBodyMetricKey.SKELETAL_MUSCLE_MASS,
        InBodyMetricKey.BODY_FAT_MASS,
    }:
        return "kg"
    if key == InBodyMetricKey.TOTAL_BODY_WATER:
        return "l"
    if key == InBodyMetricKey.BMI:
        return None
    if key == InBodyMetricKey.BODY_FAT_PERCENTAGE:
        return "%"
    if key == InBodyMetricKey.VISCERAL_FAT_LEVEL:
        return "level"
    if key == InBodyMetricKey.INBODY_SCORE:
        return "score"
    return None
