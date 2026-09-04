from __future__ import annotations

import asyncio
from uuid import UUID

from httpx import ASGITransport, AsyncClient, Response

from app.core.health import database_is_ready
from app.main import create_app


async def get_health(headers: dict[str, str] | None = None) -> Response:
    transport = ASGITransport(app=create_app())
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        return await client.get("/health", headers=headers)


def test_health_returns_ok_and_correlation_id() -> None:
    response = asyncio.run(get_health())

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    UUID(response.headers["x-request-id"])


def test_valid_request_id_is_preserved() -> None:
    request_id = "b7c6a7c9-b041-4cb6-b543-954453f3a03d"
    response = asyncio.run(get_health(headers={"x-request-id": request_id}))

    assert response.headers["x-request-id"] == request_id


def test_readiness_reports_database_availability_without_error_details() -> None:
    async def ready() -> bool:
        return True

    async def unavailable() -> bool:
        return False

    async def request(probe) -> Response:
        app = create_app()
        app.dependency_overrides[database_is_ready] = probe
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.get("/ready")

    ready_response = asyncio.run(request(ready))
    unavailable_response = asyncio.run(request(unavailable))

    assert ready_response.status_code == 200
    assert ready_response.json() == {"status": "ready"}
    assert unavailable_response.status_code == 503
    assert unavailable_response.json() == {"status": "unavailable"}
    assert "database" not in unavailable_response.text.lower()
