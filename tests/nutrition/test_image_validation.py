from __future__ import annotations

import io

import pytest
from app.core.errors import AppError
from app.domains.nutrition.image_validation import validate_food_image
from PIL import Image


def _image_bytes(image_format: str = "PNG") -> bytes:
    output = io.BytesIO()
    Image.new("RGB", (32, 24), "orange").save(output, format=image_format)
    return output.getvalue()


def test_food_image_is_validated_reencoded_and_metadata_free() -> None:
    image = validate_food_image(_image_bytes(), "image/png")

    assert image.media_type == "image/jpeg"
    assert image.content.startswith(b"\xff\xd8\xff")
    with Image.open(io.BytesIO(image.content)) as decoded:
        assert decoded.size == (32, 24)
        assert not decoded.getexif()


@pytest.mark.parametrize(
    ("content", "media_type", "error_code"),
    [
        (b"not an image", "image/jpeg", "food_image_content_invalid"),
        (_image_bytes("PNG"), "image/jpeg", "food_image_content_invalid"),
        (_image_bytes("PNG"), "application/pdf", "food_image_type_invalid"),
    ],
)
def test_food_image_rejects_spoofed_or_unsupported_content(
    content: bytes, media_type: str, error_code: str
) -> None:
    with pytest.raises(AppError) as error:
        validate_food_image(content, media_type)

    assert error.value.code == error_code
