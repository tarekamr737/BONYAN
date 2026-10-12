from __future__ import annotations

import asyncio
from types import SimpleNamespace

from httpx import ASGITransport, AsyncClient

from app.core.auth import CurrentUser, get_current_user
from app.domains.training.router import get_training_service
from app.integrations.exercises.provider import ExerciseDetails, ExerciseSearchPage
from app.main import create_app


def test_visual_catalog_browse_filters_and_pages_are_authenticated_and_preserved():
    async def scenario():
        app = create_app()
        observed = []

        async def search(filters, *, page, page_size):
            observed.append((filters.query, filters.body_parts, page, page_size))
            return ExerciseSearchPage(
                items=(
                    ExerciseDetails(
                        id="chest-a",
                        name="Chest press",
                        muscles=("chest",),
                        equipment=("machine",),
                        difficulty="beginner",
                    ),
                ),
                page=page,
                page_size=page_size,
                next_page=page + 1,
            )

        app.dependency_overrides[get_training_service] = lambda: SimpleNamespace(
            search_exercises=search
        )
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            assert (await client.get("/api/v1/training/exercises")).status_code == 401
            app.dependency_overrides[get_current_user] = lambda: CurrentUser(id="catalog-owner")
            response = await client.get(
                "/api/v1/training/exercises?body_part=chest&page=2&page_size=12"
            )
            assert response.status_code == 200
            assert observed == [(None, ("chest",), 2, 12)]
            assert response.json()["next_page"] == 3
            assert response.json()["items"][0]["id"] == "chest-a"
            invalid = await client.get("/api/v1/training/exercises?body_part=&page=0")
            assert invalid.status_code == 422
            assert len(observed) == 1
        app.dependency_overrides.clear()

    asyncio.run(scenario())
