from __future__ import annotations

import asyncio
import json
from unittest.mock import patch
from urllib.error import HTTPError

import pytest

from app.integrations.mistral.client import MISTRAL_OCR_MODEL, MistralOcrClient
from app.integrations.mistral.errors import (
    MistralOcrAuthenticationError,
    MistralOcrInvalidResponse,
    MistralOcrRateLimit,
)


class FakeResponse:
    def __init__(self, payload: object) -> None:
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return None

    def read(self) -> bytes:
        return json.dumps(self.payload).encode("utf-8")


def run(coro):
    return asyncio.run(coro)


def extract(client: MistralOcrClient):
    return run(
        client.extract_document(
            content=b"report", content_type="application/pdf", filename="report.pdf"
        )
    )


def test_uses_locked_model_without_exposing_document_in_url() -> None:
    captured = []

    def fake_urlopen(req, timeout):
        captured.append((req, timeout))
        return FakeResponse({"pages": [{"markdown": "Weight: 82 kg"}]})

    with patch("app.integrations.mistral.client.request.urlopen", fake_urlopen):
        raw = extract(MistralOcrClient(api_key="secret"))

    body = json.loads(captured[0][0].data)
    assert body["model"] == MISTRAL_OCR_MODEL == "mistral-ocr-4-1"
    assert body["include_image_base64"] is False
    assert "report" not in captured[0][0].full_url
    assert raw["pages"][0]["markdown"] == "Weight: 82 kg"


def test_missing_credentials_fail_before_network() -> None:
    with patch("app.integrations.mistral.client.request.urlopen") as urlopen:
        with pytest.raises(MistralOcrAuthenticationError):
            extract(MistralOcrClient(api_key=""))
    urlopen.assert_not_called()


def test_rate_limit_retries_with_a_hard_bound() -> None:
    attempts = 0

    def rate_limited(req, timeout):
        nonlocal attempts
        attempts += 1
        raise HTTPError(req.full_url, 429, "limited", hdrs=None, fp=None)

    with patch("app.integrations.mistral.client.request.urlopen", rate_limited):
        with pytest.raises(MistralOcrRateLimit):
            extract(
                MistralOcrClient(
                    api_key="secret", max_attempts=2, retry_delay_seconds=0
                )
            )

    assert attempts == 2


def test_authentication_and_malformed_responses_are_not_retried() -> None:
    attempts = 0

    def forbidden(req, timeout):
        nonlocal attempts
        attempts += 1
        raise HTTPError(req.full_url, 403, "forbidden", hdrs=None, fp=None)

    with patch("app.integrations.mistral.client.request.urlopen", forbidden):
        with pytest.raises(MistralOcrAuthenticationError):
            extract(MistralOcrClient(api_key="secret", max_attempts=3))
    assert attempts == 1

    with patch(
        "app.integrations.mistral.client.request.urlopen",
        return_value=FakeResponse(["invalid"]),
    ):
        with pytest.raises(MistralOcrInvalidResponse):
            extract(MistralOcrClient(api_key="secret", max_attempts=3))
