from __future__ import annotations

import asyncio
import base64
import json
import time
from typing import Any
from urllib import error, request

from app.core.config import get_settings
from app.core.logging import get_logger
from app.integrations.mistral.errors import (
    MistralOcrAuthenticationError,
    MistralOcrError,
    MistralOcrInvalidResponse,
    MistralOcrRateLimit,
    MistralOcrTimeout,
)

MISTRAL_OCR_MODEL = "mistral-ocr-4-1"
MISTRAL_OCR_URL = "https://api.mistral.ai/v1/ocr"
MAX_OCR_RESPONSE_BYTES = 8 * 1024 * 1024
logger = get_logger("providers")


class MistralOcrClient:
    def __init__(
        self,
        *,
        api_key: str | None = None,
        timeout_seconds: float | None = None,
        max_attempts: int = 2,
        retry_delay_seconds: float = 0.25,
    ) -> None:
        settings = get_settings()
        secret = getattr(settings, "mistral_api_key", None) if api_key is None else api_key
        self.api_key = secret.get_secret_value() if hasattr(secret, "get_secret_value") else secret
        self.timeout_seconds = timeout_seconds or settings.mistral_timeout_seconds
        self.max_attempts = max(1, max_attempts)
        self.retry_delay_seconds = max(0, retry_delay_seconds)

    async def extract_document(
        self,
        *,
        content: bytes,
        content_type: str,
        filename: str,
    ) -> dict[str, Any]:
        if not self.api_key:
            raise MistralOcrAuthenticationError("MISTRAL_API_KEY is required for live OCR")

        document = (
            {
                "type": "image_url",
                "image_url": self._data_url(content=content, content_type=content_type),
            }
            if content_type.startswith("image/")
            else {
                "type": "document_url",
                "document_url": self._data_url(content=content, content_type=content_type),
                "document_name": filename,
            }
        )
        payload = {
            "model": MISTRAL_OCR_MODEL,
            "document": document,
            "include_image_base64": False,
        }
        last_error: MistralOcrError | None = None
        for attempt in range(self.max_attempts):
            try:
                return await asyncio.to_thread(self._post_json, payload)
            except (MistralOcrTimeout, MistralOcrRateLimit, MistralOcrError) as exc:
                if isinstance(exc, (MistralOcrAuthenticationError, MistralOcrInvalidResponse)):
                    raise
                last_error = exc
                if attempt + 1 >= self.max_attempts:
                    raise
                await asyncio.sleep(self.retry_delay_seconds * (2**attempt))
        raise last_error or MistralOcrError("Mistral OCR request failed")

    def _post_json(self, payload: dict[str, Any]) -> dict[str, Any]:
        started = time.monotonic()
        body = json.dumps(payload).encode("utf-8")
        req = request.Request(
            MISTRAL_OCR_URL,
            data=body,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )
        try:
            with request.urlopen(req, timeout=self.timeout_seconds) as response:
                encoded = response.read(MAX_OCR_RESPONSE_BYTES + 1)
                status_code = getattr(response, "status", 200)
            if len(encoded) > MAX_OCR_RESPONSE_BYTES:
                raise MistralOcrInvalidResponse("Mistral OCR returned oversized data")
            raw = json.loads(encoded.decode("utf-8"))
        except error.HTTPError as exc:
            error_payload = _safe_error_payload(exc)
            logger.warning(
                "provider_request_failed",
                extra={
                    "duration_ms": round((time.monotonic() - started) * 1000),
                    "error_code": error_payload.get("code")
                    or error_payload.get("type")
                    or "http_error",
                    "method": "POST",
                    "path": "/v1/ocr",
                    "provider": "mistral_ocr",
                    "status_code": exc.code,
                },
            )
            if exc.code in {401, 403}:
                raise MistralOcrAuthenticationError("Mistral OCR credentials are invalid.") from exc
            if exc.code == 429:
                raise MistralOcrRateLimit("Mistral OCR rate limit was reached.") from exc
            raise MistralOcrError("Mistral OCR request failed") from exc
        except TimeoutError as exc:
            raise MistralOcrTimeout("Mistral OCR timed out") from exc
        except error.URLError as exc:
            if isinstance(exc.reason, TimeoutError):
                raise MistralOcrTimeout("Mistral OCR timed out") from exc
            raise MistralOcrError("Mistral OCR request failed") from exc
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise MistralOcrInvalidResponse("Mistral OCR returned invalid data") from exc
        if not isinstance(raw, dict):
            raise MistralOcrInvalidResponse("Mistral OCR returned invalid data")
        logger.info(
            "provider_request_succeeded",
            extra={
                "duration_ms": round((time.monotonic() - started) * 1000),
                "method": "POST",
                "path": "/v1/ocr",
                "provider": "mistral_ocr",
                "response_shape": {
                    "keys": sorted(raw.keys()),
                    "pages": len(raw.get("pages", []))
                    if isinstance(raw.get("pages"), list)
                    else None,
                },
                "status_code": status_code,
            },
        )
        return raw

    def _data_url(self, *, content: bytes, content_type: str) -> str:
        encoded = base64.b64encode(content).decode("ascii")
        return f"data:{content_type};base64,{encoded}"


def _safe_error_payload(exc: error.HTTPError) -> dict[str, Any]:
    try:
        raw = json.loads(exc.read(16 * 1024).decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return {}
    return raw if isinstance(raw, dict) else {}
