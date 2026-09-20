from datetime import datetime
from enum import StrEnum
from typing import Annotated
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class MealType(StrEnum):
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SNACK = "snack"


class AnalyzeFoodRequest(BaseModel):
    description: str = Field(min_length=3, max_length=1000)
    meal_type: MealType = MealType.SNACK


class FoodAnalysis(BaseModel):
    calories: Annotated[int, Field(ge=0, le=5000)]
    protein_g: Annotated[float, Field(ge=0, le=500)]
    carbs_g: Annotated[float, Field(ge=0, le=1000)]
    fat_g: Annotated[float, Field(ge=0, le=500)]
    summary: str = Field(min_length=1, max_length=240)


class FoodLogView(FoodAnalysis):
    id: UUID
    description: str
    meal_type: MealType
    source: str
    logged_at: datetime


class ConfirmFoodRequest(FoodAnalysis):
    request_id: UUID
    description: str = Field(min_length=3, max_length=1000)
    meal_type: MealType = MealType.SNACK


class FoodPreview(FoodAnalysis):
    request_id: UUID = Field(default_factory=uuid4)


class DailyScoreComponent(BaseModel):
    key: str
    value: int
    maximum: int
    detail: str


class DailyDashboard(BaseModel):
    date: str
    score: int
    completed_workouts: int
    active_workouts: int
    meals_logged: int
    calories_logged: int
    components: list[DailyScoreComponent]
    next_action: str
