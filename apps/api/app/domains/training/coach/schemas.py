from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class CoachToolName(StrEnum):
    GET_CURRENT_PLAN = "get_current_plan"
    GET_TRAINING_HISTORY = "get_training_history"
    SEARCH_EXERCISES = "search_exercises"
    GET_EXERCISE_DETAILS = "get_exercise_details"
    GENERATE_WORKOUT_PLAN = "generate_workout_plan"
    LOG_WORKOUT = "log_workout"


class CoachToolCall(BaseModel):
    name: CoachToolName
    arguments: dict[str, Any] = Field(default_factory=dict)


class CoachToolResult(BaseModel):
    name: CoachToolName
    result: dict[str, Any]
