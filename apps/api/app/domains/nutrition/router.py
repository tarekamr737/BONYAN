from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUserDep
from app.core.config import Settings, get_settings
from app.core.database import get_db_session
from app.domains.nutrition.image_validation import MAX_FOOD_IMAGE_BYTES, validate_food_image
from app.domains.nutrition.repository import NutritionRepository
from app.domains.nutrition.schemas import (
    AnalyzeFoodRequest,
    ConfirmFoodRequest,
    DailyDashboard,
    FoodLogView,
    FoodPreview,
    MealType,
)
from app.domains.nutrition.service import NutritionService
from app.domains.users.repository import SqlAlchemyProfileRepository
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


async def _profile_timezone(session: AsyncSession, user_id: str) -> str:
    profile = await SqlAlchemyProfileRepository(session).get(user_id)
    return profile.timezone if profile else "UTC"


@router.post("/analyze", response_model=FoodLogView, status_code=status.HTTP_201_CREATED)
async def analyze_food(
    request: AnalyzeFoodRequest, current_user: CurrentUserDep, service: ServiceDep
) -> FoodLogView:
    return await service.analyze_and_log(user_id=current_user.id, request=request)


@router.get("/today", response_model=DailyDashboard)
async def get_today(
    current_user: CurrentUserDep,
    service: ServiceDep,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> DailyDashboard:
    dashboard, _ = await service.today(
        user_id=current_user.id,
        timezone_name=await _profile_timezone(session, current_user.id),
    )
    return dashboard


@router.post("/preview", response_model=FoodPreview)
async def preview_food(
    request: AnalyzeFoodRequest, current_user: CurrentUserDep, service: ServiceDep
) -> FoodPreview:
    analysis = await service.preview(user_id=current_user.id, request=request)
    return FoodPreview(**analysis.model_dump())


@router.post("/preview-image", response_model=FoodPreview)
async def preview_food_image(
    current_user: CurrentUserDep,
    service: ServiceDep,
    photo: Annotated[UploadFile, File()],
    meal_type: Annotated[MealType, Form()] = MealType.SNACK,
    description: Annotated[str, Form(max_length=1000)] = "",
) -> FoodPreview:
    del meal_type
    content = await photo.read(MAX_FOOD_IMAGE_BYTES + 1)
    image = validate_food_image(content, photo.content_type or "application/octet-stream")
    analysis = await service.preview_image(
        user_id=current_user.id,
        image=image.content,
        media_type=image.media_type,
        description=description,
    )
    return FoodPreview(**analysis.model_dump())


@router.post("/confirm", response_model=FoodLogView, status_code=status.HTTP_201_CREATED)
async def confirm_food(
    request: ConfirmFoodRequest, current_user: CurrentUserDep, service: ServiceDep
) -> FoodLogView:
    return await service.confirm(user_id=current_user.id, request=request)


@router.get("/logs/today", response_model=list[FoodLogView])
async def get_today_logs(
    current_user: CurrentUserDep,
    service: ServiceDep,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[FoodLogView]:
    _, logs = await service.today(
        user_id=current_user.id,
        timezone_name=await _profile_timezone(session, current_user.id),
    )
    return logs


@router.get("/logs", response_model=list[FoodLogView])
async def get_recent_logs(
    current_user: CurrentUserDep,
    service: ServiceDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[FoodLogView]:
    return await service.recent(user_id=current_user.id, limit=limit)
