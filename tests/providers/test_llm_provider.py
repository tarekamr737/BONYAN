from __future__ import annotations

import asyncio

import pytest

from app.core.providers.contracts import LLMRequest, LLMToolDefinition, LLMToolResult
from app.integrations.llm.errors import LLMProviderError
from app.integrations.llm.production import ProductionLLMProvider


def run(coro):
    return asyncio.run(coro)


def tool() -> LLMToolDefinition:
    return LLMToolDefinition(
        name="get_current_plan",
        description="Read the current plan.",
        parameters={"type": "object", "properties": {}, "additionalProperties": False},
    )


def test_parses_text_and_safe_usage_cost_metadata() -> None:
    provider = ProductionLLMProvider(
        api_key="secret",
        model="gpt-5.6-terra",
        post_json=lambda payload: {
            "model": payload["model"],
            "output": [
                {
                    "type": "message",
                    "content": [{"type": "output_text", "text": "تمام، نبدأ بهدوء."}],
                }
            ],
            "usage": {"input_tokens": 1_000, "output_tokens": 250},
        },
    )

    response = run(provider.complete(LLMRequest(prompt="تمرين")))

    assert response.text == "تمام، نبدأ بهدوء."
    assert response.usage.input_tokens == 1_000
    assert response.usage.output_tokens == 250
    assert response.usage.estimated_cost_usd == 0.005
    assert "secret" not in repr(provider)


def test_parses_only_declared_typed_tool_calls() -> None:
    provider = ProductionLLMProvider(
        api_key="secret",
        model="gpt-5.6-terra",
        post_json=lambda payload: {
            "model": payload["model"],
            "output": [
                {
                    "type": "function_call",
                    "call_id": "call-1",
                    "name": "get_current_plan",
                    "arguments": "{}",
                }
            ],
        },
    )

    response = run(provider.complete(LLMRequest(prompt="plan", tools=(tool(),))))

    assert response.text == ""
    assert response.tool_calls[0].call_id == "call-1"
    assert response.tool_calls[0].arguments == {}


def test_rejects_undeclared_or_malformed_tool_output() -> None:
    provider = ProductionLLMProvider(
        api_key="secret",
        model="gpt-5.6-terra",
        post_json=lambda payload: {
            "output": [
                {
                    "type": "function_call",
                    "call_id": "call-1",
                    "name": "delete_everything",
                    "arguments": "{}",
                }
            ]
        },
    )

    with pytest.raises(LLMProviderError, match="invalid tool") as error:
        run(provider.complete(LLMRequest(prompt="plan", tools=(tool(),))))

    assert error.value.code == "tool_call_invalid"
    assert error.value.retryable is False


def test_transient_failures_retry_only_within_bound() -> None:
    attempts = 0

    def post_json(payload):
        nonlocal attempts
        attempts += 1
        raise LLMProviderError(
            "provider_unavailable", "The Coach provider is unavailable.", retryable=True
        )

    provider = ProductionLLMProvider(
        api_key="secret",
        model="gpt-5.6-terra",
        max_attempts=2,
        retry_delay_seconds=0,
        post_json=post_json,
    )

    with pytest.raises(LLMProviderError):
        run(provider.complete(LLMRequest(prompt="workout")))

    assert attempts == 2


def test_validated_tool_results_disable_further_tools() -> None:
    captured = {}

    def post_json(payload):
        captured.update(payload)
        return {
            "output": [
                {
                    "type": "message",
                    "content": [{"type": "output_text", "text": "Plan ready."}],
                }
            ]
        }

    provider = ProductionLLMProvider(
        api_key="secret", model="gpt-5.6-terra", post_json=post_json
    )

    run(
        provider.complete(
            LLMRequest(
                prompt="workout",
                tools=(tool(),),
                tool_results=(LLMToolResult(call_id="call-1", output={"plan": "safe"}),),
            )
        )
    )

    assert "tools" not in captured
    assert "Validated BONYAN tool results" in captured["input"]
