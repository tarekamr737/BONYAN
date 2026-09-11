from __future__ import annotations

import json
import os
import time
from pathlib import Path

import pytest

from app.core.providers.contracts import LLMRequest
from app.domains.training.coach.tools import CoachToolExecutor
from app.integrations.llm.production import ProductionLLMProvider

ROOT = Path(__file__).resolve().parents[2]
CANDIDATES = json.loads(
    (ROOT / "docs/benchmarks/coach-candidates.json").read_text(encoding="utf-8")
)["candidates"]
if os.getenv("CHAT_PROVIDER") in {"puter", "openrouter"}:
    CANDIDATES = [
        {
            "model": os.getenv("CHAT_MODEL")
            or (
                "nvidia/nemotron-3-ultra-550b-a55b:free"
                if os.getenv("CHAT_PROVIDER") == "openrouter"
                else "gpt-4.1"
            )
        }
    ]
CASES = json.loads(
    (ROOT / "docs/benchmarks/coach-test-set.json").read_text(encoding="utf-8")
)


@pytest.mark.live
@pytest.mark.parametrize("candidate", CANDIDATES, ids=lambda item: item["model"])
@pytest.mark.parametrize("case", CASES, ids=lambda item: item["id"])
def test_coach_candidate_live(candidate, case, record_property) -> None:
    provider_name = os.getenv("CHAT_PROVIDER", "mock")
    if provider_name not in {"openai", "puter", "openrouter"}:
        pytest.skip(
            "Explicit CHAT_PROVIDER=openai, puter, or openrouter is required for live calls"
        )
    api_key = os.getenv("CHAT_API_KEY")
    if provider_name == "openai":
        api_key = api_key or os.getenv("OPENAI_API_KEY")
    if not api_key:
        pytest.skip("CHAT_API_KEY or OPENAI_API_KEY is required")
    provider = ProductionLLMProvider(
        api_key=api_key,
        model=candidate["model"],
        provider=provider_name,
        timeout_seconds=float(
            os.getenv(
                "BONYAN_LIVE_COACH_TIMEOUT_SECONDS",
                os.getenv("CHAT_TIMEOUT_SECONDS", "20"),
            )
        ),
    )

    started = time.perf_counter()
    response = __import__("asyncio").run(
        provider.complete(
            LLMRequest(prompt=case["prompt"], tools=CoachToolExecutor.definitions())
        )
    )
    latency_ms = round((time.perf_counter() - started) * 1000, 2)

    record_property("model", candidate["model"])
    record_property("case_id", case["id"])
    record_property("latency_ms", latency_ms)
    record_property("input_tokens", response.usage.input_tokens)
    record_property("output_tokens", response.usage.output_tokens)
    record_property("estimated_cost_usd", response.usage.estimated_cost_usd)
    expected_tool = case["expected_tool"]
    if expected_tool:
        assert [call.name for call in response.tool_calls] == [expected_tool]
    else:
        assert response.text.strip()
