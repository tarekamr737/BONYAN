from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.domains.avatar.contracts import AvatarState


class CreateAvatarRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_image_base64: str = Field(min_length=4, repr=False)
    source_media_type: str
    style: str = Field(default="athletic editorial portrait", min_length=3, max_length=160)

    @field_validator("source_media_type")
    @classmethod
    def normalize_media_type(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("style")
    @classmethod
    def normalize_style(cls, value: str) -> str:
        return " ".join(value.split())


class AvatarPublicationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    enabled: bool


class AvatarView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    state: AvatarState
    style: str
    preview_url: str | None
    approved: bool
    public_in_community: bool
    failure_code: str | None
    created_at: datetime
    updated_at: datetime


class AvatarListView(BaseModel):
    items: list[AvatarView]
