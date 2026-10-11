from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.domains.game.rules import ProgressScore


class MissionView(BaseModel):
    category: Literal["workout", "nutrition", "recovery", "checkin"]
    completed: int
    target: int
    points: int
    maximum: int


class SeasonView(BaseModel):
    id: str
    starts_at: date
    ends_at: date


class GameOverview(BaseModel):
    rules_version: str
    server_time: datetime
    timezone: str
    week_start: date
    week_end: date
    progress_score: ProgressScore
    xp: int
    level: int
    next_level_xp: int
    mission_points: int
    missions: list[MissionView]
    badges: list[str]
    season: SeasonView
    league_opt_in: bool
    partner_redemption_enabled: bool


class CheckInRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["recovery", "checkin"]


class ProgressHistoryView(BaseModel):
    id: UUID
    created_at: datetime
    result: ProgressScore


class ActivityView(BaseModel):
    id: UUID
    kind: str
    local_day: date
    version: str
    eligible: bool
    created_at: datetime


class ActivityPage(BaseModel):
    items: list[ActivityView]
    next_cursor: UUID | None


class OptInRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    enabled: bool


class LeagueEntry(BaseModel):
    rank: int | None
    display_name: str
    avatar_url: str | None
    points: int
    is_me: bool
    progress_score: int | None = None
    unranked_reason: str | None = None


class LeagueView(BaseModel):
    mode: Literal["weekly", "friends", "all_time"]
    opted_in: bool
    week_end: date
    season: SeasonView
    personal_rank: int | None
    participants: list[LeagueEntry]
    rules_version: str = "sustainable-v1"
    partner_redemption_enabled: bool = False


class FriendInvitation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    invite_code: UUID


class InvitationReply(BaseModel):
    model_config = ConfigDict(extra="forbid")
    accept: bool


class FriendView(BaseModel):
    id: UUID
    display_name: str
    status: str
    incoming: bool


class FriendsView(BaseModel):
    invite_code: UUID
    items: list[FriendView]


class ChallengeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    friendship_id: UUID
    category: Literal["workout", "nutrition", "recovery"]


class ChallengeView(BaseModel):
    id: UUID
    category: str
    status: str
    incoming: bool
    target_points: int
    my_points: int
    friend_points: int
    starts_at: datetime
    ends_at: datetime


class WalletView(BaseModel):
    badges: list[str]
    xp: int
    partner_redemption_enabled: bool = False
    partner_offers: list[dict] = []
