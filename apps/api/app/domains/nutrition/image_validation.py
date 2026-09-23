from __future__ import annotations

import io
from dataclasses import dataclass, field

from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.errors import AppError

ALLOWED_FOOD_IMAGE_TYPES = frozenset({"image/jpeg", "image/png", "image/webp"})
MAX_FOOD_IMAGE_BYTES = 8 * 1024 * 1024
MAX_FOOD_IMAGE_PIXELS = 36_000_000


@dataclass(frozen=True, slots=True)
class ValidatedFoodImage:
    content: bytes = field(repr=False)
    media_type: str


def validate_food_image(content: bytes, media_type: str) -> ValidatedFoodImage:
    normalized_type = media_type.strip().lower()
    if normalized_type not in ALLOWED_FOOD_IMAGE_TYPES:
        raise AppError("food_image_type_invalid", "Choose a JPEG, PNG, or WebP image.", 422)
    if not content or len(content) > MAX_FOOD_IMAGE_BYTES:
        raise AppError("food_image_size_invalid", "Choose an image smaller than 8 MB.", 422)

    try:
        with Image.open(io.BytesIO(content)) as original:
            expected_format = {
                "image/jpeg": "JPEG",
                "image/png": "PNG",
                "image/webp": "WEBP",
            }[normalized_type]
            if original.format != expected_format:
                raise ValueError("declared image type does not match its content")
            if original.width < 1 or original.height < 1:
                raise ValueError("image dimensions are invalid")
            if original.width * original.height > MAX_FOOD_IMAGE_PIXELS:
                raise ValueError("image dimensions are too large")
            original.seek(0)
            original.load()
            prepared = ImageOps.exif_transpose(original).convert("RGB")
            prepared.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
            output = io.BytesIO()
            prepared.save(output, format="JPEG", optimize=True, quality=88)
    except (Image.DecompressionBombError, OSError, UnidentifiedImageError, ValueError) as exc:
        raise AppError(
            "food_image_content_invalid",
            "Choose a valid JPEG, PNG, or WebP image.",
            422,
        ) from exc

    return ValidatedFoodImage(content=output.getvalue(), media_type="image/jpeg")
