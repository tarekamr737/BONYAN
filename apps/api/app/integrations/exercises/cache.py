from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import TypeVar

T = TypeVar("T")


@dataclass(slots=True)
class _CacheEntry[T]:
    value: T
    expires_at: datetime


class MetadataCache[T]:
    def __init__(self, ttl: timedelta = timedelta(hours=6), max_items: int = 512) -> None:
        self.ttl = ttl
        self.max_items = max(1, max_items)
        self._items: OrderedDict[str, _CacheEntry[T]] = OrderedDict()

    def get(self, key: str) -> T | None:
        item = self._items.get(key)
        if item is None:
            return None
        if item.expires_at <= datetime.now(UTC):
            self._items.pop(key, None)
            return None
        self._items.move_to_end(key)
        return item.value

    def set(self, key: str, value: T) -> None:
        self._items.pop(key, None)
        self._items[key] = _CacheEntry(value=value, expires_at=datetime.now(UTC) + self.ttl)
        while len(self._items) > self.max_items:
            self._items.popitem(last=False)
