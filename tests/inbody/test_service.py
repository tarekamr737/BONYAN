from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import UUID

import pytest

from app.core.errors import AppError
from app.domains.inbody.schemas import (
    InBodyMeasurement,
    InBodyMetricKey,
    InBodyResult,
    InBodyScanStatus,
)
from app.domains.inbody.service import InBodyService


class FakeOcrProvider:
    def __init__(self, result: InBodyResult | Exception) -> None:
        self.result = result

    async def extract(self, *, content: bytes, content_type: str, filename: str) -> InBodyResult:
        if isinstance(self.result, Exception):
            raise self.result
        return self.result


class FakeRepository:
    def __init__(self) -> None:
        self.scans: dict[UUID, SimpleNamespace] = {}

    async def create_upload(self, **kwargs: object) -> SimpleNamespace:
        scan = SimpleNamespace(
            id=uuid.uuid4(),
            owner_id=kwargs["owner_id"],
            filename=kwargs["filename"],
            content_type=kwargs["content_type"],
            byte_size=kwargs["byte_size"],
            content_hash=kwargs["content_hash"],
            storage_key=kwargs["storage_key"],
            status=InBodyScanStatus.UPLOADED,
            failure_code=None,
            failure_message=None,
            result=None,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
            confirmed_at=None,
        )
        self.scans[scan.id] = scan
        return scan

    async def find_duplicate(self, *, owner_id: str, content_hash: str) -> SimpleNamespace | None:
        for scan in self.scans.values():
            if (
                scan.owner_id == owner_id
                and scan.content_hash == content_hash
                and scan.status != InBodyScanStatus.DELETED
            ):
                return scan
        return None

    async def get_owned(self, *, owner_id: str, scan_id: UUID) -> SimpleNamespace | None:
        scan = self.scans.get(scan_id)
        if scan and scan.owner_id == owner_id:
            return scan
        return None

    async def list_owned(
        self,
        *,
        owner_id: str,
        confirmed_only: bool = False,
    ) -> list[SimpleNamespace]:
        scans = [
            scan
            for scan in self.scans.values()
            if scan.owner_id == owner_id and scan.status != InBodyScanStatus.DELETED
        ]
        if confirmed_only:
            scans = [scan for scan in scans if scan.status == InBodyScanStatus.CONFIRMED]
        return scans

    async def latest_confirmed(self, *, owner_id: str) -> SimpleNamespace | None:
        confirmed = await self.list_owned(owner_id=owner_id, confirmed_only=True)
        return confirmed[-1] if confirmed else None

    async def save_result(
        self, scan: SimpleNamespace, *, status: InBodyScanStatus, result: InBodyResult
    ) -> SimpleNamespace:
        scan.status = status
        scan.result = result.model_dump(mode="json")
        scan.updated_at = datetime.now(UTC)
        return scan

    async def mark_failed(
        self,
        scan: SimpleNamespace,
        *,
        code: str,
        message: str,
    ) -> SimpleNamespace:
        scan.status = InBodyScanStatus.FAILED
        scan.failure_code = code
        scan.failure_message = message
        return scan

    async def confirm(self, scan: SimpleNamespace) -> SimpleNamespace:
        scan.status = InBodyScanStatus.CONFIRMED
        scan.confirmed_at = datetime.now(UTC)
        return scan

    async def delete(self, scan: SimpleNamespace) -> SimpleNamespace:
        scan.status = InBodyScanStatus.DELETED
        return scan


def run(coro):
    return asyncio.run(coro)


def service_with(result: InBodyResult | Exception) -> tuple[InBodyService, FakeRepository]:
    repo = FakeRepository()
    return InBodyService(repo, FakeOcrProvider(result)), repo


def test_valid_upload_enters_review_with_mocked_ocr() -> None:
    service, _ = service_with(
        InBodyResult(
            measurements=[
                InBodyMeasurement(key=InBodyMetricKey.WEIGHT, value=82, unit="kg"),
            ]
        )
    )

    response = run(
        service.upload_scan(
            user_id="user-1",
            filename="scan.jpg",
            content_type="image/jpeg",
            content=b"\xff\xd8\xff\xe0",
        )
    )

    assert response.scan.status == InBodyScanStatus.REVIEW_REQUIRED
    assert response.scan.result is not None


def test_duplicate_upload_returns_existing_scan() -> None:
    service, _ = service_with(InBodyResult(measurements=[]))
    payload = {
        "user_id": "user-1",
        "filename": "scan.pdf",
        "content_type": "application/pdf",
        "content": b"%PDF-1.7",
    }

    first = run(service.upload_scan(**payload))
    duplicate = run(service.upload_scan(**payload))

    assert duplicate.duplicate is True
    assert duplicate.scan.id == first.scan.id


def test_provider_timeout_and_failure_are_safe_states() -> None:
    timeout_service, _ = service_with(TimeoutError())
    timeout_response = run(
        timeout_service.upload_scan(
            user_id="user-1",
            filename="scan.pdf",
            content_type="application/pdf",
            content=b"%PDF-1.7",
        )
    )

    failure_service, _ = service_with(RuntimeError("provider exploded"))
    failure_response = run(
        failure_service.upload_scan(
            user_id="user-1",
            filename="scan.pdf",
            content_type="application/pdf",
            content=b"%PDF-1.7",
        )
    )

    assert timeout_response.scan.failure_code == "ocr_timeout"
    assert failure_response.scan.failure_code == "ocr_provider_failed"


def test_cross_user_access_fails_and_delete_hides_scan() -> None:
    service, _ = service_with(InBodyResult(measurements=[]))
    created = run(
        service.upload_scan(
            user_id="user-1",
            filename="scan.png",
            content_type="image/png",
            content=b"\x89PNG\r\n\x1a\n",
        )
    )

    with pytest.raises(AppError):
        run(service.get_scan(user_id="user-2", scan_id=created.scan.id))

    run(service.delete_scan(user_id="user-1", scan_id=created.scan.id))
    with pytest.raises(AppError):
        run(service.get_scan(user_id="user-1", scan_id=created.scan.id))


def test_unconfirmed_scan_is_not_latest_until_confirmed() -> None:
    service, _ = service_with(InBodyResult(measurements=[]))
    created = run(
        service.upload_scan(
            user_id="user-1",
            filename="scan.webp",
            content_type="image/webp",
            content=b"RIFF0000WEBP",
        )
    )

    assert run(service.get_latest_confirmed("user-1")).scan is None
    run(service.confirm_scan(user_id="user-1", scan_id=created.scan.id))
    assert run(service.get_latest_confirmed("user-1")).scan is not None
