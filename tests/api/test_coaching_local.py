"""Opt-in local PostgreSQL journey tests; never contacts external providers."""

import asyncio
import os
from datetime import UTC, datetime
from urllib.parse import urlsplit
from uuid import uuid4

import httpx
import pytest

pytestmark = pytest.mark.skipif(
    os.getenv("BONYAN_LOCAL_COACHING_TESTS") != "1",
    reason="requires isolated local experience database",
)


@pytest.mark.parametrize(
    "goal,source",
    [
        ("general_fitness", "manual"),
        ("fat_loss", "inbody"),
        ("military_preparation", "manual"),
        ("military_preparation", "inbody"),
    ],
)
def test_connected_journey_ownership_history_and_goal_changes(goal, source):
    from app.core.config import get_settings
    from app.core.database import engine, session_factory
    from app.core.passwords import PasswordHasher
    from app.domains.inbody.models import InBodyScan
    from app.domains.users.auth_service import AuthService
    from app.domains.users.repository import SqlAlchemyAccountRepository
    from app.domains.users.schemas import AuthCredentials
    from app.main import create_app

    async def scenario():
        url = urlsplit(get_settings().sqlalchemy_database_url)
        assert url.hostname == "127.0.0.1" and url.path == "/bonyan_experience"
        users = []
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=create_app(), client=(f"test-{uuid4().hex}", 123)),
            base_url="http://test",
        ) as client:

            async def call(method, path, expected=200, **kwargs):
                response = await client.request(method, path, **kwargs)
                assert response.status_code == expected, (
                    method,
                    path,
                    response.status_code,
                )
                return response.json() if response.content else None

            try:
                for _ in range(2):
                    async with session_factory() as session:
                        auth = await AuthService(
                            SqlAlchemyAccountRepository(session), PasswordHasher(), get_settings()
                        ).register(AuthCredentials(**{
                            "email": f"journey-{uuid4().hex}@example.invalid",
                            "password": uuid4().hex,
                        }))
                        await session.commit()
                    users.append({"Authorization": f"Bearer {auth.access_token}"})
                primary, other = users
                legacy = await call("GET", "/api/v1/me", headers=primary)
                assert legacy["onboarding_completed"] is False
                await call(
                    "PATCH",
                    "/api/v1/me",
                    headers=primary,
                    json={
                        "display_name": "Journey test",
                        "training_goal": goal,
                        "experience_level": "beginner",
                        "available_training_days": 3,
                        "available_equipment": ["bodyweight"],
                        "onboarding_completed": True,
                        "coaching": {
                            "military_subtype": "undecided"
                            if goal == "military_preparation"
                            else None,
                            "active_days_per_week": 2,
                            "running_minutes": 10,
                            "running_target_minutes": 20,
                        },
                    },
                )
                payload = {"request_id": str(uuid4()), "source": source}
                if source == "manual":
                    payload["measurements"] = {"height_cm": 180, "weight_kg": 90}
                else:
                    # Seed a synthetic confirmed fixture, not an OCR quality claim.
                    import jwt

                    owner = jwt.decode(
                        primary["Authorization"].split()[1],
                        options={"verify_signature": False},
                    )["sub"]
                    scan_id = uuid4()
                    async with session_factory() as session:
                        session.add(
                            InBodyScan(
                                id=scan_id,
                                owner_id=owner,
                                filename="synthetic.pdf",
                                content_type="application/pdf",
                                byte_size=0,
                                content_hash=uuid4().hex,
                                storage_key="synthetic-unused",
                                status="confirmed",
                                confirmed_at=datetime.now(UTC),
                                result={
                                    "measurements": [
                                        {"key": "height", "value": 180, "unit": "cm"},
                                        {"key": "weight", "value": 90, "unit": "kg"},
                                    ]
                                },
                            )
                        )
                        await session.commit()
                    payload["inbody_scan_id"] = str(scan_id)
                    await call(
                        "POST",
                        "/api/v1/me/assessments",
                        404,
                        headers=other,
                        json=payload,
                    )
                first, repeated = await asyncio.gather(
                    call("POST", "/api/v1/me/assessments", 201, headers=primary, json=payload),
                    call("POST", "/api/v1/me/assessments", 201, headers=primary, json=payload),
                )
                assert first["id"] == repeated["id"]
                await call("GET", f"/api/v1/me/history/{first['id']}", 404, headers=other)
                payload = {
                    "request_id": str(uuid4()),
                    "source": "manual",
                    "measurements": {"height_cm": 180, "weight_kg": 88},
                }
                second = await call(
                    "POST", "/api/v1/me/assessments", 201, headers=primary, json=payload
                )
                overview = await call("GET", "/api/v1/me/assessment", headers=primary)
                assert overview["latest"]["id"] == second["id"]
                history = await call("GET", "/api/v1/me/history", headers=primary)
                assert len([item for item in history if item["kind"] == "assessment"]) == 2
                assert (await call("GET", f"/api/v1/me/history/{first['id']}", headers=primary))[
                    "snapshot"
                ]["measurements"]["weight_kg"] == 90
                changed = await call(
                    "PATCH",
                    "/api/v1/me",
                    headers=primary,
                    json={"training_goal": "strength"},
                )
                assert changed["coaching"]["military_subtype"] is None
                assert (await call("GET", "/api/v1/me/history", headers=other)) == []
            finally:
                for headers in users:
                    await call("DELETE", "/api/v1/me", 204, headers=headers)
        await engine.dispose()

    asyncio.run(scenario())
