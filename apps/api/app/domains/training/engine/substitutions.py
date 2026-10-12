from __future__ import annotations

import re

from app.domains.training.schemas import ExercisePrescription
from app.integrations.exercises.provider import ExerciseDetails


def _movement(name: str) -> str | None:
    normalized = name.lower().replace("-", " ")
    for kind, pattern in (
        ("knee", r"\b(squat|lunge|leg press)\b"),
        ("press", r"\b(press|push up|pushup|dip)\b"),
        ("pull", r"\b(row|pull up|pullup|chin up|pulldown)\b"),
        ("hinge", r"\b(deadlift|hip thrust|good morning)\b"),
        ("curl", r"\bcurl\b"),
        ("fly", r"\bfly\b"),
    ):
        if re.search(pattern, normalized):
            return kind
    return None


def choose_substitution(
    original: ExercisePrescription,
    candidates: list[ExerciseDetails],
    *,
    available_equipment: tuple[str, ...],
) -> ExerciseDetails | None:
    original_id = original.exercise_id
    original_muscles = set(original.muscles)
    movement = _movement(original.name)

    eligible = [
        item
        for item in candidates
        if item.id != original_id
        and not re.search(r"\bstretch(?:es|ing)?\b", item.name, re.IGNORECASE)
        and (movement is None or _movement(item.name) in {None, movement})
        and set(item.equipment).issubset(set(available_equipment))
        and original_muscles.intersection(item.muscles)
    ]
    if not eligible:
        return None
    return sorted(
        eligible,
        key=lambda item: (
            0 if movement and _movement(item.name) == movement else 1,
            -len(original_muscles.intersection(item.muscles)),
            item.name.lower(),
            item.id,
        ),
    )[0]
