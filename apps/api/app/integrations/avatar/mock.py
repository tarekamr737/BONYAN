from __future__ import annotations

from enum import StrEnum
from importlib.resources import files

from app.domains.avatar.contracts import (
    AvatarGenerationRequest,
    AvatarGenerationResult,
    AvatarProviderError,
    BodyAvatarStyle,
    BodyMetricsSnapshot,
)


class CinematicBodyProfile(StrEnum):
    LEAN = "lean"
    ATHLETIC = "athletic"
    STRONG = "strong"


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
        profile = select_cinematic_body_profile(request.metrics)
        content = (
            files("app.integrations.avatar")
            .joinpath("assets", f"cinematic-{profile.value}.png")
            .read_bytes()
        )
        return AvatarGenerationResult(
            content=content,
            media_type="image/png",
            model=self._model,
        )


def select_cinematic_body_profile(metrics: BodyMetricsSnapshot) -> CinematicBodyProfile:
    height_m = metrics.height_cm / 100
    bmi = metrics.weight_kg / (height_m * height_m)
    body_fat = metrics.body_fat_percentage
    muscle_ratio = (
        metrics.skeletal_muscle_mass_kg / metrics.weight_kg
        if metrics.skeletal_muscle_mass_kg is not None
        else None
    )

    if (
        bmi >= 29
        or (body_fat is not None and body_fat >= 26)
        or (bmi >= 26 and muscle_ratio is not None and muscle_ratio >= 0.44)
    ):
        return CinematicBodyProfile.STRONG
    if bmi <= 21.5 or (body_fat is not None and body_fat <= 14):
        return CinematicBodyProfile.LEAN
    return CinematicBodyProfile.ATHLETIC
