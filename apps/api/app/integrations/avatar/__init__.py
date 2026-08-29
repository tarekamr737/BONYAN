"""Avatar provider adapters."""

from app.integrations.avatar.metrics import StaticBodyMetricsReader
from app.integrations.avatar.mock import MockAvatarProvider

__all__ = ["MockAvatarProvider", "StaticBodyMetricsReader"]
