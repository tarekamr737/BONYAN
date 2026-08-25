from __future__ import annotations

from importlib.resources import files

from app.domains.avatar.contracts import (
    AvatarGenerationRequest,
    AvatarGenerationResult,
    AvatarProviderError,
    BodyAvatarPresentation,
    BodyAvatarStyle,
    BodyMetricsSnapshot,
    BodyShapeProfile,
)
from app.domains.avatar.shape import classify_body_shape

CinematicBodyProfile = BodyShapeProfile


def select_cinematic_body_profile(
    metrics: BodyMetricsSnapshot,
    presentation: BodyAvatarPresentation = BodyAvatarPresentation.MEN,
) -> BodyShapeProfile:
    return classify_body_shape(metrics, presentation)


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
        if request.style is not BodyAvatarStyle.CINEMATIC_3D:
            raise AvatarProviderError(
                "unsupported_avatar_style",
                "The selected body-avatar style is not available.",
                retryable=False,
            )
        profile = select_cinematic_body_profile(request.metrics, request.presentation)
        content = (
            files("app.integrations.avatar")
            .joinpath(
                "assets", f"cinematic-{request.presentation.value}-{profile.value}.png"
            )
            .read_bytes()
        )
        return AvatarGenerationResult(
            content=content,
            media_type="image/png",
            model=self._model,
        )
