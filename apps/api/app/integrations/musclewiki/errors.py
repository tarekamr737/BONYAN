from __future__ import annotations


class MuscleWikiError(Exception):
    """Base provider error that is safe to map at the API boundary."""


class MuscleWikiUnavailableError(MuscleWikiError):
    """Raised when MuscleWiki cannot be reached or returns an unavailable response."""


class MuscleWikiInvalidResponseError(MuscleWikiError):
    """Raised when MuscleWiki returns data that does not match the provider contract."""
