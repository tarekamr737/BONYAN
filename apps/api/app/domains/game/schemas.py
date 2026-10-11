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
