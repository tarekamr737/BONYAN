from __future__ import annotations

from time import perf_counter
from uuid import UUID, uuid4

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import get_logger, request_id_context

logger = get_logger("http")


def _request_id(value: str | None) -> str:
    if value is not None:
        try:
            return str(UUID(value))
        except ValueError:
            pass
    return str(uuid4())


def _safe_request_path(request: Request) -> str:
    route = request.scope.get("route")
    path = getattr(route, "path", None)
    return path if isinstance(path, str) else "/unmatched"


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = _request_id(request.headers.get("x-request-id"))
        token = request_id_context.set(request_id)
        started_at = perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            logger.error(
                "request_failed",
                extra={"method": request.method, "path": _safe_request_path(request)},
            )
            raise
        else:
            duration_ms = round((perf_counter() - started_at) * 1000, 2)
            logger.info(
                "request_completed",
                extra={
                    "duration_ms": duration_ms,
                    "method": request.method,
                    "path": _safe_request_path(request),
                    "status_code": response.status_code,
                },
            )
            response.headers["x-request-id"] = request_id
            return response
        finally:
            request_id_context.reset(token)
