from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo


def local_day_bounds(
    timezone_name: str, *, now: datetime | None = None
) -> tuple[datetime, datetime, date]:
    """Return the current local calendar day as a half-open UTC interval."""
    instant = now or datetime.now(UTC)
    if instant.tzinfo is None:
        raise ValueError("now must be timezone-aware")

    timezone = ZoneInfo(timezone_name)
    local_date = instant.astimezone(timezone).date()
    start_local = datetime.combine(local_date, time.min, tzinfo=timezone)
    end_local = datetime.combine(local_date + timedelta(days=1), time.min, tzinfo=timezone)
    return start_local.astimezone(UTC), end_local.astimezone(UTC), local_date
