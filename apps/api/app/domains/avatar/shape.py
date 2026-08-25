from app.domains.avatar.contracts import (
    BodyAvatarPresentation,
    BodyMetricsSnapshot,
    BodyShapeProfile,
)


def classify_body_shape(
    metrics: BodyMetricsSnapshot, presentation: BodyAvatarPresentation
) -> BodyShapeProfile:
    height_m = metrics.height_cm / 100
    bmi = metrics.weight_kg / (height_m * height_m)
    body_fat = metrics.body_fat_percentage
    muscle_ratio = (
        metrics.skeletal_muscle_mass_kg / metrics.weight_kg
        if metrics.skeletal_muscle_mass_kg is not None
        else None
    )
    strong_body_fat = 34 if presentation is BodyAvatarPresentation.WOMEN else 26
    lean_body_fat = 22 if presentation is BodyAvatarPresentation.WOMEN else 14
    strong_muscle_ratio = 0.38 if presentation is BodyAvatarPresentation.WOMEN else 0.44
    if (
        bmi >= 29
        or (body_fat is not None and body_fat >= strong_body_fat)
        or (bmi >= 26 and muscle_ratio is not None and muscle_ratio >= strong_muscle_ratio)
    ):
        return BodyShapeProfile.STRONG
    if bmi <= 21.5 or (body_fat is not None and body_fat <= lean_body_fat):
        return BodyShapeProfile.LEAN
    return BodyShapeProfile.ATHLETIC
