from __future__ import annotations

import base64

from app.domains.avatar.contracts import (
    AvatarGenerationRequest,
    AvatarGenerationResult,
    AvatarProviderError,
)

_MOCK_AVATAR = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAIAAABMXPacAAACHklEQVR42u3cwU0sMRCE"
    "YWiRwob1rmRBNGTBlQSJ4CEQHneN+6vrSshdv6tmAHufH4/HE/WpWAAAAAQAAAQAAAQAA"
    "AQAAAQAAAQAAAQAAAQAAAQAAHSNXu646M/31/999O/t416zPN/oWMo3vt+XxA0A/Mr32"
    "5Gos91f8hOGJmC5cZlRqCHux0ahhrgfy6DmuJ/JoEa5H8igprmfxsCfIgBo2pIhIaiZ7"
    "ucwUEEAADCzf0JaSAJUEACTG6B9DRKgggAgAAAgAAAgAADYrISjIr1rkAAVBMDkBmjvQ"
    "AlQQQCMbaGEd7CUBOz3IuSwtAoCoGNL5twVyErAHl+ibmrEVdDV7qTdk0l8BlznUeAtp"
    "dCH8BVOZd4RS7+muuTMSPJN1VAAF53VCSSRBWDbGakcEikAWo6nJWDoB9B+OrEXQyeAq"
    "NuKXRiK+73raUhA+LdnbI5Ccb93hcX93nUW93tXu+MZcC/rNz8Sivu96/cvyWaV7d87"
    "RXG/d5bifu9Exf3euYr7vdN5CzrrLejs7X/FjBJwUAImbP/lk0rAKQmYs/3XzisBRyRg"
    "2vZfOLUE3D8BM7f/qtkl4KzfhGk3gMn9s8QBCVBBABAAAHgCN/kgASoIAAIAAAIAAAIA"
    "AAIAAAIAgB8p+YuQduovPkiACgKAAADAc7jJAQlQQQBoocbZJeCICpoZgiVTS8ApD+Fp"
    "IVg1rwQc9Bo6JwQLJ5WAZn0BX3Koi6CQp4MAAAAASUVORK5CYII="
)


class MockAvatarProvider:
    def __init__(self, *, fail_with: str | None = None, model: str = "TBD") -> None:
        self._fail_with = fail_with
        self._model = model

    async def generate(self, request: AvatarGenerationRequest) -> AvatarGenerationResult:
        if self._fail_with:
            raise AvatarProviderError(
                self._fail_with,
                "The mock avatar provider failed.",
            )
        if not request.source_image:
            raise AvatarProviderError("empty_source", "A source image is required.")
        return AvatarGenerationResult(
            content=_MOCK_AVATAR,
            media_type="image/png",
            model=self._model,
        )
