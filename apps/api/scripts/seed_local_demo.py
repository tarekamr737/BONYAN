"""Populate a local development API with two synthetic users and private avatars."""

from __future__ import annotations

import asyncio
import json
import os
import secrets
import sys
from datetime import datetime
from pathlib import Path
from urllib import parse, request

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.auth import create_access_token
from app.core.config import Settings
from app.domains.users.models import UserAccount

API_ROOT = "http://127.0.0.1:8000/api/v1"
DEMOS = (
    ("demo.men@bonyan.local", "Bonyan Demo Men", "male", "men", 178, 82, 18.5, 36.2),
    ("demo.women@bonyan.local", "Bonyan Demo Women", "female", "women", 165, 64, 26.0, 25.5),
)


def api_call(
    path: str, *, method: str = "GET", payload: dict | None = None, token: str | None = None
) -> dict | None:
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    if body is not None:
        headers["Content-Type"] = "application/json"
    outgoing = request.Request(API_ROOT + path, data=body, headers=headers, method=method)
    with request.urlopen(outgoing, timeout=15) as response:
        return None if response.status == 204 else json.load(response)


async def find_account_id(settings: Settings, email: str) -> str | None:
    engine = create_async_engine(settings.sqlalchemy_database_url)
    try:
        async with engine.connect() as connection:
            return await connection.scalar(select(UserAccount.id).where(UserAccount.email == email))
    finally:
        await engine.dispose()


def main() -> None:
    settings = Settings()
    if (
        settings.api_env != "development"
        or settings.email_provider != "console"
        or settings.avatar_provider != "mock"
        or parse.urlparse(settings.sqlalchemy_database_url).hostname
        not in {"localhost", "127.0.0.1", "::1"}
    ):
        raise RuntimeError(
            "Demo seeding requires a local development database, console email and mock avatars"
        )
    password = os.environ.get("BONYAN_DEMO_PASSWORD") or secrets.token_urlsafe(18)
    if len(password) < 12:
        raise RuntimeError("BONYAN_DEMO_PASSWORD must be at least 12 characters")
    newly_created: list[str] = []

    for email, name, sex, presentation, height, weight, fat, muscle in DEMOS:
        account_id = asyncio.run(find_account_id(settings, email))
        if account_id is None:
            challenge = api_call(
                "/auth/register", method="POST", payload={"email": email, "password": password}
            )
            assert challenge is not None
            api_call(
                "/auth/verify-email",
                method="POST",
                payload={
                    "challenge_id": challenge["challenge_id"],
                    "code": settings.email_console_code.get_secret_value(),
                },
            )
            account_id = asyncio.run(find_account_id(settings, email))
            if account_id is None:
                raise RuntimeError(f"Demo account was not created: {email}")
            newly_created.append(email)

        token, _ = create_access_token(account_id, settings)
        listing = api_call("/avatars", token=token)
        assert listing is not None
        matches = [item for item in listing["items"] if item["presentation"] == presentation]
        avatar = next((item for item in matches if item["state"] == "approved"), None)
        avatar = avatar or (matches[0] if matches else None)
        for duplicate in matches:
            if avatar is not None and duplicate["id"] == avatar["id"]:
                continue
            if duplicate["state"] != "ready_for_review" or duplicate["public_in_community"]:
                raise RuntimeError(f"Cannot clean an approved demo avatar for {email}")
            api_call(f"/avatars/{duplicate['id']}", method="DELETE", token=token)
        if avatar is None:
            api_call(
                "/me",
                method="PATCH",
                token=token,
                payload={
                    "display_name": name,
                    "sex": sex,
                    "onboarding_completed": True,
                    "height_cm": height,
                    "training_goal": "general_fitness",
                    "experience_level": "beginner",
                    "available_training_days": 3,
                    "available_equipment": ["bodyweight"],
                },
            )
            api_call(
                "/avatars/manual-measurements",
                method="PUT",
                token=token,
                payload={
                    "height_cm": height,
                    "weight_kg": weight,
                    "body_fat_percentage": fat,
                    "skeletal_muscle_mass_kg": muscle,
                },
            )
            avatar = api_call(
                "/avatars",
                method="POST",
                token=token,
                payload={"style": "photo_measured", "presentation": presentation},
            )
        elif avatar["state"] == "ready_for_review":
            status = api_call(
                f"/avatars/measurement-status?presentation={presentation}", token=token
            )
            assert status is not None
            measured_at = status.get("recorded_at")
            if measured_at and datetime.fromisoformat(measured_at) > datetime.fromisoformat(
                avatar["measurements_recorded_at"]
            ):
                avatar = api_call(f"/avatars/{avatar['id']}/regenerate", method="POST", token=token)
        if (
            avatar is None
            or avatar["state"] not in {"ready_for_review", "approved"}
            or not avatar["preview_url"]
        ):
            raise RuntimeError(f"Private demo avatar is unavailable for {email}")
        asset_path = parse.urlparse(avatar["preview_url"]).path
        with request.urlopen("http://127.0.0.1:8000" + asset_path, timeout=15) as response:
            if response.status != 200 or response.headers.get("Content-Type") != "image/png":
                raise RuntimeError(f"Private demo image is unavailable for {email}")
        print(f"{email}: profile and private avatar ready", flush=True)

    if newly_created:
        print("New demo account password: " + password, flush=True)


if __name__ == "__main__":
    main()
