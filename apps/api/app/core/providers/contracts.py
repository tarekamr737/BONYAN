from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass(frozen=True, slots=True)
class LLMRequest:
    prompt: str


@dataclass(frozen=True, slots=True)
class LLMResponse:
    text: str
    model: str


class LLMProvider(Protocol):
    async def complete(self, request: LLMRequest) -> LLMResponse: ...


@dataclass(frozen=True, slots=True)
class AvatarRequest:
    prompt: str | None = None
    source_image_reference: str | None = field(default=None, repr=False)
    style: str | None = None
    options: dict[str, str] = field(default_factory=dict)
    structured_context: dict[str, Any] = field(default_factory=dict, repr=False)


@dataclass(frozen=True, slots=True)
class AvatarResult:
    content: bytes = field(repr=False)
    media_type: str
    model: str


class AvatarProvider[AvatarRequestT](Protocol):
    async def generate(self, request: AvatarRequestT) -> AvatarResult: ...
