from __future__ import annotations

import json
from urllib import error, parse, request

from app.core.config import Settings
from app.integrations.musclewiki.cache import MetadataCache
from app.integrations.musclewiki.errors import (
    MuscleWikiInvalidResponseError,
    MuscleWikiUnavailableError,
)
from app.integrations.musclewiki.provider import (
    ExerciseDetails,
    ExerciseSearchFilters,
    ExerciseSearchPage,
)


class MuscleWikiClient:
    def __init__(
        self,
        *,
        settings: Settings,
        base_url: str = "https://api.musclewiki.com",
        cache: MetadataCache[ExerciseDetails] | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        secret = getattr(settings, "musclewiki_api_key", None)
        self.api_key = secret.get_secret_value() if secret else None
        self.cache = cache or MetadataCache[ExerciseDetails]()

    async def search_exercises(
        self, filters: ExerciseSearchFilters, *, page: int = 1, page_size: int = 20
    ) -> ExerciseSearchPage:
        query = {
            "page": str(page),
            "page_size": str(page_size),
        }
        if filters.query:
            query["search"] = filters.query
        if filters.muscles:
            query["muscles"] = ",".join(filters.muscles)
        if filters.equipment:
            query["equipment"] = ",".join(filters.equipment)
        if filters.difficulty:
            query["difficulty"] = filters.difficulty

        payload = self._get_json(f"/exercises/?{parse.urlencode(query)}")
        rows = payload.get("results", payload) if isinstance(payload, dict) else payload
        if not isinstance(rows, list):
            raise MuscleWikiInvalidResponseError("Exercise search returned invalid data.")
        items = tuple(self._parse_exercise(item) for item in rows)
        for item in items:
            self.cache.set(item.id, item)
        total = payload.get("count") if isinstance(payload, dict) else None
        next_page = page + 1 if isinstance(payload, dict) and payload.get("next") else None
        return ExerciseSearchPage(
            items=items, page=page, page_size=page_size, total=total, next_page=next_page
        )

    async def get_exercise(self, exercise_id: str) -> ExerciseDetails:
        cached = self.cache.get(exercise_id)
        if cached is not None:
            return cached
        item = self._parse_exercise(self._get_json(f"/exercises/{parse.quote(exercise_id)}/"))
        self.cache.set(item.id, item)
        return item

    async def get_media_access(self, exercise_id: str) -> str | None:
        return (await self.get_exercise(exercise_id)).video_url

    def _get_json(self, path: str) -> object:
        headers = {"Accept": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        req = request.Request(f"{self.base_url}{path}", headers=headers, method="GET")
        try:
            with request.urlopen(req, timeout=8) as response:
                return json.loads(response.read().decode("utf-8"))
        except (TimeoutError, error.URLError, error.HTTPError) as exc:
            raise MuscleWikiUnavailableError("MuscleWiki is unavailable.") from exc
        except json.JSONDecodeError as exc:
            raise MuscleWikiInvalidResponseError("MuscleWiki returned invalid JSON.") from exc

    def _parse_exercise(self, raw: object) -> ExerciseDetails:
        if not isinstance(raw, dict):
            raise MuscleWikiInvalidResponseError("Exercise item is not an object.")
        exercise_id = str(raw.get("id") or raw.get("uuid") or "").strip()
        name = str(raw.get("name") or raw.get("exercise_name") or "").strip()
        if not exercise_id or not name:
            raise MuscleWikiInvalidResponseError("Exercise item is missing id or name.")
        muscles = _string_tuple(raw.get("muscles") or raw.get("primary_muscles"))
        equipment = _string_tuple(raw.get("equipment") or raw.get("equipment_required"))
        instructions = _string_tuple(raw.get("instructions") or raw.get("steps"))
        return ExerciseDetails(
            id=exercise_id,
            name=name,
            muscles=muscles,
            equipment=equipment,
            difficulty=str(raw.get("difficulty") or raw.get("level") or "intermediate").lower(),
            instructions=instructions,
            video_url=_optional_url(raw.get("video_url") or raw.get("video")),
            thumbnail_url=_optional_url(raw.get("thumbnail_url") or raw.get("image")),
        )


def _string_tuple(value: object) -> tuple[str, ...]:
    if value is None:
        return ()
    if isinstance(value, str):
        return tuple(part.strip().lower() for part in value.split(",") if part.strip())
    if isinstance(value, list):
        return tuple(str(part).strip().lower() for part in value if str(part).strip())
    return ()


def _optional_url(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None
