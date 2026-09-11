from __future__ import annotations

import asyncio
import base64
import binascii
import io
import json
import re
import secrets
from collections.abc import Callable
from typing import Any
from urllib import error, parse, request

from PIL import Image, ImageOps, UnidentifiedImageError

from app.domains.avatar.contracts import (
    AvatarGenerationRequest,
    AvatarGenerationResult,
    AvatarProviderError,
)
from app.domains.avatar.shape import classify_body_shape

CLOUDFLARE_API_ROOT = "https://api.cloudflare.com/client/v4/accounts"
MAX_RESPONSE_BYTES = 20 * 1024 * 1024
MAX_REFERENCE_EDGE = 511
MAX_SOURCE_PIXELS = 25_000_000
_ACCOUNT_ID_PATTERN = re.compile(r"[A-Za-z0-9_-]{1,64}")
_TRANSIENT_STATUS_CODES = {408, 409, 429, 500, 502, 503, 504}
_IMAGE_COST_USD = {"@cf/black-forest-labs/flux-2-klein-4b": 0.000346}


class CloudflareFluxAvatarProvider:
    def __init__(
        self,
        *,
        account_id: str,
        api_token: str,
        model: str,
        timeout_seconds: float = 45,
        max_attempts: int = 2,
        retry_delay_seconds: float = 0.5,
        post_multipart: Callable[[bytes, str], dict[str, Any]] | None = None,
    ) -> None:
        if not _ACCOUNT_ID_PATTERN.fullmatch(account_id.strip()):
            raise ValueError("CLOUDFLARE_ACCOUNT_ID is invalid")
        if not api_token.strip():
            raise ValueError("CLOUDFLARE_API_TOKEN is required")
        if not model.startswith("@cf/"):
            raise ValueError("AVATAR_MODEL must be a Cloudflare-hosted model")
        self._account_id = account_id.strip()
        self._api_token = api_token
        self._model = model
        self._timeout_seconds = timeout_seconds
        self._max_attempts = max(1, max_attempts)
        self._retry_delay_seconds = max(0, retry_delay_seconds)
        self._post_multipart_override = post_multipart

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
        body, content_type = _build_multipart(
            prompt=_avatar_prompt(avatar_request),
            source_content=source_content,
            source_media_type=source_media_type,
        )
        raw = await self._request_with_retry(body, content_type)
        content, media_type = _extract_image(raw)
        return AvatarGenerationResult(
            content=content,
            media_type=media_type,
            model=self._model,
            estimated_cost_usd=_IMAGE_COST_USD.get(self._model),
            provider_metadata={"provider": "cloudflare", "resolution": "512x512"},
        )

    async def _request_with_retry(
        self, body: bytes, content_type: str
    ) -> dict[str, Any]:
        last_error: AvatarProviderError | None = None
        for attempt in range(self._max_attempts):
            try:
                if self._post_multipart_override:
                    return self._post_multipart_override(body, content_type)
                return await asyncio.to_thread(self._post_multipart, body, content_type)
            except AvatarProviderError as exc:
                last_error = exc
                if not exc.retryable or attempt + 1 >= self._max_attempts:
                    raise
                await asyncio.sleep(self._retry_delay_seconds * (2**attempt))
        raise last_error or AvatarProviderError(
            "provider_unavailable", "The Avatar provider is unavailable."
        )

    def _post_multipart(self, body: bytes, content_type: str) -> dict[str, Any]:
        endpoint = (
            f"{CLOUDFLARE_API_ROOT}/{parse.quote(self._account_id, safe='')}"
            f"/ai/run/{parse.quote(self._model, safe='@/')}"
        )
        outbound = request.Request(
            endpoint,
            data=body,
            headers={
                "Authorization": f"Bearer {self._api_token}",
                "Content-Type": content_type,
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


def _avatar_prompt(avatar_request: AvatarGenerationRequest) -> str:
    shape = classify_body_shape(
        avatar_request.metrics, avatar_request.presentation
    ).value
    return (
        "Edit reference image 0 into a polished cinematic 3D fitness avatar. "
        "Preserve the same recognizable person, face, skin tone, ethnicity, approximate age, and "
        "natural proportions. Use realistic anatomy, modest athletic clothing, and a neutral "
        f"studio background. Presentation: {avatar_request.presentation.value}. "
        f"Approximate fitness profile: {shape}. Treat this profile only as bounded visual "
        "guidance, not a medically precise body prediction. Avoid sexualization, extreme body "
        "changes, text, logos, and medical claims. Return one square image."
    )


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
            image.thumbnail((MAX_REFERENCE_EDGE, MAX_REFERENCE_EDGE), Image.Resampling.LANCZOS)
            output = io.BytesIO()
            if "A" in image.getbands():
                image.save(output, format="PNG", optimize=True)
                return output.getvalue(), "image/png"
            image.convert("RGB").save(output, format="JPEG", quality=90, optimize=True)
            return output.getvalue(), "image/jpeg"
    except AvatarProviderError:
        raise
    except (OSError, UnidentifiedImageError, Image.DecompressionBombError) as exc:
        raise AvatarProviderError(
            "source_image_invalid",
            "The source photo could not be prepared for Avatar generation.",
            retryable=False,
        ) from exc


def _build_multipart(
    *, prompt: str, source_content: bytes, source_media_type: str
) -> tuple[bytes, str]:
    boundary = f"bonyan-{secrets.token_hex(16)}"
    parts = [
        _form_part(boundary, "prompt", prompt.encode("utf-8")),
        _form_part(boundary, "width", b"512"),
        _form_part(boundary, "height", b"512"),
        _form_part(
            boundary,
            "input_image_0",
            source_content,
            filename="source-image",
            media_type=source_media_type,
        ),
        f"--{boundary}--\r\n".encode("ascii"),
    ]
    return b"".join(parts), f"multipart/form-data; boundary={boundary}"


def _form_part(
    boundary: str,
    name: str,
    value: bytes,
    *,
    filename: str | None = None,
    media_type: str | None = None,
) -> bytes:
    disposition = f'Content-Disposition: form-data; name="{name}"'
    if filename:
        disposition += f'; filename="{filename}"'
    headers = [f"--{boundary}", disposition]
    if media_type:
        headers.append(f"Content-Type: {media_type}")
    return ("\r\n".join(headers) + "\r\n\r\n").encode("ascii") + value + b"\r\n"


def _extract_image(raw: dict[str, Any]) -> tuple[bytes, str]:
    result = raw.get("result") if isinstance(raw.get("result"), dict) else raw
    encoded = result.get("image") if isinstance(result, dict) else None
    if not isinstance(encoded, str):
        raise AvatarProviderError(
            "malformed_output",
            "The Avatar provider returned no usable image.",
            retryable=False,
        )
    try:
        content = base64.b64decode(encoded, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise AvatarProviderError(
            "malformed_output",
            "The Avatar provider returned invalid image data.",
            retryable=False,
        ) from exc
    media_type = _detect_media_type(content)
    if media_type is None:
        raise AvatarProviderError(
            "malformed_output",
            "The Avatar provider returned invalid image data.",
            retryable=False,
        )
    return content, media_type


def _detect_media_type(content: bytes) -> str | None:
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if content.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "image/webp"
    return None


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
