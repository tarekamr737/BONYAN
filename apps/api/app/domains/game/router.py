from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUserDep
from app.core.avatar_integration import get_avatar_service
from app.core.database import get_db_session
from app.core.errors import AppError
from app.core.rate_limit import limit_coach
from app.domains.avatar.service import AvatarService
from app.domains.game.community_repository import GameCommunityRepository
from app.domains.game.community_service import GameCommunityService
from app.domains.game.repository import GameRepository
from app.domains.game.schemas import (
    ActivityPage,
    ActivityView,
    ChallengeRequest,
    ChallengeView,
    CheckInRequest,
    FriendInvitation,
    FriendsView,
    GameOverview,
    InvitationReply,
    LeagueView,
    OptInRequest,
    ProgressHistoryView,
    WalletView,
)
from app.domains.game.service import GameService

router = APIRouter(prefix="/game", tags=["game"])
DB = Annotated[AsyncSession, Depends(get_db_session)]
Avatar = Annotated[AvatarService, Depends(get_avatar_service)]


@router.get("/overview", response_model=GameOverview)
async def overview(user: CurrentUserDep, db: DB):
    return await GameService(GameRepository(db)).overview(user.id)


@router.get("/progress/history", response_model=list[ProgressHistoryView])
async def progress_history(
    user: CurrentUserDep, db: DB, limit: Annotated[int, Query(ge=1, le=50)] = 20
):
    records = await GameRepository(db).progress_history(user.id, limit)
    return [ProgressHistoryView.model_validate(record, from_attributes=True) for record in records]


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


@router.get("/league", response_model=LeagueView)
async def league(
    user: CurrentUserDep,
    db: DB,
    avatars: Avatar,
    mode: Literal["weekly", "friends", "all_time"] = "weekly",
):
    return await GameCommunityService(GameCommunityRepository(db), avatars).league(user.id, mode)


@router.put("/league/participation", response_model=LeagueView)
async def participation(payload: OptInRequest, user: CurrentUserDep, db: DB, avatars: Avatar):
    service = GameCommunityService(GameCommunityRepository(db), avatars)
    await service.opt_in(user.id, payload.enabled)
    result = await service.league(user.id, "weekly")
    await db.commit()
    return result


@router.get("/friends", response_model=FriendsView)
async def friends(user: CurrentUserDep, db: DB):
    return await GameCommunityService(GameCommunityRepository(db)).friends(user.id)


@router.post(
    "/friends/invitations", response_model=FriendsView, dependencies=[Depends(limit_coach)]
)
async def invite_friend(payload: FriendInvitation, user: CurrentUserDep, db: DB):
    service = GameCommunityService(GameCommunityRepository(db))
    await service.invite_friend(user.id, payload.invite_code)
    result = await service.friends(user.id)
    await db.commit()
    return result


@router.post("/friends/invitations/{id}/reply", response_model=FriendsView)
async def reply_friend(id: UUID, payload: InvitationReply, user: CurrentUserDep, db: DB):
    service = GameCommunityService(GameCommunityRepository(db))
    await service.reply_friend(user.id, id, payload.accept)
    result = await service.friends(user.id)
    await db.commit()
    return result


@router.get("/challenges", response_model=list[ChallengeView])
async def challenges(user: CurrentUserDep, db: DB):
    return await GameCommunityService(GameCommunityRepository(db)).challenges(user.id)


@router.post("/challenges", response_model=list[ChallengeView], dependencies=[Depends(limit_coach)])
async def create_challenge(payload: ChallengeRequest, user: CurrentUserDep, db: DB):
    service = GameCommunityService(GameCommunityRepository(db))
    await service.create_challenge(user.id, payload.friendship_id, payload.category)
    result = await service.challenges(user.id)
    await db.commit()
    return result


@router.post("/challenges/{id}/reply", response_model=list[ChallengeView])
async def reply_challenge(id: UUID, payload: InvitationReply, user: CurrentUserDep, db: DB):
    service = GameCommunityService(GameCommunityRepository(db))
    await service.reply_challenge(user.id, id, payload.accept)
    result = await service.challenges(user.id)
    await db.commit()
    return result


@router.get("/wallet", response_model=WalletView)
async def wallet(user: CurrentUserDep, db: DB):
    overview = await GameService(GameRepository(db)).overview(user.id)
    return WalletView(badges=overview["badges"], xp=overview["xp"])


@router.post("/wallet/claims/{inventory_id}")
async def claim_reward(inventory_id: UUID, user: CurrentUserDep):
    # A verified issuing provider is required before any value or redeem code can exist.
    raise AppError(
        "partner_rewards_unavailable", "Verified partner redemption is not available.", 503
    )
