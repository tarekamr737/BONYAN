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
    strong_body_fat = 36 if presentation is BodyAvatarPresentation.WOMEN else 28
    fit_body_fat = 28 if presentation is BodyAvatarPresentation.WOMEN else 20
    skinny_body_fat = 19 if presentation is BodyAvatarPresentation.WOMEN else 10
    slim_body_fat = 24 if presentation is BodyAvatarPresentation.WOMEN else 15
    strong_muscle_ratio = 0.38 if presentation is BodyAvatarPresentation.WOMEN else 0.44
    if (
        bmi >= 29
        or (body_fat is not None and body_fat >= strong_body_fat)
        or (bmi >= 26 and muscle_ratio is not None and muscle_ratio >= strong_muscle_ratio)
    ):
        return BodyShapeProfile.STRONG
    if bmi < 18.5 or (body_fat is not None and body_fat <= skinny_body_fat):
        return BodyShapeProfile.SKINNY
    if bmi < 21.5 or (body_fat is not None and body_fat <= slim_body_fat):
        return BodyShapeProfile.SLIM
    if (body_fat is not None and body_fat <= fit_body_fat and muscle_ratio is not None) or (
        muscle_ratio is not None and muscle_ratio >= strong_muscle_ratio - 0.03
    ):
        return BodyShapeProfile.FIT
    return BodyShapeProfile.NORMAL
