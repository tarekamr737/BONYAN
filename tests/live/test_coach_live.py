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
CASES = json.loads(
    (ROOT / "docs/benchmarks/coach-test-set.json").read_text(encoding="utf-8")
)


@pytest.mark.live
@pytest.mark.parametrize("candidate", CANDIDATES, ids=lambda item: item["model"])
@pytest.mark.parametrize("case", CASES, ids=lambda item: item["id"])
def test_coach_candidate_live(candidate, case, record_property) -> None:
    api_key = os.getenv("CHAT_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        pytest.skip("CHAT_API_KEY or OPENAI_API_KEY is required")
    provider = ProductionLLMProvider(api_key=api_key, model=candidate["model"])

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
    record_property("estimated_cost_usd", response.usage.estimated_cost_usd or 0)
    expected_tool = case["expected_tool"]
    if expected_tool:
        assert [call.name for call in response.tool_calls] == [expected_tool]
    else:
        assert response.text.strip()
