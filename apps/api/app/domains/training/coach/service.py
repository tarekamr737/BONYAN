from __future__ import annotations

import hashlib

from fastapi import status

from app.core.errors import AppError
from app.core.providers.contracts import LLMProvider, LLMRequest, LLMToolResult
from app.domains.training.coach.schemas import CoachToolCall
from app.domains.training.coach.tools import CoachToolExecutor
from app.domains.training.schemas import CoachMessageResponse
from app.integrations.llm.errors import LLMProviderError

FITNESS_SCOPE_TERMS = (
    "workout",
    "exercise",
    "set",
    "rep",
    "training",
    "plan",
    "muscle",
    "strength",
    "hypertrophy",
    "cardio",
    "تمرين",
    "تمارين",
    "تدريب",
    "جيم",
    "عضلة",
    "عضلات",
    "مجموعة",
    "عدة",
    "خطة",
)


class CoachService:
    def __init__(self, *, llm_provider: LLMProvider, tool_executor: CoachToolExecutor) -> None:
        self.llm_provider = llm_provider
        self.tool_executor = tool_executor

    async def respond(self, *, user_id: str, message: str) -> CoachMessageResponse:
        if not any(term in message.lower() for term in FITNESS_SCOPE_TERMS):
            raise AppError(
                "coach_scope_error",
                "Ask the coach about training or workouts.",
                status.HTTP_400_BAD_REQUEST,
            )
        prompt = (
            "You are BONYAN's fitness coach. Answer naturally in the user's language, "
            "including Egyptian Arabic when used. Do not diagnose medical conditions. "
            "Use BONYAN tools for authoritative workout state and never invent user data. "
            f"User message: {message[:1000]}"
        )
        safety_identifier = hashlib.sha256(user_id.encode("utf-8")).hexdigest()
        try:
            response = await self.llm_provider.complete(
                LLMRequest(
                    prompt=prompt,
                    tools=self.tool_executor.definitions(),
                    safety_identifier=safety_identifier,
                )
            )
            if len(response.tool_calls) > 4:
                raise LLMProviderError(
                    "tool_call_invalid",
                    "The Coach requested too many actions.",
                    retryable=False,
                )
            results: list[dict[str, object]] = []
            provider_results: list[LLMToolResult] = []
            for requested_call in response.tool_calls:
                try:
                    call = CoachToolCall(
                        name=requested_call.name,
                        arguments=requested_call.arguments,
                    )
                except ValueError as exc:
                    raise LLMProviderError(
                        "tool_call_invalid",
                        "The Coach requested an unsupported action.",
                        retryable=False,
                    ) from exc
                result = await self.tool_executor.execute(user_id=user_id, call=call)
                serialized = result.model_dump(mode="json")
                results.append(serialized)
                provider_results.append(
                    LLMToolResult(call_id=requested_call.call_id, output=serialized)
                )
            if provider_results:
                response = await self.llm_provider.complete(
                    LLMRequest(
                        prompt=prompt,
                        tool_results=tuple(provider_results),
                        safety_identifier=safety_identifier,
                    )
                )
                if response.tool_calls:
                    raise LLMProviderError(
                        "tool_call_invalid",
                        "The Coach requested an unexpected additional action.",
                        retryable=False,
                    )
        except LLMProviderError as exc:
            raise _provider_app_error(exc) from exc
        return CoachMessageResponse(
            response=response.text, model=response.model, tool_results=results
        )


def _provider_app_error(exc: LLMProviderError) -> AppError:
    status_code = {
        "rate_limited": status.HTTP_429_TOO_MANY_REQUESTS,
        "provider_auth_error": status.HTTP_503_SERVICE_UNAVAILABLE,
        "provider_timeout": status.HTTP_503_SERVICE_UNAVAILABLE,
        "provider_unavailable": status.HTTP_503_SERVICE_UNAVAILABLE,
        "malformed_output": status.HTTP_502_BAD_GATEWAY,
        "tool_call_invalid": status.HTTP_502_BAD_GATEWAY,
    }.get(exc.code, status.HTTP_502_BAD_GATEWAY)
    return AppError(exc.code, str(exc), status_code)
