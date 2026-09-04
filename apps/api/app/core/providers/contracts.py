from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass(frozen=True, slots=True)
class LLMToolDefinition:
    name: str
    description: str
    parameters: dict[str, Any]


@dataclass(frozen=True, slots=True)
class LLMToolCall:
    call_id: str
    name: str
    arguments: dict[str, Any]


@dataclass(frozen=True, slots=True)
class LLMToolResult:
    call_id: str
    output: dict[str, Any]


@dataclass(frozen=True, slots=True)
class LLMUsage:
    input_tokens: int = 0
    output_tokens: int = 0
    estimated_cost_usd: float | None = None


@dataclass(frozen=True, slots=True)
class LLMRequest:
    prompt: str
    tools: tuple[LLMToolDefinition, ...] = ()
    tool_results: tuple[LLMToolResult, ...] = ()
    safety_identifier: str | None = None


@dataclass(frozen=True, slots=True)
class LLMResponse:
    text: str
    model: str
    tool_calls: tuple[LLMToolCall, ...] = ()
    usage: LLMUsage = field(default_factory=LLMUsage)


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
    estimated_cost_usd: float | None = None
    provider_metadata: dict[str, str] = field(default_factory=dict)


class AvatarProvider[AvatarRequestT](Protocol):
    async def generate(self, request: AvatarRequestT) -> AvatarResult: ...
