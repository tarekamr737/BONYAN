from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.storage import PrivateObjectStorage
from app.domains.avatar.models import AvatarRecord
from app.domains.community.models import CommunityPost, PostReaction, PostReport
from app.domains.inbody.models import InBodyScan
from app.domains.training.models import WorkoutPlanRecord, WorkoutSessionRecord
from app.domains.users.models import UserAccount, UserProfile


@dataclass
class AccountDeletionService:
    session: AsyncSession
    storage: PrivateObjectStorage

    async def delete(self, user_id: str) -> None:
        inbody_keys = list(
            await self.session.scalars(
                select(InBodyScan.storage_key).where(InBodyScan.owner_id == user_id)
            )
        )
        avatar_rows = list(
            (
                await self.session.execute(
                    select(AvatarRecord.id, AvatarRecord.generated_object_key).where(
                        AvatarRecord.owner_id == user_id
                    )
                )
            ).all()
        )
        object_keys = inbody_keys + [key for _, key in avatar_rows if key]

        try:
            for key in object_keys:
                await self.storage.delete(key=key)
        except Exception as exc:
            raise AppError(
                "account_deletion_failed",
                "Your account could not be deleted right now. Please try again.",
                503,
            ) from exc

        avatar_ids = [avatar_id for avatar_id, _ in avatar_rows]
        if avatar_ids:
            await self.session.execute(
                update(CommunityPost)
                .where(CommunityPost.avatar_id.in_(avatar_ids))
                .values(avatar_id=None)
            )

        await self.session.execute(delete(PostReport).where(PostReport.reporter_id == user_id))
        await self.session.execute(delete(PostReaction).where(PostReaction.user_id == user_id))
        await self.session.execute(delete(CommunityPost).where(CommunityPost.owner_id == user_id))
        await self.session.execute(
            delete(WorkoutSessionRecord).where(WorkoutSessionRecord.owner_id == user_id)
        )
        await self.session.execute(
            delete(WorkoutPlanRecord).where(WorkoutPlanRecord.owner_id == user_id)
        )
        await self.session.execute(delete(AvatarRecord).where(AvatarRecord.owner_id == user_id))
        await self.session.execute(delete(InBodyScan).where(InBodyScan.owner_id == user_id))
        await self.session.execute(delete(UserProfile).where(UserProfile.owner_id == user_id))
        await self.session.execute(delete(UserAccount).where(UserAccount.id == user_id))
        await self.session.flush()
