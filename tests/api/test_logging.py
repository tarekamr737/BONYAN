from __future__ import annotations

import logging

from starlette.requests import Request

from app.core.correlation import _safe_request_path
from app.core.logging import configure_logging


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
