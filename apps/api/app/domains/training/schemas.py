from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.domains.training.coach.schemas import CoachToolCall


class TrainingGoal(StrEnum):
    STRENGTH = "strength"
    HYPERTROPHY = "hypertrophy"
    FAT_LOSS = "fat_loss"
    GENERAL_FITNESS = "general_fitness"


class ExperienceLevel(StrEnum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class PlanStatus(StrEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class WorkoutSessionStatus(StrEnum):
    ACTIVE = "active"
    COMPLETED = "completed"


class ProgressionAction(StrEnum):
    INCREASE = "increase"
    HOLD = "hold"
    REGRESS = "regress"


class PlanningContext(BaseModel):
    goal: TrainingGoal = TrainingGoal.GENERAL_FITNESS
    experience: ExperienceLevel = ExperienceLevel.BEGINNER
    days_per_week: Annotated[int, Field(ge=2, le=6)] = 3
    session_duration_minutes: Annotated[int, Field(ge=25, le=120)] = 45
    equipment: list[str] = Field(default_factory=list, max_length=20)
    preferences: list[str] = Field(default_factory=list, max_length=20)
    latest_inbody: dict[str, float | str | None] | None = None
    recent_history: list[dict[str, int | float | str | None]] = Field(
        default_factory=list, max_length=12
    )

    @field_validator("equipment", "preferences")
    @classmethod
    def normalize_text_list(cls, value: list[str]) -> list[str]:
        return sorted({item.strip().lower() for item in value if item.strip()})


class ProgressionRule(BaseModel):
    type: str = "double_progression"
    increment_kg: Annotated[float, Field(gt=0, le=10)] = 2.5
    hold_after_failures: Annotated[int, Field(ge=1, le=5)] = 1
    regress_after_failures: Annotated[int, Field(ge=2, le=6)] = 2


class ExercisePrescription(BaseModel):
    musclewiki_id: str = Field(min_length=1, max_length=120)
    name: str = Field(min_length=1, max_length=160)
    muscles: list[str] = Field(default_factory=list)
    equipment: list[str] = Field(default_factory=list)
    sets: Annotated[int, Field(ge=1, le=8)]
    reps_min: Annotated[int, Field(ge=1, le=50)]
    reps_max: Annotated[int, Field(ge=1, le=50)]
    rest_seconds: Annotated[int, Field(ge=30, le=300)]
    intensity_target: str | None = Field(default=None, max_length=80)
    notes: str | None = Field(default=None, max_length=240)
    progression: ProgressionRule = Field(default_factory=ProgressionRule)

    @model_validator(mode="after")
    def validate_rep_range(self) -> ExercisePrescription:
        if self.reps_min > self.reps_max:
            raise ValueError("reps_min cannot exceed reps_max")
        return self


class WorkoutDay(BaseModel):
    key: str = Field(min_length=1, max_length=80)
    order: Annotated[int, Field(ge=1, le=7)]
    name: str = Field(min_length=1, max_length=120)
    estimated_minutes: Annotated[int, Field(ge=10, le=180)]
    prescriptions: list[ExercisePrescription] = Field(
        default_factory=list, min_length=1, max_length=12
    )


class WorkoutPlan(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID | None = None
    status: PlanStatus = PlanStatus.DRAFT
    goal: TrainingGoal
    experience: ExperienceLevel
    days_per_week: int
    session_duration_minutes: int
    equipment: list[str]
    generation_snapshot: dict[str, object] = Field(default_factory=dict)
    days: list[WorkoutDay]
    created_at: datetime | None = None
    updated_at: datetime | None = None


class GeneratePlanRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    goal: TrainingGoal = TrainingGoal.GENERAL_FITNESS
    experience: ExperienceLevel = ExperienceLevel.BEGINNER
    days_per_week: Annotated[int, Field(ge=2, le=6)] = 3
    session_duration_minutes: Annotated[int, Field(ge=25, le=120)] = 45
    equipment: list[str] = Field(default_factory=list, max_length=20)
    preferences: list[str] = Field(default_factory=list, max_length=20)
    activate: bool = True

    @field_validator("equipment", "preferences")
    @classmethod
    def normalize_text_list(cls, value: list[str]) -> list[str]:
        return sorted({item.strip().lower() for item in value if item.strip()})


class LoggedSetInput(BaseModel):
    prescription_index: Annotated[int, Field(ge=0, le=20)]
    set_number: Annotated[int, Field(ge=1, le=12)]
    reps: Annotated[int, Field(ge=0, le=100)]
    weight_kg: Annotated[float, Field(ge=0, le=600)] = 0
    completed: bool = True
    notes: str | None = Field(default=None, max_length=240)


class LoggedSet(LoggedSetInput):
    id: UUID | None = None
    exercise_name: str | None = None


class StartSessionRequest(BaseModel):
    plan_id: UUID
    day_key: str = Field(min_length=1, max_length=80)


class WorkoutSessionResponse(BaseModel):
    id: UUID
    plan_id: UUID
    day_key: str
    status: WorkoutSessionStatus
    started_at: datetime
    completed_at: datetime | None = None
    logged_sets: list[LoggedSet] = Field(default_factory=list)
    summary: dict[str, object] = Field(default_factory=dict)


class ProgressionDecision(BaseModel):
    action: ProgressionAction
    next_weight_kg: float
    reason: str


class SubstituteExerciseRequest(BaseModel):
    plan_id: UUID
    day_key: str
    prescription_index: Annotated[int, Field(ge=0, le=20)]
    available_equipment: list[str] = Field(default_factory=list, max_length=20)


class CoachMessageRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    tool_calls: list[CoachToolCall] = Field(default_factory=list, max_length=8)


class CoachMessageResponse(BaseModel):
    response: str
    model: str
    tool_results: list[dict[str, object]] = Field(default_factory=list)


class ExerciseMediaAccessResponse(BaseModel):
    url: str
    expires_at: datetime
