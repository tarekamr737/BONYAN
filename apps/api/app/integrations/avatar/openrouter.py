from __future__ import annotations

import asyncio
import base64
import binascii
import io
import json
from collections.abc import Callable
from typing import Any
from urllib import error, request
from urllib.parse import urlparse

from PIL import Image, ImageOps, UnidentifiedImageError

from app.domains.avatar.contracts import (
    AvatarGenerationRequest,
    AvatarGenerationResult,
    AvatarProviderError,
)
from app.domains.avatar.shape import classify_body_shape

DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
SUPPORTED_MODELS = {"meta/muse-image", "qwen/qwen-image-3"}
MAX_SOURCE_PIXELS = 25_000_000
MAX_SOURCE_BYTES = 8 * 1024 * 1024
MAX_OUTPUT_BYTES = 20 * 1024 * 1024
MAX_RESPONSE_BYTES = 28 * 1024 * 1024
_TRANSIENT_STATUS_CODES = {408, 409, 429, 500, 502, 503, 504}


class OpenRouterAvatarProvider:
    def __init__(
        self,
        *,
        api_key: str,
        model: str,
        base_url: str = DEFAULT_OPENROUTER_BASE_URL,
        timeout_seconds: float = 45,
        max_attempts: int = 2,
        retry_delay_seconds: float = 0.5,
        post_json: Callable[[dict[str, Any]], dict[str, Any]] | None = None,
    ) -> None:
        if not api_key.strip():
            raise ValueError("OPENROUTER_AVATAR_API_KEY is required")
        if model not in SUPPORTED_MODELS:
            raise ValueError("AVATAR_MODEL is not an approved OpenRouter avatar candidate")
        self._api_key = api_key
        self._model = model
        self._base_url = _validate_base_url(base_url)
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
        source_content, source_media_type = _prepare_source_image(
            source.content, source.media_type
        )
        payload = {
            "model": self._model,
            "prompt": _avatar_prompt(avatar_request),
            "input_references": [
                {
                    "type": "image_url",
                    "image_url": {
                        "url": (
                            f"data:{source_media_type};base64,"
                            f"{base64.b64encode(source_content).decode('ascii')}"
                        )
                    },
                }
            ],
        }
        raw = await self._request_with_retry(payload)
        content, media_type = _extract_image(raw)
        usage = raw.get("usage")
        cost = usage.get("cost") if isinstance(usage, dict) else None
        return AvatarGenerationResult(
            content=content,
            media_type=media_type,
            model=str(raw.get("model") or self._model),
            estimated_cost_usd=float(cost) if isinstance(cost, int | float) else None,
            provider_metadata={"provider": "openrouter"},
        )

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
            f"{self._base_url}/images",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )
        try:
            with request.urlopen(outbound, timeout=self._timeout_seconds) as response:
                encoded = response.read(MAX_RESPONSE_BYTES + 1)
            if len(encoded) > MAX_RESPONSE_BYTES:
                raise AvatarProviderError(
                    "malformed_output",
                    "The Avatar provider returned an oversized result.",
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
                "malformed_output",
                "The Avatar provider returned invalid data.",
                retryable=False,
            ) from exc
        if not isinstance(raw, dict):
            raise AvatarProviderError(
                "malformed_output",
                "The Avatar provider returned invalid data.",
                retryable=False,
            )
        return raw


def _prepare_source_image(content: bytes, media_type: str) -> tuple[bytes, str]:
    if media_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise AvatarProviderError(
            "source_image_invalid",
            "The source photo could not be prepared for Avatar generation.",
            retryable=False,
        )
    try:
        with Image.open(io.BytesIO(content)) as original:
            if original.width * original.height > MAX_SOURCE_PIXELS:
                raise AvatarProviderError(
                    "source_image_invalid",
                    "The source photo is too large for Avatar generation.",
                    retryable=False,
                )
            image = ImageOps.exif_transpose(original)
            image.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
            output = io.BytesIO()
            if "A" in image.getbands():
                image.save(output, format="PNG", optimize=True)
                prepared, prepared_type = output.getvalue(), "image/png"
            else:
                image.convert("RGB").save(output, format="JPEG", quality=92, optimize=True)
                prepared, prepared_type = output.getvalue(), "image/jpeg"
            if len(prepared) > MAX_SOURCE_BYTES:
                raise AvatarProviderError(
                    "source_image_invalid",
                    "The source photo is too large for Avatar generation.",
                    retryable=False,
                )
            return prepared, prepared_type
    except AvatarProviderError:
        raise
    except (OSError, UnidentifiedImageError, Image.DecompressionBombError) as exc:
        raise AvatarProviderError(
            "source_image_invalid",
            "The source photo could not be prepared for Avatar generation.",
            retryable=False,
        ) from exc


def _avatar_prompt(avatar_request: AvatarGenerationRequest) -> str:
    shape = classify_body_shape(
        avatar_request.metrics, avatar_request.presentation
    ).value
    return (
        "Transform the private reference photo into one polished cinematic 3D fitness avatar of "
        "the exact same recognizable person. Preserve identity precisely: face shape, facial "
        "structure, skin tone, ethnicity, approximate age, hairstyle where reasonably possible, "
        "and gender presentation. Do not redesign, substitute, beautify, or create a new face. "
        "Keep realistic human anatomy and natural proportions, with modest non-sexualized athletic "
        "clothing and a neutral studio background. "
        f"Presentation: {avatar_request.presentation.value}. Approximate fitness profile: {shape}. "
        "Use the fitness profile only as bounded body-composition guidance, never as a medically "
        "exact visualization. Avoid extreme body changes, prompt drift, text, logos, and medical "
        "claims. The result must clearly look like the same real person. Return one image."
    )


def _extract_image(raw: dict[str, Any]) -> tuple[bytes, str]:
    data = raw.get("data")
    if not isinstance(data, list) or not data or not isinstance(data[0], dict):
        raise AvatarProviderError(
            "malformed_output", "The Avatar provider returned no usable image.", retryable=False
        )
    encoded = data[0].get("b64_json")
    media_type = str(data[0].get("media_type") or "image/png").lower()
    if not isinstance(encoded, str) or media_type not in {
        "image/jpeg",
        "image/png",
        "image/webp",
    }:
        raise AvatarProviderError(
            "malformed_output", "The Avatar provider returned no usable image.", retryable=False
        )
    try:
        content = base64.b64decode(encoded, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise AvatarProviderError(
            "malformed_output", "The Avatar provider returned invalid image data.", retryable=False
        ) from exc
    if not content or len(content) > MAX_OUTPUT_BYTES:
        raise AvatarProviderError(
            "malformed_output",
            "The Avatar provider returned an invalid or oversized image.",
            retryable=False,
        )
    return content, media_type


def _validate_base_url(value: str) -> str:
    normalized = value.strip().rstrip("/")
    parsed = urlparse(normalized)
    if (
        parsed.scheme != "https"
        or parsed.hostname != "openrouter.ai"
        or parsed.port not in {None, 443}
        or parsed.username is not None
        or parsed.password is not None
        or parsed.path != "/api/v1"
        or parsed.query
        or parsed.fragment
    ):
        raise ValueError("OPENROUTER_BASE_URL must use the official OpenRouter HTTPS API")
    return normalized


def _http_error(status_code: int) -> AvatarProviderError:
    if status_code in {401, 403}:
        return AvatarProviderError(
            "provider_auth_error", "The Avatar provider is not configured.", retryable=False
        )
    if status_code == 429:
        return AvatarProviderError("rate_limited", "Avatar generation is busy. Try again shortly.")
    if status_code in _TRANSIENT_STATUS_CODES:
        return AvatarProviderError("provider_unavailable", "The Avatar provider is unavailable.")
    return AvatarProviderError(
        "provider_rejected", "The Avatar provider rejected the request.", retryable=False
    )


def _is_timeout(exc: BaseException) -> bool:
    return isinstance(exc, TimeoutError) or (
        isinstance(exc, error.URLError) and isinstance(exc.reason, TimeoutError)
    )
