from __future__ import annotations

import json

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
        if "Estimate nutrition" in request.prompt:
            return LLMResponse(
                text=json.dumps(
                    {
                        "calories": 420,
                        "protein_g": 28,
                        "carbs_g": 46,
                        "fat_g": 14,
                        "summary": "تقدير تجريبي للتطوير؛ راجع كل قيمة قبل ما تحفظها."
                        if "only in natural Egyptian Arabic" in request.prompt
                        else "Development estimate; review every value before saving.",
                    },
                    ensure_ascii=False,
                ),
                model=self._model,
            )
        return LLMResponse(
            text=(
                "رد تجريبي: BONYAN استقبل بيانات تمرينك. الكوتش الحقيقي مش مفعّل في وضع التجربة."
                if "only in natural Egyptian Arabic" in request.prompt
                else "Development response: BONYAN processed your training context. "
                "A live Coach is not enabled in mock mode."
            ),
            model=self._model,
        )


class MockAvatarProvider:
    def __init__(self, model: str = "TBD") -> None:
        self._model = model

    async def generate(self, request: AvatarRequest) -> AvatarResult:
        del request
        return AvatarResult(content=_MOCK_AVATAR, media_type="image/svg+xml", model=self._model)
