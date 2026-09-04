from __future__ import annotations

import asyncio
import base64
import binascii
import json
from collections.abc import Callable
from typing import Any
from urllib import error, request

from app.domains.avatar.contracts import (
    AvatarGenerationRequest,
    AvatarGenerationResult,
    AvatarProviderError,
)
from app.domains.avatar.shape import classify_body_shape

GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions"
_TRANSIENT_STATUS_CODES = {408, 409, 429, 500, 502, 503, 504}
_IMAGE_COST_USD = {
    "gemini-3.1-flash-lite-image": 0.0336,
    "gemini-3.1-flash-image": 0.067,
    "gemini-3-pro-image": 0.134,
}


class ProductionAvatarProvider:
    def __init__(
        self,
        *,
        api_key: str,
        model: str,
        timeout_seconds: float = 45,
        max_attempts: int = 2,
        retry_delay_seconds: float = 0.5,
        post_json: Callable[[dict[str, Any]], dict[str, Any]] | None = None,
    ) -> None:
        if not api_key.strip():
            raise ValueError("AVATAR_API_KEY is required for the Gemini avatar provider")
        self._api_key = api_key
        self._model = model
        self._timeout_seconds = timeout_seconds
        self._max_attempts = max(1, max_attempts)
        self._retry_delay_seconds = max(0, retry_delay_seconds)
        self._post_json_override = post_json

    async def generate(self, avatar_request: AvatarGenerationRequest) -> AvatarGenerationResult:
        source = avatar_request.source_image
        if source is None:
            raise AvatarProviderError(
                "source_image_required",
                "A private source photo is required for production avatar generation.",
                retryable=False,
            )
        if source.media_type not in {"image/jpeg", "image/png", "image/webp"}:
            raise AvatarProviderError(
                "source_image_invalid",
                "The source photo format is not supported.",
                retryable=False,
            )
        payload = self._build_payload(avatar_request)
        raw = await self._request_with_retry(payload)
        content, media_type = _extract_image(raw)
        return AvatarGenerationResult(
            content=content,
            media_type=media_type,
            model=str(raw.get("model") or self._model),
            estimated_cost_usd=_IMAGE_COST_USD.get(self._model),
            provider_metadata={"provider": "google", "resolution": "1K"},
        )

    def _build_payload(self, avatar_request: AvatarGenerationRequest) -> dict[str, Any]:
        source = avatar_request.source_image
        if source is None:
            raise AssertionError("source image validation did not run")
        shape = classify_body_shape(
            avatar_request.metrics, avatar_request.presentation
        ).value
        prompt = (
            "Create a polished, cinematic 3D fitness avatar based on this private source photo. "
            "Preserve the person's recognizable facial identity, skin tone, and natural "
            "proportions. "
            f"Presentation: {avatar_request.presentation.value}. Body profile: {shape}. "
            "Use a neutral studio background and modest athletic clothing. Do not add text, logos, "
            "medical claims, or exaggerated anatomy. Return one square image."
        )
        return {
            "model": self._model,
            "input": [
                {
                    "type": "image",
                    "mime_type": source.media_type,
                    "data": base64.b64encode(source.content).decode("ascii"),
                },
                {"type": "text", "text": prompt},
            ],
        }

    async def _request_with_retry(self, payload: dict[str, Any]) -> dict[str, Any]:
        last_error: AvatarProviderError | None = None
        for attempt in range(self._max_attempts):
            try:
                if self._post_json_override:
                    return self._post_json_override(payload)
                return await asyncio.to_thread(self._post_json, payload)
            except AvatarProviderError as exc:
                last_error = exc
                if not exc.retryable or attempt + 1 >= self._max_attempts:
                    raise
                await asyncio.sleep(self._retry_delay_seconds * (2**attempt))
        raise last_error or AvatarProviderError(
            "provider_unavailable", "The Avatar provider is unavailable."
        )

    def _post_json(self, payload: dict[str, Any]) -> dict[str, Any]:
        outbound = request.Request(
            GEMINI_INTERACTIONS_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "x-goog-api-key": self._api_key,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )
        try:
            with request.urlopen(outbound, timeout=self._timeout_seconds) as response:
                encoded = response.read(20 * 1024 * 1024 + 1)
            if len(encoded) > 20 * 1024 * 1024:
                raise AvatarProviderError(
                    "malformed_output", "The Avatar provider returned an oversized result.",
                    retryable=False,
                )
            raw = json.loads(encoded.decode("utf-8"))
        except error.HTTPError as exc:
            raise _http_error(exc.code) from exc
        except (TimeoutError, error.URLError) as exc:
            code = "provider_timeout" if _is_timeout(exc) else "provider_unavailable"
            message = (
                "The Avatar provider timed out."
                if code == "provider_timeout"
                else "The Avatar provider is unavailable."
            )
            raise AvatarProviderError(code, message, retryable=True) from exc
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise AvatarProviderError(
                "malformed_output", "The Avatar provider returned invalid data.", retryable=False
            ) from exc
        if not isinstance(raw, dict):
            raise AvatarProviderError(
                "malformed_output", "The Avatar provider returned invalid data.", retryable=False
            )
        return raw


def _extract_image(raw: dict[str, Any]) -> tuple[bytes, str]:
    candidates: list[object] = []
    candidates.append(raw.get("output_image"))
    steps = raw.get("steps")
    if isinstance(steps, list):
        for step in steps:
            if isinstance(step, dict) and isinstance(step.get("content"), list):
                candidates.extend(step["content"])
    for item in candidates:
        if not isinstance(item, dict) or item.get("type") not in {None, "image"}:
            continue
        encoded = item.get("data")
        media_type = str(item.get("mime_type") or item.get("mimeType") or "image/png")
        if not isinstance(encoded, str):
            continue
        try:
            content = base64.b64decode(encoded, validate=True)
        except (ValueError, binascii.Error):
            continue
        if content:
            return content, media_type.lower()
    raise AvatarProviderError(
        "malformed_output", "The Avatar provider returned no usable image.", retryable=False
    )


def _http_error(status_code: int) -> AvatarProviderError:
    if status_code in {401, 403}:
        return AvatarProviderError(
            "provider_auth_error", "The Avatar provider is not configured.", retryable=False
        )
    if status_code == 429:
        return AvatarProviderError(
            "rate_limited", "Avatar generation is busy. Try again shortly."
        )
    if status_code in _TRANSIENT_STATUS_CODES:
        return AvatarProviderError(
            "provider_unavailable", "The Avatar provider is unavailable."
        )
    return AvatarProviderError(
        "provider_rejected", "The Avatar provider rejected the request.", retryable=False
    )


def _is_timeout(exc: BaseException) -> bool:
    return isinstance(exc, TimeoutError) or (
        isinstance(exc, error.URLError) and isinstance(exc.reason, TimeoutError)
    )
