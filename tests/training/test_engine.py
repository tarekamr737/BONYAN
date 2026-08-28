from __future__ import annotations

import asyncio

import pytest
from pydantic import ValidationError

from app.domains.training.engine.planner import WorkoutPlanner
from app.domains.training.engine.progression import decide_progression
from app.domains.training.engine.substitutions import choose_substitution
from app.domains.training.schemas import (
    ExercisePrescription,
    ExperienceLevel,
    LoggedSet,
    PlanningContext,
    ProgressionAction,
    TrainingGoal,
)
from app.integrations.musclewiki.errors import MuscleWikiUnavailableError
from app.integrations.musclewiki.provider import (
    ExerciseDetails,
    ExerciseSearchFilters,
    ExerciseSearchPage,
)


class FakeExerciseProvider:
    def __init__(self, *, fail: bool = False) -> None:
        self.fail = fail
        self.calls: list[ExerciseSearchFilters] = []

    async def search_exercises(
        self, filters: ExerciseSearchFilters, *, page: int = 1, page_size: int = 20
    ) -> ExerciseSearchPage:
        if self.fail:
            raise MuscleWikiUnavailableError("down")
        self.calls.append(filters)
        muscle = filters.muscles[0] if filters.muscles else "general"
        equipment = filters.equipment or ("bodyweight",)
        return ExerciseSearchPage(
            items=(
                ExerciseDetails(
                    id=f"{muscle}-1",
                    name=f"{muscle.title()} Alpha",
                    muscles=(muscle,),
                    equipment=(equipment[0],),
                    difficulty=filters.difficulty or "intermediate",
                ),
                ExerciseDetails(
                    id=f"{muscle}-2",
                    name=f"{muscle.title()} Beta",
                    muscles=(muscle,),
                    equipment=(equipment[0],),
                    difficulty=filters.difficulty or "intermediate",
                ),
            ),
            page=page,
            page_size=page_size,
            total=2,
        )

    async def get_exercise(self, exercise_id: str) -> ExerciseDetails:
        return ExerciseDetails(
            id=exercise_id,
            name="Loaded Exercise",
            muscles=("chest",),
            equipment=("dumbbell",),
            difficulty="beginner",
        )

    async def get_media_access(self, exercise_id: str) -> str | None:
        return f"https://media.example/{exercise_id}"


def run(coro):
    return asyncio.run(coro)


def test_planning_context_validates_ranges_and_normalizes_equipment() -> None:
    context = PlanningContext(days_per_week=3, equipment=["Dumbbell", " dumbbell "])

    assert context.equipment == ["dumbbell"]
    with pytest.raises(ValidationError):
        PlanningContext(days_per_week=1)


def test_beginner_plan_is_deterministic_without_inbody() -> None:
    provider = FakeExerciseProvider()
    context = PlanningContext(
        goal=TrainingGoal.GENERAL_FITNESS,
        experience=ExperienceLevel.BEGINNER,
        days_per_week=3,
        session_duration_minutes=45,
        equipment=["dumbbell", "bodyweight"],
    )

    first = run(WorkoutPlanner(provider).generate(context))
    second = run(WorkoutPlanner(provider).generate(context))

    assert first.model_dump(exclude={"id", "created_at", "updated_at"}) == second.model_dump(
        exclude={"id", "created_at", "updated_at"}
    )
    assert len(first.days) == 3
    assert all(item.sets == 2 for day in first.days for item in day.prescriptions)
    assert first.generation_snapshot["optional_inbody_used"] is False


def test_advanced_plan_uses_more_sets_and_duration_limits_exercises() -> None:
    plan = run(
        WorkoutPlanner(FakeExerciseProvider()).generate(
            PlanningContext(
                goal=TrainingGoal.STRENGTH,
                experience=ExperienceLevel.ADVANCED,
                days_per_week=5,
                session_duration_minutes=30,
                equipment=["barbell"],
                latest_inbody={"weight": 82},
            )
        )
    )

    assert len(plan.days) == 5
    assert all(len(day.prescriptions) == 3 for day in plan.days)
    assert all(item.sets == 4 for day in plan.days for item in day.prescriptions)
    assert plan.generation_snapshot["optional_inbody_used"] is True


def test_musclewiki_outage_degrades_to_bodyweight_fallback() -> None:
    plan = run(
        WorkoutPlanner(FakeExerciseProvider(fail=True)).generate(
            PlanningContext(days_per_week=2, equipment=["cable"], session_duration_minutes=35)
        )
    )

    assert all(
        item.musclewiki_id.startswith("fallback-")
        for day in plan.days
        for item in day.prescriptions
    )
    assert all(item.equipment == ["bodyweight"] for day in plan.days for item in day.prescriptions)


def test_progression_increases_holds_and_regresses() -> None:
    prescription = ExercisePrescription(
        musclewiki_id="ex-1",
        name="Bench Press",
        muscles=["chest"],
        equipment=["barbell"],
        sets=3,
        reps_min=6,
        reps_max=8,
        rest_seconds=120,
    )

    increase = decide_progression(
        prescription,
        [LoggedSet(prescription_index=0, set_number=i, reps=8, weight_kg=60) for i in range(1, 4)],
        current_weight_kg=60,
    )
    hold = decide_progression(
        prescription,
        [LoggedSet(prescription_index=0, set_number=1, reps=6, weight_kg=60)],
        current_weight_kg=60,
    )
    regress = decide_progression(
        prescription,
        [LoggedSet(prescription_index=0, set_number=1, reps=4, weight_kg=60)],
        current_weight_kg=60,
        recent_failures=1,
    )

    assert increase.action == ProgressionAction.INCREASE
    assert increase.next_weight_kg == 62.5
    assert hold.action == ProgressionAction.HOLD
    assert regress.action == ProgressionAction.REGRESS


def test_substitution_respects_equipment_and_muscle_overlap() -> None:
    original = ExercisePrescription(
        musclewiki_id="old",
        name="Old Press",
        muscles=["chest"],
        equipment=["barbell"],
        sets=3,
        reps_min=8,
        reps_max=12,
        rest_seconds=90,
    )
    replacement = choose_substitution(
        original,
        [
            ExerciseDetails(
                id="bad-equipment",
                name="Cable Press",
                muscles=("chest",),
                equipment=("cable",),
                difficulty="intermediate",
            ),
            ExerciseDetails(
                id="good",
                name="Push Up",
                muscles=("chest",),
                equipment=("bodyweight",),
                difficulty="beginner",
            ),
        ],
        available_equipment=("bodyweight",),
    )

    assert replacement is not None
    assert replacement.id == "good"
