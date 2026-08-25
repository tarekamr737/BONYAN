from __future__ import annotations

from app.domains.avatar.contracts import (
    AvatarGenerationRequest,
    AvatarGenerationResult,
    AvatarProviderError,
)

_MOCK_AVATAR = b"""<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
<rect width="512" height="512" fill="#151515"/>
<circle cx="256" cy="195" r="92" fill="#C8A86B"/>
<path d="M84 500c18-134 88-202 172-202s154 68 172 202" fill="#C8A86B"/>
</svg>"""


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
            media_type="image/svg+xml",
            model=self._model,
        )
