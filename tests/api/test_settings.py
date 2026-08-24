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
