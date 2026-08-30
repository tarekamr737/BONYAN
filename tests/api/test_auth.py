from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient

from app.core.auth import JwtAccessTokenVerifier
from app.core.config import Settings
from app.core.errors import AppError
from app.main import create_app

TEST_SECRET = "test-secret-that-is-at-least-32-bytes"


def make_settings(secret: str | None = TEST_SECRET) -> Settings:
    return Settings(
        auth_jwt_secret=secret,
        auth_jwt_issuer="bonyan-test",
        auth_jwt_audience="bonyan-api-test",
    )


def make_token(*, subject: str = "user-1", expires_in: timedelta = timedelta(minutes=5)) -> str:
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": subject,
            "iat": now,
            "exp": now + expires_in,
            "iss": "bonyan-test",
            "aud": "bonyan-api-test",
        },
        TEST_SECRET,
        algorithm="HS256",
    )


def test_verified_token_derives_trusted_user_id() -> None:
    user = JwtAccessTokenVerifier(make_settings()).verify(make_token())

    assert user.id == "user-1"


def test_expired_or_tampered_token_is_rejected() -> None:
    verifier = JwtAccessTokenVerifier(make_settings())

    with pytest.raises(AppError) as expired:
        verifier.verify(make_token(expires_in=timedelta(seconds=-1)))
    with pytest.raises(AppError) as tampered:
        verifier.verify(f"{make_token()}tampered")

    assert expired.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert tampered.value.status_code == status.HTTP_401_UNAUTHORIZED


def test_missing_auth_configuration_fails_closed() -> None:
    with pytest.raises(AppError) as error:
        JwtAccessTokenVerifier(make_settings(None)).verify("token")

    assert error.value.status_code == status.HTTP_503_SERVICE_UNAVAILABLE


def test_issued_access_token_round_trips_through_verifier() -> None:
    from app.core.auth import create_access_token

    settings = make_settings()
    token, expires_in = create_access_token("server-user", settings)

    assert expires_in == settings.auth_access_token_minutes * 60
    assert JwtAccessTokenVerifier(settings).verify(token).id == "server-user"


async def get_private_route(path: str) -> int:
    transport = ASGITransport(app=create_app())
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(path)
    return response.status_code


def test_private_inbody_route_rejects_missing_authentication() -> None:
    assert asyncio.run(get_private_route("/api/v1/inbody/scans")) == status.HTTP_401_UNAUTHORIZED


def test_private_training_route_rejects_missing_authentication() -> None:
    path = "/api/v1/training/plans/current"
    assert asyncio.run(get_private_route(path)) == status.HTTP_401_UNAUTHORIZED


@pytest.mark.parametrize("path", ["/api/v1/avatars", "/api/v1/community/feed"])
def test_private_ws4_routes_reject_missing_authentication(path: str) -> None:
    assert asyncio.run(get_private_route(path)) == status.HTTP_401_UNAUTHORIZED
