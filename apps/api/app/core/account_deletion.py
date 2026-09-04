from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.storage import PrivateObjectStorage
from app.domains.avatar.lifecycle import delete_avatar_account_data
from app.domains.community.lifecycle import delete_community_account_data
from app.domains.inbody.lifecycle import delete_inbody_account_data
from app.domains.training.lifecycle import delete_training_account_data
from app.domains.users.lifecycle import delete_user_account_data


@dataclass
class AccountDeletionService:
    session: AsyncSession
    storage: PrivateObjectStorage

    async def delete(self, user_id: str) -> None:
        try:
            await delete_inbody_account_data(self.session, self.storage, user_id)
            await delete_avatar_account_data(self.session, self.storage, user_id)
        except Exception as exc:
            raise AppError(
                "account_deletion_failed",
                "Your account could not be deleted right now. Please try again.",
                503,
            ) from exc

        await delete_community_account_data(self.session, user_id)
        await delete_training_account_data(self.session, user_id)
        await delete_user_account_data(self.session, user_id)
        await self.session.flush()
