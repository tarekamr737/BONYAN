from __future__ import annotations

import base64
import binascii
from dataclasses import dataclass, field

from app.core.errors import AppError

MAX_SOURCE_BYTES = 5 * 1024 * 1024
ALLOWED_SOURCE_MEDIA_TYPES = frozenset({"image/jpeg", "image/png", "image/webp"})
ALLOWED_GENERATED_MEDIA_TYPES = ALLOWED_SOURCE_MEDIA_TYPES


@dataclass(frozen=True, slots=True)
class ValidatedImage:
    content: bytes = field(repr=False)
    media_type: str


def decode_source_image(encoded: str, media_type: str) -> ValidatedImage:
    if media_type not in ALLOWED_SOURCE_MEDIA_TYPES:
        raise AppError(
            code="unsupported_source_image",
            message="Choose a JPEG, PNG, or WebP image.",
            status_code=422,
        )

    try:
        content = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise AppError(
            code="invalid_source_image",
            message="The selected image could not be read.",
            status_code=422,
        ) from exc

    if not content or len(content) > MAX_SOURCE_BYTES:
        raise AppError(
            code="invalid_source_image_size",
            message="Choose an image smaller than 5 MB.",
            status_code=422,
        )
    if not _matches_signature(content, media_type):
        raise AppError(
            code="invalid_source_image",
            message="The file content does not match its image type.",
            status_code=422,
        )
    return ValidatedImage(content=content, media_type=media_type)


def validate_generated_image(content: bytes, media_type: str) -> ValidatedImage:
    normalized_media_type = media_type.strip().lower()
    if not content or normalized_media_type not in ALLOWED_GENERATED_MEDIA_TYPES:
        raise AppError(
            code="invalid_generated_avatar",
            message="Avatar generation returned an unsupported image.",
            status_code=502,
        )
    if not _matches_signature(content, normalized_media_type):
        raise AppError(
            code="invalid_generated_avatar",
            message="Avatar generation returned an invalid image.",
            status_code=502,
        )
    return ValidatedImage(content=content, media_type=normalized_media_type)


def _matches_signature(content: bytes, media_type: str) -> bool:
    if media_type == "image/jpeg":
        return content.startswith(b"\xff\xd8\xff")
    if media_type == "image/png":
        return content.startswith(b"\x89PNG\r\n\x1a\n")
    if media_type == "image/webp":
        return len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP"
    return False
