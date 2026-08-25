from __future__ import annotations

from dataclasses import dataclass, field
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


@dataclass(frozen=True, slots=True)
class AvatarGenerationRequest:
    source_image: bytes = field(repr=False)
    source_media_type: str
    style: str


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
