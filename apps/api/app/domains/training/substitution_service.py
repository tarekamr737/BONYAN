"""Human-approved session changes. All writes share the caller's one transaction."""

from copy import deepcopy
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from app.core.errors import AppError
from app.domains.training.engine.substitutions import choose_substitution
from app.domains.training.schemas import ExercisePrescription
from app.domains.training.service import TrainingService
from app.domains.training.substitution_models import SessionSubstitutionProposal
from app.domains.training.substitution_repository import SubstitutionRepository
from app.domains.training.substitution_schemas import (
    ApproveSessionSubstitution,
    PreviewSessionSubstitution,
    SessionSubstitutionView,
    SubstitutionApprovalResult,
)
from app.integrations.exercises.provider import ExerciseSearchFilters


class SessionSubstitutionService:
    def __init__(self, training: TrainingService, repository: SubstitutionRepository) -> None:
        self.training = training
        self.repository = repository

    async def preview(
        self, owner: str, session_id: UUID, request: PreviewSessionSubstitution
    ) -> SessionSubstitutionView:
        await self.training._require_training_clearance(owner)
        session = await self.training._owned_session(user_id=owner, session_id=session_id)
        self.training._ensure_active_session(session)
        day = await self.training._session_day(user_id=owner, session=session)
        if request.prescription_index >= len(day.prescriptions):
            raise AppError("training_prescription_not_found", "Exercise not found.", 404)
        original = day.prescriptions[request.prescription_index]
        if (
            sum(
                item["prescription_index"] == request.prescription_index
                for item in session.logged_sets
            )
            >= original.sets
        ):
            raise AppError("exercise_completed", "All prescribed sets are already logged.", 409)
        plan = await self.training._owned_plan(user_id=owner, plan_id=session.plan_id)
        unavailable = set(request.unavailable_equipment or original.equipment)
        equipment = sorted(set(plan.equipment).difference(unavailable) | {"bodyweight"})
        difficulty = plan.experience
        page = await self.training.exercise_provider.search_exercises(
            ExerciseSearchFilters(
                muscles=tuple(original.muscles), equipment=tuple(equipment), difficulty=difficulty
            ),
            page=1,
            page_size=40,
        )
        levels = {"beginner": 0, "intermediate": 1, "advanced": 2}
        candidates = [
            candidate
            for candidate in page.items
            if levels.get(candidate.difficulty, 0) <= levels.get(difficulty, 0)
        ]
        candidate = choose_substitution(original, candidates, available_equipment=tuple(equipment))
        if candidate is None:
            raise AppError("substitution_not_available", "No safe alternative is available.", 409)
        replacement = original.model_copy(
            update={
                "exercise_id": candidate.id,
                "name": candidate.name,
                "muscles": list(candidate.muscles),
                "equipment": list(candidate.equipment),
            }
        )
        media = await self.training.exercise_provider.get_media_access(candidate.id, user_id=owner)
        proposal = SessionSubstitutionProposal(
            id=uuid4(),
            owner_id=owner,
            session_id=session_id,
            prescription_index=request.prescription_index,
            expected_version=session.version,
            scope=request.scope,
            reason=request.reason,
            status="pending",
            original=original.model_dump(mode="json"),
            candidate=replacement.model_dump(mode="json"),
            available_equipment=equipment,
            media_available=media is not None,
            expires_at=datetime.now(UTC) + timedelta(minutes=5),
        )
        # A proposal is durable; preview never edits a prescription, plan, equipment or log.
        await self.repository.save(proposal)
        return self._view(proposal, session)

    async def approve(
        self, owner: str, proposal_id: UUID, request: ApproveSessionSubstitution
    ) -> SubstitutionApprovalResult:
        proposal = await self._owned(owner, proposal_id)
        session = await self.training._owned_session(user_id=owner, session_id=proposal.session_id)
        if proposal.status == "approved":
            if proposal.approval_key != request.idempotency_key:
                raise AppError("proposal_replayed", "This proposal was already approved.", 409)
            result = proposal.result or {}
            return SubstitutionApprovalResult(
                session=self.training._session_response(session),
                event_id=result["event_id"],
                plan_revision_id=result.get("plan_revision_id"),
                equipment_changed=result.get("equipment_changed", False),
            )
        self.training._ensure_active_session(session)
        if proposal.status != "pending":
            raise AppError("proposal_replayed", "This proposal is no longer pending.", 409)
        if proposal.expires_at <= datetime.now(UTC):
            raise AppError("proposal_expired", "This proposal expired.", 410)
        if (
            session.version != proposal.expected_version
            or session.version != request.expected_version
        ):
            raise AppError("proposal_stale", "Your workout changed. Preview again.", 409)
        await self.training._require_training_clearance(owner)
        if await self.repository.approval_key_used(owner, request.idempotency_key):
            raise AppError("idempotency_conflict", "This key was used for another approval.", 409)
        day = await self.training._session_day(user_id=owner, session=session)
        current = day.prescriptions[proposal.prescription_index]
        if current.model_dump(mode="json") != proposal.original:
            raise AppError("proposal_stale", "The exercise changed. Preview again.", 409)
        logs = [
            item
            for item in session.logged_sets
            if item["prescription_index"] == proposal.prescription_index
        ]
        if len(logs) >= current.sets:
            raise AppError("exercise_completed", "All prescribed sets are already logged.", 409)
        if logs and not request.acknowledge_logged_sets:
            raise AppError(
                "logged_sets_confirmation", "Confirm replacement of remaining sets.", 409
            )
        # Revalidate trusted current catalog data; never accept a request-supplied prescription.
        candidate = await self.training.exercise_provider.get_exercise(
            proposal.candidate["exercise_id"]
        )
        plan = await self.training._owned_plan(user_id=owner, plan_id=session.plan_id)
        levels = {"beginner": 0, "intermediate": 1, "advanced": 2}
        if levels.get(candidate.difficulty, 2) > levels.get(plan.experience, 0):
            raise AppError("proposal_stale", "This alternative is no longer compatible.", 409)
        if not set(candidate.equipment).issubset(set(proposal.available_equipment)) or not set(
            candidate.muscles
        ).intersection(current.muscles):
            raise AppError("proposal_stale", "This alternative is no longer compatible.", 409)
        revision_id = None
        equipment_changed = False
        if proposal.scope != "session":
            if not request.confirm_persistent_edit or proposal.reason == "busy_today":
                raise AppError(
                    "persistent_edit_confirmation", "Persistent edits need confirmation.", 409
                )
            plan = await self.training._owned_plan(user_id=owner, plan_id=session.plan_id)
            revised = self.training._plan_response(plan)
            revision_day = next(item for item in revised.days if item.key == session.day_key)
            if (
                revision_day.prescriptions[proposal.prescription_index].model_dump(mode="json")
                != proposal.original
            ):
                raise AppError("proposal_stale", "The source plan changed. Preview again.", 409)
            revision_day.prescriptions[proposal.prescription_index] = (
                ExercisePrescription.model_validate(proposal.candidate)
            )
            payload = revised.model_dump(mode="json", exclude={"id", "created_at", "updated_at"})
            payload["status"] = "draft"
            payload["generation_snapshot"] = {
                **payload["generation_snapshot"],
                "revision_of": str(plan.id),
                "approved_proposal": str(proposal.id),
            }
            revision = await self.training.repository.save_plan(owner_id=owner, plan=payload)
            revision_id = revision.id
            if proposal.scope == "equipment":
                if self.training.profile_repository is None:
                    raise AppError("profile_unavailable", "Your profile is unavailable.", 409)
                profile = await self.training.profile_repository.get(owner)
                if profile is None:
                    raise AppError("profile_unavailable", "Your profile is unavailable.", 409)
                await self.training.profile_repository.upsert(
                    owner, {"available_equipment": list(proposal.available_equipment)}
                )
                equipment_changed = True
        else:
            snapshot = deepcopy(day.model_dump(mode="json"))
            snapshot["prescriptions"][proposal.prescription_index] = proposal.candidate
            session.prescription_snapshot = snapshot
        session.version += 1
        proposal.status = "approved"
        proposal.approval_key = request.idempotency_key
        event = await self.repository.event(
            owner_id=owner,
            session_id=session.id,
            proposal_id=proposal.id,
            action="approved",
            version=session.version,
            details={
                "scope": proposal.scope,
                "original": proposal.original,
                "candidate": proposal.candidate,
                "remaining_sets": current.sets - len(logs),
            },
        )
        proposal.result = {
            "event_id": str(event.id),
            "plan_revision_id": str(revision_id) if revision_id else None,
            "equipment_changed": equipment_changed,
        }
        await self.repository.session.flush()
        return SubstitutionApprovalResult(
            session=self.training._session_response(session),
            event_id=event.id,
            plan_revision_id=revision_id,
            equipment_changed=equipment_changed,
        )

    async def reject(self, owner: str, proposal_id: UUID) -> None:
        proposal = await self._owned(owner, proposal_id)
        if proposal.status == "rejected":
            return
        if proposal.status != "pending":
            raise AppError("proposal_replayed", "This proposal is no longer pending.", 409)
        proposal.status = "rejected"

    async def undo(self, owner: str, proposal_id: UUID) -> SubstitutionApprovalResult:
        proposal = await self._owned(owner, proposal_id)
        session = await self.training._owned_session(user_id=owner, session_id=proposal.session_id)
        self.training._ensure_active_session(session)
        if proposal.scope != "session" or proposal.status != "approved":
            raise AppError("undo_unavailable", "This change cannot be undone here.", 409)
        if session.version != proposal.expected_version + 1 or any(
            item.get("exercise_id") == proposal.candidate["exercise_id"]
            for item in session.logged_sets
        ):
            raise AppError(
                "undo_unavailable", "The replacement has started or workout changed.", 409
            )
        snapshot = deepcopy(session.prescription_snapshot)
        snapshot["prescriptions"][proposal.prescription_index] = proposal.original
        session.prescription_snapshot = snapshot
        session.version += 1
        proposal.status = "undone"
        event = await self.repository.event(
            owner_id=owner,
            session_id=session.id,
            proposal_id=proposal.id,
            action="undone",
            version=session.version,
            details={},
        )
        return SubstitutionApprovalResult(
            session=self.training._session_response(session), event_id=event.id
        )

    async def _owned(self, owner: str, proposal_id: UUID) -> SessionSubstitutionProposal:
        proposal = await self.repository.proposal(owner, proposal_id)
        if proposal is None:
            raise AppError("proposal_not_found", "Proposal not found.", 404)
        return proposal

    @staticmethod
    def _view(proposal, session) -> SessionSubstitutionView:
        logs = [
            item
            for item in session.logged_sets
            if item["prescription_index"] == proposal.prescription_index
        ]
        return SessionSubstitutionView(
            id=proposal.id,
            session_id=proposal.session_id,
            prescription_index=proposal.prescription_index,
            expected_version=proposal.expected_version,
            scope=proposal.scope,
            reason=proposal.reason,
            status=proposal.status,
            original=proposal.original,
            candidate=proposal.candidate,
            expires_at=proposal.expires_at,
            media_available=proposal.media_available,
            remaining_sets=max(0, proposal.original["sets"] - len(logs)),
        )
