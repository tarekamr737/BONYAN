import asyncio
import json
from urllib import request

import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.core.providers.contracts import LLMRequest, LLMToolDefinition, LLMToolResult
from app.domains.training.router import get_llm_provider
from app.integrations.llm.errors import LLMProviderError
from app.integrations.llm.production import PUTER_CHAT_URL, ProductionLLMProvider


def response(message, finish="stop"):
    return {
        "choices": [{"message": message, "finish_reason": finish}],
        "usage": {"prompt_tokens": 100, "completion_tokens": 20},
    }


def test_puter_wiring_transport_and_usage(monkeypatch):
    class Reply:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def read(self):
            return json.dumps(response({"content": "Hello"})).encode()

    def urlopen(outbound, timeout):
        assert outbound.full_url == PUTER_CHAT_URL
        assert outbound.get_header("Authorization") == "Bearer puter-secret"
        payload = json.loads(outbound.data)
        assert payload["messages"] == [{"role": "user", "content": "Hi"}]
        assert "input" not in payload
        assert timeout == 20
        return Reply()

    monkeypatch.setattr(request, "urlopen", urlopen)
    provider = get_llm_provider(
        Settings(
            _env_file=None,
            chat_provider="puter",
            chat_api_key="puter-secret",
            chat_model="gpt-4.1",
        )
    )
    result = asyncio.run(provider.complete(LLMRequest(prompt="Hi")))
    assert result.text == "Hello"
    assert result.usage.input_tokens == 100
    assert result.usage.estimated_cost_usd is None


@pytest.mark.parametrize("key", [None, "", "   "])
def test_puter_requires_token(key):
    with pytest.raises(ValidationError, match="CHAT_API_KEY"):
        Settings(
            _env_file=None,
            chat_provider="puter",
            chat_model="gpt-4.1",
            chat_api_key=key,
        )


def test_puter_tools_and_followup():
    tool = LLMToolDefinition(
        name="get_current_plan", description="Read plan", parameters={}
    )
    payloads = []

    def post(payload):
        payloads.append(payload)
        if len(payloads) == 1:
            return response(
                {
                    "tool_calls": [
                        {
                            "id": "call-1",
                            "type": "function",
                            "function": {"name": tool.name, "arguments": "{}"},
                        }
                    ]
                },
                "tool_calls",
            )
        return response({"content": "Your plan"})

    provider = ProductionLLMProvider(
        api_key="secret", model="gpt-4.1", provider="puter", post_json=post
    )
    result = asyncio.run(provider.complete(LLMRequest(prompt="Plan", tools=(tool,))))
    assert result.tool_calls[0].arguments == {}
    assert payloads[0]["tools"][0]["function"]["name"] == tool.name
    asyncio.run(
        provider.complete(
            LLMRequest(
                prompt="Plan",
                tools=(tool,),
                tool_results=(
                    LLMToolResult(call_id="call-1", output={"plan": "rest"}),
                ),
            )
        )
    )
    assert "tools" not in payloads[1]
    assert "Validated BONYAN tool results" in payloads[1]["messages"][0]["content"]


@pytest.mark.parametrize(
    "raw",
    [
        {},
        response({"content": "partial"}, "length"),
        response({"tool_calls": "bad"}),
        response(
            {
                "tool_calls": [
                    {
                        "id": "x",
                        "type": "function",
                        "function": {"name": "delete_everything", "arguments": "{}"},
                    }
                ]
            },
            "tool_calls",
        ),
    ],
)
def test_puter_rejects_invalid_output(raw):
    provider = ProductionLLMProvider(
        api_key="secret", model="gpt-4.1", provider="puter", post_json=lambda _: raw
    )
    with pytest.raises(LLMProviderError):
        asyncio.run(provider.complete(LLMRequest(prompt="Hi")))
