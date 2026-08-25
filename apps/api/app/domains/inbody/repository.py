from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.inbody.models import InBodyScan
from app.domains.inbody.schemas import InBodyResult, InBodyScanStatus


class InBodyRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_upload(
        self,
        *,
        owner_id: str,
        filename: str,
        content_type: str,
        byte_size: int,
        content_hash: str,
        storage_key: str,
    ) -> InBodyScan:
        scan = InBodyScan(
            owner_id=owner_id,
            filename=filename,
            content_type=content_type,
            byte_size=byte_size,
            content_hash=content_hash,
            storage_key=storage_key,
            status=InBodyScanStatus.UPLOADED,
        )
        self.session.add(scan)
        await self.session.flush()
        return scan

    async def find_duplicate(self, *, owner_id: str, content_hash: str) -> InBodyScan | None:
        result = await self.session.execute(
            select(InBodyScan).where(
                InBodyScan.owner_id == owner_id,
                InBodyScan.content_hash == content_hash,
                InBodyScan.status != InBodyScanStatus.DELETED,
            )
        )
        return result.scalar_one_or_none()

    async def get_owned(self, *, owner_id: str, scan_id: UUID) -> InBodyScan | None:
        result = await self.session.execute(
            select(InBodyScan).where(InBodyScan.owner_id == owner_id, InBodyScan.id == scan_id)
        )
        return result.scalar_one_or_none()

    async def list_owned(self, *, owner_id: str, confirmed_only: bool = False) -> list[InBodyScan]:
        statement: Select[tuple[InBodyScan]] = select(InBodyScan).where(
            InBodyScan.owner_id == owner_id,
            InBodyScan.status != InBodyScanStatus.DELETED,
        )
        if confirmed_only:
            statement = statement.where(InBodyScan.status == InBodyScanStatus.CONFIRMED)
        statement = statement.order_by(
            InBodyScan.confirmed_at.desc().nullslast(),
            InBodyScan.created_at.desc(),
        )
        result = await self.session.execute(statement)
        return list(result.scalars().all())

    async def latest_confirmed(self, *, owner_id: str) -> InBodyScan | None:
        result = await self.session.execute(
            select(InBodyScan)
            .where(InBodyScan.owner_id == owner_id, InBodyScan.status == InBodyScanStatus.CONFIRMED)
            .order_by(InBodyScan.confirmed_at.desc().nullslast(), InBodyScan.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def save_result(
        self, scan: InBodyScan, *, status: InBodyScanStatus, result: InBodyResult
    ) -> InBodyScan:
        scan.status = status
        scan.result = result.model_dump(mode="json")
        scan.failure_code = None
        scan.failure_message = None
        await self.session.flush()
        return scan

    async def mark_failed(self, scan: InBodyScan, *, code: str, message: str) -> InBodyScan:
        scan.status = InBodyScanStatus.FAILED
        scan.failure_code = code
        scan.failure_message = message
        await self.session.flush()
        return scan

    async def confirm(self, scan: InBodyScan) -> InBodyScan:
        scan.status = InBodyScanStatus.CONFIRMED
        scan.confirmed_at = datetime.now(UTC)
        await self.session.flush()
        return scan

    async def delete(self, scan: InBodyScan) -> InBodyScan:
        scan.status = InBodyScanStatus.DELETED
        await self.session.flush()
        return scan
