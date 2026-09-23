from __future__ import annotations

import asyncio
import logging

import pytest

from app.core.config import Settings
from app.core.passwords import PasswordHasher
from app.domains.users.auth_service import AuthService
from app.domains.users.email_verification import VerificationEmailSender
from app.domains.users.schemas import AuthCredentials

TEST_SECRET = "email-sender-test-secret-at-least-32-bytes"


class CaptureEmailSender:
    def __init__(self) -> None:
        self.code = ""

    async def send(self, email: str, code: str) -> None:
        del email
        self.code = code


class RegistrationRepository:
    def __init__(self) -> None:
        self.challenge = None

    async def get_by_email(self, email: str):
        del email

    async def create_verification(self, challenge):
        self.challenge = challenge
        return challenge


def test_console_email_sender_does_not_log_email_or_code(
    caplog: pytest.LogCaptureFixture,
) -> None:
    settings = Settings(
        auth_jwt_secret=TEST_SECRET,
        email_provider="console",
        email_console_code="654321",
    )

    with caplog.at_level(logging.INFO, logger="bonyan.email"):
        asyncio.run(
            VerificationEmailSender(settings).send("private@example.com", "654321")
        )

    assert "private@example.com" not in caplog.text
    assert "654321" not in caplog.text
    assert "development_email_verification_requested" in caplog.text


def test_console_registration_uses_configured_local_code() -> None:
    async def scenario() -> None:
        sender = CaptureEmailSender()
        service = AuthService(
            RegistrationRepository(),  # type: ignore[arg-type]
            PasswordHasher(),
            Settings(
                auth_jwt_secret=TEST_SECRET,
                email_provider="console",
                email_console_code="654321",
            ),
            sender,  # type: ignore[arg-type]
        )
        await service.start_email_registration(
            AuthCredentials(
                email="local@example.com",
                password="long-test-password",
            )
        )

        assert sender.code == "654321"

    asyncio.run(scenario())
