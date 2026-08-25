from __future__ import annotations

from app.domains.avatar.contracts import BodyMetricsSnapshot


class StaticBodyMetricsReader:
    """Development/test reader used until the InBody workstream is centrally composed."""

    def __init__(self, snapshot: BodyMetricsSnapshot | None) -> None:
        self._snapshot = snapshot

    async def latest_confirmed(self, owner_id: str) -> BodyMetricsSnapshot | None:
        del owner_id
        return self._snapshot
