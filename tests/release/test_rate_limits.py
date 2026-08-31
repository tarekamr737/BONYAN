from __future__ import annotations

import asyncio

import pytest

from app.core.errors import AppError
from app.core.rate_limit import FixedWindowRateLimiter


def test_rate_limit_returns_consistent_safe_429() -> None:
    async def exercise() -> None:
        limiter = FixedWindowRateLimiter()
        await limiter.enforce(key="login:ip:test", limit=2)
        await limiter.enforce(key="login:ip:test", limit=2)

        with pytest.raises(AppError) as raised:
            await limiter.enforce(key="login:ip:test", limit=2)

        assert raised.value.status_code == 429
        assert raised.value.code == "rate_limited"
        assert raised.value.message == "Too many requests. Please try again later."

    asyncio.run(exercise())


def test_rate_limit_categories_do_not_consume_each_others_budget() -> None:
    async def exercise() -> None:
        limiter = FixedWindowRateLimiter()
        await limiter.enforce(key="ocr:token:test", limit=1)
        await limiter.enforce(key="coach:token:test", limit=1)

    asyncio.run(exercise())
