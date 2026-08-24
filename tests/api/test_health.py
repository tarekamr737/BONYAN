from __future__ import annotations

import asyncio
from uuid import UUID

from httpx import ASGITransport, AsyncClient, Response

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
