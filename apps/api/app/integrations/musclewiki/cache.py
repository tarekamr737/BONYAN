from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import TypeVar

T = TypeVar("T")


@dataclass(slots=True)
class _CacheEntry[T]:
    value: T
    expires_at: datetime


class MetadataCache[T]:
    def __init__(self, ttl: timedelta = timedelta(hours=6)) -> None:
        self.ttl = ttl
        self._items: dict[str, _CacheEntry[T]] = {}

    def get(self, key: str) -> T | None:
        item = self._items.get(key)
        if item is None:
            return None
        if item.expires_at <= datetime.now(UTC):
            self._items.pop(key, None)
            return None
        return item.value

    def set(self, key: str, value: T) -> None:
        self._items[key] = _CacheEntry(value=value, expires_at=datetime.now(UTC) + self.ttl)
