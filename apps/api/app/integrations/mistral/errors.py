from __future__ import annotations


class MistralOcrError(Exception):
    """Stable integration error for OCR provider failures."""


class MistralOcrTimeout(MistralOcrError, TimeoutError):
    """Raised when Mistral OCR does not respond within the configured timeout."""
