from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

API_DIRECTORY = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=API_DIRECTORY / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    api_env: Literal["development", "test", "staging", "production"] = "development"
    database_url: SecretStr = SecretStr(
        "postgresql+asyncpg://bonyan:bonyan@127.0.0.1:5432/bonyan"
    )
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    chat_model: str = "TBD"
    avatar_model: str = "TBD"
    mistral_api_key: SecretStr | None = None
    musclewiki_api_key: SecretStr | None = None
    auth_jwt_secret: SecretStr | None = None
    auth_jwt_issuer: str = "bonyan"
    auth_jwt_audience: str = "bonyan-api"
    auth_access_token_minutes: int = 720
    cors_allowed_origins: str = ""
    private_storage_root: Path = API_DIRECTORY / ".private-storage"
    api_public_url: str = "http://127.0.0.1:8000"
    rate_limit_register_per_minute: int = 5
    rate_limit_login_per_minute: int = 10
    rate_limit_ocr_per_minute: int = 10
    rate_limit_coach_per_minute: int = 30
    rate_limit_avatar_per_minute: int = 6
    rate_limit_media_token_per_minute: int = 60

    @field_validator("database_url")
    @classmethod
    def require_postgresql(cls, value: SecretStr) -> SecretStr:
        url = value.get_secret_value()
        if not url.startswith("postgresql+asyncpg://"):
            raise ValueError("DATABASE_URL must use the asyncpg SQLAlchemy driver")
        return value

    @field_validator("chat_model", "avatar_model")
    @classmethod
    def require_non_empty_model_marker(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("provider model markers cannot be empty")
        return value

    @field_validator("auth_jwt_issuer", "auth_jwt_audience")
    @classmethod
    def require_non_empty_auth_claim(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("auth JWT claims cannot be empty")
        return value

    @field_validator("auth_access_token_minutes")
    @classmethod
    def validate_access_token_lifetime(cls, value: int) -> int:
        if not 5 <= value <= 1440:
            raise ValueError("AUTH_ACCESS_TOKEN_MINUTES must be between 5 and 1440")
        return value

    @field_validator(
        "rate_limit_register_per_minute",
        "rate_limit_login_per_minute",
        "rate_limit_ocr_per_minute",
        "rate_limit_coach_per_minute",
        "rate_limit_avatar_per_minute",
        "rate_limit_media_token_per_minute",
    )
    @classmethod
    def validate_rate_limits(cls, value: int) -> int:
        if not 1 <= value <= 10_000:
            raise ValueError("rate limits must be between 1 and 10000 requests per minute")
        return value

    @field_validator("api_public_url")
    @classmethod
    def normalize_api_public_url(cls, value: str) -> str:
        normalized = value.strip().rstrip("/")
        if not normalized.startswith(("http://", "https://")):
            raise ValueError("API_PUBLIC_URL must be an HTTP(S) URL")
        return normalized

    @field_validator("auth_jwt_secret", mode="before")
    @classmethod
    def validate_auth_secret(cls, value: object) -> object:
        if value is None or value == "":
            return None
        secret = value.get_secret_value() if isinstance(value, SecretStr) else str(value)
        if len(secret.encode("utf-8")) < 32:
            raise ValueError("AUTH_JWT_SECRET must contain at least 32 bytes")
        return value

    @field_validator("private_storage_root")
    @classmethod
    def resolve_private_storage_root(cls, value: Path) -> Path:
        return value if value.is_absolute() else API_DIRECTORY / value

    @model_validator(mode="after")
    def require_release_security(self) -> Settings:
        if self.api_env in {"staging", "production"} and self.auth_jwt_secret is None:
            raise ValueError("AUTH_JWT_SECRET is required in staging and production")
        if self.api_env in {"staging", "production"} and not self.api_public_url.startswith(
            "https://"
        ):
            raise ValueError("API_PUBLIC_URL must use HTTPS in staging and production")
        return self

    @property
    def sqlalchemy_database_url(self) -> str:
        return self.database_url.get_secret_value()

    @property
    def cors_origins(self) -> list[str]:
        configured = [
            origin.strip().rstrip("/")
            for origin in self.cors_allowed_origins.split(",")
            if origin.strip()
        ]
        if configured:
            return configured
        if self.api_env in {"development", "test"}:
            return [
                "http://localhost:4173",
                "http://127.0.0.1:4173",
                "http://localhost:8081",
                "http://127.0.0.1:8081",
                "http://localhost:19006",
                "http://127.0.0.1:19006",
            ]
        return []


@lru_cache
def get_settings() -> Settings:
    return Settings()
