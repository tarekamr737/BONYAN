from __future__ import annotations

import asyncio
from types import SimpleNamespace

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient

from app.core.auth import JwtAccessTokenVerifier
from app.core.config import Settings
from app.core.errors import AppError
from app.core.passwords import PasswordHasher
from app.domains.users.auth_service import AuthService
from app.domains.users.router import get_auth_service
from app.domains.users.schemas import (
    AuthCredentials,
    EmailVerificationRequest,
    GoogleTokenRequest,
)
from app.main import create_app

TEST_SECRET = "account-auth-test-secret-at-least-32-bytes"


class FakeAccountRepository:
    def __init__(self) -> None:
        self.accounts: dict[str, SimpleNamespace] = {}
        self.verifications: dict[str, SimpleNamespace] = {}

    async def create(self, account_id: str, email: str, password_hash: str):
        if email in self.accounts:
            return None
        account = SimpleNamespace(id=account_id, email=email, password_hash=password_hash)
        self.accounts[email] = account
        return account

    async def get_by_email(self, email: str):
        return self.accounts.get(email)

    async def create_verification(self, challenge):
        self.verifications = {
            key: value
            for key, value in self.verifications.items()
            if value.email != challenge.email
        }
        self.verifications[challenge.id] = challenge
        return challenge

    async def get_verification(self, challenge_id: str):
        return self.verifications.get(challenge_id)

    async def record_failed_verification(self, challenge_id: str) -> None:
        self.verifications[challenge_id].attempts += 1

    async def delete_verification(self, challenge_id: str) -> None:
        self.verifications.pop(challenge_id, None)


class FakeEmailSender:
    def __init__(self) -> None:
        self.code = ""
        self.email = ""

    async def send(self, email: str, code: str) -> None:
        self.email = email
        self.code = code


def make_service(
    repository: FakeAccountRepository | None = None,
    email_sender: FakeEmailSender | None = None,
) -> AuthService:
    settings = Settings(
        auth_jwt_secret=TEST_SECRET,
        auth_jwt_issuer="bonyan-test",
        auth_jwt_audience="bonyan-api-test",
    )
    return AuthService(
        repository or FakeAccountRepository(),
        PasswordHasher(),
        settings,
        email_sender,
    )


def test_register_and_login_issue_server_trusted_identity() -> None:
    async def scenario() -> None:
        service = make_service()
        credentials = AuthCredentials(email=" PERSON@Example.com ", password="long-test-password")

        registered = await service.register(credentials)
        logged_in = await service.login(credentials)

        verifier = JwtAccessTokenVerifier(service.settings)
        registered_user = verifier.verify(registered.access_token)
        logged_in_user = verifier.verify(logged_in.access_token)
        assert registered_user.id == logged_in_user.id
        assert registered.token_type == "bearer"
        assert credentials.password.get_secret_value() not in registered.access_token

    asyncio.run(scenario())


def test_duplicate_account_and_wrong_password_are_rejected_safely() -> None:
    async def scenario() -> None:
        service = make_service()
        credentials = AuthCredentials(email="person@example.com", password="long-test-password")
        await service.register(credentials)

        with pytest.raises(AppError) as duplicate:
            await service.register(credentials)
        with pytest.raises(AppError) as invalid:
            await service.login(
                AuthCredentials(email="person@example.com", password="wrong-password-value")
            )

        assert duplicate.value.status_code == status.HTTP_409_CONFLICT
        assert invalid.value.code == "invalid_credentials"
        assert invalid.value.status_code == status.HTTP_401_UNAUTHORIZED

    asyncio.run(scenario())


def test_registration_route_is_public_and_never_returns_password_data() -> None:
    async def scenario() -> None:
        app = create_app()
        sender = FakeEmailSender()
        app.dependency_overrides[get_auth_service] = lambda: make_service(
            email_sender=sender
        )
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/auth/register",
                json={"email": "person@example.com", "password": "long-test-password"},
            )

        assert response.status_code == status.HTTP_202_ACCEPTED
        assert set(response.json()) == {"challenge_id", "expires_in"}
        assert sender.email == "person@example.com"
        assert len(sender.code) == 6

    asyncio.run(scenario())


def test_email_registration_requires_the_one_time_code() -> None:
    async def scenario() -> None:
        repository = FakeAccountRepository()
        sender = FakeEmailSender()
        service = make_service(repository, sender)
        credentials = AuthCredentials(
            email="person@example.com", password="long-test-password"
        )

        started = await service.start_email_registration(credentials)
        wrong_code = "000000" if sender.code != "000000" else "000001"
        with pytest.raises(AppError) as invalid:
            await service.verify_email_registration(
                EmailVerificationRequest(challenge_id=started.challenge_id, code=wrong_code)
            )
        verified = await service.verify_email_registration(
            EmailVerificationRequest(challenge_id=started.challenge_id, code=sender.code)
        )

        assert invalid.value.code == "invalid_verification_code"
        assert repository.verifications == {}
        assert JwtAccessTokenVerifier(service.settings).verify(verified.access_token).id

    asyncio.run(scenario())


def test_google_login_accepts_only_a_verified_provider_email(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def scenario() -> None:
        repository = FakeAccountRepository()
        service = make_service(repository)
        monkeypatch.setattr(
            AuthService,
            "_verify_google_token",
            lambda self, token: {
                "aud": "google-client",
                "email": "person@gmail.com",
                "email_verified": True,
            },
        )

        session = await service.login_with_google(GoogleTokenRequest(id_token="x" * 40))

        assert "person@gmail.com" in repository.accounts
        assert JwtAccessTokenVerifier(service.settings).verify(session.access_token).id

    asyncio.run(scenario())
