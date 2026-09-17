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
from app.integrations.avatar.cloudflare import CloudflareFluxAvatarProvider


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


def provider(post_multipart) -> CloudflareFluxAvatarProvider:
    return CloudflareFluxAvatarProvider(
        account_id="account123",
        api_token="private-token",
        model="@cf/black-forest-labs/flux-2-klein-4b",
        retry_delay_seconds=0,
        post_multipart=post_multipart,
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


def test_sends_source_and_identity_safe_prompt_and_decodes_output() -> None:
    captured = {}

    def post(body, content_type):
        captured.update(body=body, content_type=content_type)
        return {"result": {"image": base64.b64encode(png()).decode()}}

    result = run(provider(post).generate(generation_request()))

    assert result.media_type == "image/png"
    assert result.estimated_cost_usd == 0.000346
    assert b'form-data; name="input_image_0"' in captured["body"]
    assert b"preserve" in captured["body"].lower()
    assert b"body_fat_percentage" not in captured["body"]
    assert "private-token" not in repr(provider(post))


def test_requires_valid_private_source_image() -> None:
    with pytest.raises(AvatarProviderError) as missing:
        run(provider(lambda *_: {}).generate(generation_request(source=False)))
    assert missing.value.code == "source_image_required"

    request = generation_request()
    invalid = AvatarGenerationRequest(
        metrics=request.metrics,
        style=request.style,
        presentation=request.presentation,
        source_image=AvatarSourceImage(b"private", "image/png"),
    )
    with pytest.raises(AvatarProviderError) as malformed:
        run(provider(lambda *_: {}).generate(invalid))
    assert malformed.value.code == "source_image_invalid"


@pytest.mark.parametrize(
    ("payload", "code"),
    [({}, "malformed_output"), ({"result": {"image": "not-base64"}}, "malformed_output")],
)
def test_rejects_malformed_output(payload, code: str) -> None:
    with pytest.raises(AvatarProviderError) as failure:
        run(provider(lambda *_: payload).generate(generation_request()))
    assert failure.value.code == code


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

    monkeypatch.setattr("app.integrations.avatar.cloudflare.request.urlopen", fail)
    instance = CloudflareFluxAvatarProvider(
        account_id="account123",
        api_token="private-token",
        model="@cf/black-forest-labs/flux-2-klein-4b",
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

    monkeypatch.setattr("app.integrations.avatar.cloudflare.request.urlopen", timeout)
    instance = CloudflareFluxAvatarProvider(
        account_id="account123",
        api_token="private-token",
        model="@cf/black-forest-labs/flux-2-klein-4b",
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
        return FakeResponse(json_bytes({"result": {"image": valid}}))

    monkeypatch.setattr("app.integrations.avatar.cloudflare.request.urlopen", success)
    instance = CloudflareFluxAvatarProvider(
        account_id="account123",
        api_token="private-token",
        model="@cf/black-forest-labs/flux-2-klein-4b",
    )
    run(instance.generate(generation_request()))
    assert captured["url"].endswith(
        "/accounts/account123/ai/run/@cf/black-forest-labs/flux-2-klein-4b"
    )
    assert captured["authorization"] == "Bearer private-token"

    monkeypatch.setattr(
        "app.integrations.avatar.cloudflare.request.urlopen",
        lambda *_args, **_kwargs: FakeResponse(b"x" * (20 * 1024 * 1024 + 1)),
    )
    with pytest.raises(AvatarProviderError) as oversized:
        run(instance.generate(generation_request()))
    assert oversized.value.code == "malformed_output"


def json_bytes(value: object) -> bytes:
    return json.dumps(value).encode()
