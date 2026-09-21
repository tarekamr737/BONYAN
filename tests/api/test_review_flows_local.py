"""Review and retry semantics against an explicitly opted-in, isolated PostgreSQL DB."""
import asyncio
import os
from uuid import uuid4

import httpx
import pytest

pytestmark = pytest.mark.skipif(
    os.getenv("BONYAN_LOCAL_COACHING_TESTS") != "1",
    reason="requires isolated local experience database",
)


def test_review_confirmation_and_session_retry(monkeypatch):
    from app.core.config import get_settings
    from app.core.database import engine, session_factory
    from app.core.passwords import PasswordHasher
    from app.core.providers.contracts import LLMResponse
    from app.domains.nutrition import router as nutrition_router
    from app.domains.training import router as training_router
    from app.domains.users.auth_service import AuthService
    from app.domains.users.repository import SqlAlchemyAccountRepository
    from app.domains.users.schemas import AuthCredentials
    from app.integrations.exercises.provider import ExerciseDetails
    from app.main import create_app

    class Catalog:
        async def get_exercise(self, exercise_id):
            return ExerciseDetails(
                id=exercise_id, name="Test push-up", muscles=("chest",),
                equipment=("bodyweight",), difficulty="beginner",
            )

    class NutritionProvider:
        async def complete(self, request):
            return LLMResponse(
                text='{"calories":400,"protein_g":30,"carbs_g":40,"fat_g":10,'
                     '"summary":"Test estimate"}', model="test",
            )

    monkeypatch.setattr(training_router, "get_exercise_provider", lambda _: Catalog())
    monkeypatch.setattr(nutrition_router, "_provider", lambda _: NutritionProvider())

    async def scenario():
        assert "127.0.0.1:55439/bonyan_experience" in get_settings().sqlalchemy_database_url
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=create_app(), client=(uuid4().hex, 123)),
            base_url="http://test",
        ) as client:
            headers = []
            for _ in range(2):
                async with session_factory() as session:
                    auth = await AuthService(
                        SqlAlchemyAccountRepository(session), PasswordHasher(), get_settings()
                    ).register(AuthCredentials(
                        email=f"review-{uuid4().hex}@example.invalid",
                        password=uuid4().hex,
                    ))
                    await session.commit()
                headers.append({"Authorization": f"Bearer {auth.access_token}"})
            owner, other = headers
            response = await client.post("/api/v1/training/plans/manual", headers=owner, json={
                "name": "Review fixture", "goal": "strength", "experience": "beginner",
                "activate": False, "exercises": [{"exercise_id": "push-up", "sets": 3,
                    "reps_min": 8, "reps_max": 12, "rest_seconds": 90}],
            })
            assert response.status_code == 201, response.text
            plan = response.json()
            assert plan["status"] == "draft"
            current = await client.get("/api/v1/training/plans/current", headers=owner)
            assert current.json() is None
            path = f"/api/v1/training/plans/{plan['id']}/activate"
            assert (await client.post(path, headers=other)).status_code == 404
            assert (await client.post(path, headers=owner)).json()["status"] == "active"
            assert (await client.post(path, headers=owner)).status_code == 200
            params = {"plan_id": plan["id"], "day_key": plan["days"][0]["key"]}
            sessions = await asyncio.gather(*[
                client.post("/api/v1/training/sessions", headers=owner, params=params)
                for _ in range(2)
            ])
            assert all(item.status_code == 201 for item in sessions)
            assert sessions[0].json()["id"] == sessions[1].json()["id"]
            session_id = sessions[0].json()["id"]
            session_path = f"/api/v1/training/sessions/{session_id}"
            logged = await client.post(session_path + "/sets", headers=owner, json={
                "prescription_index": 0, "set_number": 1, "reps": 10,
                "weight_kg": 0, "completed": True,
            })
            assert logged.status_code == 200
            assert len((await client.get(session_path, headers=owner)).json()["logged_sets"]) == 1
            assert (await client.get(session_path, headers=other)).status_code == 404
            preview = await client.post("/api/v1/nutrition/preview", headers=owner,
                                        json={"description": "Synthetic meal"})
            assert preview.status_code == 200
            assert (await client.get("/api/v1/nutrition/logs/today", headers=owner)).json() == []
            confirmation = {**preview.json(), "description": "Synthetic meal", "calories": 350}
            confirmed = await asyncio.gather(*[
                client.post("/api/v1/nutrition/confirm", headers=owner, json=confirmation)
                for _ in range(2)
            ])
            assert all(item.status_code == 201 for item in confirmed)
            assert confirmed[0].json()["id"] == confirmed[1].json()["id"]
            meals = (await client.get("/api/v1/nutrition/logs/today", headers=owner)).json()
            assert len(meals) == 1 and meals[0]["calories"] == 350
            assert (await client.post("/api/v1/nutrition/confirm", headers=other,
                                      json=confirmation)).status_code == 409
        await engine.dispose()

    asyncio.run(scenario())
