"""Provider-neutral avatar contracts re-exported for adapter authors."""

from app.domains.avatar.contracts import (
    AvatarGenerationRequest,
    AvatarGenerationResult,
    AvatarProvider,
    AvatarProviderError,
)

__all__ = [
    "AvatarGenerationRequest",
    "AvatarGenerationResult",
    "AvatarProvider",
    "AvatarProviderError",
]
