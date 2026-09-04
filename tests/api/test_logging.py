from __future__ import annotations

import asyncio
import json
import logging
from io import StringIO

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from starlette.requests import Request

from app.core.correlation import CorrelationIdMiddleware, _safe_request_path
from app.core.errors import register_error_handlers
from app.core.logging import JsonFormatter, configure_logging


class RouteStub:
    path = "/api/v1/avatar-assets/{token}"


def test_request_logging_uses_route_template_not_private_asset_token() -> None:
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/v1/avatar-assets/private-capability-token",
            "headers": [],
            "route": RouteStub(),
        }
    )

    assert _safe_request_path(request) == "/api/v1/avatar-assets/{token}"


def test_raw_uvicorn_access_logging_is_disabled() -> None:
    configure_logging("INFO")

    assert logging.getLogger("uvicorn.access").disabled is True


def test_provider_logs_allow_only_safe_operational_metadata() -> None:
    record = logging.LogRecord(
        "bonyan.providers",
        logging.WARNING,
        __file__,
        1,
        "provider_request_failed",
        (),
        None,
    )
    record.provider = "avatar"
    record.error_code = "provider_timeout"
    record.access_token = "must-not-be-serialized"

    payload = json.loads(JsonFormatter().format(record))

    assert payload["provider"] == "avatar"
    assert payload["error_code"] == "provider_timeout"
    assert "access_token" not in payload


def test_unexpected_error_logs_tokenized_route_template_and_safe_metadata() -> None:
    request_id = "353b7604-cd6b-4cb5-a0d6-381924a6397a"
    capability_token = "private-capability-token-must-not-leak"
    stream = StringIO()
    configure_logging("INFO")
    logging.getLogger("bonyan").handlers[0].setStream(stream)

    app = FastAPI()
    register_error_handlers(app)
    app.add_middleware(CorrelationIdMiddleware)

    @app.get("/private-assets/{token}")
    async def explode(token: str) -> None:
        raise RuntimeError("storage failed")

    async def exercise() -> int:
        transport = ASGITransport(app=app, raise_app_exceptions=False)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                f"/private-assets/{capability_token}",
                headers={"x-request-id": request_id},
            )
        return response.status_code

    assert asyncio.run(exercise()) == 500
    records = [json.loads(line) for line in stream.getvalue().splitlines()]
    record = next(item for item in records if item["message"] == "request_failed")
    assert record["path"] == "/private-assets/{token}"
    assert record["status_code"] == 500
    assert record["error_code"] == "internal_error"
    assert record["request_id"] == request_id
    assert isinstance(record["duration_ms"], float)
    assert capability_token not in stream.getvalue()
