from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Response

from app.core.auth import CurrentUserDep
from app.core.rate_limit import limit_coach
from app.domains.training.router import TrainingServiceDep
from app.domains.training.substitution_repository import SubstitutionRepository
from app.domains.training.substitution_schemas import (
    ApproveSessionSubstitution,
    PreviewSessionSubstitution,
    SessionSubstitutionView,
    SubstitutionApprovalResult,
)
from app.domains.training.substitution_service import SessionSubstitutionService

router = APIRouter(prefix="/training", tags=["session-substitutions"])


def get_service(training: TrainingServiceDep) -> SessionSubstitutionService:
    return SessionSubstitutionService(training, SubstitutionRepository(training.repository.session))


Service = Annotated[SessionSubstitutionService, Depends(get_service)]


@router.post("/sessions/{session_id}/substitutions/preview", response_model=SessionSubstitutionView)
async def preview(
    session_id: UUID,
    request: PreviewSessionSubstitution,
    user: CurrentUserDep,
    service: Service,
    _: Annotated[None, Depends(limit_coach)],
):
    return await service.preview(user.id, session_id, request)


@router.post(
    "/substitution-proposals/{proposal_id}/approve", response_model=SubstitutionApprovalResult
)
async def approve(
    proposal_id: UUID, request: ApproveSessionSubstitution, user: CurrentUserDep, service: Service
):
    result = await service.approve(user.id, proposal_id, request)
    # Success must never reach the client before the database commit succeeds.
    await service.repository.session.commit()
    return result


@router.post("/substitution-proposals/{proposal_id}/reject", status_code=204)
async def reject(proposal_id: UUID, user: CurrentUserDep, service: Service):
    await service.reject(user.id, proposal_id)
    await service.repository.session.commit()
    return Response(status_code=204)


@router.post(
    "/substitution-proposals/{proposal_id}/undo", response_model=SubstitutionApprovalResult
)
async def undo(proposal_id: UUID, user: CurrentUserDep, service: Service):
    result = await service.undo(user.id, proposal_id)
    await service.repository.session.commit()
    return result
