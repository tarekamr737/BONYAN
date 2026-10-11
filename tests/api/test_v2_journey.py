"""Explicitly opted-in HTTP journey using real PostgreSQL and synthetic providers."""

import asyncio
import os
from datetime import UTC, datetime, timedelta
from io import BytesIO
from pathlib import Path
from uuid import UUID, uuid4

import httpx
import jwt
import pytest
from PIL import Image
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.core.database import get_db_session
from app.core.providers.contracts import LLMResponse, LLMToolCall
from app.core.providers.mocks import MockLLMProvider
from app.core.storage import LocalPrivateObjectStorage, get_private_object_storage
from app.domains.inbody import router as inbody_router
from app.domains.inbody.repository import InBodyRepository
from app.domains.inbody.schemas import InBodyMeasurement, InBodyResult
from app.domains.inbody.service import InBodyService
from app.domains.training import router as training_router
from app.domains.training.models import WorkoutSessionRecord
from app.integrations.exercisedb.client import ExerciseDbClient
from app.integrations.exercises.provider import (
    ExerciseDetails,
    ExerciseSearchPage,
    MediaAccess,
)
from app.main import create_app

pytestmark = pytest.mark.skipif(
    not os.getenv("BONYAN_V2_TEST_DATABASE_URL"), reason="requires isolated PostgreSQL"
)


class JourneyCatalog:
    """Fixture identities and media remain in tests, never in the product catalog."""

    exercises = (
        ExerciseDetails(
            id="test-chest-press",
            name="Test chest press",
            muscles=("chest",),
            equipment=("machine",),
            difficulty="beginner",
            instructions=("Test form note",),
        ),
        ExerciseDetails(
            id="test-push-up",
            name="Test push-up",
            muscles=("chest",),
            equipment=("bodyweight",),
            difficulty="beginner",
            instructions=("Test form note",),
        ),
    )

    async def search_exercises(self, filters, *, page=1, page_size=20):
        return ExerciseSearchPage(items=self.exercises, page=page, page_size=page_size)

    async def get_exercise(self, exercise_id):
        return next(item for item in self.exercises if item.id == exercise_id)

    async def get_media_access(self, exercise_id, *, user_id):
        return MediaAccess(url=f"https://example.invalid/test-media/{exercise_id}")


class JourneyOcr:
    async def extract(self, **kwargs):
        return InBodyResult(
            measurements=[
                InBodyMeasurement(key="height", value=178, unit="cm"),
                InBodyMeasurement(key="weight", value=82, unit="kg"),
                InBodyMeasurement(key="body_fat_percentage", value=18, unit="%"),
            ]
        )


class JourneyCoach:
    def __init__(self):
        self.session_id = None

    async def complete(self, request):
        if not request.tool_results:
            assert self.session_id in request.prompt
            return LLMResponse(
                text="",
                model="test",
                tool_calls=(
                    LLMToolCall(
                        call_id="preview-test",
                        name="preview_session_substitution",
                        arguments={
                            "session_id": self.session_id,
                            "prescription_index": 0,
                            "scope": "session",
                            "reason": "busy_today",
                            "unavailable_equipment": ["machine"],
                        },
                    ),
                ),
            )
        return LLMResponse(
            text="الجهاز مشغول النهارده؟ ده بديل مناسب. راجع الاقتراح وأكده بنفسك."
            if "only in natural Egyptian Arabic" in request.prompt
            else "The machine is busy today. Review this alternative and approve it explicitly.",
            model="test",
        )


@pytest.mark.parametrize("locale", ["en", "ar-EG"])
def test_authenticated_measurement_workout_coach_game_and_privacy_journey(
    locale,
    monkeypatch,
    tmp_path: Path,
):
    asyncio.run(_journey(locale, monkeypatch, tmp_path))


async def _journey(locale, monkeypatch, tmp_path):
    engine = create_async_engine(os.environ["BONYAN_V2_TEST_DATABASE_URL"])
    factory = async_sessionmaker(engine, expire_on_commit=False)
    settings = get_settings().model_copy(
        update={
            "api_env": "test",
            "chat_provider": "mock",
            "avatar_provider": "mock",
            "avatar_model": "TBD",
            "avatar_generation_enabled": True,
            "email_provider": "console",
        }
    )
    storage = LocalPrivateObjectStorage(tmp_path)
    coach = JourneyCoach()
    app = create_app()

    async def db_session():
        async with factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    from typing import Annotated

    from fastapi import Depends
    from sqlalchemy.ext.asyncio import AsyncSession

    async def isolated_inbody(session: Annotated[AsyncSession, Depends(get_db_session)]):
        return InBodyService(InBodyRepository(session), storage, JourneyOcr())

    app.dependency_overrides[get_db_session] = db_session
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[get_private_object_storage] = lambda: storage
    app.dependency_overrides[inbody_router.get_inbody_service] = isolated_inbody
    monkeypatch.setattr(training_router, "get_exercise_provider", lambda _: JourneyCatalog())
    monkeypatch.setattr(training_router, "get_llm_provider", lambda _: coach)
    from app.domains.nutrition import router as nutrition_router

    monkeypatch.setattr(nutrition_router, "_provider", lambda _: MockLLMProvider())

    image = BytesIO()
    Image.new("RGB", (320, 480), color=(120, 90, 60)).save(image, "JPEG")
    payload = image.getvalue()
    headers_to_cleanup = []
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app, client=(f"v2-{uuid4().hex}", 123)),
            base_url="http://test",
        ) as client:

            async def call(method, path, headers=None, expected=200, **kwargs):
                __tracebackhide__ = True  # Never include authentication headers in failures.
                response = await client.request(method, "/api/v1" + path, headers=headers, **kwargs)
                assert response.status_code == expected, (method, path, response.status_code)
                return response.json() if response.content else None

            async def account():
                credentials = {
                    "email": f"v2-{uuid4().hex}@example.com",
                    "password": "Synthetic-V2-Test-Password!",
                }
                challenge = await call("POST", "/auth/register", expected=202, json=credentials)
                await call(
                    "POST",
                    "/auth/verify-email",
                    expected=201,
                    json={
                        "challenge_id": challenge["challenge_id"],
                        "code": settings.email_console_code.get_secret_value(),
                    },
                )
                token = await call("POST", "/auth/login", json=credentials)
                headers = {"Authorization": "Bearer " + token["access_token"]}
                headers_to_cleanup.append(headers)
                return headers

            owner, other = await account(), await account()
            for private in ("/game/overview", "/game/league", "/avatars", "/users/me/privacy"):
                await call("GET", private, expected=401)
            await call(
                "PATCH",
                "/me",
                owner,
                json={
                    "display_name": "Private journey owner",
                    "preferred_language": locale,
                    "preferred_units": "imperial",
                    "timezone": "Africa/Cairo",
                    "training_goal": "general_fitness",
                    "experience_level": "beginner",
                    "available_training_days": 3,
                    "available_equipment": ["machine", "bodyweight"],
                    "height_cm": 178,
                    "onboarding_completed": True,
                    "coaching": {"pushups": 5, "pushups_target": 10},
                },
            )
            assert (await call("GET", "/avatars/measurement-status", owner))["available"] is False
            upload = await call(
                "POST",
                "/inbody/scans",
                owner,
                expected=201,
                files={"report": ("synthetic-report.jpg", payload, "image/jpeg")},
            )
            scan = upload["scan"]
            assert scan["status"] == "review_required"
            assert (await call("GET", "/avatars/measurement-status", owner))["available"] is False
            scan_path = f"/inbody/scans/{scan['id']}"
            await call("GET", scan_path, other, expected=404)
            scan = await call(
                "PATCH",
                scan_path + "/review",
                owner,
                json={
                    "expected_version": scan["result"]["measurement_version"],
                    "measurements": scan["result"]["measurements"],
                    "device_label": "Synthetic test device",
                    "scan_date": datetime.now(UTC).date().isoformat(),
                },
            )
            scan = await call("POST", scan_path + "/confirm", owner)
            assert scan["status"] == "confirmed"
            before_game = await call("GET", "/game/overview", owner)
            assert before_game["xp"] == 0
            await call(
                "POST",
                "/avatars/source-photos",
                owner,
                expected=409,
                data={"processing_consent": "false"},
                files={"photo": ("synthetic-source.jpg", payload, "image/jpeg")},
            )
            photo = await call(
                "POST",
                "/avatars/source-photos",
                owner,
                expected=201,
                data={"processing_consent": "true"},
                files={"photo": ("synthetic-source.jpg", payload, "image/jpeg")},
            )
            avatar = await call(
                "POST",
                "/avatars",
                owner,
                expected=201,
                json={"style": "cinematic_3d", "source_photo_id": photo["id"]},
            )
            assert avatar["development_mock"] is True and not avatar["public_in_community"]
            assert "weight_kg" not in avatar["measurement_snapshot"]
            assert avatar["measurement_snapshot"]["device_label"] == "Synthetic test device"
            await call("GET", f"/avatars/{avatar['id']}", other, expected=404)
            assert (await call("GET", "/game/overview", owner))["xp"] == 0
            plan = await call(
                "POST",
                "/training/plans/manual",
                owner,
                expected=201,
                json={
                    "name": "Synthetic journey plan",
                    "goal": "strength",
                    "experience": "beginner",
                    "activate": False,
                    "exercises": [
                        {
                            "exercise_id": "test-chest-press",
                            "sets": 3,
                            "reps_min": 8,
                            "reps_max": 12,
                            "rest_seconds": 90,
                        }
                    ],
                },
            )
            plan = await call("POST", f"/training/plans/{plan['id']}/activate", owner)
            session = await call(
                "POST",
                "/training/sessions",
                owner,
                expected=201,
                params={"plan_id": plan["id"], "day_key": plan["days"][0]["key"]},
            )
            session_path = f"/training/sessions/{session['id']}"
            await call("GET", "/training/exercises/test-chest-press/media", owner)
            await call(
                "POST",
                session_path + "/sets",
                owner,
                json={
                    "prescription_index": 0,
                    "set_number": 1,
                    "reps": 10,
                    "weight_kg": 20,
                    "completed": True,
                },
            )
            coach.session_id = session["id"]
            saved_plan = await call("GET", f"/training/plans/{plan['id']}", owner)
            reply = await call(
                "POST",
                "/training/coach",
                owner,
                json={
                    "message": "الجهاز مشغول النهارده، أبدله بإيه؟"
                    if locale == "ar-EG"
                    else "The machine is busy today; what can replace it?",
                },
            )
            assert bool(any("\u0600" <= c <= "\u06ff" for c in reply["response"])) == (
                locale == "ar-EG"
            )
            proposal = reply["tool_results"][0]["result"]["proposal"]
            assert proposal["candidate"]["exercise_id"] == "test-push-up"
            current = await call("GET", session_path, owner)
            assert (
                current["prescription_snapshot"]["prescriptions"][0]["exercise_id"]
                == "test-chest-press"
            )
            approval_path = f"/training/substitution-proposals/{proposal['id']}/approve"
            approval_body = {
                "idempotency_key": uuid4().hex,
                "expected_version": proposal["expected_version"],
                "acknowledge_logged_sets": True,
            }
            await call("POST", approval_path, other, expected=404, json=approval_body)
            approved = await call("POST", approval_path, owner, json=approval_body)
            retried = await call("POST", approval_path, owner, json=approval_body)
            assert approved["event_id"] == retried["event_id"]
            assert (
                approved["session"]["prescription_snapshot"]["prescriptions"][0]["exercise_id"]
                == "test-push-up"
            )
            assert approved["session"]["logged_sets"][0]["exercise_id"] == "test-chest-press"
            assert await call("GET", f"/training/plans/{plan['id']}", owner) == saved_plan
            # Saved sessions remain usable when the live catalog is disabled or unavailable.
            monkeypatch.setattr(
                training_router, "get_exercise_provider", lambda _: ExerciseDbClient(enabled=False)
            )
            for set_number in (2, 3):
                await call(
                    "POST",
                    session_path + "/sets",
                    owner,
                    json={
                        "prescription_index": 0,
                        "set_number": set_number,
                        "reps": 10,
                        "weight_kg": 0,
                        "completed": True,
                    },
                )
            # Advance the fixture's persisted server start, never a client/device clock.
            async with factory.begin() as db:
                record = await db.get(WorkoutSessionRecord, UUID(session["id"]))
                record.started_at = datetime.now(UTC) - timedelta(minutes=3)
            await call("POST", session_path + "/complete", owner)
            await call("POST", session_path + "/complete", owner)
            game = await call("GET", "/game/overview", owner)
            assert game["xp"] == 20 and game["missions"][0]["completed"] == 1
            estimate = await call(
                "POST", "/nutrition/preview", owner, json={"description": "Synthetic meal"}
            )
            await call(
                "POST",
                "/nutrition/confirm",
                owner,
                expected=201,
                json={**estimate, "description": "Synthetic meal"},
            )
            game = await call("GET", "/game/overview", owner)
            assert game["xp"] == 25
            league = await call("PUT", "/game/league/participation", owner, json={"enabled": True})
            assert league["opted_in"] is True
            assert all(item["avatar_url"] is None for item in league["participants"])
            assert (
                next(item for item in league["participants"] if item["is_me"])["display_name"]
                == "BONYAN member"
            )
            post = await call(
                "POST",
                "/community/posts",
                owner,
                expected=201,
                json={"caption": "Synthetic consistency milestone"},
            )
            feed = await call("GET", "/community/feed", other)
            assert any(item["id"] == post["id"] for item in feed["items"])
            await call("PUT", "/users/me/privacy", owner, json={"posts": False})
            assert all(
                item["id"] != post["id"]
                for item in (await call("GET", "/community/feed", other))["items"]
            )
            exported = await call("GET", "/users/me/export", owner)
            assert exported["avatar_versions"] and exported["game_events"]
            await call("DELETE", "/me", owner, expected=204)
            headers_to_cleanup.remove(owner)
            await call("GET", "/me", owner, expected=401)
            async with factory() as db:
                subject = jwt.decode(
                    owner["Authorization"].split()[1], options={"verify_signature": False}
                )["sub"]
                assert (
                    await db.scalar(
                        select(WorkoutSessionRecord.id).where(
                            WorkoutSessionRecord.owner_id == subject
                        )
                    )
                    is None
                )
            for headers in headers_to_cleanup:
                await call("DELETE", "/me", headers, expected=204)
            headers_to_cleanup.clear()
    finally:
        # All cleanup remains owner-scoped, including when an assertion fails.
        if headers_to_cleanup:
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app), base_url="http://test"
            ) as client:
                for headers in headers_to_cleanup:
                    await client.delete("/api/v1/me", headers=headers)
        await engine.dispose()
