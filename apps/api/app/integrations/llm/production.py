from __future__ import annotations

import asyncio
import json
from collections.abc import Callable
from typing import Any
from urllib import error, request

from app.core.providers.contracts import (
    LLMRequest,
    LLMResponse,
    LLMToolCall,
    LLMUsage,
)
from app.integrations.llm.errors import LLMProviderError

OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
_TRANSIENT_STATUS_CODES = {408, 409, 429, 500, 502, 503, 504}
_MODEL_PRICES_PER_MILLION = {
    "gpt-5.6-sol": (4.0, 20.0),
    "gpt-5.6": (4.0, 20.0),
    "gpt-5.6-terra": (2.0, 12.0),
    "gpt-5.6-luna": (0.2, 1.2),
}


class ProductionLLMProvider:
    def __init__(
        self,
        *,
        api_key: str,
        model: str,
        timeout_seconds: float = 20,
        max_attempts: int = 2,
        retry_delay_seconds: float = 0.25,
        post_json: Callable[[dict[str, Any]], dict[str, Any]] | None = None,
    ) -> None:
        if not api_key.strip():
            raise ValueError("CHAT_API_KEY is required for the OpenAI chat provider")
        self._api_key = api_key
        self._model = model
        self._timeout_seconds = timeout_seconds
        self._max_attempts = max(1, max_attempts)
        self._retry_delay_seconds = max(0, retry_delay_seconds)
        self._post_json_override = post_json

    async def complete(self, llm_request: LLMRequest) -> LLMResponse:
        payload = self._build_payload(llm_request)
        raw = await self._request_with_retry(payload)
        return self._parse_response(raw, llm_request)

    def _build_payload(self, llm_request: LLMRequest) -> dict[str, Any]:
        prompt = llm_request.prompt
        if llm_request.tool_results:
            results = [
                {"call_id": item.call_id, "output": item.output}
                for item in llm_request.tool_results
            ]
            prompt = (
                f"{prompt}\n\nValidated BONYAN tool results:\n"
                f"{json.dumps(results, ensure_ascii=False, separators=(',', ':'))}\n"
                "Answer the user using only these validated results. Do not request another tool."
            )
        payload: dict[str, Any] = {
            "model": self._model,
            "input": prompt,
            "store": False,
            "max_output_tokens": 800,
            "parallel_tool_calls": False,
        }
        if llm_request.safety_identifier:
            payload["safety_identifier"] = llm_request.safety_identifier
        if llm_request.tools and not llm_request.tool_results:
            payload["tools"] = [
                {
                    "type": "function",
                    "name": item.name,
                    "description": item.description,
                    "parameters": item.parameters,
                    "strict": True,
                }
                for item in llm_request.tools
            ]
            payload["tool_choice"] = "auto"
        return payload

    async def _request_with_retry(self, payload: dict[str, Any]) -> dict[str, Any]:
        last_error: LLMProviderError | None = None
        for attempt in range(self._max_attempts):
            try:
                if self._post_json_override:
                    return self._post_json_override(payload)
                return await asyncio.to_thread(self._post_json, payload)
            except LLMProviderError as exc:
                last_error = exc
                if not exc.retryable or attempt + 1 >= self._max_attempts:
                    raise
                await asyncio.sleep(self._retry_delay_seconds * (2**attempt))
        raise last_error or LLMProviderError(
            "provider_unavailable", "The Coach provider is unavailable.", retryable=True
        )

    def _post_json(self, payload: dict[str, Any]) -> dict[str, Any]:
        body = json.dumps(payload).encode("utf-8")
        outbound = request.Request(
            OPENAI_RESPONSES_URL,
            data=body,
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )
        try:
            with request.urlopen(outbound, timeout=self._timeout_seconds) as response:
                raw = json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            raise _http_error(exc.code) from exc
        except (TimeoutError, error.URLError) as exc:
            code = "provider_timeout" if _is_timeout(exc) else "provider_unavailable"
            message = (
                "The Coach provider timed out."
                if code == "provider_timeout"
                else "The Coach provider is unavailable."
            )
            raise LLMProviderError(code, message, retryable=True) from exc
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise LLMProviderError(
                "malformed_output", "The Coach provider returned invalid data.", retryable=False
            ) from exc
        if not isinstance(raw, dict):
            raise LLMProviderError(
                "malformed_output", "The Coach provider returned invalid data.", retryable=False
            )
        return raw

    def _parse_response(self, raw: dict[str, Any], llm_request: LLMRequest) -> LLMResponse:
        output = raw.get("output")
        if not isinstance(output, list):
            raise LLMProviderError(
                "malformed_output", "The Coach provider returned invalid data.", retryable=False
            )
        allowed_tools = {item.name for item in llm_request.tools}
        text_parts: list[str] = []
        tool_calls: list[LLMToolCall] = []
        for item in output:
            if not isinstance(item, dict):
                continue
            if item.get("type") == "function_call":
                tool_calls.append(_parse_tool_call(item, allowed_tools))
            if item.get("type") == "message":
                content = item.get("content")
                if isinstance(content, list):
                    text_parts.extend(
                        str(part["text"])
                        for part in content
                        if isinstance(part, dict)
                        and part.get("type") == "output_text"
                        and isinstance(part.get("text"), str)
                    )
        text = "\n".join(part.strip() for part in text_parts if part.strip())
        if not text and not tool_calls:
            raise LLMProviderError(
                "malformed_output", "The Coach provider returned no usable output.", retryable=False
            )
        usage = raw.get("usage") if isinstance(raw.get("usage"), dict) else {}
        input_tokens = _non_negative_int(usage.get("input_tokens"))
        output_tokens = _non_negative_int(usage.get("output_tokens"))
        model = str(raw.get("model") or self._model)
        return LLMResponse(
            text=text,
            model=model,
            tool_calls=tuple(tool_calls),
            usage=LLMUsage(
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                estimated_cost_usd=_estimate_cost(model, input_tokens, output_tokens),
            ),
        )


def _parse_tool_call(raw: dict[str, Any], allowed_tools: set[str]) -> LLMToolCall:
    call_id = str(raw.get("call_id") or "").strip()
    name = str(raw.get("name") or "").strip()
    arguments_raw = raw.get("arguments")
    if not call_id or name not in allowed_tools or not isinstance(arguments_raw, str):
        raise LLMProviderError(
            "tool_call_invalid", "The Coach requested an invalid tool.", retryable=False
        )
    try:
        arguments = json.loads(arguments_raw)
    except json.JSONDecodeError as exc:
        raise LLMProviderError(
            "tool_call_invalid", "The Coach requested invalid tool arguments.", retryable=False
        ) from exc
    if not isinstance(arguments, dict):
        raise LLMProviderError(
            "tool_call_invalid", "The Coach requested invalid tool arguments.", retryable=False
        )
    return LLMToolCall(call_id=call_id, name=name, arguments=arguments)


def _http_error(status_code: int) -> LLMProviderError:
    if status_code in {401, 403}:
        return LLMProviderError(
            "provider_auth_error", "The Coach provider is not configured.", retryable=False
        )
    if status_code == 429:
        return LLMProviderError(
            "rate_limited", "The Coach is busy. Try again shortly.", retryable=True
        )
    if status_code in _TRANSIENT_STATUS_CODES:
        return LLMProviderError(
            "provider_unavailable", "The Coach provider is unavailable.", retryable=True
        )
    return LLMProviderError(
        "provider_rejected", "The Coach provider rejected the request.", retryable=False
    )


def _is_timeout(exc: BaseException) -> bool:
    return isinstance(exc, TimeoutError) or (
        isinstance(exc, error.URLError) and isinstance(exc.reason, TimeoutError)
    )


def _non_negative_int(value: object) -> int:
    return value if isinstance(value, int) and value >= 0 else 0


def _estimate_cost(model: str, input_tokens: int, output_tokens: int) -> float | None:
    prices = _MODEL_PRICES_PER_MILLION.get(model)
    if prices is None:
        return None
    input_price, output_price = prices
    return round((input_tokens * input_price + output_tokens * output_price) / 1_000_000, 8)
