from __future__ import annotations

import json
import logging

from starlette.requests import Request

from app.core.correlation import _safe_request_path
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
