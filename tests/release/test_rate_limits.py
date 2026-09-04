from __future__ import annotations

import asyncio
from pathlib import Path

from fastapi import Depends, FastAPI, Request
from httpx import ASGITransport, AsyncClient
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from app.core.auth import CurrentUser, get_current_user
from app.core.config import Settings, get_settings
from app.core.errors import register_error_handlers
from app.core.rate_limit import (
    FixedWindowRateLimiter,
    get_rate_limiter,
    limit_avatar,
    limit_coach,
    limit_login,
    limit_media_token,
    limit_ocr,
    limit_registration,
)

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]


def limited_app() -> FastAPI:
    app = FastAPI()
    register_error_handlers(app)
    settings = Settings(
        auth_jwt_secret="test-secret-that-is-at-least-32-bytes",
        rate_limit_register_per_minute=1,
        rate_limit_login_per_minute=1,
        rate_limit_ocr_per_minute=1,
        rate_limit_coach_per_minute=1,
        rate_limit_avatar_per_minute=1,
        rate_limit_media_token_per_minute=1,
    )
    limiter = FixedWindowRateLimiter()
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[get_rate_limiter] = lambda: limiter

    async def trusted_user(request: Request) -> CurrentUser:
        return CurrentUser(id=request.headers.get("x-test-user", "user-1"))

    app.dependency_overrides[get_current_user] = trusted_user

    for path, dependency in (
        ("/register", limit_registration),
        ("/login", limit_login),
        ("/ocr", limit_ocr),
        ("/coach", limit_coach),
        ("/avatar", limit_avatar),
        ("/media-token", limit_media_token),
    ):
        app.add_api_route(
            path,
            lambda: {"status": "ok"},
            methods=["POST"],
            dependencies=[Depends(dependency)],
        )
    return app


async def post(
    app: FastAPI,
    path: str,
    *,
    authorization: str = "Bearer token-a",
    user_id: str = "user-1",
) -> int:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            path,
            headers={"authorization": authorization, "x-test-user": user_id},
        )
    return response.status_code


def test_all_six_endpoint_categories_return_safe_429() -> None:
    async def exercise() -> None:
        app = limited_app()
        for path in ("/register", "/login", "/ocr", "/coach", "/avatar", "/media-token"):
            assert await post(app, path) == 200
            assert await post(app, path) == 429

    asyncio.run(exercise())


def test_authenticated_limits_use_stable_user_identity_not_rotated_token() -> None:
    async def exercise() -> None:
        app = limited_app()
        assert await post(app, "/coach", authorization="Bearer token-a") == 200
        assert await post(app, "/coach", authorization="Bearer token-b") == 429
        assert (
            await post(app, "/coach", authorization="Bearer token-c", user_id="user-2")
            == 200
        )

    asyncio.run(exercise())


def test_proxy_headers_are_accepted_only_from_the_configured_trusted_proxy() -> None:
    app = FastAPI()

    @app.get("/client")
    async def client(request: Request) -> dict[str, str]:
        return {"host": request.client.host if request.client else "unknown"}

    async def request_from(source: str) -> str:
        wrapped = ProxyHeadersMiddleware(app, trusted_hosts=["172.29.6.2"])
        transport = ASGITransport(app=wrapped, client=(source, 1234))
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/client", headers={"x-forwarded-for": "198.51.100.24"}
            )
        return response.json()["host"]

    assert asyncio.run(request_from("172.29.6.2")) == "198.51.100.24"
    assert asyncio.run(request_from("203.0.113.9")) == "203.0.113.9"


def test_staging_proxy_forwards_client_ip_and_api_trusts_only_edge() -> None:
    caddyfile = (REPOSITORY_ROOT / "deployment/staging/Caddyfile").read_text()
    api_environment = (REPOSITORY_ROOT / "deployment/staging/api.env.example").read_text()
    compose = (REPOSITORY_ROOT / "deployment/staging/compose.yaml").read_text()

    assert "header_up X-Forwarded-For {remote_host}" in caddyfile
    assert "FORWARDED_ALLOW_IPS=172.29.6.2" in api_environment
    assert "ipv4_address: 172.29.6.2" in compose
