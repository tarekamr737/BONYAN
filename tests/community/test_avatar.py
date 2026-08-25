from __future__ import annotations

import asyncio
import base64
from uuid import UUID

import pytest

from app.core.errors import AppError
from app.domains.avatar.contracts import AvatarState
from app.domains.avatar.models import AvatarRecord
from app.domains.avatar.schemas import CreateAvatarRequest
from app.domains.avatar.service import AvatarService
from app.integrations.avatar.mock import MockAvatarProvider

PNG_SOURCE = base64.b64encode(b"\x89PNG\r\n\x1a\nprivate-photo-content").decode()


class FakeAvatarRepository:
    def __init__(self) -> None:
        self.items: dict[UUID, AvatarRecord] = {}

    async def add(self, avatar: AvatarRecord) -> None:
        self.items[avatar.id] = avatar

    async def get_for_owner(self, avatar_id: UUID, owner_id: str) -> AvatarRecord | None:
        avatar = self.items.get(avatar_id)
        return avatar if avatar and avatar.owner_id == owner_id else None

    async def save(self, avatar: AvatarRecord) -> None:
        self.items[avatar.id] = avatar

    async def delete(self, avatar: AvatarRecord) -> None:
        self.items.pop(avatar.id, None)


class FakePrivateStorage:
    def __init__(self) -> None:
        self.items: dict[str, tuple[bytes, str]] = {}
        self.deleted: list[str] = []
        self._counter = 0

    async def put_private(self, content: bytes, media_type: str) -> str:
        self._counter += 1
        key = f"private/avatar-{self._counter}"
        self.items[key] = (content, media_type)
        return key

    async def get_private(self, object_key: str) -> bytes:
        return self.items[object_key][0]

    async def create_read_url(self, object_key: str, *, expires_in_seconds: int) -> str:
        assert object_key in self.items
        return f"https://private-storage.test/read/{self._counter}?ttl={expires_in_seconds}"

    async def delete_private(self, object_key: str) -> None:
        self.items.pop(object_key, None)
        self.deleted.append(object_key)


def make_service(
    *, provider: MockAvatarProvider | None = None
) -> tuple[AvatarService, FakeAvatarRepository, FakePrivateStorage]:
    repository = FakeAvatarRepository()
    storage = FakePrivateStorage()
    service = AvatarService(
        repository,
        provider or MockAvatarProvider(),
        storage,
        provider_timeout_seconds=0.1,
    )
    return service, repository, storage


def create_request() -> CreateAvatarRequest:
    return CreateAvatarRequest(
        source_image_base64=PNG_SOURCE,
        source_media_type="image/png",
        style="athletic portrait",
    )


def test_source_photo_and_unapproved_result_are_private() -> None:
    async def scenario() -> None:
        service, repository, storage = make_service()
        view = await service.create("user-1", create_request())

        assert view.state is AvatarState.READY_FOR_REVIEW
        assert view.public_in_community is False
        assert await service.get_community_identity("user-1", view.id) is None
        serialized = view.model_dump(mode="json")
        assert "source" not in " ".join(serialized).lower()
        record = repository.items[view.id]
        assert record.source_object_key in storage.items
        assert record.generated_object_key in storage.items
        assert record.source_object_key not in str(serialized)

    asyncio.run(scenario())


def test_approval_does_not_publish_without_a_second_explicit_action() -> None:
    async def scenario() -> None:
        service, _, _ = make_service()
        created = await service.create("user-1", create_request())

        approved = await service.approve("user-1", created.id)
        assert approved.approved is True
        assert approved.public_in_community is False
        assert await service.get_community_identity("user-1", created.id) is None

        published = await service.set_public_use("user-1", created.id, enabled=True)
        identity = await service.get_community_identity("user-1", created.id)
        assert published.public_in_community is True
        assert identity is not None
        assert identity.avatar_id == created.id

    asyncio.run(scenario())


def test_provider_failure_is_safe_and_retryable() -> None:
    async def scenario() -> None:
        service, repository, storage = make_service(
            provider=MockAvatarProvider(fail_with="provider_unavailable")
        )
        view = await service.create("user-1", create_request())

        assert view.state is AvatarState.FAILED
        assert view.failure_code == "provider_unavailable"
        assert view.preview_url is None
        record = repository.items[view.id]
        assert record.source_object_key in storage.items
        assert record.generated_object_key is None

    asyncio.run(scenario())


def test_regeneration_replaces_the_private_generated_asset() -> None:
    async def scenario() -> None:
        service, repository, storage = make_service()
        created = await service.create("user-1", create_request())
        old_generated_key = repository.items[created.id].generated_object_key

        regenerated = await service.regenerate("user-1", created.id)
        new_generated_key = repository.items[created.id].generated_object_key

        assert regenerated.state is AvatarState.READY_FOR_REVIEW
        assert new_generated_key != old_generated_key
        assert old_generated_key in storage.deleted
        assert new_generated_key in storage.items

    asyncio.run(scenario())


def test_delete_removes_source_and_generated_assets() -> None:
    async def scenario() -> None:
        service, repository, storage = make_service()
        created = await service.create("user-1", create_request())
        record = repository.items[created.id]
        expected_keys = {record.source_object_key, record.generated_object_key}

        await service.delete("user-1", created.id)

        assert created.id not in repository.items
        assert expected_keys <= set(storage.deleted)
        assert not storage.items

    asyncio.run(scenario())


def test_cross_user_access_returns_not_found() -> None:
    async def scenario() -> None:
        service, _, _ = make_service()
        created = await service.create("owner", create_request())

        with pytest.raises(AppError) as error:
            await service.get("someone-else", created.id)
        assert error.value.code == "avatar_not_found"
        assert error.value.status_code == 404

    asyncio.run(scenario())
