from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUserDep
from app.core.database import get_db_session
from app.core.errors import AppError
from app.core.logging import get_logger
from app.core.rate_limit import limit_ocr
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
from app.domains.inbody.validation import (
    MAX_REPORT_IMAGES,
    MAX_UPLOAD_BYTES,
    assemble_image_pages_pdf,
)

router = APIRouter(prefix="/inbody", tags=["inbody"])
logger = get_logger("inbody")


async def get_inbody_service(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    storage: Annotated[PrivateObjectStorage, Depends(get_private_object_storage)],
) -> InBodyService:
    return InBodyService(InBodyRepository(session), storage=storage)


InBodyServiceDep = Annotated[InBodyService, Depends(get_inbody_service)]
ReportFiles = Annotated[list[UploadFile], File()]


@router.post("/scans", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_scan(
    report: ReportFiles,
    current_user: CurrentUserDep,
    service: InBodyServiceDep,
    _: Annotated[None, Depends(limit_ocr)],
) -> UploadResponse:
    if not 1 <= len(report) <= MAX_REPORT_IMAGES:
        raise AppError(
            "invalid_inbody_file",
            "Upload one PDF or between one and three report images.",
            status.HTTP_400_BAD_REQUEST,
        )
    contents = [await item.read(MAX_UPLOAD_BYTES + 1) for item in report]
    logger.info(
        "inbody_upload_received",
        extra={
            "content_type": ",".join((item.content_type or "unknown") for item in report),
            "file_count": len(report),
            "method": "POST",
            "path": "/api/v1/inbody/scans",
        },
    )
    if len(report) == 1:
        selected = report[0]
        content = contents[0]
        filename = selected.filename or "inbody-report"
        content_type = selected.content_type or "application/octet-stream"
    else:
        try:
            content = assemble_image_pages_pdf(
                [
                    (item.content_type or "application/octet-stream", item_content)
                    for item, item_content in zip(report, contents, strict=True)
                ]
            )
        except ValueError as exc:
            raise AppError(
                "invalid_inbody_file",
                "Upload one PDF or between one and three readable report images.",
                status.HTTP_400_BAD_REQUEST,
            ) from exc
        filename = f"inbody-{len(report)}-pages.pdf"
        content_type = "application/pdf"
    return await service.upload_scan(
        user_id=current_user.id,
        filename=filename,
        content_type=content_type,
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
    return await service.update_review(user_id=current_user.id, scan_id=scan_id, review=review)


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
