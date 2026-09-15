from __future__ import annotations

from uuid import UUID

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.avatar_integration import SqlAlchemyBodyMetricsAdapter, _measurement_value
from app.core.errors import AppError
from app.domains.avatar.contracts import BodyMetricsSnapshot, BodyMetricsSource
from app.domains.inbody.models import InBodyScan
from app.domains.users.coaching_schemas import (
    AssessmentOverview,
    AssessmentRequest,
    BodyMeasurements,
    HistoryView,
)
from app.domains.users.models import ProfileHistoryRecord, UserAccount
from app.domains.users.repository import SqlAlchemyProfileRepository
from app.domains.users.schemas import UserProfileView
from app.domains.users.scoring import coaching_score


class AssessmentService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.profiles = SqlAlchemyProfileRepository(session)

    async def profile(self, owner_id: str) -> UserProfileView:
        profile = await self.profiles.get(owner_id)
        return UserProfileView.model_validate(profile) if profile else UserProfileView()

    async def history(self, owner_id: str, offset: int = 0, limit: int = 30) -> list[HistoryView]:
        records = await self.session.scalars(
            select(ProfileHistoryRecord)
            .where(ProfileHistoryRecord.owner_id == owner_id)
            .order_by(ProfileHistoryRecord.created_at.desc(), ProfileHistoryRecord.id.desc())
            .offset(offset)
            .limit(limit)
        )
        return [HistoryView.model_validate(record) for record in records]

    async def detail(self, owner_id: str, record_id: UUID) -> HistoryView:
        record = await self.session.scalar(
            select(ProfileHistoryRecord).where(
                ProfileHistoryRecord.owner_id == owner_id, ProfileHistoryRecord.id == record_id
            )
        )
        if record is None:
            raise AppError("assessment_not_found", "This assessment is not available.", 404)
        return HistoryView.model_validate(record)

    async def overview(self, owner_id: str) -> AssessmentOverview:
        profile = await self.profile(owner_id)
        records = select(ProfileHistoryRecord).where(
            ProfileHistoryRecord.owner_id == owner_id, ProfileHistoryRecord.kind == "assessment"
        )
        latest = await self.session.scalar(
            records.order_by(
                ProfileHistoryRecord.created_at.desc(), ProfileHistoryRecord.id.desc()
            ).limit(1)
        )
        first = await self.session.scalar(
            records.order_by(ProfileHistoryRecord.created_at, ProfileHistoryRecord.id).limit(1)
        )
        weight = latest.snapshot.get("measurements", {}).get("weight_kg") if latest else None
        baseline = first.snapshot.get("measurements", {}).get("weight_kg") if first else None
        score = coaching_score(
            profile.training_goal,
            profile.coaching,
            profile.available_training_days,
            weight_kg=weight,
            baseline_weight_kg=baseline,
        )
        required = {
            "name": profile.display_name,
            "goal": profile.training_goal,
            "experience": profile.experience_level,
            "schedule": profile.available_training_days,
            "equipment": profile.available_equipment,
            "body_data": latest,
        }
        if profile.training_goal == "military_preparation":
            required["military_subtype"] = profile.coaching.military_subtype
        missing = [key for key, value in required.items() if not value]
        return AssessmentOverview(
            score=score,
            latest=HistoryView.model_validate(latest) if latest else None,
            completion=round((len(required) - len(missing)) / len(required) * 100),
            missing_profile=missing,
        )

    async def save(self, owner_id: str, request: AssessmentRequest) -> HistoryView:
        # The account exists even before a profile, so first-save retries serialize too.
        await self.session.scalar(
            select(UserAccount).where(UserAccount.id == owner_id).with_for_update()
        )
        existing = await self.session.scalar(
            select(ProfileHistoryRecord).where(
                ProfileHistoryRecord.owner_id == owner_id,
                ProfileHistoryRecord.request_id == request.request_id,
            )
        )
        if existing:
            return HistoryView.model_validate(existing)
        profile = await self.profile(owner_id)
        measurements = request.measurements
        measured_at = None
        if request.source == "inbody":
            scan = await self.session.scalar(
                select(InBodyScan).where(
                    InBodyScan.id == request.inbody_scan_id,
                    InBodyScan.owner_id == owner_id,
                    InBodyScan.status == "confirmed",
                )
            )
            if scan is None or not scan.result:
                raise AppError(
                    "confirmed_scan_required", "Choose one of your confirmed reports.", 404
                )
            values = {item.get("key"): item for item in scan.result.get("measurements", [])}
            try:
                measurements = BodyMeasurements(
                    height_cm=_measurement_value(values.get("height"), "height"),
                    weight_kg=_measurement_value(values.get("weight"), "weight"),
                    body_fat_percentage=_measurement_value(
                        values.get("body_fat_percentage"), "percentage"
                    ),
                    skeletal_muscle_mass_kg=_measurement_value(
                        values.get("skeletal_muscle_mass"), "weight"
                    ),
                )
            except ValidationError as exc:
                raise AppError(
                    "inbody_measurements_invalid",
                    "Correct the measurements in this report before using it.",
                    422,
                ) from exc
            if measurements.weight_kg is None:
                raise AppError(
                    "inbody_weight_required",
                    "Review and confirm a weight in this report first.",
                    422,
                )
            measured_at = scan.confirmed_at.isoformat() if scan.confirmed_at else None
        assert measurements is not None
        coaching = profile.coaching.model_copy(update={"body_data_source": request.source})
        await self.profiles.upsert(
            owner_id,
            {
                "coaching": coaching.model_dump(mode="json"),
                **({"height_cm": measurements.height_cm} if measurements.height_cm else {}),
            },
        )
        overview = await self.overview(owner_id)
        first = await self.session.scalar(
            select(ProfileHistoryRecord)
            .where(
                ProfileHistoryRecord.owner_id == owner_id, ProfileHistoryRecord.kind == "assessment"
            )
            .order_by(ProfileHistoryRecord.created_at, ProfileHistoryRecord.id)
            .limit(1)
        )
        baseline = (
            first.snapshot.get("measurements", {}).get("weight_kg")
            if first
            else measurements.weight_kg
        )
        score = coaching_score(
            profile.training_goal,
            coaching,
            profile.available_training_days,
            weight_kg=measurements.weight_kg,
            baseline_weight_kg=baseline,
        )
        record = ProfileHistoryRecord(
            owner_id=owner_id,
            request_id=request.request_id,
            kind="assessment",
            snapshot={
                "source": request.source,
                "inbody_scan_id": str(request.inbody_scan_id) if request.inbody_scan_id else None,
                "measured_at": measured_at,
                "measurements": measurements.model_dump(mode="json"),
                "goal": profile.training_goal,
                "coaching": coaching.model_dump(mode="json"),
                "score": score.model_dump(mode="json"),
                "previous_score": overview.score.value,
            },
        )
        self.session.add(record)
        await self.session.flush()
        await self.session.refresh(record)
        if (
            request.source == "manual"
            and measurements.height_cm
            and 100 <= measurements.height_cm <= 240
        ):
            await SqlAlchemyBodyMetricsAdapter(self.session).save_manual(
                owner_id,
                BodyMetricsSnapshot(
                    height_cm=measurements.height_cm,
                    weight_kg=measurements.weight_kg,
                    body_fat_percentage=measurements.body_fat_percentage,
                    skeletal_muscle_mass_kg=measurements.skeletal_muscle_mass_kg,
                    recorded_at=record.created_at,
                    source=BodyMetricsSource.PROFILE,
                ),
            )
        return HistoryView.model_validate(record)
