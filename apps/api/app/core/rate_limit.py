from __future__ import annotations

import asyncio
from collections import defaultdict, deque
from collections.abc import Callable
from functools import lru_cache
from time import monotonic
from typing import Annotated, Literal

from fastapi import Depends, Request, status

from app.core.auth import CurrentUserDep
from app.core.config import Settings, get_settings
from app.core.errors import AppError

RateLimitCategory = Literal["register", "login", "ocr", "coach", "avatar", "media_token"]


class FixedWindowRateLimiter:
    def __init__(self) -> None:
        self._requests: dict[str, deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def enforce(self, *, key: str, limit: int, window_seconds: int = 60) -> None:
        now = monotonic()
        cutoff = now - window_seconds
        async with self._lock:
            requests = self._requests[key]
            while requests and requests[0] <= cutoff:
                requests.popleft()
            if len(requests) >= limit:
                raise AppError(
                    "rate_limited",
                    "Too many requests. Please try again later.",
                    status.HTTP_429_TOO_MANY_REQUESTS,
                )
            requests.append(now)

    def reset(self) -> None:
        self._requests.clear()


@lru_cache
def get_rate_limiter() -> FixedWindowRateLimiter:
    return FixedWindowRateLimiter()


def _public_caller_key(request: Request) -> str:
    host = request.client.host if request.client else "unknown"
    return f"ip:{host}"


def public_rate_limit_dependency(
    category: RateLimitCategory,
    limit_attribute: str,
) -> Callable[..., object]:
    async def enforce(
        request: Request,
        settings: Annotated[Settings, Depends(get_settings)],
        limiter: Annotated[FixedWindowRateLimiter, Depends(get_rate_limiter)],
    ) -> None:
        limit = getattr(settings, limit_attribute)
        await limiter.enforce(key=f"{category}:{_public_caller_key(request)}", limit=limit)

    return enforce


def authenticated_rate_limit_dependency(
    category: RateLimitCategory,
    limit_attribute: str,
) -> Callable[..., object]:
    async def enforce(
        current_user: CurrentUserDep,
        settings: Annotated[Settings, Depends(get_settings)],
        limiter: Annotated[FixedWindowRateLimiter, Depends(get_rate_limiter)],
    ) -> None:
        limit = getattr(settings, limit_attribute)
        await limiter.enforce(key=f"{category}:user:{current_user.id}", limit=limit)

    return enforce


limit_registration = public_rate_limit_dependency("register", "rate_limit_register_per_minute")
limit_login = public_rate_limit_dependency("login", "rate_limit_login_per_minute")
limit_ocr = authenticated_rate_limit_dependency("ocr", "rate_limit_ocr_per_minute")
limit_coach = authenticated_rate_limit_dependency("coach", "rate_limit_coach_per_minute")
limit_avatar = authenticated_rate_limit_dependency("avatar", "rate_limit_avatar_per_minute")
limit_media_token = authenticated_rate_limit_dependency(
    "media_token", "rate_limit_media_token_per_minute"
)
