from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Protocol


@dataclass(frozen=True, slots=True)
class ExerciseSearchFilters:
    query: str | None = None
    muscles: tuple[str, ...] = ()
    equipment: tuple[str, ...] = ()
    difficulty: str | None = None


@dataclass(frozen=True, slots=True)
class ExerciseDetails:
    id: str
    name: str
    muscles: tuple[str, ...]
    equipment: tuple[str, ...]
    difficulty: str
    instructions: tuple[str, ...] = ()
    video_url: str | None = None
    thumbnail_url: str | None = None
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class ExerciseSearchPage:
    items: tuple[ExerciseDetails, ...]
    page: int
    page_size: int
    total: int | None = None
    next_page: int | None = None


@dataclass(frozen=True, slots=True)
class MediaAccess:
    url: str
    expires_at: datetime


class MuscleWikiExerciseProvider(Protocol):
    async def search_exercises(
        self, filters: ExerciseSearchFilters, *, page: int = 1, page_size: int = 20
    ) -> ExerciseSearchPage: ...

    async def get_exercise(self, exercise_id: str) -> ExerciseDetails: ...

    async def get_media_access(self, exercise_id: str) -> MediaAccess | None: ...
