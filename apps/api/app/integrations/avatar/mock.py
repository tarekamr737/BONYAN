from __future__ import annotations

from app.domains.avatar.contracts import (
    AvatarGenerationRequest,
    AvatarGenerationResult,
    AvatarProviderError,
)
from app.integrations.avatar.renderer import render_body_avatar_png


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
        return AvatarGenerationResult(
            content=render_body_avatar_png(request.metrics),
            media_type="image/png",
            model=self._model,
        )
