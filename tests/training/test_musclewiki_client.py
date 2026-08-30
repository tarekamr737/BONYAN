from __future__ import annotations

import asyncio
import base64
import json
import logging
import time
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import patch
from urllib.error import URLError

import jwt
import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import SecretStr

from app.core.config import get_settings
from app.core.errors import AppError
from app.domains.training.router import (
    get_musclewiki_media_relay,
    get_musclewiki_media_signer,
)
from app.integrations.musclewiki.cache import MetadataCache
from app.integrations.musclewiki.client import MuscleWikiClient
from app.integrations.musclewiki.errors import (
    MuscleWikiInvalidResponseError,
    MuscleWikiUnavailableError,
)
from app.integrations.musclewiki.media import (
    MediaRelayResponse,
    MuscleWikiMediaRegistry,
    MuscleWikiMediaRelay,
    MuscleWikiMediaSigner,
)
from app.integrations.musclewiki.provider import ExerciseDetails, ExerciseSearchFilters
from app.main import create_app


class FakeResponse:
    def __init__(self, payload: object) -> None:
        self.payload = payload

    def __enter__(self) -> FakeResponse:
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def read(self) -> bytes:
        return json.dumps(self.payload).encode("utf-8")


def run(coro):
    return asyncio.run(coro)


def settings(api_key: str | None = None) -> SimpleNamespace:
    return SimpleNamespace(
        api_public_url="https://api.bonyan.test",
        auth_jwt_secret=SecretStr("test-secret-that-is-at-least-32-bytes"),
        musclewiki_api_key=SecretStr(api_key) if api_key else None,
    )


def auth_token(subject: str = "user-1") -> str:
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "aud": "bonyan-api-test",
            "exp": now + timedelta(minutes=5),
            "iat": now,
            "iss": "bonyan-test",
            "sub": subject,
        },
        "test-secret-that-is-at-least-32-bytes",
        algorithm="HS256",
    )


def exercise_payload(exercise_id: str = "push-up") -> dict[str, object]:
    return {
        "difficulty": "beginner",
        "equipment": ["bodyweight"],
        "id": exercise_id,
        "muscles": ["chest"],
        "name": "Push Up",
        "video_url": "https://media.musclewiki.test/push-up.mp4",
    }


def search_payload(exercise_id: str = "push-up") -> dict[str, object]:
    return {
        "count": 12,
        "next": "https://api.musclewiki.com/exercises/?page=3",
        "results": [exercise_payload(exercise_id)],
    }


def test_filters_pagination_and_authorization_header_are_sent() -> None:
    requests = []

    def fake_urlopen(req, timeout: int):
        requests.append((req, timeout))
        return FakeResponse(search_payload())

    with patch("app.integrations.musclewiki.client.request.urlopen", fake_urlopen):
        client = MuscleWikiClient(settings=settings("secret-key"))
        page = run(
            client.search_exercises(
                ExerciseSearchFilters(
                    query="press",
                    muscles=("chest",),
                    equipment=("dumbbell",),
                    difficulty="beginner",
                ),
                page=2,
                page_size=7,
            )
        )

    request = requests[0][0]
    assert "page=2" in request.full_url
    assert "page_size=7" in request.full_url
    assert "search=press" in request.full_url
    assert "muscles=chest" in request.full_url
    assert "equipment=dumbbell" in request.full_url
    assert "difficulty=beginner" in request.full_url
    assert request.get_header("Authorization") == "Bearer secret-key"
    assert page.total == 12
    assert page.next_page == 3
    assert page.page == 2
    assert page.page_size == 7


def test_authorization_header_is_absent_without_key() -> None:
    requests = []

    def fake_urlopen(req, timeout: int):
        requests.append(req)
        return FakeResponse(search_payload())

    with patch("app.integrations.musclewiki.client.request.urlopen", fake_urlopen):
        run(
            MuscleWikiClient(settings=settings()).search_exercises(
                ExerciseSearchFilters()
            )
        )

    assert requests[0].get_header("Authorization") is None


def test_cache_maximum_size_eviction_and_expiry() -> None:
    cache = MetadataCache[ExerciseDetails](ttl=timedelta(milliseconds=20), max_items=2)
    first = ExerciseDetails("one", "One", ("chest",), ("bodyweight",), "beginner")
    second = ExerciseDetails("two", "Two", ("back",), ("dumbbell",), "beginner")
    third = ExerciseDetails("three", "Three", ("legs",), ("barbell",), "beginner")

    cache.set("one", first)
    cache.set("two", second)
    assert cache.get("one") == first
    cache.set("three", third)

    assert cache.get("two") is None
    assert cache.get("one") == first
    time.sleep(0.03)
    assert cache.get("one") is None


def test_media_access_uses_server_token_and_enforces_expiry() -> None:
    registry = MuscleWikiMediaRegistry()
    signer = MuscleWikiMediaSigner(b"s" * 32, registry)
    client = MuscleWikiClient(settings=settings(), media_signer=signer)

    with patch(
        "app.integrations.musclewiki.client.request.urlopen",
        return_value=FakeResponse(exercise_payload()),
    ):
        access = run(client.get_media_access("push-up", user_id="user-1"))

    assert access is not None
    assert access.url.startswith("https://api.bonyan.test/api/v1/training/media?token=")
    assert "media.musclewiki.test" not in access.url
    token = access.url.split("token=", 1)[1]
    encoded_payload = token.split(".", 1)[0]
    payload = json.loads(
        base64.urlsafe_b64decode(encoded_payload + "=" * (-len(encoded_payload) % 4))
    )
    assert "url" not in payload
    assert "media.musclewiki.test" not in json.dumps(payload)
    verified = signer.verify(token, user_id="user-1")
    assert verified.provider_url == "https://media.musclewiki.test/push-up.mp4"
    with pytest.raises(AppError):
        signer.verify(token, user_id="user-2")
    expired = signer.sign(
        provider_url="https://media.musclewiki.test/push-up.mp4",
        user_id="user-1",
        expires_in_seconds=-1,
    )
    with pytest.raises(AppError):
        signer.verify(expired, user_id="user-1")

    tampered = f"{token[:-1]}{'A' if token[-1] != 'A' else 'B'}"
    with pytest.raises(AppError):
        signer.verify(tampered, user_id="user-1")


def test_default_media_registry_is_shared_between_client_and_route_signers() -> None:
    issuer = MuscleWikiMediaSigner(b"shared-secret" * 3)
    verifier = MuscleWikiMediaSigner(b"shared-secret" * 3)
    token = issuer.sign(
        provider_url="https://media.musclewiki.test/push-up.mp4",
        user_id="user-1",
        expires_in_seconds=60,
    )

    verified = verifier.verify(token, user_id="user-1")

    assert verified.provider_url == "https://media.musclewiki.test/push-up.mp4"


def test_training_media_endpoint_requires_auth_and_enforces_token_expiry(
    monkeypatch,
) -> None:
    class FakeRelay:
        def __init__(self) -> None:
            self.calls: list[tuple[str, str | None]] = []

        def open(
            self, provider_url: str, *, range_header: str | None
        ) -> MediaRelayResponse:
            self.calls.append((provider_url, range_header))
            return MediaRelayResponse(
                body=iter([b"video-bytes"]),
                headers={
                    "Accept-Ranges": "bytes",
                    "Cache-Control": "private, no-store",
                    "Content-Range": "bytes 0-10/11",
                    "Content-Type": "video/mp4",
                },
                status_code=206,
            )

    async def scenario() -> None:
        monkeypatch.setenv("AUTH_JWT_SECRET", "test-secret-that-is-at-least-32-bytes")
        monkeypatch.setenv("AUTH_JWT_ISSUER", "bonyan-test")
        monkeypatch.setenv("AUTH_JWT_AUDIENCE", "bonyan-api-test")
        get_settings.cache_clear()
        app = create_app()
        registry = MuscleWikiMediaRegistry()
        signer = MuscleWikiMediaSigner(
            b"test-secret-that-is-at-least-32-bytes", registry
        )
        relay = FakeRelay()
        app.dependency_overrides[get_musclewiki_media_signer] = lambda: signer
        app.dependency_overrides[get_musclewiki_media_relay] = lambda: relay
        token = signer.sign(
            provider_url="https://media.musclewiki.test/push-up.mp4",
            user_id="user-1",
            expires_in_seconds=300,
        )
        expired = signer.sign(
            provider_url="https://media.musclewiki.test/push-up.mp4",
            user_id="user-1",
            expires_in_seconds=-1,
        )
        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport, base_url="http://test", follow_redirects=False
        ) as client:
            missing_auth = await client.get(f"/api/v1/training/media?token={token}")
            valid = await client.get(
                f"/api/v1/training/media?token={token}",
                headers={
                    "Authorization": f"Bearer {auth_token()}",
                    "Range": "bytes=0-10",
                },
            )
            expired_response = await client.get(
                f"/api/v1/training/media?token={expired}",
                headers={"Authorization": f"Bearer {auth_token()}"},
            )

        assert missing_auth.status_code == 401
        assert valid.status_code == 206
        assert valid.content == b"video-bytes"
        assert "location" not in valid.headers
        assert "media.musclewiki.test" not in valid.text
        assert valid.headers["cache-control"] == "private, no-store"
        assert valid.headers["content-range"] == "bytes 0-10/11"
        assert expired_response.status_code == 404
        assert relay.calls == [
            ("https://media.musclewiki.test/push-up.mp4", "bytes=0-10")
        ]
        app.dependency_overrides.clear()
        get_settings.cache_clear()

    asyncio.run(scenario())


def test_media_relay_streams_ranges_without_forwarding_credentials() -> None:
    class FakeMediaResponse:
        status = 206
        headers = {
            "Accept-Ranges": "bytes",
            "Content-Range": "bytes 0-4/5",
            "Content-Type": "video/mp4",
            "Set-Cookie": "must-not-leak=yes",
        }

        def __init__(self) -> None:
            self.closed = False
            self._chunks = iter([b"video", b""])

        def read(self, amount: int = -1) -> bytes:
            return next(self._chunks)

        def close(self) -> None:
            self.closed = True

    upstream = FakeMediaResponse()
    requests = []

    def fake_urlopen(req, timeout: int):
        requests.append((req, timeout))
        return upstream

    with patch("app.integrations.musclewiki.media.request.urlopen", fake_urlopen):
        response = MuscleWikiMediaRelay().open(
            "https://media.musclewiki.test/push-up.mp4",
            range_header="bytes=0-4",
        )
        assert b"".join(response.body) == b"video"

    assert requests[0][0].get_header("Range") == "bytes=0-4"
    assert requests[0][0].get_header("Authorization") is None
    assert response.status_code == 206
    assert response.headers["Content-Range"] == "bytes 0-4/5"
    assert response.headers["Cache-Control"] == "private, no-store"
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert "Set-Cookie" not in response.headers
    assert upstream.closed is True


def test_media_relay_rejects_invalid_range_before_provider_call() -> None:
    with patch("app.integrations.musclewiki.media.request.urlopen") as urlopen:
        with pytest.raises(AppError):
            MuscleWikiMediaRelay().open(
                "https://media.musclewiki.test/push-up.mp4",
                range_header="bytes=0-4,8-12",
            )
    urlopen.assert_not_called()


def test_media_relay_provider_outage_maps_to_safe_error() -> None:
    with patch(
        "app.integrations.musclewiki.media.request.urlopen",
        side_effect=URLError("offline"),
    ):
        with pytest.raises(AppError) as exc_info:
            MuscleWikiMediaRelay().open(
                "https://media.musclewiki.test/push-up.mp4", range_header=None
            )
    assert exc_info.value.status_code == 503


def test_media_relay_rejects_non_video_content() -> None:
    class HtmlResponse:
        status = 200
        headers = {"Content-Type": "text/html"}

        def __init__(self) -> None:
            self.closed = False

        def read(self, amount: int = -1) -> bytes:
            return b"<script>unsafe()</script>"

        def close(self) -> None:
            self.closed = True

    upstream = HtmlResponse()
    with patch(
        "app.integrations.musclewiki.media.request.urlopen", return_value=upstream
    ):
        with pytest.raises(AppError) as exc_info:
            MuscleWikiMediaRelay().open(
                "https://media.musclewiki.test/not-video", range_header=None
            )

    assert exc_info.value.status_code == 503
    assert upstream.closed is True


def test_malformed_provider_response_fails_safely() -> None:
    with patch(
        "app.integrations.musclewiki.client.request.urlopen",
        return_value=FakeResponse({"results": {"bad": "shape"}}),
    ):
        with pytest.raises(MuscleWikiInvalidResponseError):
            run(
                MuscleWikiClient(settings=settings()).search_exercises(
                    ExerciseSearchFilters()
                )
            )


def test_provider_outage_maps_to_safe_error() -> None:
    with patch(
        "app.integrations.musclewiki.client.request.urlopen",
        side_effect=URLError("offline"),
    ):
        with pytest.raises(MuscleWikiUnavailableError):
            run(
                MuscleWikiClient(settings=settings()).search_exercises(
                    ExerciseSearchFilters()
                )
            )


def test_permanent_credentials_never_appear_in_media_response_or_logs(caplog) -> None:
    caplog.set_level(logging.INFO)
    client = MuscleWikiClient(settings=settings("secret-key"))

    with patch(
        "app.integrations.musclewiki.client.request.urlopen",
        return_value=FakeResponse(exercise_payload()),
    ):
        access = run(client.get_media_access("push-up", user_id="user-1"))

    assert access is not None
    assert "secret-key" not in access.url
    assert "secret-key" not in caplog.text
