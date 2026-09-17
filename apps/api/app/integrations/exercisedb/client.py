from __future__ import annotations

import asyncio
import json
from urllib import error, parse, request

from app.core.logging import get_logger
from app.integrations.exercises.cache import MetadataCache
from app.integrations.exercises.errors import (
    ExerciseProviderInvalidResponseError,
    ExerciseProviderRateLimitError,
    ExerciseProviderRequestError,
    ExerciseProviderUnavailableError,
)
from app.integrations.exercises.provider import (
    ExerciseDetails,
    ExerciseSearchFilters,
    ExerciseSearchPage,
    MediaAccess,
)

DEFAULT_EXERCISEDB_BASE_URL = "https://oss.exercisedb.dev/api/v1"
MAX_RESPONSE_BYTES = 2 * 1024 * 1024
MAX_PAGE = 20
MAX_PAGE_SIZE = 100
_ALLOWED_API_HOST = "oss.exercisedb.dev"
_ALLOWED_MEDIA_HOST = "static.exercisedb.dev"

logger = get_logger("providers")


class ExerciseDbClient:
    def __init__(
        self,
        *,
        base_url: str = DEFAULT_EXERCISEDB_BASE_URL,
        cache: MetadataCache[ExerciseDetails] | None = None,
        timeout_seconds: float = 8,
        max_attempts: int = 3,
        retry_delay_seconds: float = 0.25,
    ) -> None:
        self.base_url = _validated_base_url(base_url)
        self.cache = cache or MetadataCache[ExerciseDetails]()
        self.timeout_seconds = timeout_seconds
        self.max_attempts = max(1, max_attempts)
        self.retry_delay_seconds = max(0, retry_delay_seconds)

    async def search_exercises(
        self, filters: ExerciseSearchFilters, *, page: int = 1, page_size: int = 20
    ) -> ExerciseSearchPage:
        if not 1 <= page <= MAX_PAGE:
            raise ValueError(f"page must be between 1 and {MAX_PAGE}")
        if not 1 <= page_size <= MAX_PAGE_SIZE:
            raise ValueError(f"page_size must be between 1 and {MAX_PAGE_SIZE}")

        cursor: str | None = None
        for current_page in range(1, page + 1):
            query = _query_parameters(filters, page_size=page_size, cursor=cursor)
            payload = await self._get_json(f"/exercises?{parse.urlencode(query)}")
            items, total, has_next, next_cursor = self._parse_page(payload)
            if current_page == page:
                return ExerciseSearchPage(
                    items=items,
                    page=page,
                    page_size=page_size,
                    total=total,
                    next_page=page + 1 if has_next and next_cursor else None,
                )
            if not has_next or not next_cursor:
                return ExerciseSearchPage(
                    items=(), page=page, page_size=page_size, total=total, next_page=None
                )
            cursor = next_cursor
        raise AssertionError("validated page loop did not return")

    async def get_exercise(self, exercise_id: str) -> ExerciseDetails:
        normalized_id = exercise_id.strip()
        if not normalized_id or len(normalized_id) > 120:
            raise ValueError("exercise_id must contain between 1 and 120 characters")
        cached = self.cache.get(normalized_id)
        if cached is not None:
            return cached
        payload = await self._get_json(f"/exercises/{parse.quote(normalized_id, safe='')}")
        if not isinstance(payload, dict) or payload.get("success") is not True:
            raise ExerciseProviderInvalidResponseError("ExerciseDB returned invalid data.")
        item = self._parse_exercise(payload.get("data"))
        self.cache.set(item.id, item)
        return item

    async def get_media_access(self, exercise_id: str, *, user_id: str) -> MediaAccess | None:
        del user_id
        media_url = (await self.get_exercise(exercise_id)).media_url
        return MediaAccess(url=media_url) if media_url else None

    def _parse_page(
        self, payload: object
    ) -> tuple[tuple[ExerciseDetails, ...], int | None, bool, str | None]:
        if not isinstance(payload, dict) or payload.get("success") is not True:
            raise ExerciseProviderInvalidResponseError("ExerciseDB returned invalid data.")
        rows = payload.get("data")
        meta = payload.get("meta")
        if not isinstance(rows, list) or not isinstance(meta, dict):
            raise ExerciseProviderInvalidResponseError("ExerciseDB returned invalid data.")
        items = tuple(self._parse_exercise(row) for row in rows)
        for item in items:
            self.cache.set(item.id, item)
        raw_total = meta.get("total")
        total = raw_total if isinstance(raw_total, int) and raw_total >= 0 else None
        has_next = meta.get("hasNextPage") is True
        raw_cursor = meta.get("nextCursor")
        next_cursor = raw_cursor.strip() if isinstance(raw_cursor, str) else None
        if has_next and not next_cursor:
            raise ExerciseProviderInvalidResponseError("ExerciseDB pagination is invalid.")
        return items, total, has_next, next_cursor

    def _parse_exercise(self, raw: object) -> ExerciseDetails:
        if not isinstance(raw, dict):
            raise ExerciseProviderInvalidResponseError("ExerciseDB item is not an object.")
        exercise_id = str(raw.get("exerciseId") or "").strip()
        name = str(raw.get("name") or "").strip()
        if not exercise_id or not name:
            raise ExerciseProviderInvalidResponseError("ExerciseDB item is missing id or name.")
        targets = _string_tuple(raw.get("targetMuscles"))
        secondary = _string_tuple(raw.get("secondaryMuscles"))
        body_parts = _string_tuple(raw.get("bodyParts"))
        media_url = _optional_media_url(raw.get("gifUrl") or _resolution_url(raw.get("gifUrls")))
        thumbnail_url = _optional_media_url(
            raw.get("imageUrl") or _resolution_url(raw.get("imageUrls"))
        )
        return ExerciseDetails(
            id=exercise_id,
            name=name,
            muscles=targets or body_parts,
            equipment=_string_tuple(raw.get("equipments")),
            difficulty=str(raw.get("difficulty") or "intermediate").strip().lower(),
            instructions=_string_tuple(raw.get("instructions"), lowercase=False),
            media_url=media_url,
            thumbnail_url=thumbnail_url,
            metadata={
                "body_parts": ",".join(body_parts),
                "secondary_muscles": ",".join(secondary),
                "provider": "exercisedb-v1",
            },
        )

    async def _get_json(self, path: str) -> object:
        last_error: ExerciseProviderUnavailableError | None = None
        for attempt in range(self.max_attempts):
            try:
                return await asyncio.to_thread(self._get_json_blocking, path)
            except ExerciseProviderUnavailableError as exc:
                last_error = exc
                if attempt + 1 >= self.max_attempts:
                    raise
                await asyncio.sleep(self.retry_delay_seconds * (2**attempt))
        raise last_error or ExerciseProviderUnavailableError("ExerciseDB is unavailable.")

    def _get_json_blocking(self, path: str) -> object:
        outbound = request.Request(
            f"{self.base_url}{path}",
            headers={"Accept": "application/json", "User-Agent": "BONYAN/1.0"},
            method="GET",
        )
        try:
            with request.urlopen(outbound, timeout=self.timeout_seconds) as response:
                encoded = response.read(MAX_RESPONSE_BYTES + 1)
            if len(encoded) > MAX_RESPONSE_BYTES:
                raise ExerciseProviderInvalidResponseError(
                    "ExerciseDB returned an oversized response."
                )
            return json.loads(encoded.decode("utf-8"))
        except error.HTTPError as exc:
            if exc.code == 429:
                _log_failure("rate_limited")
                raise ExerciseProviderRateLimitError("ExerciseDB rate limit was reached.") from exc
            if exc.code in {408, 500, 502, 503, 504}:
                _log_failure("provider_unavailable")
                raise ExerciseProviderUnavailableError("ExerciseDB is unavailable.") from exc
            _log_failure("provider_request_rejected")
            raise ExerciseProviderRequestError("ExerciseDB rejected the request.") from exc
        except (TimeoutError, error.URLError) as exc:
            _log_failure("provider_unavailable")
            raise ExerciseProviderUnavailableError("ExerciseDB is unavailable.") from exc
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            _log_failure("provider_invalid_json")
            raise ExerciseProviderInvalidResponseError(
                "ExerciseDB returned invalid JSON."
            ) from exc


def _query_parameters(
    filters: ExerciseSearchFilters, *, page_size: int, cursor: str | None
) -> dict[str, str]:
    query = {"limit": str(page_size)}
    if filters.query:
        query["name"] = filters.query.strip()
    if filters.muscles:
        query["targetMuscles"] = ",".join(filters.muscles)
    if filters.body_parts:
        query["bodyParts"] = ",".join(filters.body_parts)
    if filters.equipment:
        query["equipments"] = ",".join(filters.equipment)
    if filters.difficulty:
        query["difficulty"] = filters.difficulty.strip()
    if cursor:
        query["after"] = cursor
    return query


def _string_tuple(value: object, *, lowercase: bool = True) -> tuple[str, ...]:
    if not isinstance(value, list):
        return ()
    items = (str(item).strip() for item in value)
    return tuple((item.lower() if lowercase else item) for item in items if item)


def _resolution_url(value: object) -> object:
    if not isinstance(value, dict):
        return None
    for key in ("360p", "480p", "720p", "1080p"):
        if value.get(key):
            return value[key]
    return None


def _optional_media_url(value: object) -> str | None:
    if value is None or not str(value).strip():
        return None
    candidate = str(value).strip()
    parsed = parse.urlparse(candidate)
    if (
        parsed.scheme != "https"
        or parsed.hostname != _ALLOWED_MEDIA_HOST
        or parsed.port not in {None, 443}
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
        or not parsed.path.startswith("/media/")
    ):
        raise ExerciseProviderInvalidResponseError("ExerciseDB returned an unsafe media URL.")
    return candidate


def _validated_base_url(value: str) -> str:
    candidate = value.strip().rstrip("/")
    parsed = parse.urlparse(candidate)
    if (
        parsed.scheme != "https"
        or parsed.hostname != _ALLOWED_API_HOST
        or parsed.port not in {None, 443}
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
        or parsed.path != "/api/v1"
    ):
        raise ValueError("EXERCISEDB_BASE_URL must use the official ExerciseDB V1 HTTPS endpoint")
    return candidate


def _log_failure(error_code: str) -> None:
    logger.warning(
        "provider_request_failed",
        extra={"error_code": error_code, "provider": "exercisedb"},
    )
