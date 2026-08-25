from __future__ import annotations

import asyncio
import base64
from typing import Any
from urllib import error, request

from app.core.config import get_settings
from app.integrations.mistral.errors import MistralOcrError, MistralOcrTimeout

MISTRAL_OCR_MODEL = "mistral-ocr-4-1"
MISTRAL_OCR_URL = "https://api.mistral.ai/v1/ocr"


class MistralOcrClient:
    def __init__(
        self,
        *,
        api_key: str | None = None,
        timeout_seconds: float = 20,
        max_attempts: int = 2,
    ) -> None:
        settings = get_settings()
        secret = api_key or getattr(settings, "mistral_api_key", None)
        self.api_key = secret.get_secret_value() if hasattr(secret, "get_secret_value") else secret
        self.timeout_seconds = timeout_seconds
        self.max_attempts = max(1, max_attempts)

    async def extract_document(
        self,
        *,
        content: bytes,
        content_type: str,
        filename: str,
    ) -> dict[str, Any]:
        if not self.api_key:
            raise MistralOcrError("MISTRAL_API_KEY is required for live OCR")

        payload = {
            "model": MISTRAL_OCR_MODEL,
            "document": {
                "type": "document_url",
                "document_url": self._data_url(content=content, content_type=content_type),
                "document_name": filename,
            },
            "include_image_base64": False,
        }
        last_error: MistralOcrError | None = None
        for _ in range(self.max_attempts):
            try:
                return await asyncio.to_thread(self._post_json, payload)
            except MistralOcrTimeout:
                raise
            except MistralOcrError as exc:
                last_error = exc
        raise last_error or MistralOcrError("Mistral OCR request failed")

    def _post_json(self, payload: dict[str, Any]) -> dict[str, Any]:
        import json

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
                return json.loads(response.read().decode("utf-8"))
        except TimeoutError as exc:
            raise MistralOcrTimeout("Mistral OCR timed out") from exc
        except error.URLError as exc:
            if isinstance(exc.reason, TimeoutError):
                raise MistralOcrTimeout("Mistral OCR timed out") from exc
            raise MistralOcrError("Mistral OCR request failed") from exc

    def _data_url(self, *, content: bytes, content_type: str) -> str:
        encoded = base64.b64encode(content).decode("ascii")
        return f"data:{content_type};base64,{encoded}"
