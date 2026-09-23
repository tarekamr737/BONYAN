from __future__ import annotations

import json

from fastapi import status
from pydantic import ValidationError

from app.core.errors import AppError
from app.core.providers.contracts import LLMImage, LLMProvider, LLMRequest
from app.core.time import local_day_bounds
from app.domains.nutrition.repository import NutritionRepository
from app.domains.nutrition.schemas import (
    AnalyzeFoodRequest,
    ConfirmFoodRequest,
    DailyDashboard,
    DailyScoreComponent,
    FoodAnalysis,
    FoodLogView,
)


class NutritionService:
    def __init__(self, repository: NutritionRepository, llm_provider: LLMProvider) -> None:
        self.repository = repository
        self.llm_provider = llm_provider

    async def analyze_and_log(self, *, user_id: str, request: AnalyzeFoodRequest) -> FoodLogView:
        analysis = await self.preview(user_id=user_id, request=request)
        record = await self.repository.save_food(
            owner_id=user_id,
            values={
                "description": request.description.strip(),
                "meal_type": request.meal_type.value,
                **analysis.model_dump(),
                "source": "ai",
            },
        )
        return _view(record)

    async def preview(self, *, user_id: str, request: AnalyzeFoodRequest) -> FoodAnalysis:
        prompt = (
            "Estimate nutrition for the described meal. Return only one JSON object with numeric "
            "calories, protein_g, carbs_g, fat_g and a concise summary (maximum 20 words). "
            "Treat values as estimates and do not add markdown. Meal: "
            + request.description.strip()
        )
        try:
            response = await self.llm_provider.complete(
                LLMRequest(prompt=prompt, safety_identifier=user_id)
            )
            analysis = _parse_analysis(response.text)
        except AppError:
            raise
        except Exception as exc:
            raise AppError(
                "food_analysis_unavailable",
                "Food analysis is unavailable right now.",
                status.HTTP_503_SERVICE_UNAVAILABLE,
            ) from exc
        return analysis

    async def preview_image(
        self,
        *,
        user_id: str,
        image: bytes,
        media_type: str,
        description: str = "",
    ) -> FoodAnalysis:
        prompt = (
            "Estimate nutrition from this meal photo. Return only one JSON object with numeric "
            "calories, protein_g, carbs_g, fat_g and a concise summary (maximum 20 words). "
            "Treat every value as an estimate, mention uncertainty in the summary, and do not add "
            "markdown. Additional user context: " + (description.strip() or "none")
        )
        try:
            response = await self.llm_provider.complete(
                LLMRequest(
                    prompt=prompt,
                    images=(LLMImage(data=image, media_type=media_type),),
                    safety_identifier=user_id,
                )
            )
            return _parse_analysis(response.text)
        except AppError:
            raise
        except Exception as exc:
            raise AppError(
                "food_image_analysis_unavailable",
                "The meal photo could not be analyzed right now.",
                status.HTTP_503_SERVICE_UNAVAILABLE,
            ) from exc

    async def recent(self, *, user_id: str, limit: int = 50) -> list[FoodLogView]:
        records = await self.repository.list_recent_food(owner_id=user_id, limit=limit)
        return [_view(item) for item in records]

    async def confirm(self, *, user_id: str, request: ConfirmFoodRequest) -> FoodLogView:
        record = await self.repository.save_reviewed_food(
            owner_id=user_id,
            request_id=request.request_id,
            values={
                **request.model_dump(exclude={"request_id"}),
                "source": "user_reviewed",
            },
        )
        return _view(record)

    async def today(
        self, *, user_id: str, timezone_name: str = "UTC"
    ) -> tuple[DailyDashboard, list[FoodLogView]]:
        start, end, local_date = local_day_bounds(timezone_name)
        foods = await self.repository.list_food_between(
            owner_id=user_id, start=start, end=end
        )
        completed, active = await self.repository.session_counts_between(
            owner_id=user_id, start=start, end=end
        )
        meal_points = min(40, round(len(foods) / 3 * 40))
        workout_points = 60 if completed else (20 if active else 0)
        score = meal_points + workout_points
        next_action = (
            "Log or analyze a meal."
            if not foods
            else "Complete today's workout."
            if not completed
            else "Today's core actions are complete."
        )
        dashboard = DailyDashboard(
            date=local_date.isoformat(),
            score=score,
            completed_workouts=completed,
            active_workouts=active,
            meals_logged=len(foods),
            calories_logged=sum(item.calories for item in foods),
            components=[
                DailyScoreComponent(
                    key="training",
                    value=workout_points,
                    maximum=60,
                    detail=(
                        "Completed workout"
                        if completed
                        else "Workout in progress"
                        if active
                        else "No workout yet"
                    ),
                ),
                DailyScoreComponent(
                    key="nutrition",
                    value=meal_points,
                    maximum=40,
                    detail=f"{len(foods)} meal{'s' if len(foods) != 1 else ''} logged",
                ),
            ],
            next_action=next_action,
        )
        return dashboard, [_view(item) for item in foods]


def _parse_analysis(text: str) -> FoodAnalysis:
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("analysis did not contain JSON")
    try:
        return FoodAnalysis.model_validate(json.loads(text[start : end + 1]))
    except (json.JSONDecodeError, ValidationError) as exc:
        raise ValueError("analysis JSON was invalid") from exc


def _view(record) -> FoodLogView:
    return FoodLogView(
        id=record.id,
        description=record.description,
        meal_type=record.meal_type,
        calories=record.calories,
        protein_g=float(record.protein_g),
        carbs_g=float(record.carbs_g),
        fat_g=float(record.fat_g),
        summary=record.summary,
        source=record.source,
        logged_at=record.logged_at,
    )
