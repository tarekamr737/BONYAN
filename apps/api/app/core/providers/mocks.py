from __future__ import annotations

from app.core.providers.contracts import (
    AvatarRequest,
    AvatarResult,
    LLMRequest,
    LLMResponse,
)

_MOCK_AVATAR = b"""<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
<rect width="64" height="64" fill="#151515"/>
<circle cx="32" cy="25" r="12" fill="#C8A86B"/>
<path d="M12 62c2-16 11-24 20-24s18 8 20 24" fill="#C8A86B"/>
</svg>"""


class MockLLMProvider:
    def __init__(self, model: str = "TBD") -> None:
        self._model = model

    async def complete(self, request: LLMRequest) -> LLMResponse:
        return LLMResponse(text=f"Mock response: {request.prompt}", model=self._model)


class MockAvatarProvider:
    def __init__(self, model: str = "TBD") -> None:
        self._model = model

    async def generate(self, request: AvatarRequest) -> AvatarResult:
        del request
        return AvatarResult(content=_MOCK_AVATAR, media_type="image/svg+xml", model=self._model)
