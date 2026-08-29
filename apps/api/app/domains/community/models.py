from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.domains.community.contracts import (
    PostType,
    ReactionKind,
    ReportReason,
    ReportStatus,
)


class CommunityPost(Base):
    __tablename__ = "community_posts"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    owner_id: Mapped[str] = mapped_column(String(128), index=True)
    author_display_name: Mapped[str] = mapped_column(String(120))
    post_type: Mapped[PostType] = mapped_column(
        Enum(PostType, native_enum=False, length=24)
    )
    caption: Mapped[str] = mapped_column(Text)
    avatar_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class PostReaction(Base):
    __tablename__ = "community_post_reactions"
    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_post_reaction_post_user"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    post_id: Mapped[UUID] = mapped_column(
        ForeignKey("community_posts.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[str] = mapped_column(String(128), index=True)
    reaction: Mapped[ReactionKind] = mapped_column(
        Enum(ReactionKind, native_enum=False, length=24)
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class PostReport(Base):
    __tablename__ = "community_post_reports"
    __table_args__ = (
        UniqueConstraint("post_id", "reporter_id", name="uq_post_report_post_reporter"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    post_id: Mapped[UUID] = mapped_column(
        ForeignKey("community_posts.id", ondelete="CASCADE"), index=True
    )
    reporter_id: Mapped[str] = mapped_column(String(128), index=True)
    reason: Mapped[ReportReason] = mapped_column(
        Enum(ReportReason, native_enum=False, length=24)
    )
    note: Mapped[str | None] = mapped_column(String(300), nullable=True)
    status: Mapped[ReportStatus] = mapped_column(
        Enum(ReportStatus, native_enum=False, length=24)
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
