from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


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
    prompt: str


@dataclass(frozen=True, slots=True)
class AvatarResult:
    content: bytes
    media_type: str
    model: str


class AvatarProvider(Protocol):
    async def generate(self, request: AvatarRequest) -> AvatarResult: ...
