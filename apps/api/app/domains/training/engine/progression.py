from __future__ import annotations

from app.domains.training.schemas import (
    ExercisePrescription,
    LoggedSet,
    ProgressionAction,
    ProgressionDecision,
)


def decide_progression(
    prescription: ExercisePrescription,
    logged_sets: list[LoggedSet],
    *,
    current_weight_kg: float,
    recent_failures: int = 0,
) -> ProgressionDecision:
    completed = [item for item in logged_sets if item.completed]
    hit_target = len(completed) >= prescription.sets and all(
        item.reps >= prescription.reps_max for item in completed[: prescription.sets]
    )
    if hit_target:
        return ProgressionDecision(
            action=ProgressionAction.INCREASE,
            next_weight_kg=round(current_weight_kg + prescription.progression.increment_kg, 2),
            reason="All target sets reached the top of the rep range.",
        )
    if recent_failures + 1 >= prescription.progression.regress_after_failures:
        return ProgressionDecision(
            action=ProgressionAction.REGRESS,
            next_weight_kg=max(
                0, round(current_weight_kg - prescription.progression.increment_kg, 2)
            ),
            reason="Repeated missed targets require a small load reduction.",
        )
    return ProgressionDecision(
        action=ProgressionAction.HOLD,
        next_weight_kg=current_weight_kg,
        reason="Keep the load until the target sets reach the top of the rep range.",
    )
