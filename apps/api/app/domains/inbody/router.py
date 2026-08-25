from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUserDep
from app.core.database import get_db_session
from app.core.storage import PrivateObjectStorage, get_private_object_storage
from app.domains.inbody.repository import InBodyRepository
from app.domains.inbody.schemas import (
    InBodyHistoryResponse,
    InBodyScanResponse,
    LatestInBodyResponse,
    ReviewUpdate,
    UploadResponse,
)
from app.domains.inbody.service import InBodyService
from app.domains.inbody.validation import MAX_UPLOAD_BYTES

router = APIRouter(prefix="/inbody", tags=["inbody"])


async def get_inbody_service(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    storage: Annotated[PrivateObjectStorage, Depends(get_private_object_storage)],
) -> InBodyService:
    return InBodyService(InBodyRepository(session), storage=storage)


InBodyServiceDep = Annotated[InBodyService, Depends(get_inbody_service)]
ReportFile = Annotated[UploadFile, File()]


@router.post("/scans", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_scan(
    report: ReportFile,
    current_user: CurrentUserDep,
    service: InBodyServiceDep,
) -> UploadResponse:
    content = await report.read(MAX_UPLOAD_BYTES + 1)
    return await service.upload_scan(
        user_id=current_user.id,
        filename=report.filename or "inbody-report",
        content_type=report.content_type or "application/octet-stream",
        content=content,
    )


@router.get("/scans", response_model=InBodyHistoryResponse)
async def list_scans(
    current_user: CurrentUserDep, service: InBodyServiceDep
) -> InBodyHistoryResponse:
    return await service.get_history(user_id=current_user.id)


@router.get("/scans/{scan_id}", response_model=InBodyScanResponse)
async def get_scan(
    scan_id: UUID,
    current_user: CurrentUserDep,
    service: InBodyServiceDep,
) -> InBodyScanResponse:
    return await service.get_scan(user_id=current_user.id, scan_id=scan_id)


@router.patch("/scans/{scan_id}/review", response_model=InBodyScanResponse)
async def update_review(
    scan_id: UUID,
    review: ReviewUpdate,
    current_user: CurrentUserDep,
    service: InBodyServiceDep,
) -> InBodyScanResponse:
    return await service.update_review(
        user_id=current_user.id, scan_id=scan_id, review=review
    )


@router.post("/scans/{scan_id}/confirm", response_model=InBodyScanResponse)
async def confirm_scan(
    scan_id: UUID,
    current_user: CurrentUserDep,
    service: InBodyServiceDep,
) -> InBodyScanResponse:
    return await service.confirm_scan(user_id=current_user.id, scan_id=scan_id)


@router.delete("/scans/{scan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scan(
    scan_id: UUID, current_user: CurrentUserDep, service: InBodyServiceDep
) -> None:
    await service.delete_scan(user_id=current_user.id, scan_id=scan_id)


@router.get("/latest", response_model=LatestInBodyResponse)
async def get_latest_scan(
    current_user: CurrentUserDep, service: InBodyServiceDep
) -> LatestInBodyResponse:
    return await service.get_latest_confirmed(current_user.id)
