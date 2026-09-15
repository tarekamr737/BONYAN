from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUserDep
from app.core.config import Settings, get_settings
from app.core.database import get_db_session
from app.domains.nutrition.repository import NutritionRepository
from app.domains.nutrition.schemas import AnalyzeFoodRequest, DailyDashboard, FoodLogView
from app.domains.nutrition.service import NutritionService
from app.integrations.llm.production import ProductionLLMProvider

router = APIRouter(prefix="/nutrition", tags=["nutrition"])


def _provider(settings: Settings):
    if settings.chat_provider == "mock":
        from app.core.providers.mocks import MockLLMProvider

        return MockLLMProvider(settings.chat_model)
    if settings.chat_api_key is None:
        raise RuntimeError("CHAT_API_KEY validation did not run")
    return ProductionLLMProvider(
        provider=settings.chat_provider,
        api_key=settings.chat_api_key.get_secret_value(),
        model=settings.chat_model,
        base_url=settings.chat_base_url,
        timeout_seconds=settings.chat_timeout_seconds,
    )


async def get_service(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> NutritionService:
    return NutritionService(NutritionRepository(session), _provider(settings))


ServiceDep = Annotated[NutritionService, Depends(get_service)]


@router.post("/analyze", response_model=FoodLogView, status_code=status.HTTP_201_CREATED)
async def analyze_food(
    request: AnalyzeFoodRequest, current_user: CurrentUserDep, service: ServiceDep
) -> FoodLogView:
    return await service.analyze_and_log(user_id=current_user.id, request=request)


@router.get("/today", response_model=DailyDashboard)
async def get_today(current_user: CurrentUserDep, service: ServiceDep) -> DailyDashboard:
    dashboard, _ = await service.today(user_id=current_user.id)
    return dashboard


@router.get("/logs/today", response_model=list[FoodLogView])
async def get_today_logs(current_user: CurrentUserDep, service: ServiceDep) -> list[FoodLogView]:
    _, logs = await service.today(user_id=current_user.id)
    return logs
