from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.domains.training.schemas import ExercisePrescription, WorkoutSessionResponse


class PreviewSessionSubstitution(BaseModel):
    model_config = ConfigDict(extra="forbid")
    prescription_index: int = Field(ge=0, le=20)
    scope: Literal["session", "plan", "equipment"] = "session"
    reason: Literal["busy_today", "not_available"] = "busy_today"
    unavailable_equipment: list[str] = Field(default_factory=list, max_length=20)


class SessionSubstitutionView(BaseModel):
    id: UUID
    session_id: UUID
    prescription_index: int
    expected_version: int
    scope: Literal["session", "plan", "equipment"]
    reason: str
    status: str
    original: ExercisePrescription
    candidate: ExercisePrescription
    expires_at: datetime
    media_available: bool
    remaining_sets: int
    explanation_key: str = "same_muscles_available_equipment"


class ApproveSessionSubstitution(BaseModel):
    model_config = ConfigDict(extra="forbid")
    idempotency_key: str = Field(min_length=8, max_length=120)
    expected_version: int = Field(ge=0)
    acknowledge_logged_sets: bool = False
    confirm_persistent_edit: bool = False


class SubstitutionApprovalResult(BaseModel):
    session: WorkoutSessionResponse
    event_id: UUID
    plan_revision_id: UUID | None = None
    equipment_changed: bool = False
