from __future__ import annotations

from typing import Protocol

from app.domains.inbody.repository import InBodyRepository
from app.domains.inbody.schemas import InBodyMetricKey, InBodyResult


class LatestInBodyProvider(Protocol):
    async def get_latest_inbody(self, user_id: str) -> dict[str, float | str | None] | None: ...


class InBodyTrainingAdapter:
    def __init__(self, repository: InBodyRepository) -> None:
        self.repository = repository

    async def get_latest_inbody(self, user_id: str) -> dict[str, float | str | None] | None:
        scan = await self.repository.latest_confirmed(owner_id=user_id)
        if scan is None or scan.result is None:
            return None

        result = InBodyResult.model_validate(scan.result)
        context: dict[str, float | str | None] = {
            measurement.key.value: measurement.value
            for measurement in result.measurements
            if measurement.key in InBodyMetricKey
        }
        if result.scan_date is not None:
            context["scan_date"] = result.scan_date.isoformat()
        return context or None
