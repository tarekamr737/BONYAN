from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_database_url_must_be_async_postgresql() -> None:
    with pytest.raises(ValidationError):
        Settings(database_url="sqlite+aiosqlite:///local.db")


def test_database_url_is_redacted_from_settings_repr() -> None:
    settings = Settings()

    assert settings.sqlalchemy_database_url.startswith("postgresql+")
    assert "bonyan:bonyan" not in repr(settings)


def test_production_requires_a_strong_auth_secret() -> None:
    with pytest.raises(ValidationError):
        Settings(api_env="production", auth_jwt_secret=None)
    with pytest.raises(ValidationError):
        Settings(auth_jwt_secret="too-short")


def test_production_requires_https_public_api_url() -> None:
    with pytest.raises(ValidationError, match="API_PUBLIC_URL must use HTTPS"):
        Settings(
            api_env="production",
            auth_jwt_secret="a-secure-production-secret-that-is-long-enough",
            api_public_url="http://api.bonyan.test",
        )


def test_cors_origins_are_explicit_and_production_fails_closed() -> None:
    development = Settings()
    production = Settings(
        api_env="production",
        api_public_url="https://api.bonyan.example",
        auth_jwt_secret="a-secure-production-secret-that-is-long-enough",
    )
    configured = Settings(cors_allowed_origins="https://app.bonyan.example/")

    assert "http://127.0.0.1:4173" in development.cors_origins
    assert production.cors_origins == []
    assert configured.cors_origins == ["https://app.bonyan.example"]
