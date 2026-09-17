"""Avatar provider adapters."""

from app.integrations.avatar.cloudflare import CloudflareFluxAvatarProvider
from app.integrations.avatar.metrics import StaticBodyMetricsReader
from app.integrations.avatar.mock import MockAvatarProvider
from app.integrations.avatar.openrouter import OpenRouterAvatarProvider
from app.integrations.avatar.production import ProductionAvatarProvider

__all__ = [
    "CloudflareFluxAvatarProvider",
    "MockAvatarProvider",
    "OpenRouterAvatarProvider",
    "ProductionAvatarProvider",
    "StaticBodyMetricsReader",
]
