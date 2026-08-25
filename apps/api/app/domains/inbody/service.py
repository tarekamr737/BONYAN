from __future__ import annotations

import hashlib
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any
from uuid import UUID

from fastapi import status

from app.core.errors import AppError
from app.domains.inbody.schemas import (
    InBodyHistoryResponse,
    InBodyMeasurement,
    InBodyResult,
    InBodyScanResponse,
    InBodyScanStatus,
    LatestInBodyResponse,
    ReviewUpdate,
    UploadResponse,
)
from app.domains.inbody.validation import is_supported_upload, validate_measurement
from app.integrations.mistral.ocr_provider import MistralOcrProvider, OcrProvider

if TYPE_CHECKING:
    from app.domains.inbody.models import InBodyScan
    from app.domains.inbody.repository import InBodyRepository


class InBodyService:
    def __init__(self, repository: "InBodyRepository", ocr_provider: OcrProvider | None = None) -> None:
        self.repository = repository
        self.ocr_provider = ocr_provider or MistralOcrProvider()

    async def upload_scan(
        self,
        *,
        user_id: str,
        filename: str,
        content_type: str,
        content: bytes,
    ) -> UploadResponse:
        if not is_supported_upload(content_type, len(content), content):
            raise AppError("invalid_inbody_file", "Upload a readable InBody image or PDF.", status.HTTP_400_BAD_REQUEST)

        content_hash = hashlib.sha256(content).hexdigest()
        duplicate = await self.repository.find_duplicate(owner_id=user_id, content_hash=content_hash)
        if duplicate is not None:
            return UploadResponse(scan=self._to_response(duplicate), duplicate=True)

        scan = await self.repository.create_upload(
            owner_id=user_id,
            filename=filename,
            content_type=content_type,
            byte_size=len(content),
            content_hash=content_hash,
            storage_key=f"inbody/{user_id}/{content_hash}",
        )

        try:
            result = await self.ocr_provider.extract(content=content, content_type=content_type, filename=filename)
        except TimeoutError:
            scan = await self.repository.mark_failed(
                scan,
                code="ocr_timeout",
                message="The report took too long to process. Please retry.",
            )
        except Exception:
            scan = await self.repository.mark_failed(
                scan,
                code="ocr_provider_failed",
                message="The report could not be processed right now.",
            )
        else:
            scan = await self.repository.save_result(
                scan,
                status=InBodyScanStatus.REVIEW_REQUIRED,
                result=self._validate_result(result),
            )

        return UploadResponse(scan=self._to_response(scan), duplicate=False)

    async def get_scan(self, *, user_id: str, scan_id: UUID) -> InBodyScanResponse:
        return self._to_response(await self._get_owned_or_404(user_id=user_id, scan_id=scan_id))

    async def get_history(self, *, user_id: str) -> InBodyHistoryResponse:
        scans = await self.repository.list_owned(owner_id=user_id, confirmed_only=True)
        return InBodyHistoryResponse(scans=[self._to_response(scan) for scan in scans])

    async def get_latest_confirmed(self, user_id: str) -> LatestInBodyResponse:
        scan = await self.repository.latest_confirmed(owner_id=user_id)
        return LatestInBodyResponse(scan=self._to_response(scan) if scan else None)

    async def update_review(self, *, user_id: str, scan_id: UUID, review: ReviewUpdate) -> InBodyScanResponse:
        scan = await self._get_owned_or_404(user_id=user_id, scan_id=scan_id)
        if scan.status not in {InBodyScanStatus.REVIEW_REQUIRED, InBodyScanStatus.FAILED}:
            raise AppError("scan_not_reviewable", "This scan cannot be edited.", status.HTTP_409_CONFLICT)

        edited = InBodyResult(
            scan_date=review.scan_date,
            measurements=[
                validate_measurement(
                    item.model_copy(
                        update={"metadata": item.metadata.model_copy(update={"user_edited": True})},
                        deep=True,
                    )
                )
                for item in review.measurements
            ],
            segmental_measurements=review.segmental_measurements,
        )
        scan = await self.repository.save_result(scan, status=InBodyScanStatus.REVIEW_REQUIRED, result=edited)
        return self._to_response(scan)

    async def confirm_scan(self, *, user_id: str, scan_id: UUID) -> InBodyScanResponse:
        scan = await self._get_owned_or_404(user_id=user_id, scan_id=scan_id)
        if scan.status != InBodyScanStatus.REVIEW_REQUIRED or scan.result is None:
            raise AppError("scan_not_confirmable", "Review this scan before confirming.", status.HTTP_409_CONFLICT)
        scan = await self.repository.confirm(scan)
        return self._to_response(scan)

    async def delete_scan(self, *, user_id: str, scan_id: UUID) -> None:
        scan = await self._get_owned_or_404(user_id=user_id, scan_id=scan_id)
        await self.repository.delete(scan)

    async def _get_owned_or_404(self, *, user_id: str, scan_id: UUID) -> "InBodyScan":
        scan = await self.repository.get_owned(owner_id=user_id, scan_id=scan_id)
        if scan is None or scan.status == InBodyScanStatus.DELETED:
            raise AppError("scan_not_found", "InBody scan not found.", status.HTTP_404_NOT_FOUND)
        return scan

    def _validate_result(self, result: InBodyResult) -> InBodyResult:
        measurements = [validate_measurement(item) for item in result.measurements]
        review_flags = list(result.review_flags)
        if any(item.metadata.flags for item in measurements):
            review_flags.append("measurement_review_required")
        if not measurements:
            review_flags.append("no_measurements_found")
        return result.model_copy(
            update={
                "measurements": measurements,
                "review_flags": list(dict.fromkeys(review_flags)),
            },
            deep=True,
        )

    def _to_response(self, scan: Any) -> InBodyScanResponse:
        result = InBodyResult.model_validate(scan.result) if scan.result else None
        now = datetime.now(UTC)
        return InBodyScanResponse(
            id=scan.id,
            status=InBodyScanStatus(scan.status),
            filename=scan.filename,
            content_type=scan.content_type,
            created_at=scan.created_at or now,
            updated_at=scan.updated_at or now,
            confirmed_at=scan.confirmed_at,
            failure_code=scan.failure_code,
            failure_message=scan.failure_message,
            result=result,
        )
