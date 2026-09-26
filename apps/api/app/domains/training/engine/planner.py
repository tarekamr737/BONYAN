from __future__ import annotations

import re

from app.core.errors import AppError
from app.domains.training.engine.rules import (
    DAY_MUSCLES,
    SPLITS,
    normalize_equipment,
    prescription_defaults,
    prescriptions_per_day,
)
from app.domains.training.schemas import (
    ExercisePrescription,
    PlanningContext,
    PlanStatus,
    ProgressionRule,
    TrainingGoal,
    WorkoutDay,
    WorkoutPlan,
)
from app.integrations.exercises.provider import (
    ExerciseDetails,
    ExerciseProvider,
    ExerciseSearchFilters,
)


class WorkoutPlanner:
    def __init__(self, exercise_provider: ExerciseProvider) -> None:
        self.exercise_provider = exercise_provider

    async def generate(
        self, context: PlanningContext, *, activate: bool = True, user_id: str = ""
    ) -> WorkoutPlan:
        equipment = normalize_equipment(context.equipment)
        split = SPLITS[context.days_per_week]
        military = context.goal == TrainingGoal.MILITARY_PREPARATION
        per_day = prescriptions_per_day(context.session_duration_minutes)
        defaults = prescription_defaults(context.goal, context.experience)
        catalog: dict[str, tuple[ExerciseDetails, ...]] = {}
        days: list[WorkoutDay] = []

        for order, day_name in enumerate(split, start=1):
            used_ids: set[str] = set()
            prescriptions: list[ExercisePrescription] = []
            muscles = (
                ("chest", "back", "quadriceps", "core", "hamstrings")
                if military
                else DAY_MUSCLES[day_name]
            )
            for muscle in muscles[:per_day]:
                exercise = await self._select_exercise(
                    muscle=muscle,
                    equipment=equipment,
                    used_ids=used_ids,
                    difficulty=context.experience.value,
                    catalog=catalog,
                    user_id=user_id,
                )
                used_ids.add(exercise.id)
                sets, reps_min, reps_max, rest_seconds, intensity = defaults
                prescriptions.append(
                    ExercisePrescription(
                        exercise_id=exercise.id,
                        name=exercise.name,
                        muscles=list(exercise.muscles or (muscle,)),
                        equipment=list(exercise.equipment),
                        sets=sets,
                        reps_min=reps_min,
                        reps_max=reps_max,
                        rest_seconds=rest_seconds,
                        intensity_target=intensity,
                        notes=f"Primary focus: {muscle}.",
                        progression=ProgressionRule(),
                    )
                )
            days.append(
                WorkoutDay(
                    key=f"day-{order}",
                    order=order,
                    name=f"Preparation {order}: strength endurance" if military else day_name,
                    estimated_minutes=min(
                        context.session_duration_minutes, 10 + len(prescriptions) * 9
                    ),
                    prescriptions=prescriptions,
                )
            )

        return WorkoutPlan(
            status=PlanStatus.ACTIVE if activate else PlanStatus.DRAFT,
            goal=context.goal,
            experience=context.experience,
            days_per_week=context.days_per_week,
            session_duration_minutes=context.session_duration_minutes,
            equipment=list(equipment),
            generation_snapshot={
                "engine": "deterministic-v1",
                "optional_inbody_used": context.latest_inbody is not None,
                "history_items": len(context.recent_history),
            },
            days=days,
        )

    async def _select_exercise(
        self,
        *,
        muscle: str,
        equipment: tuple[str, ...],
        used_ids: set[str],
        difficulty: str,
        catalog: dict[str, tuple[ExerciseDetails, ...]],
        user_id: str,
    ) -> ExerciseDetails:
        if muscle not in catalog:
            page = await self.exercise_provider.search_exercises(
                ExerciseSearchFilters(
                    muscles=(muscle,), equipment=equipment, difficulty=difficulty
                ),
                page=1,
                page_size=40,
            )
            catalog[muscle] = page.items
        candidates = [
            item
            for item in catalog[muscle]
            if item.id not in used_ids
            and not item.id.startswith("fallback-")
            # These prescriptions use reps and progressive load, not timed stretches.
            and not re.search(r"\bstretch(?:es|ing)?\b", item.name, re.IGNORECASE)
            and set(item.equipment).issubset(set(equipment))
        ]
        # Bound media probes; a stale catalog URL must not become a broken demonstration.
        for candidate in sorted(candidates, key=lambda item: (item.name.lower(), item.id))[:3]:
            if candidate.media_url and not await self.exercise_provider.get_media_access(
                candidate.id, user_id=user_id
            ):
                continue
            return candidate
        raise AppError(
            "training_catalog_no_match",
            "No compatible catalog exercise was found. Review your equipment or build a manual "
            "workout. Your current plan has not changed.",
            409,
        )
