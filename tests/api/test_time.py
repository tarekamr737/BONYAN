from datetime import UTC, datetime

import pytest

from app.core.time import local_day_bounds


def test_local_day_bounds_are_converted_to_utc() -> None:
    start, end, local_date = local_day_bounds(
        "Africa/Cairo", now=datetime(2026, 9, 15, 22, 30, tzinfo=UTC)
    )

    assert local_date.isoformat() == "2026-09-16"
    assert start == datetime(2026, 9, 15, 21, 0, tzinfo=UTC)
    assert end == datetime(2026, 9, 16, 21, 0, tzinfo=UTC)


def test_local_day_bounds_require_an_aware_clock() -> None:
    with pytest.raises(ValueError, match="timezone-aware"):
        local_day_bounds("UTC", now=datetime(2026, 9, 16, 12, 0))
