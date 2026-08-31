from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Annotated, Protocol

import jwt
from fastapi import Depends, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.database import get_db_session
from app.core.errors import AppError
from app.domains.users.models import UserAccount


@dataclass(frozen=True)
class CurrentUser:
    id: str


class AccessTokenVerifier(Protocol):
    def verify(self, token: str) -> CurrentUser: ...


class JwtAccessTokenVerifier:
    def __init__(self, settings: Settings) -> None:
        self.secret = (
            settings.auth_jwt_secret.get_secret_value() if settings.auth_jwt_secret else None
        )
        self.issuer = settings.auth_jwt_issuer
        self.audience = settings.auth_jwt_audience

    def verify(self, token: str) -> CurrentUser:
        if not self.secret:
            raise AppError(
                "auth_not_configured",
                "Authentication is temporarily unavailable.",
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        try:
            claims = jwt.decode(
                token,
                self.secret,
                algorithms=["HS256"],
                audience=self.audience,
                issuer=self.issuer,
                options={"require": ["exp", "iat", "sub"]},
            )
        except InvalidTokenError as exc:
            raise AppError(
                "unauthorized",
                "Sign in to continue.",
                status.HTTP_401_UNAUTHORIZED,
            ) from exc

        subject = claims.get("sub")
        if not isinstance(subject, str) or not subject.strip() or len(subject) > 120:
            raise AppError(
                "unauthorized",
                "Sign in to continue.",
                status.HTTP_401_UNAUTHORIZED,
            )
        return CurrentUser(id=subject)


def create_access_token(user_id: str, settings: Settings) -> tuple[str, int]:
    if not settings.auth_jwt_secret:
        raise AppError(
            "auth_not_configured",
            "Authentication is temporarily unavailable.",
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    now = datetime.now(UTC)
    expires_in = timedelta(minutes=settings.auth_access_token_minutes)
    token = jwt.encode(
        {
            "aud": settings.auth_jwt_audience,
            "exp": now + expires_in,
            "iat": now,
            "iss": settings.auth_jwt_issuer,
            "sub": user_id,
        },
        settings.auth_jwt_secret.get_secret_value(),
        algorithm="HS256",
    )
    return token, int(expires_in.total_seconds())


def get_access_token_verifier(
    settings: Annotated[Settings, Depends(get_settings)],
) -> AccessTokenVerifier:
    return JwtAccessTokenVerifier(settings)


bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Security(bearer_scheme)],
    verifier: Annotated[AccessTokenVerifier, Depends(get_access_token_verifier)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> CurrentUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AppError(
            "unauthorized",
            "Sign in to continue.",
            status.HTTP_401_UNAUTHORIZED,
        )
    current_user = verifier.verify(credentials.credentials)
    account_id = await session.scalar(
        select(UserAccount.id).where(UserAccount.id == current_user.id)
    )
    if account_id is None:
        raise AppError(
            "unauthorized",
            "Sign in to continue.",
            status.HTTP_401_UNAUTHORIZED,
        )
    return current_user


CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]
