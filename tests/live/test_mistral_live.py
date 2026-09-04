from __future__ import annotations

import asyncio
import json
import os
import time
from pathlib import Path

import pytest

from app.integrations.mistral.client import MistralOcrClient
from app.integrations.mistral.ocr_provider import MistralOcrProvider


@pytest.mark.live
def test_mistral_ocr_manifest_live(record_property) -> None:
    api_key = os.getenv("MISTRAL_API_KEY")
    manifest_path = os.getenv("BONYAN_LIVE_OCR_MANIFEST")
    if not api_key or not manifest_path:
        pytest.skip("MISTRAL_API_KEY and BONYAN_LIVE_OCR_MANIFEST are required")
    manifest = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
    assert {case["id"] for case in manifest["cases"]} >= {
        "image",
        "native_pdf",
        "scanned_pdf",
        "low_quality",
        "missing_fields",
        "alternate_layout",
    }
    provider = MistralOcrProvider(MistralOcrClient(api_key=api_key))

    for case in manifest["cases"]:
        report_path = Path(case["path"])
        started = time.perf_counter()
        result = asyncio.run(
            provider.extract(
                content=report_path.read_bytes(),
                content_type=case["content_type"],
                filename=report_path.name,
            )
        )
        latency_ms = round((time.perf_counter() - started) * 1000, 2)
        actual = {item.key.value: item.value for item in result.measurements}
        hallucinated = 0
        for key, expected in case["expected"].items():
            if expected is None:
                hallucinated += int(actual.get(key) is not None)
                assert actual.get(key) is None
            else:
                assert actual.get(key) == pytest.approx(expected, abs=0.1)
        record_property(f"{case['id']}_latency_ms", latency_ms)
        record_property(f"{case['id']}_hallucinated_fields", hallucinated)
