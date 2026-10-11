"""Versioned, capped personal targets. No awards for weight, appearance or volume."""

from datetime import UTC, date, datetime, timedelta
from math import isfinite

from pydantic import BaseModel

from app.domains.users.coaching_schemas import CoachingPreferences
from app.domains.users.scoring import coaching_score

RULES_VERSION = "sustainable-v1"
WEIGHTS = {"training": 35, "personal_goal": 25, "recovery": 20, "nutrition": 20}
MINIMUM_COVERAGE = 60
SEASON_EPOCH = date(2026, 10, 5)


class ProgressScore(BaseModel):
    version: str = "progress-v1"
    value: int | None
    coverage: int
    ranked: bool
    dimensions: dict[str, float | None]
    weights: dict[str, int] = WEIGHTS
    missing: list[str]
    basis: str = "personal_targets_and_recorded_habits"


def progress_score(values: dict[str, float | None]) -> ProgressScore:
    dimensions = {
        key: min(100, max(0, values[key]))
        if values.get(key) is not None and isfinite(values[key])
        else None
        for key in WEIGHTS
    }
    coverage = sum(WEIGHTS[key] for key, value in dimensions.items() if value is not None)
    value = (
        round(
            sum(WEIGHTS[key] * score for key, score in dimensions.items() if score is not None)
            / coverage
        )
        if coverage
        else None
    )
    return ProgressScore(
        value=value,
        coverage=coverage,
        ranked=coverage >= MINIMUM_COVERAGE,
        dimensions=dimensions,
        missing=[key for key, value in dimensions.items() if value is None],
    )


def progress_for_habits(
    counts: dict[str, int], workout_days: int, goal: str, preferences: CoachingPreferences
) -> ProgressScore:
    personal = coaching_score(goal, preferences, workout_days)
    # Unvalidated weight targets do not become body-based rank evidence.
    dimensions = [
        item for item in personal.dimensions if item.key not in {"consistency", "body_goal"}
    ]
    personal_goal = (
        sum(item.value * item.weight for item in dimensions)
        / sum(item.weight for item in dimensions)
        if dimensions
        else None
    )
    return progress_score(
        {
            "training": min(100, counts.get("workout", 0) / workout_days * 100)
            if counts.get("workout")
            else None,
            "personal_goal": personal_goal,
            "nutrition": counts.get("nutrition", 0) / 7 * 100 if counts.get("nutrition") else None,
            "recovery": min(100, counts.get("recovery", 0) / max(1, 7 - workout_days) * 100)
            if counts.get("recovery")
            else None,
        }
    )


def week_start(now: datetime) -> date:
    if now.tzinfo is None:
        raise ValueError("server time must include timezone")
    day = now.astimezone(UTC).date()
    return day - timedelta(days=day.weekday())


def season_bounds(day: date, length: int = 28) -> tuple[date, date]:
    start = SEASON_EPOCH + timedelta(days=((day - SEASON_EPOCH).days // length) * length)
    return start, start + timedelta(days=length)


def level_for_xp(xp: int) -> int:
    return max(0, xp) // 100 + 1


def mission_reward(category: str, count: int, workout_days: int) -> tuple[int, int]:
    """(XP, points). Rounding distributes exactly the same maximum to every schedule."""
    target, maximum, xp_each = {
        "workout": (workout_days, 40, 20),
        "nutrition": (7, 20, 5),
        "recovery": (max(1, 7 - workout_days), 20, 5),
        "checkin": (1, 0, 5),
    }[category]
    if count >= target:
        return 0, 0
    return xp_each, ((count + 1) * maximum // target) - (count * maximum // target)
