from __future__ import annotations

from dataclasses import dataclass, field

from app.core.errors import AppError

ALLOWED_GENERATED_MEDIA_TYPES = frozenset({"image/jpeg", "image/png", "image/webp"})


@dataclass(frozen=True, slots=True)
class ValidatedImage:
    content: bytes = field(repr=False)
    media_type: str


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
