from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from types import SimpleNamespace

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient

from app.core.auth import CurrentUser, get_current_user
from app.core.errors import AppError
from app.domains.users.router import get_profile_service
from app.domains.users.schemas import ProfileUpdate, UserProfileView
from app.domains.users.service import ProfileService
from app.main import create_app


class FakeProfileRepository:
    def __init__(self) -> None:
        self.profiles: dict[str, dict[str, object]] = {}

    async def get(self, owner_id: str):
        values = self.profiles.get(owner_id)
        return None if values is None else SimpleNamespace(**values)

    async def upsert(self, owner_id: str, values: dict[str, object]):
        now = datetime.now(UTC)
        current = self.profiles.get(
            owner_id,
            {
                "owner_id": owner_id,
                "display_name": None,
                "preferred_language": "en",
                "date_of_birth": None,
                "sex": None,
                "height_cm": None,
                "training_goal": None,
                "experience_level": None,
                "available_training_days": None,
                "available_equipment": [],
                "preferred_units": "metric",
                "timezone": "UTC",
                "onboarding_completed": False,
                "created_at": now,
                "updated_at": now,
            },
        )
        current.update(values)
        current["updated_at"] = now
        self.profiles[owner_id] = current
        return SimpleNamespace(**current)


def test_new_authenticated_user_receives_safe_default_profile() -> None:
    profile = asyncio.run(ProfileService(FakeProfileRepository()).get("user-1"))

    assert profile == UserProfileView()
    assert "owner_id" not in profile.model_dump()


def test_profile_updates_are_scoped_to_trusted_user() -> None:
    async def scenario() -> None:
        repository = FakeProfileRepository()
        service = ProfileService(repository)

        await service.update("user-a", ProfileUpdate(display_name="User A"))
        await service.update("user-b", ProfileUpdate(display_name="User B"))

        assert (await service.get("user-a")).display_name == "User A"
        assert (await service.get("user-b")).display_name == "User B"

    asyncio.run(scenario())


def test_onboarding_cannot_complete_without_required_fields() -> None:
    async def scenario() -> None:
        service = ProfileService(FakeProfileRepository())
        try:
            await service.update("user-1", ProfileUpdate(onboarding_completed=True))
        except AppError as exc:
            assert exc.code == "onboarding_incomplete"
            assert exc.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
        else:
            raise AssertionError("incomplete onboarding was accepted")

    asyncio.run(scenario())


def test_onboarding_requires_an_equipment_choice() -> None:
    async def scenario() -> None:
        service = ProfileService(FakeProfileRepository())
        with pytest.raises(AppError) as error:
            await service.update(
                "user-1",
                ProfileUpdate(
                    display_name="User",
                    training_goal="general_fitness",
                    experience_level="beginner",
                    available_training_days=3,
                    available_equipment=[],
                    onboarding_completed=True,
                ),
            )

        assert error.value.code == "onboarding_incomplete"

    asyncio.run(scenario())


def test_onboarding_completion_persists_normalized_preferences() -> None:
    async def scenario() -> None:
        service = ProfileService(FakeProfileRepository())
        profile = await service.update(
            "user-1",
            ProfileUpdate(
                display_name="  Tarek   Ahmed  ",
                preferred_language="EN_us",
                training_goal="general_fitness",
                experience_level="beginner",
                available_training_days=3,
                available_equipment=[" Dumbbell ", "dumbbell", "Bodyweight"],
                preferred_units="metric",
                timezone="Africa/Cairo",
                onboarding_completed=True,
            ),
        )

        assert profile.display_name == "Tarek Ahmed"
        assert profile.preferred_language == "en-us"
        assert profile.available_equipment == ["bodyweight", "dumbbell"]
        assert profile.onboarding_completed is True

    asyncio.run(scenario())


def test_me_routes_require_auth_and_never_accept_owner_id() -> None:
    async def scenario() -> None:
        app = create_app()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            unauthorized = await client.get("/api/v1/me")

        assert unauthorized.status_code == status.HTTP_401_UNAUTHORIZED

        repository = FakeProfileRepository()
        service = ProfileService(repository)
        app.dependency_overrides[get_current_user] = lambda: CurrentUser(
            id="trusted-user"
        )
        app.dependency_overrides[get_profile_service] = lambda: service
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            rejected_owner = await client.patch(
                "/api/v1/me",
                json={"display_name": "Trusted", "owner_id": "attacker-choice"},
            )
            updated = await client.patch("/api/v1/me", json={"display_name": "Trusted"})
            fetched = await client.get("/api/v1/me")

        assert rejected_owner.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
        assert updated.status_code == status.HTTP_200_OK
        assert fetched.json()["display_name"] == "Trusted"
        assert "owner_id" not in fetched.json()
        assert set(repository.profiles) == {"trusted-user"}

    asyncio.run(scenario())
