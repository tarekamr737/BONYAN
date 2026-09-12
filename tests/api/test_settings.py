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


def test_staging_has_the_same_transport_and_auth_floor_as_production() -> None:
    with pytest.raises(ValidationError, match="AUTH_JWT_SECRET is required"):
        Settings(api_env="staging", api_public_url="https://staging-api.bonyan.example")
    with pytest.raises(ValidationError, match="API_PUBLIC_URL must use HTTPS"):
        Settings(
            api_env="staging",
            auth_jwt_secret="a-secure-staging-secret-that-is-long-enough",
            api_public_url="http://staging-api.bonyan.example",
        )

    settings = Settings(
        api_env="staging",
        auth_jwt_secret="a-secure-staging-secret-that-is-long-enough",
        api_public_url="https://staging-api.bonyan.example",
    )

    assert settings.api_env == "staging"
    assert settings.cors_origins == []


def test_production_requires_https_public_api_url() -> None:
    with pytest.raises(ValidationError, match="API_PUBLIC_URL must use HTTPS"):
        Settings(
            api_env="production",
            auth_jwt_secret="a-secure-production-secret-that-is-long-enough",
            api_public_url="http://api.bonyan.test",
        )


def test_cors_origins_are_explicit_and_production_fails_closed() -> None:
    development = Settings(cors_allowed_origins="")
    production = Settings(
        api_env="production",
        api_public_url="https://api.bonyan.example",
        auth_jwt_secret="a-secure-production-secret-that-is-long-enough",
        cors_allowed_origins="",
    )
    configured = Settings(cors_allowed_origins="https://app.bonyan.example/")

    assert "http://127.0.0.1:4173" in development.cors_origins
    assert production.cors_origins == []
    assert configured.cors_origins == ["https://app.bonyan.example"]


def test_selected_providers_require_backend_credentials() -> None:
    with pytest.raises(ValidationError, match="CHAT_API_KEY"):
        Settings(chat_provider="openai", chat_api_key=None)
    for missing_key in (None, "", "   "):
        with pytest.raises(ValidationError, match="AVATAR_API_KEY"):
            Settings(avatar_provider="gemini", avatar_api_key=missing_key)


def test_selected_providers_require_explicit_models() -> None:
    with pytest.raises(ValidationError, match="CHAT_MODEL"):
        Settings(
            chat_provider="openai",
            chat_api_key="chat-secret",
            chat_model="TBD",
        )
    with pytest.raises(ValidationError, match="AVATAR_MODEL"):
        Settings(
            avatar_provider="gemini",
            avatar_api_key="avatar-secret",
            avatar_model="TBD",
        )


def test_provider_secrets_are_redacted() -> None:
    settings = Settings(
        chat_provider="openai",
        chat_model="gpt-5.6-terra",
        chat_api_key="chat-secret",
        avatar_provider="gemini",
        avatar_model="gemini-3.1-flash-image",
        avatar_api_key="avatar-secret",
    )

    assert "chat-secret" not in repr(settings)
    assert "avatar-secret" not in repr(settings)


def test_exercisedb_defaults_to_fixed_official_v1_endpoint() -> None:
    settings = Settings()

    assert settings.exercise_provider == "exercisedb"
    assert settings.exercisedb_base_url == "https://oss.exercisedb.dev/api/v1"
    with pytest.raises(ValidationError, match="official ExerciseDB"):
        Settings(exercisedb_base_url="https://example.test/api/v1")


def test_cloudflare_avatar_requires_backend_credentials_and_redacts_token() -> None:
    with pytest.raises(ValidationError, match="CLOUDFLARE_ACCOUNT_ID"):
        Settings(
            avatar_provider="cloudflare",
            avatar_model="@cf/black-forest-labs/flux-2-klein-4b",
        )
    settings = Settings(
        avatar_provider="cloudflare",
        avatar_model="@cf/black-forest-labs/flux-2-klein-4b",
        cloudflare_account_id="account123",
        cloudflare_api_token="cloudflare-private-token",
    )

    assert "cloudflare-private-token" not in repr(settings)


def test_openrouter_avatar_requires_approved_model_and_redacts_token() -> None:
    with pytest.raises(ValidationError, match="OPENROUTER_AVATAR_API_KEY"):
        Settings(avatar_provider="openrouter", avatar_model="qwen/qwen-image-3")
    with pytest.raises(ValidationError, match="approved OpenRouter"):
        Settings(
            avatar_provider="openrouter",
            avatar_model="other/model",
            openrouter_avatar_api_key="openrouter-private-token",
        )
    settings = Settings(
        avatar_provider="openrouter",
        avatar_model="qwen/qwen-image-3",
        openrouter_avatar_api_key="openrouter-private-token",
    )

    assert "openrouter-private-token" not in repr(settings)


def test_openrouter_base_url_is_fixed_to_official_https_api() -> None:
    with pytest.raises(ValidationError, match="official OpenRouter"):
        Settings(openrouter_base_url="https://example.test/api/v1")
