from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated, Protocol

import jwt
from fastapi import Depends, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError

from app.core.config import Settings, get_settings
from app.core.errors import AppError


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


def get_access_token_verifier(
    settings: Annotated[Settings, Depends(get_settings)],
) -> AccessTokenVerifier:
    return JwtAccessTokenVerifier(settings)


bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Security(bearer_scheme)],
    verifier: Annotated[AccessTokenVerifier, Depends(get_access_token_verifier)],
) -> CurrentUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AppError(
            "unauthorized",
            "Sign in to continue.",
            status.HTTP_401_UNAUTHORIZED,
        )
    return verifier.verify(credentials.credentials)


CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]
