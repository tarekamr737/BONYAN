from __future__ import annotations

import asyncio
import base64
from datetime import UTC, datetime

import pytest

from app.domains.avatar.contracts import (
    AvatarGenerationRequest,
    AvatarProviderError,
    AvatarSourceImage,
    BodyAvatarPresentation,
    BodyAvatarStyle,
    BodyMetricsSnapshot,
    BodyMetricsSource,
)
from app.integrations.avatar.production import ProductionAvatarProvider

PNG = b"\x89PNG\r\n\x1a\nprivate-image"
METRICS = BodyMetricsSnapshot(
    height_cm=178,
    weight_kg=82,
    body_fat_percentage=18,
    skeletal_muscle_mass_kg=36,
    recorded_at=datetime(2026, 9, 4, tzinfo=UTC),
    source=BodyMetricsSource.INBODY,
)


def run(coro):
    return asyncio.run(coro)


def avatar_request(*, with_source: bool = True) -> AvatarGenerationRequest:
    source = AvatarSourceImage(PNG, "image/png") if with_source else None
    return AvatarGenerationRequest(
        metrics=METRICS,
        style=BodyAvatarStyle.CINEMATIC_3D,
        presentation=BodyAvatarPresentation.MEN,
        source_image=source,
    )


def test_requires_private_source_image() -> None:
    provider = ProductionAvatarProvider(
        api_key="secret", model="gemini-3.1-flash-image", post_json=lambda payload: {}
    )

    with pytest.raises(AvatarProviderError) as error:
        run(provider.generate(avatar_request(with_source=False)))

    assert error.value.code == "source_image_required"
    assert error.value.retryable is False


def test_sends_source_without_exact_body_metrics_and_parses_private_result() -> None:
    captured = {}

    def post_json(payload):
        captured.update(payload)
        return {
            "model": "gemini-3.1-flash-image",
            "output_image": {
                "type": "image",
                "mime_type": "image/png",
                "data": base64.b64encode(PNG).decode("ascii"),
            },
        }

    provider = ProductionAvatarProvider(
        api_key="secret", model="gemini-3.1-flash-image", post_json=post_json
    )

    result = run(provider.generate(avatar_request()))

    assert result.content == PNG
    assert result.media_type == "image/png"
    assert result.estimated_cost_usd == 0.067
    assert result.provider_metadata == {"provider": "google", "resolution": "1K"}
    assert captured["input"][0]["data"] == base64.b64encode(PNG).decode("ascii")
    prompt = captured["input"][1]["text"]
    assert "Body profile: fit" in prompt
    assert "178" not in prompt
    assert "82" not in prompt
    assert "secret" not in repr(provider)


def test_retries_transient_failures_with_a_hard_bound() -> None:
    attempts = 0

    def post_json(payload):
        nonlocal attempts
        attempts += 1
        raise AvatarProviderError(
            "provider_unavailable", "The Avatar provider is unavailable."
        )

    provider = ProductionAvatarProvider(
        api_key="secret",
        model="gemini-3.1-flash-image",
        max_attempts=2,
        retry_delay_seconds=0,
        post_json=post_json,
    )

    with pytest.raises(AvatarProviderError):
        run(provider.generate(avatar_request()))

    assert attempts == 2


def test_rejects_malformed_or_partial_provider_output() -> None:
    provider = ProductionAvatarProvider(
        api_key="secret",
        model="gemini-3.1-flash-image",
        post_json=lambda payload: {"steps": [{"type": "model_output", "content": []}]},
    )

    with pytest.raises(AvatarProviderError) as error:
        run(provider.generate(avatar_request()))

    assert error.value.code == "malformed_output"
    assert error.value.retryable is False
