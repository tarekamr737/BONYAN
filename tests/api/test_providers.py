from __future__ import annotations

import asyncio

from app.core.providers.contracts import AvatarRequest, LLMRequest
from app.core.providers.mocks import MockAvatarProvider, MockLLMProvider


def test_mock_llm_provider_is_deterministic_without_credentials() -> None:
    response = asyncio.run(MockLLMProvider().complete(LLMRequest(prompt="hello")))

    assert response.text == "Mock response: BONYAN processed the validated training context."
    assert response.model == "TBD"


def test_mock_avatar_provider_returns_local_image_bytes() -> None:
    result = asyncio.run(MockAvatarProvider().generate(AvatarRequest(prompt="athlete")))

    assert result.content.startswith(b"<svg")
    assert result.media_type == "image/svg+xml"
    assert result.model == "TBD"
