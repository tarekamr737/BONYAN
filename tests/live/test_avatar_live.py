from __future__ import annotations

import asyncio
import json
import os
import time
from datetime import UTC, datetime
from pathlib import Path

import pytest

from app.domains.avatar.contracts import (
    AvatarGenerationRequest,
    AvatarSourceImage,
    BodyAvatarPresentation,
    BodyAvatarStyle,
    BodyMetricsSnapshot,
    BodyMetricsSource,
)
from app.domains.avatar.validation import validate_generated_image, validate_source_image
from app.integrations.avatar.production import ProductionAvatarProvider

ROOT = Path(__file__).resolve().parents[2]
CANDIDATES = json.loads(
    (ROOT / "docs/benchmarks/avatar-candidates.json").read_text(encoding="utf-8")
)["candidates"]


@pytest.mark.live
@pytest.mark.parametrize("candidate", CANDIDATES, ids=lambda item: item["model"])
def test_avatar_candidate_live(candidate, record_property) -> None:
    api_key = os.getenv("AVATAR_API_KEY")
    manifest_path = os.getenv("BONYAN_LIVE_AVATAR_MANIFEST")
    if not api_key or not manifest_path:
        pytest.skip("AVATAR_API_KEY and BONYAN_LIVE_AVATAR_MANIFEST are required")
    manifest = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
    if manifest.get("consent_confirmed") is not True:
        pytest.skip("source-image consent must be explicitly confirmed")
    source_path = Path(manifest["source_path"])
    source = validate_source_image(source_path.read_bytes(), manifest["media_type"])
    provider = ProductionAvatarProvider(api_key=api_key, model=candidate["model"])
    generation_request = AvatarGenerationRequest(
        metrics=BodyMetricsSnapshot(
            height_cm=178,
            weight_kg=82,
            body_fat_percentage=18,
            skeletal_muscle_mass_kg=36,
            recorded_at=datetime.now(UTC),
            source=BodyMetricsSource.PROFILE,
        ),
        style=BodyAvatarStyle.CINEMATIC_3D,
        presentation=BodyAvatarPresentation.MEN,
        source_image=AvatarSourceImage(source.content, source.media_type),
    )

    started = time.perf_counter()
    result = asyncio.run(provider.generate(generation_request))
    latency_ms = round((time.perf_counter() - started) * 1000, 2)

    validate_generated_image(result.content, result.media_type)
    record_property("model", candidate["model"])
    record_property("latency_ms", latency_ms)
    record_property("estimated_cost_usd", result.estimated_cost_usd or 0)
