from __future__ import annotations

import asyncio
import json
from datetime import timedelta
from urllib import error, parse, request

from app.core.config import Settings
from app.integrations.musclewiki.cache import MetadataCache
from app.integrations.musclewiki.errors import (
    MuscleWikiInvalidResponseError,
    MuscleWikiUnavailableError,
)
from app.integrations.musclewiki.media import MuscleWikiMediaSigner
from app.integrations.musclewiki.provider import (
    ExerciseDetails,
    ExerciseSearchFilters,
    ExerciseSearchPage,
    MediaAccess,
)


class MuscleWikiClient:
    def __init__(
        self,
        *,
        settings: Settings,
        base_url: str = "https://api.musclewiki.com",
        cache: MetadataCache[ExerciseDetails] | None = None,
        media_signer: MuscleWikiMediaSigner | None = None,
        api_public_url: str | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        secret = getattr(settings, "musclewiki_api_key", None)
        self.api_key = secret.get_secret_value() if secret else None
        self.cache = cache or MetadataCache[ExerciseDetails]()
        auth_secret = getattr(settings, "auth_jwt_secret", None)
        configured_secret = (
            auth_secret.get_secret_value().encode("utf-8")
            if auth_secret
            else b"development-musclewiki-media-secret"
        )
        self.media_signer = media_signer or MuscleWikiMediaSigner(configured_secret)
        self.api_public_url = (
            api_public_url or getattr(settings, "api_public_url", "http://127.0.0.1:8000")
        ).rstrip("/")

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

        payload = await self._get_json(f"/exercises/?{parse.urlencode(query)}")
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
        item = self._parse_exercise(
            await self._get_json(f"/exercises/{parse.quote(exercise_id)}/")
        )
        self.cache.set(item.id, item)
        return item

    async def get_media_access(self, exercise_id: str, *, user_id: str) -> MediaAccess | None:
        video_url = (await self.get_exercise(exercise_id)).video_url
        if video_url is None:
            return None
        expires_in_seconds = int(timedelta(minutes=10).total_seconds())
        token = self.media_signer.sign(
            provider_url=video_url,
            user_id=user_id,
            expires_in_seconds=expires_in_seconds,
        )
        verified = self.media_signer.verify(token, user_id=user_id)
        return MediaAccess(
            url=f"{self.api_public_url}/api/v1/training/media?token={token}",
            expires_at=verified.expires_at,
        )

    async def _get_json(self, path: str) -> object:
        return await asyncio.to_thread(self._get_json_blocking, path)

    def _get_json_blocking(self, path: str) -> object:
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
