from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class PostType(StrEnum):
    MILESTONE = "milestone"
    PROGRESS = "progress"


class ReactionKind(StrEnum):
    SUPPORT = "support"
    STRONG = "strong"
    INSPIRED = "inspired"


class ReportReason(StrEnum):
    SPAM = "spam"
    HARASSMENT = "harassment"
    PRIVACY = "privacy"
    OTHER = "other"


class ReportStatus(StrEnum):
    PENDING = "pending"
    REVIEWED = "reviewed"


@dataclass(frozen=True, slots=True)
class CommunityActor:
    user_id: str
    display_name: str
