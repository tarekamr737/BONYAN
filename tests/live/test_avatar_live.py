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
from app.integrations.avatar.cloudflare import CloudflareFluxAvatarProvider
from app.integrations.avatar.openrouter import OpenRouterAvatarProvider
from app.integrations.avatar.production import ProductionAvatarProvider

ROOT = Path(__file__).resolve().parents[2]
CANDIDATES = json.loads(
    (ROOT / "docs/benchmarks/avatar-candidates.json").read_text(encoding="utf-8")
)["candidates"]


@pytest.mark.live
@pytest.mark.parametrize("candidate", CANDIDATES, ids=lambda item: item["model"])
def test_avatar_candidate_live(candidate, record_property) -> None:
    manifest_path = os.getenv("BONYAN_LIVE_AVATAR_MANIFEST")
    if not manifest_path:
        pytest.skip("BONYAN_LIVE_AVATAR_MANIFEST is required")
    manifest = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
    if manifest.get("consent_confirmed") is not True:
        pytest.skip("source-image consent must be explicitly confirmed")
    source_path = Path(manifest["source_path"])
    source = validate_source_image(source_path.read_bytes(), manifest["media_type"])
    provider_name = os.getenv("AVATAR_PROVIDER")
    if provider_name == "cloudflare":
        account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID")
        api_token = os.getenv("CLOUDFLARE_API_TOKEN")
        if not account_id or not api_token:
            pytest.skip("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required")
        provider = CloudflareFluxAvatarProvider(
            account_id=account_id, api_token=api_token, model=candidate["model"]
        )
    elif provider_name == "openrouter":
        api_key = os.getenv("OPENROUTER_AVATAR_API_KEY") or os.getenv(
            "OPENROUTER_avatar_API_KEY"
        )
        if not api_key:
            pytest.skip("OPENROUTER_AVATAR_API_KEY is required")
        provider = OpenRouterAvatarProvider(
            api_key=api_key,
            model=candidate["model"],
            base_url=os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
            timeout_seconds=float(os.getenv("BONYAN_LIVE_AVATAR_TIMEOUT_SECONDS", "45")),
        )
    else:
        api_key = os.getenv("AVATAR_API_KEY")
        if not api_key:
            pytest.skip("AVATAR_API_KEY is required for the legacy Gemini adapter")
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
    output_directory = manifest.get("output_directory")
    if output_directory:
        destination = Path(output_directory)
        destination.mkdir(parents=True, exist_ok=True)
        suffix = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
        }[result.media_type]
        model_slug = candidate["model"].replace("/", "-")
        output_path = destination / (
            f"avatar-{model_slug}-{datetime.now(UTC).strftime('%Y%m%dT%H%M%S%fZ')}{suffix}"
        )
        output_path.write_bytes(result.content)
        record_property("output_path", str(output_path))
    record_property("model", candidate["model"])
    record_property("latency_ms", latency_ms)
    record_property("estimated_cost_usd", result.estimated_cost_usd or 0)
