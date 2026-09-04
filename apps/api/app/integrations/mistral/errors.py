from __future__ import annotations


class MistralOcrError(Exception):
    """Stable integration error for OCR provider failures."""


class MistralOcrTimeout(MistralOcrError, TimeoutError):
    """Raised when Mistral OCR does not respond within the configured timeout."""


class MistralOcrRateLimit(MistralOcrError):
    """Raised when Mistral OCR rejects a request because of rate limits."""


class MistralOcrAuthenticationError(MistralOcrError):
    """Raised when Mistral OCR credentials are missing or invalid."""


class MistralOcrInvalidResponse(MistralOcrError):
    """Raised when Mistral OCR returns malformed data."""
