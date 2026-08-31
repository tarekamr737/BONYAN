from __future__ import annotations

import asyncio
from uuid import uuid4

import pytest

from app.core.account_deletion import AccountDeletionService
from app.core.errors import AppError


class FakeResult:
    def __init__(self, rows: list[tuple[object, str | None]]) -> None:
        self._rows = rows

    def all(self) -> list[tuple[object, str | None]]:
        return self._rows


class FakeSession:
    def __init__(self) -> None:
        self.statements: list[str] = []
        self.flushed = False

    async def scalars(self, statement: object) -> list[str]:
        self.statements.append(str(statement))
        return ["inbody/private-object"]

    async def execute(self, statement: object) -> FakeResult:
        rendered = str(statement)
        self.statements.append(rendered)
        if rendered.startswith("SELECT avatars"):
            return FakeResult([(uuid4(), "avatars/private-object")])
        return FakeResult([])

    async def flush(self) -> None:
        self.flushed = True


class FakeStorage:
    def __init__(self, *, fail: bool = False) -> None:
        self.deleted: list[str] = []
        self.fail = fail

    async def delete(self, *, key: str) -> None:
        if self.fail:
            raise OSError("storage unavailable")
        self.deleted.append(key)


def test_account_deletion_removes_private_objects_and_all_owned_domains() -> None:
    async def exercise() -> None:
        session = FakeSession()
        storage = FakeStorage()
        await AccountDeletionService(session, storage).delete("user-1")  # type: ignore[arg-type]

        rendered = "\n".join(session.statements)
        assert storage.deleted == ["inbody/private-object", "avatars/private-object"]
        for table in (
            "community_post_reports",
            "community_post_reactions",
            "community_posts",
            "training_workout_sessions",
            "training_workout_plans",
            "avatars",
            "inbody_scans",
            "user_profiles",
            "user_accounts",
        ):
            assert f"DELETE FROM {table}" in rendered
        assert session.flushed

    asyncio.run(exercise())


def test_account_deletion_aborts_database_cleanup_when_private_storage_fails() -> None:
    async def exercise() -> None:
        session = FakeSession()
        storage = FakeStorage(fail=True)

        with pytest.raises(AppError) as raised:
            await AccountDeletionService(session, storage).delete("user-1")  # type: ignore[arg-type]

        assert raised.value.code == "account_deletion_failed"
        assert not any(statement.startswith("DELETE") for statement in session.statements)
        assert not session.flushed

    asyncio.run(exercise())
