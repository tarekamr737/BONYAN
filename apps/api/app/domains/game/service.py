import hashlib
import json
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from app.core.errors import AppError
from app.domains.game.repository import GameRepository
from app.domains.game.rules import level_for_xp, mission_reward, progress_for_habits
from app.domains.nutrition.models import FoodLogRecord
from app.domains.training.models import WorkoutSessionRecord
from app.domains.users.coaching_schemas import CoachingPreferences
from app.domains.users.repository import SqlAlchemyProfileRepository


class GameService:
    def __init__(self, repository: GameRepository):
        self.repository = repository

    async def record(
        self,
        owner: str,
        source: str,
        category: str,
        *,
        eligible: bool,
        evidence: dict | None = None,
    ):
        await self.repository.lock(owner)
        previous = await self.repository.source(owner, source)
        if previous:
            return previous
        now = datetime.now(UTC)
        targets = await self.repository.targets(owner, now)
        day = now.astimezone(ZoneInfo(targets.timezone)).date()
        same_day = await self.repository.credited(owner, category, None, day)
        if category == "workout" and eligible:
            await self.repository.revoke(owner, f"recovery:{targets.week_start}:{day}")
        count = await self.repository.credited(owner, category, targets.week_start)
        # Recovery counts on days without an awarded workout, never extra workout volume.
        conflicts = category == "recovery" and await self.repository.credited(
            owner, "workout", targets.week_start, day
        )
        xp, points = (
            mission_reward(category, count, targets.workout_days)
            if eligible and not same_day and not conflicts
            else (0, 0)
        )
        return await self.repository.append(
            owner, source, category, day, targets, bool(xp), evidence or {}, xp, points
        )

    async def workout_completed(self, owner: str, workout: WorkoutSessionRecord):
        if workout.owner_id != owner:
            raise AppError("workout_not_found", "Workout not found.", 404)
        now = datetime.now(UTC)
        prescriptions = (workout.prescription_snapshot or {}).get("prescriptions", [])
        target = sum(item["sets"] for item in prescriptions)
        sets = sum(
            bool(item.get("completed", True) and item.get("reps", 0) > 0)
            for item in workout.logged_sets
        )
        eligible = (
            workout.status == "completed"
            and target > 0
            and sets >= max(2, (target + 1) // 2)
            and 60 <= (now - workout.started_at).total_seconds() <= 24 * 3600
        )
        # Completion timestamps are set by the server; old import/sync never mints awards.
        eligible = (
            eligible
            and workout.completed_at is not None
            and abs((now - workout.completed_at).total_seconds()) < 60
        )
        return await self.record(
            owner,
            f"workout:{workout.id}",
            "workout",
            eligible=eligible,
            evidence={
                "completed_sets": sets,
                "prescribed_sets": target,
                "reason": "eligible" if eligible else "insufficient_or_stale_evidence",
            },
        )

    async def nutrition_confirmed(self, owner: str, food: FoodLogRecord):
        if food.owner_id != owner:
            raise AppError("food_not_found", "Meal not found.", 404)
        eligible = (
            abs((datetime.now(UTC) - food.logged_at).total_seconds()) < 60 and food.calories > 0
        )
        return await self.record(
            owner,
            f"nutrition:{food.id}",
            "nutrition",
            eligible=eligible,
            evidence={"human_confirmed": True},
        )

    async def check_in(self, owner: str, kind: str):
        await self.repository.lock(owner)
        if kind not in {"recovery", "checkin"}:
            raise AppError("invalid_checkin", "Choose recovery or progress check-in.", 400)
        targets = await self.repository.targets(owner, datetime.now(UTC))
        day = datetime.now(UTC).astimezone(ZoneInfo(targets.timezone)).date()
        return await self.record(
            owner,
            f"{kind}:{targets.week_start}:{day}",
            kind,
            eligible=True,
            evidence={"self_reported": True, "not_medical": True},
        )

    async def overview(self, owner: str) -> dict:
        now = datetime.now(UTC)
        targets = await self.repository.targets(owner, now)
        awards, weekly = (
            await self.repository.awards(owner),
            await self.repository.awards(owner, targets.week_start),
        )
        total_xp = max(0, sum(item.xp for item in awards))
        counts = {
            category: max(
                0, sum(1 if row.xp > 0 else -1 for row in weekly if row.category == category)
            )
            for category in ("workout", "nutrition", "recovery", "checkin")
        }
        profile = await SqlAlchemyProfileRepository(self.repository.session).get(owner)
        preferences = (
            CoachingPreferences.model_validate(profile.coaching or {})
            if profile
            else CoachingPreferences()
        )
        progress = progress_for_habits(counts, targets.workout_days, targets.goal, preferences)
        goal = progress.dimensions["personal_goal"]
        evidence = {
            "week": str(targets.week_start),
            "counts": counts,
            "goal": goal,
            "target": targets.workout_days,
            "progress": progress.model_dump(),
        }
        fingerprint = hashlib.sha256(json.dumps(evidence, sort_keys=True).encode()).hexdigest()
        await self.repository.snapshot(owner, fingerprint, progress.model_dump())
        season = await self.repository.season(now)
        missions = [
            {
                "category": kind,
                "completed": counts[kind],
                "target": target,
                "points": max(0, sum(row.points for row in weekly if row.category == kind)),
                "maximum": maximum,
            }
            for kind, target, maximum in [
                ("workout", targets.workout_days, 40),
                ("nutrition", 7, 20),
                ("recovery", max(1, 7 - targets.workout_days), 20),
                ("checkin", 1, 0),
            ]
        ]
        reversed_ids = {item.reverses_id for item in awards if item.reverses_id}
        active_awards = [item for item in awards if item.id not in reversed_ids and item.xp > 0]
        badges = [
            key
            for key, condition in [
                (
                    "first_workout",
                    any(item.category == "workout" for item in active_awards),
                ),
                (
                    "balanced_week",
                    all(counts[kind] for kind in ("workout", "nutrition", "recovery")),
                ),
                ("steady_builder", total_xp >= 500),
            ]
            if condition
        ]
        return {
            "rules_version": "sustainable-v1",
            "server_time": now,
            "timezone": targets.timezone,
            "week_start": targets.week_start,
            "week_end": targets.week_start + timedelta(days=7),
            "progress_score": progress,
            "xp": total_xp,
            "level": level_for_xp(total_xp),
            "next_level_xp": level_for_xp(total_xp) * 100,
            "mission_points": max(0, sum(row.points for row in weekly)),
            "missions": missions,
            "badges": badges,
            "season": {"id": season.id, "starts_at": season.starts_at, "ends_at": season.ends_at},
            "league_opt_in": targets.league_opt_in,
            "partner_redemption_enabled": False,
        }
