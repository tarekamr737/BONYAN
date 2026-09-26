from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.correlation import CorrelationIdMiddleware
from app.core.database import engine
from app.core.errors import error_response, register_error_handlers
from app.core.health import router as health_router
from app.core.logging import configure_logging
from app.core.routing import api_v1_router
from app.integrations.exercises.errors import (
    ExerciseProviderError,
    ExerciseProviderRateLimitError,
    ExerciseProviderUnavailableError,
)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    yield
    await engine.dispose()


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)

    application = FastAPI(
        title="BONYAN API",
        version="0.1.0",
        docs_url="/docs" if settings.api_env == "development" else None,
        redoc_url=None,
        lifespan=lifespan,
    )
    application.state.settings = settings
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Accept", "Authorization", "Content-Type", "Range"],
        expose_headers=["Content-Range", "X-Request-ID"],
    )
    application.add_middleware(CorrelationIdMiddleware)
    register_error_handlers(application)

    @application.exception_handler(ExerciseProviderError)
    async def handle_exercise_provider_error(
        request: Request, exc: ExerciseProviderError
    ) -> JSONResponse:
        if isinstance(exc, ExerciseProviderRateLimitError):
            code = "exercise_provider_rate_limited"
            message = "Exercise service is busy. Please retry shortly."
            response_status = status.HTTP_429_TOO_MANY_REQUESTS
        elif isinstance(exc, ExerciseProviderUnavailableError):
            code = "exercise_provider_unavailable"
            message = "Exercise service is temporarily unavailable."
            response_status = status.HTTP_503_SERVICE_UNAVAILABLE
        else:
            code = "exercise_provider_error"
            message = "Exercise information could not be loaded."
            response_status = status.HTTP_502_BAD_GATEWAY
        request.state.safe_error_code = code
        return error_response(code=code, message=message, status_code=response_status)

    application.include_router(health_router)
    application.include_router(api_v1_router)
    return application


app = create_app()
