from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.domains.community.contracts import PostType, ReactionKind, ReportReason


class CreatePostRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    post_type: PostType = PostType.MILESTONE
    caption: str = Field(min_length=1, max_length=500)
    avatar_id: UUID | None = None

    @field_validator("caption")
    @classmethod
    def normalize_caption(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if not normalized:
            raise ValueError("caption cannot be blank")
        return normalized


class ReactionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reaction: ReactionKind = ReactionKind.SUPPORT


class ReportPostRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reason: ReportReason
    note: str | None = Field(default=None, max_length=300)

    @field_validator("note")
    @classmethod
    def normalize_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = " ".join(value.split())
        return normalized or None


class PostAuthorView(BaseModel):
    display_name: str
    avatar_url: str | None


class ReactionSummaryView(BaseModel):
    counts: dict[ReactionKind, int]
    viewer_reaction: ReactionKind | None


class CommunityPostView(BaseModel):
    id: UUID
    post_type: PostType
    caption: str
    author: PostAuthorView
    reactions: ReactionSummaryView
    created_at: datetime
    can_delete: bool


class CommunityFeedView(BaseModel):
    items: list[CommunityPostView]
    next_cursor: str | None


class ReportAcceptedView(BaseModel):
    accepted: bool = True
