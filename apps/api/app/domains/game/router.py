from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUserDep
from app.core.database import get_db_session
from app.core.rate_limit import limit_coach
from app.domains.game.repository import GameRepository
from app.domains.game.schemas import ActivityPage, ActivityView, CheckInRequest, GameOverview
from app.domains.game.service import GameService

router = APIRouter(prefix="/game", tags=["game"])
DB = Annotated[AsyncSession, Depends(get_db_session)]


@router.get("/overview", response_model=GameOverview)
async def overview(user: CurrentUserDep, db: DB):
    return await GameService(GameRepository(db)).overview(user.id)


@router.post("/check-ins", response_model=GameOverview, dependencies=[Depends(limit_coach)])
async def check_in(request: CheckInRequest, user: CurrentUserDep, db: DB):
    service = GameService(GameRepository(db))
    await service.check_in(user.id, request.kind)
    result = await service.overview(user.id)
    await db.commit()
    return result


@router.get("/activity", response_model=ActivityPage)
async def activity(
    user: CurrentUserDep,
    db: DB,
    before: UUID | None = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
):
    records = await GameRepository(db).history(user.id, before, limit + 1)
    return ActivityPage(
        items=[
            ActivityView.model_validate(record, from_attributes=True) for record in records[:limit]
        ],
        next_cursor=records[limit - 1].id if len(records) > limit else None,
    )
