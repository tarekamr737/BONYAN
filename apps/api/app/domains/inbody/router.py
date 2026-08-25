from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, File, Header, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.errors import AppError
from app.domains.inbody.repository import InBodyRepository
from app.domains.inbody.schemas import (
    InBodyHistoryResponse,
    InBodyScanResponse,
    LatestInBodyResponse,
    ReviewUpdate,
    UploadResponse,
)
from app.domains.inbody.service import InBodyService

router = APIRouter(prefix="/inbody", tags=["inbody"])


async def require_user_id(x_bonyan_user_id: str | None = Header(default=None)) -> str:
    if not x_bonyan_user_id:
        raise AppError("unauthorized", "Sign in to continue.", status.HTTP_401_UNAUTHORIZED)
    return x_bonyan_user_id


async def get_inbody_service(session: AsyncSession = Depends(get_db_session)) -> InBodyService:
    return InBodyService(InBodyRepository(session))


@router.post("/scans", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_scan(
    report: UploadFile = File(...),
    user_id: str = Depends(require_user_id),
    service: InBodyService = Depends(get_inbody_service),
) -> UploadResponse:
    content = await report.read()
    return await service.upload_scan(
        user_id=user_id,
        filename=report.filename or "inbody-report",
        content_type=report.content_type or "application/octet-stream",
        content=content,
    )


@router.get("/scans", response_model=InBodyHistoryResponse)
async def list_scans(
    user_id: str = Depends(require_user_id),
    service: InBodyService = Depends(get_inbody_service),
) -> InBodyHistoryResponse:
    return await service.get_history(user_id=user_id)


@router.get("/scans/{scan_id}", response_model=InBodyScanResponse)
async def get_scan(
    scan_id: UUID,
    user_id: str = Depends(require_user_id),
    service: InBodyService = Depends(get_inbody_service),
) -> InBodyScanResponse:
    return await service.get_scan(user_id=user_id, scan_id=scan_id)


@router.patch("/scans/{scan_id}/review", response_model=InBodyScanResponse)
async def update_review(
    scan_id: UUID,
    review: ReviewUpdate,
    user_id: str = Depends(require_user_id),
    service: InBodyService = Depends(get_inbody_service),
) -> InBodyScanResponse:
    return await service.update_review(user_id=user_id, scan_id=scan_id, review=review)


@router.post("/scans/{scan_id}/confirm", response_model=InBodyScanResponse)
async def confirm_scan(
    scan_id: UUID,
    user_id: str = Depends(require_user_id),
    service: InBodyService = Depends(get_inbody_service),
) -> InBodyScanResponse:
    return await service.confirm_scan(user_id=user_id, scan_id=scan_id)


@router.delete("/scans/{scan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scan(
    scan_id: UUID,
    user_id: str = Depends(require_user_id),
    service: InBodyService = Depends(get_inbody_service),
) -> None:
    await service.delete_scan(user_id=user_id, scan_id=scan_id)


@router.get("/latest", response_model=LatestInBodyResponse)
async def get_latest_scan(
    user_id: str = Depends(require_user_id),
    service: InBodyService = Depends(get_inbody_service),
) -> LatestInBodyResponse:
    return await service.get_latest_confirmed(user_id)
