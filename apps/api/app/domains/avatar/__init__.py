"""Privacy-safe avatar domain exports."""

from app.domains.avatar.router import create_avatar_router
from app.domains.avatar.service import AvatarService

__all__ = ["AvatarService", "create_avatar_router"]
