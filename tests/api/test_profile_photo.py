from __future__ import annotations

import asyncio
import io
from datetime import UTC, datetime

import pytest
from PIL import Image

from app.core.errors import AppError
from app.domains.users.models import UserProfile
from app.domains.users.profile_photo import ProfilePhotoService


class FakeSession:
    def __init__(self, *profiles: UserProfile) -> None:
        self.profiles = {profile.owner_id: profile for profile in profiles}
        self.flushed = 0
        self.committed = 0

    async def scalar(self, statement: object) -> UserProfile | None:
        params = statement.compile().params  # type: ignore[union-attr]
        owner_id = next((value for key, value in params.items() if "owner_id" in key), None)
        return self.profiles.get(owner_id)

    def add(self, profile: UserProfile) -> None:
        self.profiles[profile.owner_id] = profile

    async def flush(self) -> None:
        self.flushed += 1

    async def refresh(self, profile: UserProfile) -> None:
        self.profiles[profile.owner_id] = profile

    async def commit(self) -> None:
        self.committed += 1


class FakeStorage:
    def __init__(self) -> None:
        self.objects: dict[str, tuple[bytes, str]] = {}

    async def put(self, *, key: str, content: bytes, content_type: str) -> None:
        self.objects[key] = (content, content_type)

    async def delete(self, *, key: str) -> None:
        self.objects.pop(key, None)

    async def read(self, *, key: str) -> bytes:
        if key not in self.objects:
            raise FileNotFoundError(key)
        return self.objects[key][0]


class FailingDeleteStorage(FakeStorage):
    async def delete(self, *, key: str) -> None:
        del key
        raise RuntimeError("storage unavailable")


def png_bytes() -> bytes:
    output = io.BytesIO()
    Image.new("RGB", (128, 128), "#3686df").save(output, format="PNG")
    return output.getvalue()


def profile_record() -> UserProfile:
    profile = UserProfile(
        owner_id="user-1",
        available_equipment=[],
        coaching={},
        home_tour_completed=False,
        onboarding_completed=False,
        preferred_language="en",
        preferred_units="metric",
        timezone="UTC",
    )
    profile.updated_at = datetime.now(UTC)
    return profile


def test_profile_photo_is_private_sanitized_and_replaceable() -> None:
    async def scenario() -> None:
        profile = profile_record()
        session = FakeSession(profile)
        storage = FakeStorage()
        service = ProfilePhotoService(session, storage)  # type: ignore[arg-type]

        view = await service.save("user-1", png_bytes(), "image/png")
        first_key = profile.profile_photo_object_key

        assert view.has_profile_photo is True
        assert "profile_photo_object_key" not in view.model_dump()
        assert first_key is not None
        assert storage.objects[first_key][1] == "image/jpeg"
        assert storage.objects[first_key][0].startswith(b"\xff\xd8\xff")
        assert (await service.read("user-1")).media_type == "image/jpeg"

        await service.save("user-1", png_bytes(), "image/png")
        assert first_key not in storage.objects
        assert len(storage.objects) == 1

        await service.delete("user-1")
        assert storage.objects == {}
        assert profile.profile_photo_object_key is None

    asyncio.run(scenario())


def test_profile_photo_rejects_spoofed_image_content() -> None:
    async def scenario() -> None:
        profile = profile_record()
        service = ProfilePhotoService(
            FakeSession(profile), FakeStorage()  # type: ignore[arg-type]
        )
        with pytest.raises(AppError) as raised:
            await service.save("user-1", b"not an image", "image/png")

        assert raised.value.code == "invalid_profile_photo"
        assert raised.value.status_code == 400

    asyncio.run(scenario())


def test_profile_photo_lookup_is_scoped_to_the_requested_owner() -> None:
    async def scenario() -> None:
        owner = profile_record()
        other = profile_record()
        other.owner_id = "user-2"
        storage = FakeStorage()
        service = ProfilePhotoService(FakeSession(owner, other), storage)  # type: ignore[arg-type]

        await service.save("user-1", png_bytes(), "image/png")
        with pytest.raises(AppError) as raised:
            await service.read("user-2")

        assert raised.value.code == "profile_photo_not_found"

    asyncio.run(scenario())


def test_profile_photo_delete_fails_without_hiding_a_retained_object() -> None:
    async def scenario() -> None:
        profile = profile_record()
        profile.profile_photo_object_key = "profile-photos/user-1/profile.jpg"
        profile.profile_photo_media_type = "image/jpeg"
        profile.profile_photo_updated_at = datetime.now(UTC)
        session = FakeSession(profile)
        service = ProfilePhotoService(
            session, FailingDeleteStorage()  # type: ignore[arg-type]
        )

        with pytest.raises(AppError) as raised:
            await service.delete("user-1")

        assert raised.value.code == "profile_photo_delete_unavailable"
        assert raised.value.status_code == 503
        assert profile.profile_photo_object_key == "profile-photos/user-1/profile.jpg"
        assert session.committed == 0

    asyncio.run(scenario())
