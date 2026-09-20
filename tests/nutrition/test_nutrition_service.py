import asyncio
from datetime import UTC, datetime
from types import SimpleNamespace

from app.core.providers.contracts import LLMRequest, LLMResponse
from app.domains.nutrition.schemas import AnalyzeFoodRequest, MealType
from app.domains.nutrition.service import NutritionService


class FakeLLM:
    async def complete(self, request: LLMRequest) -> LLMResponse:
        assert "Meal:" in request.prompt
        return LLMResponse(
            text=(
                '{"calories":520,"protein_g":42,"carbs_g":55,"fat_g":14,'
                '"summary":"Balanced high-protein meal."}'
            ),
            model="test",
        )


class FakeRepository:
    def __init__(self) -> None:
        self.foods = []
        self.completed = 0
        self.active = 0

    async def save_food(self, *, owner_id: str, values: dict[str, object]):
        record = SimpleNamespace(
            id="11111111-1111-1111-1111-111111111111",
            owner_id=owner_id,
            logged_at=datetime.now(UTC),
            **values,
        )
        self.foods.append(record)
        return record

    async def list_food_between(self, *, owner_id: str, start: datetime, end: datetime):
        return [
            item
            for item in self.foods
            if item.owner_id == owner_id and start <= item.logged_at < end
        ]

    async def session_counts_between(self, *, owner_id: str, start: datetime, end: datetime):
        del owner_id, start, end
        return self.completed, self.active


def run(coro):
    return asyncio.run(coro)


def test_food_analysis_is_validated_persisted_and_owner_scoped() -> None:
    repository = FakeRepository()
    service = NutritionService(repository, FakeLLM())

    result = run(
        service.analyze_and_log(
            user_id="user-1",
            request=AnalyzeFoodRequest(
                description="Chicken, rice and salad", meal_type=MealType.LUNCH
            ),
        )
    )

    assert result.calories == 520
    assert result.protein_g == 42
    assert result.meal_type == MealType.LUNCH
    assert repository.foods[0].owner_id == "user-1"


def test_daily_score_uses_only_real_today_actions() -> None:
    repository = FakeRepository()
    service = NutritionService(repository, FakeLLM())
    empty, _ = run(service.today(user_id="user-1"))
    assert empty.score == 0

    repository.completed = 1
    for meal in ("Breakfast", "Lunch", "Dinner"):
        run(
            service.analyze_and_log(
                user_id="user-1",
                request=AnalyzeFoodRequest(description=meal, meal_type=MealType.SNACK),
            )
        )
    complete, logs = run(service.today(user_id="user-1"))

    assert complete.score == 100
    assert complete.completed_workouts == 1
    assert complete.meals_logged == 3
    assert len(logs) == 3


def test_preview_leaves_food_history_unchanged():
    repository = FakeRepository()
    service = NutritionService(repository, FakeLLM())
    preview = run(service.preview(
        user_id="user-1", request=AnalyzeFoodRequest(description="Chicken and rice")
    ))
    assert preview.calories == 520
    assert repository.foods == []
