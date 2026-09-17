from __future__ import annotations

import asyncio
import os
import time

import pytest

from app.integrations.exercisedb.client import ExerciseDbClient
from app.integrations.exercises.provider import ExerciseSearchFilters


@pytest.mark.live
def test_exercisedb_search_detail_and_media_live(record_property) -> None:
    if os.getenv("BONYAN_RUN_EXERCISEDB_LIVE") != "1":
        pytest.skip("set BONYAN_RUN_EXERCISEDB_LIVE=1 for the public live call")
    client = ExerciseDbClient()
    started = time.perf_counter()
    page = asyncio.run(
        client.search_exercises(
            ExerciseSearchFilters(query="curl", equipment=("dumbbell",)), page_size=2
        )
    )
    assert page.items
    detail_client = ExerciseDbClient()
    details = asyncio.run(detail_client.get_exercise(page.items[0].id))
    access = asyncio.run(detail_client.get_media_access(details.id, user_id="live-probe"))
    assert details.name
    assert access is not None
    assert access.url.startswith("https://static.exercisedb.dev/media/")
    record_property("latency_ms", round((time.perf_counter() - started) * 1000, 2))
    record_property("result_count", len(page.items))
