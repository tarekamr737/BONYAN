from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode
from urllib.request import urlopen
from uuid import uuid4

from fastapi import status

from app.core.auth import create_access_token
from app.core.config import Settings
from app.core.errors import AppError
from app.core.passwords import PasswordHasher
from app.domains.users.email_verification import VerificationEmailSender
from app.domains.users.models import EmailVerificationChallenge
from app.domains.users.repository import AccountRepository
from app.domains.users.schemas import (
    AccessTokenView,
    AuthCredentials,
    EmailRegistrationStarted,
    EmailVerificationRequest,
    GoogleTokenRequest,
)


@dataclass(slots=True)
class AuthService:
    repository: AccountRepository
    password_hasher: PasswordHasher
    settings: Settings
    email_sender: VerificationEmailSender | None = None

    async def register(self, credentials: AuthCredentials) -> AccessTokenView:
        password_hash = await self.password_hasher.hash(credentials.password.get_secret_value())
        account = await self.repository.create(str(uuid4()), credentials.email, password_hash)
        if account is None:
            raise AppError(
                "account_exists",
                "An account with this email already exists.",
                status.HTTP_409_CONFLICT,
            )
        return self._token(account.id)

    async def start_email_registration(
        self, credentials: AuthCredentials
    ) -> EmailRegistrationStarted:
        if await self.repository.get_by_email(credentials.email) is not None:
            raise AppError(
                "account_exists",
                "An account with this email already exists.",
                status.HTTP_409_CONFLICT,
            )
        challenge_id = str(uuid4())
        code = f"{secrets.randbelow(1_000_000):06d}"
        password_hash = await self.password_hasher.hash(credentials.password.get_secret_value())
        challenge = EmailVerificationChallenge(
            id=challenge_id,
            email=credentials.email,
            password_hash=password_hash,
            code_digest=self._code_digest(challenge_id, code),
            attempts=0,
            expires_at=datetime.now(UTC)
            + timedelta(minutes=self.settings.email_verification_minutes),
        )
        await self.repository.create_verification(challenge)
        sender = self.email_sender or VerificationEmailSender(self.settings)
        await sender.send(credentials.email, code)
        return EmailRegistrationStarted(
            challenge_id=challenge_id,
            expires_in=self.settings.email_verification_minutes * 60,
        )

    async def verify_email_registration(
        self, request: EmailVerificationRequest
    ) -> AccessTokenView:
        challenge = await self.repository.get_verification(request.challenge_id)
        now = datetime.now(UTC)
        if challenge is None or challenge.expires_at <= now or challenge.attempts >= 5:
            raise AppError(
                "verification_expired",
                "The verification code expired. Request a new code.",
                status.HTTP_410_GONE,
            )
        expected = self._code_digest(challenge.id, request.code)
        if not hmac.compare_digest(expected, challenge.code_digest):
            await self.repository.record_failed_verification(challenge.id)
            raise AppError(
                "invalid_verification_code",
                "The verification code is incorrect.",
                status.HTTP_400_BAD_REQUEST,
            )
        account = await self.repository.create(
            str(uuid4()), challenge.email, challenge.password_hash
        )
        await self.repository.delete_verification(challenge.id)
        if account is None:
            raise AppError(
                "account_exists",
                "An account with this email already exists.",
                status.HTTP_409_CONFLICT,
            )
        return self._token(account.id)

    async def login_with_google(self, request: GoogleTokenRequest) -> AccessTokenView:
        profile = await asyncio.to_thread(self._verify_google_token, request.id_token)
        email = str(profile.get("email", "")).strip().lower()
        if profile.get("email_verified") not in {True, "true"} or not email:
            raise AppError("google_email_unverified", "Google email is not verified.", 401)
        account = await self.repository.get_by_email(email)
        if account is None:
            unusable_password = await self.password_hasher.hash(secrets.token_urlsafe(32))
            account = await self.repository.create(str(uuid4()), email, unusable_password)
        if account is None:
            account = await self.repository.get_by_email(email)
        if account is None:
            raise AppError("google_login_failed", "Google sign-in failed.", 401)
        return self._token(account.id)

    async def login(self, credentials: AuthCredentials) -> AccessTokenView:
        account = await self.repository.get_by_email(credentials.email)
        password = credentials.password.get_secret_value()
        if account is None:
            await self.password_hasher.hash(password)
            password_matches = False
        else:
            password_matches = await self.password_hasher.verify(password, account.password_hash)
        if not password_matches:
            raise AppError(
                "invalid_credentials",
                "Email or password is incorrect.",
                status.HTTP_401_UNAUTHORIZED,
            )
        return self._token(account.id)

    def _token(self, account_id: str) -> AccessTokenView:
        token, expires_in = create_access_token(account_id, self.settings)
        return AccessTokenView(access_token=token, expires_in=expires_in)

    def _code_digest(self, challenge_id: str, code: str) -> str:
        secret = self.settings.auth_jwt_secret
        if secret is None:
            raise AppError("auth_unavailable", "Authentication is unavailable.", 503)
        value = f"{challenge_id}:{code}".encode()
        return hmac.new(secret.get_secret_value().encode(), value, hashlib.sha256).hexdigest()

    def _verify_google_token(self, id_token: str) -> dict[str, object]:
        if not self.settings.google_oauth_client_ids:
            raise AppError("google_not_configured", "Google sign-in is not configured.", 503)
        try:
            with urlopen(  # noqa: S310
                "https://oauth2.googleapis.com/tokeninfo?" + urlencode({"id_token": id_token}),
                timeout=10,
            ) as response:
                profile = json.loads(response.read(128 * 1024))
        except (OSError, ValueError) as exc:
            raise AppError(
                "invalid_google_token", "Google sign-in could not be verified.", 401
            ) from exc
        if profile.get("aud") not in self.settings.google_oauth_client_ids:
            raise AppError("invalid_google_token", "Google sign-in could not be verified.", 401)
        return profile
