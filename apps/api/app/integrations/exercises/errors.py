from __future__ import annotations


class ExerciseProviderError(Exception):
    """Base exercise-provider failure with no request or credential data."""


class ExerciseProviderUnavailableError(ExerciseProviderError):
    """Raised for timeouts, network failures, and transient upstream responses."""


class ExerciseProviderRateLimitError(ExerciseProviderUnavailableError):
    """Raised when an exercise provider rejects a request because of rate limits."""


class ExerciseProviderRequestError(ExerciseProviderError):
    """Raised when an exercise provider rejects a bounded backend request."""


class ExerciseProviderInvalidResponseError(ExerciseProviderError):
    """Raised when an exercise provider returns malformed or unsafe data."""
