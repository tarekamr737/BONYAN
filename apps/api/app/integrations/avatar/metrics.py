from __future__ import annotations

from app.domains.avatar.contracts import BodyMetricsSnapshot


class StaticBodyMetricsReader:
    """Development/test reader used until the InBody workstream is centrally composed."""

    def __init__(self, snapshot: BodyMetricsSnapshot | None) -> None:
        self._snapshot = snapshot
        self._manual_by_owner: dict[str, BodyMetricsSnapshot] = {}

    async def latest_confirmed(self, owner_id: str) -> BodyMetricsSnapshot | None:
        return self._manual_by_owner.get(owner_id, self._snapshot)

    async def save_manual(self, owner_id: str, snapshot: BodyMetricsSnapshot) -> None:
        self._manual_by_owner[owner_id] = snapshot
