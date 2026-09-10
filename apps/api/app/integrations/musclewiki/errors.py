from __future__ import annotations


class MuscleWikiError(Exception):
    """Base provider error that is safe to map at the API boundary."""


class MuscleWikiUnavailableError(MuscleWikiError):
    """Raised when MuscleWiki cannot be reached or returns an unavailable response."""


class MuscleWikiRateLimitError(MuscleWikiUnavailableError):
    """Raised when MuscleWiki rejects a request because of quota or rate limits."""


class MuscleWikiAuthenticationError(MuscleWikiError):
    """Raised when the backend MuscleWiki key is missing, invalid, or under-tiered."""


class MuscleWikiInvalidResponseError(MuscleWikiError):
    """Raised when MuscleWiki returns data that does not match the provider contract."""
