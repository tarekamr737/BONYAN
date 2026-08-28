from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from typing import Protocol
from uuid import UUID


class AvatarState(StrEnum):
    REQUESTED = "requested"
    PROCESSING = "processing"
    READY_FOR_REVIEW = "ready_for_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    FAILED = "failed"


class BodyMetricsSource(StrEnum):
    INBODY = "inbody"
    PROFILE = "profile"


class BodyAvatarStyle(StrEnum):
    CINEMATIC_3D = "cinematic_3d"


class BodyAvatarPresentation(StrEnum):
    MEN = "men"
    WOMEN = "women"


class BodyShapeProfile(StrEnum):
    SKINNY = "skinny"
    SLIM = "slim"
    NORMAL = "normal"
    FIT = "fit"
    STRONG = "strong"
    FULL = "full"


@dataclass(frozen=True, slots=True, repr=False)
class BodyMetricsSnapshot:
    height_cm: float
    weight_kg: float
    body_fat_percentage: float | None
    skeletal_muscle_mass_kg: float | None
    recorded_at: datetime
    source: BodyMetricsSource

    def __post_init__(self) -> None:
        if not 100 <= self.height_cm <= 240:
            raise ValueError("height_cm is outside the supported range")
        if not 30 <= self.weight_kg <= 350:
            raise ValueError("weight_kg is outside the supported range")
        if self.body_fat_percentage is not None and not 2 <= self.body_fat_percentage <= 70:
            raise ValueError("body_fat_percentage is outside the supported range")
        if (
            self.skeletal_muscle_mass_kg is not None
            and not 5 <= self.skeletal_muscle_mass_kg <= 150
        ):
            raise ValueError("skeletal_muscle_mass_kg is outside the supported range")


class BodyMetricsReader(Protocol):
    async def latest_confirmed(self, owner_id: str) -> BodyMetricsSnapshot | None: ...


class ManualBodyMetricsWriter(Protocol):
    async def save_manual(self, owner_id: str, snapshot: BodyMetricsSnapshot) -> None: ...


@dataclass(frozen=True, slots=True)
class AvatarGenerationRequest:
    metrics: BodyMetricsSnapshot = field(repr=False)
    style: BodyAvatarStyle
    presentation: BodyAvatarPresentation = BodyAvatarPresentation.MEN


@dataclass(frozen=True, slots=True)
class AvatarGenerationResult:
    content: bytes = field(repr=False)
    media_type: str
    model: str


class AvatarProviderError(Exception):
    def __init__(self, code: str, message: str, *, retryable: bool = True) -> None:
        super().__init__(message)
        self.code = code
        self.retryable = retryable


class AvatarProvider(Protocol):
    async def generate(self, request: AvatarGenerationRequest) -> AvatarGenerationResult: ...


class PrivateAvatarStorage(Protocol):
    async def put_private(self, content: bytes, media_type: str) -> str: ...

    async def get_private(self, object_key: str) -> bytes: ...

    async def create_read_url(self, object_key: str, *, expires_in_seconds: int) -> str: ...

    async def delete_private(self, object_key: str) -> None: ...


@dataclass(frozen=True, slots=True)
class AvatarCommunityIdentity:
    avatar_id: UUID
    image_url: str


class AvatarIdentityReader(Protocol):
    async def get_community_identity(
        self, owner_id: str, avatar_id: UUID
    ) -> AvatarCommunityIdentity | None: ...
