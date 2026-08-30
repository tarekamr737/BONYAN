from __future__ import annotations

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
    WorkoutDay,
    WorkoutPlan,
)
from app.integrations.musclewiki.errors import MuscleWikiError
from app.integrations.musclewiki.provider import (
    ExerciseDetails,
    ExerciseSearchFilters,
    MuscleWikiExerciseProvider,
)


class WorkoutPlanner:
    def __init__(self, exercise_provider: MuscleWikiExerciseProvider) -> None:
        self.exercise_provider = exercise_provider

    async def generate(self, context: PlanningContext, *, activate: bool = True) -> WorkoutPlan:
        equipment = normalize_equipment(context.equipment)
        split = SPLITS[context.days_per_week]
        per_day = prescriptions_per_day(context.session_duration_minutes)
        defaults = prescription_defaults(context.goal, context.experience)
        used_ids: set[str] = set()
        days: list[WorkoutDay] = []

        for order, day_name in enumerate(split, start=1):
            prescriptions: list[ExercisePrescription] = []
            for muscle in DAY_MUSCLES[day_name][:per_day]:
                exercise = await self._select_exercise(
                    muscle=muscle,
                    equipment=equipment,
                    used_ids=used_ids,
                    difficulty=context.experience.value,
                )
                used_ids.add(exercise.id)
                sets, reps_min, reps_max, rest_seconds, intensity = defaults
                prescriptions.append(
                    ExercisePrescription(
                        musclewiki_id=exercise.id,
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
                    name=day_name,
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
    ) -> ExerciseDetails:
        try:
            page = await self.exercise_provider.search_exercises(
                ExerciseSearchFilters(
                    muscles=(muscle,), equipment=equipment, difficulty=difficulty
                ),
                page=1,
                page_size=12,
            )
            candidates = [
                item
                for item in page.items
                if item.id not in used_ids and set(item.equipment).issubset(set(equipment))
            ]
        except MuscleWikiError:
            candidates = []
        if candidates:
            return sorted(candidates, key=lambda item: (item.name.lower(), item.id))[0]
        return ExerciseDetails(
            id=f"fallback-{muscle.replace(' ', '-')}",
            name=f"{muscle.title()} Bodyweight Pattern",
            muscles=(muscle,),
            equipment=("bodyweight",),
            difficulty=difficulty,
            instructions=("Use a controlled tempo and stop if pain occurs.",),
        )
