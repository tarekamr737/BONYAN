from __future__ import annotations

import asyncio
import os
import time
from types import SimpleNamespace

import pytest
from pydantic import SecretStr

from app.core.errors import AppError
from app.integrations.musclewiki.client import MuscleWikiClient
from app.integrations.musclewiki.media import MuscleWikiMediaRelay
from app.integrations.musclewiki.provider import ExerciseSearchFilters


@pytest.mark.live
def test_musclewiki_search_detail_pagination_and_media_live(record_property) -> None:
    api_key = os.getenv("MUSCLEWIKI_API_KEY")
    if not api_key:
        pytest.skip("MUSCLEWIKI_API_KEY is required")
    settings = SimpleNamespace(
        musclewiki_api_key=SecretStr(api_key),
        auth_jwt_secret=SecretStr("live-test-signing-secret-that-is-long-enough"),
        api_public_url="https://api.bonyan.invalid",
    )
    client = MuscleWikiClient(settings=settings)

    started = time.perf_counter()
    first = asyncio.run(
        client.search_exercises(
            ExerciseSearchFilters(query="curl", equipment=("barbell",)),
            page=1,
            page_size=2,
        )
    )
    second = asyncio.run(
        client.search_exercises(
            ExerciseSearchFilters(query="curl", equipment=("barbell",)),
            page=2,
            page_size=2,
        )
    )
    assert first.items
    assert {item.id for item in first.items}.isdisjoint(item.id for item in second.items)
    detail = asyncio.run(client.get_exercise(first.items[0].id))
    assert detail.name
    access = asyncio.run(client.get_media_access(detail.id, user_id="live-user"))
    if access is not None:
        token = access.url.split("token=", 1)[1]
        verified = client.media_signer.verify(token, user_id="live-user")
        with pytest.raises(AppError):
            client.media_signer.verify(token, user_id="other-user")
        tampered = f"{token[:-1]}{'A' if token[-1] != 'A' else 'B'}"
        with pytest.raises(AppError):
            client.media_signer.verify(tampered, user_id="live-user")
        relay = MuscleWikiMediaRelay(api_key)
        response = relay.open(verified.provider_url, range_header="bytes=0-1023")
        next(iter(response.body), b"")
        assert response.status_code in {200, 206}
    record_property("latency_ms", round((time.perf_counter() - started) * 1000, 2))
