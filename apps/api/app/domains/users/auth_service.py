from __future__ import annotations

from dataclasses import dataclass
from uuid import uuid4

from fastapi import status

from app.core.auth import create_access_token
from app.core.config import Settings
from app.core.errors import AppError
from app.core.passwords import PasswordHasher
from app.domains.users.repository import AccountRepository
from app.domains.users.schemas import AccessTokenView, AuthCredentials


@dataclass(slots=True)
class AuthService:
    repository: AccountRepository
    password_hasher: PasswordHasher
    settings: Settings

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
