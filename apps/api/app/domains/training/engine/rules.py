from __future__ import annotations

from app.domains.training.schemas import ExperienceLevel, TrainingGoal

BODYWEIGHT_EQUIPMENT = "bodyweight"

SPLITS: dict[int, tuple[str, ...]] = {
    2: ("Full Body A", "Full Body B"),
    3: ("Full Body A", "Upper Strength", "Lower Strength"),
    4: ("Upper A", "Lower A", "Upper B", "Lower B"),
    5: ("Push", "Pull", "Legs", "Upper", "Full Body"),
    6: ("Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"),
}

DAY_MUSCLES: dict[str, tuple[str, ...]] = {
    "Full Body A": ("chest", "back", "quadriceps", "hamstrings", "shoulders"),
    "Full Body B": ("back", "glutes", "chest", "biceps", "triceps"),
    "Upper Strength": ("chest", "back", "shoulders", "biceps", "triceps"),
    "Lower Strength": ("quadriceps", "hamstrings", "glutes", "calves", "core"),
    "Upper A": ("chest", "back", "shoulders", "triceps"),
    "Lower A": ("quadriceps", "hamstrings", "glutes", "core"),
    "Upper B": ("back", "chest", "biceps", "shoulders"),
    "Lower B": ("glutes", "quadriceps", "hamstrings", "calves"),
    "Push": ("chest", "shoulders", "triceps", "quadriceps"),
    "Pull": ("back", "biceps", "hamstrings", "core"),
    "Legs": ("quadriceps", "hamstrings", "glutes", "calves"),
    "Upper": ("chest", "back", "shoulders", "arms"),
    "Full Body": ("quadriceps", "chest", "back", "glutes", "core"),
    "Push A": ("chest", "shoulders", "triceps"),
    "Pull A": ("back", "biceps", "core"),
    "Legs A": ("quadriceps", "hamstrings", "glutes"),
    "Push B": ("shoulders", "chest", "triceps"),
    "Pull B": ("back", "biceps", "hamstrings"),
    "Legs B": ("glutes", "quadriceps", "calves"),
}


def prescriptions_per_day(duration_minutes: int) -> int:
    if duration_minutes < 35:
        return 3
    if duration_minutes < 55:
        return 4
    if duration_minutes < 75:
        return 5
    return 6


def prescription_defaults(
    goal: TrainingGoal, experience: ExperienceLevel
) -> tuple[int, int, int, int, str]:
    if goal == TrainingGoal.STRENGTH:
        reps = (3, 6)
        rest = 150
    elif goal == TrainingGoal.HYPERTROPHY:
        reps = (8, 12)
        rest = 90
    elif goal == TrainingGoal.FAT_LOSS:
        reps = (10, 15)
        rest = 60
    else:
        reps = (8, 14)
        rest = 75

    sets = 2 if experience == ExperienceLevel.BEGINNER else 3
    if experience == ExperienceLevel.ADVANCED and goal in {
        TrainingGoal.STRENGTH,
        TrainingGoal.HYPERTROPHY,
    }:
        sets = 4
    intensity = "RIR 2-3" if experience == ExperienceLevel.BEGINNER else "RIR 1-2"
    return sets, reps[0], reps[1], rest, intensity


def normalize_equipment(equipment: list[str]) -> tuple[str, ...]:
    normalized = tuple(sorted({item.strip().lower() for item in equipment if item.strip()}))
    return normalized or (BODYWEIGHT_EQUIPMENT,)
