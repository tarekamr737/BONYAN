"""Versioned coaching score against personal targets, never admission/medical norms."""

from app.domains.users.coaching_schemas import CoachingPreferences, CoachingScore, ScoreDimension

WEIGHTS = {
    "military_preparation": {"endurance": 0.4, "strength": 0.3, "pullups": 0.1, "consistency": 0.2},
    "strength": {"strength": 0.65, "consistency": 0.35},
    "hypertrophy": {"strength": 0.5, "consistency": 0.5},
    "fat_loss": {"body_goal": 0.5, "consistency": 0.3, "endurance": 0.2},
    "general_fitness": {"endurance": 0.5, "consistency": 0.5},
}


def coaching_score(
    goal: str | None,
    preferences: CoachingPreferences,
    planned_days: int | None,
    *,
    weight_kg: float | None = None,
    baseline_weight_kg: float | None = None,
) -> CoachingScore:
    weights = WEIGHTS.get(goal or "", WEIGHTS["general_fitness"])
    values: dict[str, tuple[float, str]] = {}
    for key, current, target in (
        ("endurance", preferences.running_minutes, preferences.running_target_minutes),
        ("strength", preferences.pushups, preferences.pushups_target),
        ("pullups", preferences.pullups, preferences.pullups_target),
    ):
        if current is not None and target is not None:
            values[key] = (current / target * 100, "reported ability / your personal target")
    if preferences.active_days_per_week is not None and planned_days:
        values["consistency"] = (
            preferences.active_days_per_week / planned_days * 100,
            "reported active days / planned weekly training days",
        )
    target_weight = preferences.target_weight_kg
    if (
        goal == "fat_loss"
        and weight_kg is not None
        and baseline_weight_kg is not None
        and target_weight is not None
        and target_weight < baseline_weight_kg
    ):
        values["body_goal"] = (
            (baseline_weight_kg - weight_kg) / (baseline_weight_kg - target_weight) * 100,
            "change from your first assessment toward your selected weight target",
        )
    dimensions = [
        ScoreDimension(
            key=k, value=round(max(0, min(100, values[k][0]))), weight=w, basis=values[k][1]
        )
        for k, w in weights.items()
        if k in values
    ]
    coverage = sum(d.weight for d in dimensions)
    strongest = max(dimensions, key=lambda d: d.value).key if dimensions else None
    improve = min(dimensions, key=lambda d: d.value).key if dimensions else None
    missing = [key for key in weights if key not in values]
    return CoachingScore(
        value=round(sum(d.value * d.weight for d in dimensions) / coverage) if coverage else None,
        coverage=round(coverage * 100),
        dimensions=dimensions,
        missing=missing,
        strongest=strongest,
        improve=improve,
        recommendation=(
            "Add your current ability and a personal target to build your baseline."
            if not dimensions
            else "Review your lowest component and choose one achievable next step."
        ),
    )
