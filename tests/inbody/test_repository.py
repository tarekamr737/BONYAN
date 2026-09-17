from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

from app.domains.inbody.repository import InBodyRepository
from app.domains.inbody.schemas import InBodyScanStatus


def test_save_result_refreshes_database_generated_timestamps() -> None:
    session = SimpleNamespace(flush=AsyncMock(), refresh=AsyncMock())
    repository = InBodyRepository(session)
    scan = SimpleNamespace()
    result = Mock()
    result.model_dump.return_value = {"measurements": []}

    saved = asyncio.run(
        repository.save_result(
            scan,
            status=InBodyScanStatus.REVIEW_REQUIRED,
            result=result,
        )
    )

    assert saved is scan
    session.flush.assert_awaited_once_with()
    session.refresh.assert_awaited_once_with(scan)
