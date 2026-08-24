from __future__ import annotations

from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory

API_DIRECTORY = Path(__file__).resolve().parents[2] / "apps" / "api"


def test_migration_history_has_one_head() -> None:
    config = Config(API_DIRECTORY / "alembic.ini")
    scripts = ScriptDirectory.from_config(config)

    assert scripts.get_heads() == ["20260824_0001"]
