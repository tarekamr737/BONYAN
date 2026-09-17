from __future__ import annotations

import asyncio
import json
from typing import Self
from unittest.mock import patch
from urllib.error import HTTPError, URLError

import pytest

from app.integrations.exercisedb.client import ExerciseDbClient
from app.integrations.exercises.errors import (
    ExerciseProviderInvalidResponseError,
    ExerciseProviderRequestError,
    ExerciseProviderUnavailableError,
)
from app.integrations.exercises.provider import ExerciseSearchFilters


class FakeResponse:
    def __init__(self, payload: object | bytes) -> None:
        self.payload = payload if isinstance(payload, bytes) else json.dumps(payload).encode()

    def __enter__(self) -> Self:
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def read(self, size: int = -1) -> bytes:
        return self.payload[:size]


def run(coro):
    return asyncio.run(coro)


def exercise_payload() -> dict[str, object]:
    return {
        "exerciseId": "abc-123",
        "name": "Dumbbell curl",
        "targetMuscles": ["biceps"],
        "secondaryMuscles": ["forearms"],
        "bodyParts": ["upper arms"],
        "equipments": ["dumbbell"],
        "instructions": ["Curl with control."],
        "gifUrl": "https://static.exercisedb.dev/media/abc-123.gif",
    }


def test_search_normalizes_filters_pagination_and_media() -> None:
    captured = []

    def open_request(req, timeout):
        captured.append(req.full_url)
        return FakeResponse(
            {
                "success": True,
                "data": [exercise_payload()],
                "meta": {"total": 1, "hasNextPage": False, "nextCursor": None},
            }
        )

    with patch("app.integrations.exercisedb.client.request.urlopen", open_request):
        page = run(
            ExerciseDbClient().search_exercises(
                ExerciseSearchFilters(
                    query="curl",
                    muscles=("biceps",),
                    body_parts=("upper arms",),
                    equipment=("dumbbell",),
                ),
                page_size=10,
            )
        )

    assert page.items[0].id == "abc-123"
    assert page.items[0].media_url == "https://static.exercisedb.dev/media/abc-123.gif"
    assert "name=curl" in captured[0]
    assert "targetMuscles=biceps" in captured[0]
    assert "bodyParts=upper+arms" in captured[0]
    assert "equipments=dumbbell" in captured[0]


def test_details_and_direct_sanitized_media_access() -> None:
    with patch(
        "app.integrations.exercisedb.client.request.urlopen",
        return_value=FakeResponse({"success": True, "data": exercise_payload()}),
    ):
        client = ExerciseDbClient()
        details = run(client.get_exercise("abc-123"))
        access = run(client.get_media_access("abc-123", user_id="owner"))

    assert details.instructions == ("Curl with control.",)
    assert access is not None and access.expires_at is None
    assert "owner" not in repr(client)


@pytest.mark.parametrize(
    ("payload", "expected"),
    [
        (b"not-json", ExerciseProviderInvalidResponseError),
        ({"success": True, "data": {}, "meta": {}}, ExerciseProviderInvalidResponseError),
        ({"success": True, "data": [], "meta": {"total": 0}}, None),
    ],
)
def test_malformed_and_empty_search(payload, expected) -> None:
    with patch(
        "app.integrations.exercisedb.client.request.urlopen",
        return_value=FakeResponse(payload),
    ):
        if expected:
            with pytest.raises(expected):
                run(ExerciseDbClient(max_attempts=1).search_exercises(ExerciseSearchFilters()))
        else:
            page = run(ExerciseDbClient().search_exercises(ExerciseSearchFilters()))
            assert page.items == ()


@pytest.mark.parametrize("status", [400, 404])
def test_4xx_maps_to_safe_request_error(status: int) -> None:
    def rejected(req, timeout):
        raise HTTPError(req.full_url, status, "rejected", None, None)

    with patch("app.integrations.exercisedb.client.request.urlopen", rejected), pytest.raises(
        ExerciseProviderRequestError
    ):
        run(ExerciseDbClient(max_attempts=1).search_exercises(ExerciseSearchFilters()))


@pytest.mark.parametrize(
    "failure", [URLError(TimeoutError()), HTTPError("x", 503, "x", None, None)]
)
def test_timeout_and_5xx_are_bounded_and_safe(failure: Exception) -> None:
    attempts = 0

    def unavailable(req, timeout):
        nonlocal attempts
        attempts += 1
        raise failure

    with patch("app.integrations.exercisedb.client.request.urlopen", unavailable), pytest.raises(
        ExerciseProviderUnavailableError
    ):
        run(
            ExerciseDbClient(max_attempts=2, retry_delay_seconds=0).search_exercises(
                ExerciseSearchFilters()
            )
        )
    assert attempts == 2


def test_rejects_unsafe_media_and_oversized_response() -> None:
    unsafe = exercise_payload() | {"gifUrl": "https://evil.example/media/a.gif"}
    with patch(
        "app.integrations.exercisedb.client.request.urlopen",
        return_value=FakeResponse({"success": True, "data": unsafe}),
    ), pytest.raises(ExerciseProviderInvalidResponseError):
        run(ExerciseDbClient().get_exercise("abc-123"))

    with patch(
        "app.integrations.exercisedb.client.request.urlopen",
        return_value=FakeResponse(b"x" * (2 * 1024 * 1024 + 1)),
    ), pytest.raises(ExerciseProviderInvalidResponseError):
        run(ExerciseDbClient().search_exercises(ExerciseSearchFilters()))
