from __future__ import annotations

from fastapi import status

from app.core.errors import AppError
from app.core.logging import get_logger
from app.core.providers.contracts import LLMProvider, LLMRequest
from app.domains.training.coach.schemas import CoachToolCall
from app.domains.training.coach.tools import CoachToolExecutor
from app.domains.training.schemas import CoachMessageResponse

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
)
logger = get_logger("providers")


class CoachService:
    def __init__(self, *, llm_provider: LLMProvider, tool_executor: CoachToolExecutor) -> None:
        self.llm_provider = llm_provider
        self.tool_executor = tool_executor

    async def respond(
        self, *, user_id: str, message: str, tool_calls: list[CoachToolCall] | None = None
    ) -> CoachMessageResponse:
        if not any(term in message.lower() for term in FITNESS_SCOPE_TERMS):
            raise AppError(
                "coach_scope_error",
                "Ask the coach about training or workouts.",
                status.HTTP_400_BAD_REQUEST,
            )
        results = []
        for call in tool_calls or []:
            result = await self.tool_executor.execute(user_id=user_id, call=call)
            results.append(result.model_dump(mode="json"))
        compact_context = {"tool_results": results[:4]}
        try:
            response = await self.llm_provider.complete(
                LLMRequest(
                    prompt=(
                        "You are BONYAN's fitness coach. Do not diagnose medical conditions. "
                        f"User message: {message[:1000]}. Context: {compact_context}"
                    )
                )
            )
        except TimeoutError as exc:
            logger.warning(
                "provider_request_failed",
                extra={"error_code": "coach_timeout", "provider": "coach"},
            )
            raise AppError(
                "coach_unavailable",
                "The coach is taking too long to respond. Please try again.",
                status.HTTP_503_SERVICE_UNAVAILABLE,
            ) from exc
        except Exception as exc:
            logger.warning(
                "provider_request_failed",
                extra={"error_code": "coach_provider_failed", "provider": "coach"},
            )
            raise AppError(
                "coach_unavailable",
                "The coach is unavailable right now. Please try again.",
                status.HTTP_503_SERVICE_UNAVAILABLE,
            ) from exc
        return CoachMessageResponse(
            response=response.text, model=response.model, tool_results=results
        )
