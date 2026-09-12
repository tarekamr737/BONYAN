from __future__ import annotations

import asyncio
import base64
import io
import json
from datetime import UTC, datetime
from typing import Self
from urllib.error import HTTPError, URLError

import pytest
from PIL import Image

from app.domains.avatar.contracts import (
    AvatarGenerationRequest,
    AvatarProviderError,
    AvatarSourceImage,
    BodyAvatarPresentation,
    BodyAvatarStyle,
    BodyMetricsSnapshot,
    BodyMetricsSource,
)
from app.integrations.avatar.openrouter import OpenRouterAvatarProvider


def run(coro):
    return asyncio.run(coro)


def png() -> bytes:
    output = io.BytesIO()
    Image.new("RGB", (8, 8), "blue").save(output, format="PNG")
    return output.getvalue()


def generation_request(*, source: bool = True) -> AvatarGenerationRequest:
    return AvatarGenerationRequest(
        metrics=BodyMetricsSnapshot(
            height_cm=175,
            weight_kg=80,
            body_fat_percentage=20,
            skeletal_muscle_mass_kg=35,
            recorded_at=datetime.now(UTC),
            source=BodyMetricsSource.INBODY,
        ),
        style=BodyAvatarStyle.CINEMATIC_3D,
        presentation=BodyAvatarPresentation.MEN,
        source_image=AvatarSourceImage(png(), "image/png") if source else None,
    )


def provider(post_json, *, model: str = "qwen/qwen-image-3") -> OpenRouterAvatarProvider:
    return OpenRouterAvatarProvider(
        api_key="private-token",
        model=model,
        retry_delay_seconds=0,
        post_json=post_json,
    )


class FakeResponse:
    def __init__(self, payload: bytes) -> None:
        self.payload = payload

    def __enter__(self) -> Self:
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def read(self, size: int = -1) -> bytes:
        return self.payload[:size]


@pytest.mark.parametrize("model", ["meta/muse-image", "qwen/qwen-image-3"])
def test_sends_model_source_and_identity_prompt_and_decodes_output(model: str) -> None:
    captured = {}

    def post(payload):
        captured.update(payload)
        return {
            "model": model,
            "data": [{"b64_json": base64.b64encode(png()).decode()}],
            "usage": {"cost": 0.033},
        }

    result = run(provider(post, model=model).generate(generation_request()))

    assert result.media_type == "image/png"
    assert result.model == model
    assert result.estimated_cost_usd == 0.033
    assert result.provider_metadata == {"provider": "openrouter"}
    assert captured["model"] == model
    assert captured["input_references"][0]["image_url"]["url"].startswith(
        "data:image/jpeg;base64,"
    )
    prompt = captured["prompt"]
    assert "exact same recognizable person" in prompt
    assert "face shape" in prompt
    assert "skin tone" in prompt
    assert "Body profile" not in prompt
    assert "175" not in prompt
    assert "80" not in prompt
    assert "private-token" not in repr(provider(post, model=model))


def test_requires_valid_private_source_image() -> None:
    with pytest.raises(AvatarProviderError) as missing:
        run(provider(lambda _: {}).generate(generation_request(source=False)))
    assert missing.value.code == "source_image_required"

    invalid = generation_request()
    malformed = AvatarGenerationRequest(
        metrics=invalid.metrics,
        style=invalid.style,
        presentation=invalid.presentation,
        source_image=AvatarSourceImage(b"private", "image/png"),
    )
    with pytest.raises(AvatarProviderError) as failure:
        run(provider(lambda _: {}).generate(malformed))
    assert failure.value.code == "source_image_invalid"


@pytest.mark.parametrize(
    "payload",
    [{}, {"data": []}, {"data": [{"b64_json": "not-base64"}]}],
)
def test_rejects_malformed_output(payload: dict[str, object]) -> None:
    with pytest.raises(AvatarProviderError) as failure:
        run(provider(lambda _: payload).generate(generation_request()))
    assert failure.value.code == "malformed_output"


@pytest.mark.parametrize(
    ("status", "code", "retryable"),
    [
        (401, "provider_auth_error", False),
        (403, "provider_auth_error", False),
        (429, "rate_limited", True),
        (503, "provider_unavailable", True),
    ],
)
def test_http_failures_are_safely_mapped(
    status: int, code: str, retryable: bool, monkeypatch
) -> None:
    attempts = 0

    def fail(req, timeout):
        nonlocal attempts
        attempts += 1
        raise HTTPError(req.full_url, status, "private upstream text", None, None)

    monkeypatch.setattr("app.integrations.avatar.openrouter.request.urlopen", fail)
    instance = OpenRouterAvatarProvider(
        api_key="private-token",
        model="qwen/qwen-image-3",
        max_attempts=2,
        retry_delay_seconds=0,
    )
    with pytest.raises(AvatarProviderError) as failure:
        run(instance.generate(generation_request()))
    assert failure.value.code == code
    assert attempts == (2 if retryable else 1)
    assert "private upstream text" not in str(failure.value)


def test_timeout_retries_within_bound(monkeypatch) -> None:
    attempts = 0

    def timeout(req, timeout):
        nonlocal attempts
        attempts += 1
        raise URLError(TimeoutError())

    monkeypatch.setattr("app.integrations.avatar.openrouter.request.urlopen", timeout)
    instance = OpenRouterAvatarProvider(
        api_key="private-token",
        model="qwen/qwen-image-3",
        max_attempts=2,
        retry_delay_seconds=0,
    )
    with pytest.raises(AvatarProviderError) as failure:
        run(instance.generate(generation_request()))
    assert failure.value.code == "provider_timeout"
    assert attempts == 2


def test_endpoint_auth_header_and_response_size_bound(monkeypatch) -> None:
    captured = {}
    valid = base64.b64encode(png()).decode()

    def success(req, timeout):
        captured.update(url=req.full_url, authorization=req.headers["Authorization"])
        return FakeResponse(json.dumps({"data": [{"b64_json": valid}]}).encode())

    monkeypatch.setattr("app.integrations.avatar.openrouter.request.urlopen", success)
    instance = OpenRouterAvatarProvider(
        api_key="private-token", model="qwen/qwen-image-3"
    )
    run(instance.generate(generation_request()))
    assert captured["url"] == "https://openrouter.ai/api/v1/images"
    assert captured["authorization"] == "Bearer private-token"

    monkeypatch.setattr(
        "app.integrations.avatar.openrouter.request.urlopen",
        lambda *_args, **_kwargs: FakeResponse(b"x" * (28 * 1024 * 1024 + 1)),
    )
    with pytest.raises(AvatarProviderError) as oversized:
        run(instance.generate(generation_request()))
    assert oversized.value.code == "malformed_output"


def test_rejects_non_official_base_url_and_unknown_model() -> None:
    with pytest.raises(ValueError, match="official OpenRouter"):
        OpenRouterAvatarProvider(
            api_key="private-token",
            model="qwen/qwen-image-3",
            base_url="https://example.test/api/v1",
        )
    with pytest.raises(ValueError, match="approved OpenRouter"):
        OpenRouterAvatarProvider(api_key="private-token", model="other/model")


def test_rejects_decoded_output_above_bound(monkeypatch) -> None:
    monkeypatch.setattr("app.integrations.avatar.openrouter.MAX_OUTPUT_BYTES", 4)
    payload = {"data": [{"b64_json": base64.b64encode(png()).decode()}]}

    with pytest.raises(AvatarProviderError) as failure:
        run(provider(lambda _: payload).generate(generation_request()))

    assert failure.value.code == "malformed_output"
