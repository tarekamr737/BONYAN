"""Owner-only portable data export, using explicit field allowlists."""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUserDep
from app.core.database import get_db_session
from app.domains.avatar.models import AvatarRecord, manual_body_metrics
from app.domains.community.models import CommunityPost, ModerationAudit, PostReport
from app.domains.game.models import (
    AwardLedger,
    Challenge,
    Friendship,
    GameEvent,
    ProgressSnapshot,
    RewardClaim,
    WeeklyTargets,
)
from app.domains.inbody.models import InBodyScan
from app.domains.nutrition.models import FoodLogRecord
from app.domains.training.models import CoachMessageRecord, WorkoutPlanRecord, WorkoutSessionRecord
from app.domains.training.substitution_models import SessionSubstitutionEvent
from app.domains.users.models import ProfileHistoryRecord
from app.domains.users.privacy import PrivacyRepository
from app.domains.users.repository import SqlAlchemyProfileRepository
from app.domains.users.schemas import UserProfileView

router = APIRouter(prefix="/users/me", tags=["privacy"])


async def export_owned_data(db: AsyncSession, owner: str) -> dict:
    profile = await SqlAlchemyProfileRepository(db).get(owner)
    data = {
        "schema_version": 1,
        "exported_at": datetime.now(UTC),
        "profile": UserProfileView.model_validate(profile).model_dump(mode="json")
        if profile
        else None,
        "privacy": (await PrivacyRepository(db).get(owner)).model_dump(),
    }
    collections = {
        "game_events": (
            GameEvent,
            [
                "id",
                "source_key",
                "kind",
                "local_day",
                "week_start",
                "timezone",
                "version",
                "evidence",
                "eligible",
                "created_at",
            ],
        ),
        "awards": (
            AwardLedger,
            ["id", "event_id", "reverses_id", "category", "xp", "points", "created_at"],
        ),
        "reward_claims": (
            RewardClaim,
            ["id", "inventory_id", "provider_claim_id", "state", "audit", "created_at"],
        ),
        "progress_history": (ProgressSnapshot, ["id", "result", "created_at"]),
        "weekly_targets": (
            WeeklyTargets,
            [
                "week_start",
                "timezone",
                "workout_days",
                "experience",
                "goal",
                "league_opt_in",
                "joined_at",
            ],
        ),
        "profile_history": (ProfileHistoryRecord, ["id", "kind", "snapshot", "created_at"]),
        "confirmed_measurements": (
            InBodyScan,
            ["id", "status", "result", "confirmed_at", "created_at"],
        ),
        "avatar_versions": (
            AvatarRecord,
            [
                "id",
                "state",
                "style",
                "presentation",
                "measurement_source",
                "measurement_snapshot",
                "measurements_recorded_at",
                "is_public",
                "created_at",
            ],
        ),
        "plans": (
            WorkoutPlanRecord,
            ["id", "status", "goal", "experience", "days", "equipment", "created_at"],
        ),
        "workouts": (
            WorkoutSessionRecord,
            [
                "id",
                "plan_id",
                "day_key",
                "status",
                "logged_sets",
                "summary",
                "prescription_snapshot",
                "version",
                "started_at",
                "completed_at",
            ],
        ),
        "workout_change_audit": (
            SessionSubstitutionEvent,
            ["id", "session_id", "proposal_id", "action", "version", "details", "created_at"],
        ),
        "coach_messages": (CoachMessageRecord, ["id", "role", "content", "model", "created_at"]),
        "nutrition": (
            FoodLogRecord,
            [
                "id",
                "description",
                "meal_type",
                "calories",
                "protein_g",
                "carbs_g",
                "fat_g",
                "source",
                "logged_at",
            ],
        ),
        "posts": (CommunityPost, ["id", "caption", "post_type", "avatar_id", "created_at"]),
    }
    for key, (model, fields) in collections.items():
        rows = await db.execute(
            select(*(getattr(model, field) for field in fields)).where(model.owner_id == owner)
        )
        data[key] = [dict(row) for row in rows.mappings()]
    for key, model, condition, fields in [
        (
            "reports",
            PostReport,
            PostReport.reporter_id == owner,
            ["id", "post_id", "reason", "note", "status", "created_at"],
        ),
        (
            "moderation",
            ModerationAudit,
            ModerationAudit.post_owner_id == owner,
            ["id", "report_id", "post_id", "decision", "created_at"],
        ),
        (
            "friendships",
            Friendship,
            or_(Friendship.member_a == owner, Friendship.member_b == owner),
            ["id", "status", "created_at"],
        ),
        (
            "challenges",
            Challenge,
            or_(Challenge.creator_id == owner, Challenge.recipient_id == owner),
            ["id", "category", "status", "target_points", "starts_at", "ends_at"],
        ),
    ]:
        rows = await db.execute(
            select(*(getattr(model, field) for field in fields)).where(condition)
        )
        data[key] = [dict(row) for row in rows.mappings()]
    manual = await db.execute(
        select(manual_body_metrics).where(manual_body_metrics.c.owner_id == owner)
    )
    data["manual_measurements"] = [dict(row) for row in manual.mappings()]
    return jsonable_encoder(data)


@router.get("/export")
async def export(user: CurrentUserDep, db: Annotated[AsyncSession, Depends(get_db_session)]):
    return JSONResponse(
        await export_owned_data(db, user.id),
        headers={
            "Cache-Control": "private, no-store",
            "Content-Disposition": 'attachment; filename="bonyan-private-data.json"',
        },
    )
