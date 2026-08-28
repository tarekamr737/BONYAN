from __future__ import annotations

from app.domains.training.schemas import ExercisePrescription
from app.integrations.musclewiki.provider import ExerciseDetails


def choose_substitution(
    original: ExercisePrescription,
    candidates: list[ExerciseDetails],
    *,
    available_equipment: tuple[str, ...],
) -> ExerciseDetails | None:
    original_id = original.musclewiki_id
    original_muscles = set(original.muscles)

    eligible = [
        item
        for item in candidates
        if item.id != original_id
        and set(item.equipment).issubset(set(available_equipment))
        and original_muscles.intersection(item.muscles)
    ]
    if not eligible:
        return None
    return sorted(
        eligible,
        key=lambda item: (
            -len(original_muscles.intersection(item.muscles)),
            item.name.lower(),
            item.id,
        ),
    )[0]
