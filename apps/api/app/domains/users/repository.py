from __future__ import annotations

from typing import Protocol

from sqlalchemy import delete, func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.users.models import (
    EmailVerificationChallenge,
    ProfileHistoryRecord,
    UserAccount,
    UserProfile,
)


class AccountRepository(Protocol):
    async def create(
        self, account_id: str, email: str, password_hash: str
    ) -> UserAccount | None: ...

    async def get_by_email(self, email: str) -> UserAccount | None: ...

    async def create_verification(
        self, challenge: EmailVerificationChallenge
    ) -> EmailVerificationChallenge: ...

    async def get_verification(self, challenge_id: str) -> EmailVerificationChallenge | None: ...

    async def record_failed_verification(self, challenge_id: str) -> None: ...

    async def delete_verification(self, challenge_id: str) -> None: ...


class SqlAlchemyAccountRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, account_id: str, email: str, password_hash: str) -> UserAccount | None:
        statement = (
            insert(UserAccount)
            .values(id=account_id, email=email, password_hash=password_hash)
            .on_conflict_do_nothing(index_elements=[UserAccount.email])
            .returning(UserAccount)
        )
        result = await self._session.execute(statement)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> UserAccount | None:
        return await self._session.scalar(select(UserAccount).where(UserAccount.email == email))

    async def create_verification(
        self, challenge: EmailVerificationChallenge
    ) -> EmailVerificationChallenge:
        await self._session.execute(
            delete(EmailVerificationChallenge).where(
                EmailVerificationChallenge.email == challenge.email
            )
        )
        self._session.add(challenge)
        await self._session.flush()
        return challenge

    async def get_verification(self, challenge_id: str) -> EmailVerificationChallenge | None:
        return await self._session.scalar(
            select(EmailVerificationChallenge)
            .where(EmailVerificationChallenge.id == challenge_id)
            .with_for_update()
        )

    async def record_failed_verification(self, challenge_id: str) -> None:
        await self._session.execute(
            update(EmailVerificationChallenge)
            .where(EmailVerificationChallenge.id == challenge_id)
            .values(attempts=EmailVerificationChallenge.attempts + 1)
        )

    async def delete_verification(self, challenge_id: str) -> None:
        await self._session.execute(
            delete(EmailVerificationChallenge).where(
                EmailVerificationChallenge.id == challenge_id
            )
        )


class ProfileRepository(Protocol):
    async def get(self, owner_id: str) -> UserProfile | None: ...

    async def upsert(self, owner_id: str, values: dict[str, object]) -> UserProfile: ...


class SqlAlchemyProfileRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, owner_id: str) -> UserProfile | None:
        return await self._session.scalar(
            select(UserProfile)
            .where(UserProfile.owner_id == owner_id)
            .execution_options(populate_existing=True)
        )

    async def upsert(self, owner_id: str, values: dict[str, object]) -> UserProfile:
        from app.domains.users.schemas import UserProfileView
        from app.domains.users.scoring import coaching_score

        previous = await self.get(owner_id)
        before = (
            UserProfileView.model_validate(previous).model_dump(mode="json") if previous else {}
        )
        insert_values = {"owner_id": owner_id, **values}
        update_values = {key: value for key, value in values.items() if key != "owner_id"}
        statement = insert(UserProfile).values(**insert_values)
        if update_values:
            update_values["updated_at"] = func.now()
            statement = statement.on_conflict_do_update(
                index_elements=[UserProfile.owner_id], set_=update_values
            )
        else:
            statement = statement.on_conflict_do_nothing(index_elements=[UserProfile.owner_id])
        await self._session.execute(statement)
        await self._session.flush()
        profile = await self.get(owner_id)
        if profile is None:
            raise RuntimeError("profile upsert did not return a profile")
        after = UserProfileView.model_validate(profile).model_dump(mode="json")
        changed = [k for k in values if before.get(k) != after.get(k)]
        if changed:
            goal_changed = before.get("training_goal") != after.get("training_goal")
            kind = (
                "onboarding_completed"
                if not before.get("onboarding_completed") and after.get("onboarding_completed")
                else "goal_changed"
                if goal_changed
                else "profile_updated"
            )
            view = UserProfileView.model_validate(profile)
            assessments = select(ProfileHistoryRecord).where(
                ProfileHistoryRecord.owner_id == owner_id,
                ProfileHistoryRecord.kind == "assessment",
            )
            first = await self._session.scalar(
                assessments.order_by(
                    ProfileHistoryRecord.created_at, ProfileHistoryRecord.id
                ).limit(1)
            )
            latest = await self._session.scalar(
                assessments.order_by(
                    ProfileHistoryRecord.created_at.desc(), ProfileHistoryRecord.id.desc()
                ).limit(1)
            )
            score = coaching_score(
                view.training_goal,
                view.coaching,
                view.available_training_days,
                weight_kg=latest.snapshot.get("measurements", {}).get("weight_kg")
                if latest
                else None,
                baseline_weight_kg=first.snapshot.get("measurements", {}).get("weight_kg")
                if first
                else None,
            )
            self._session.add(
                ProfileHistoryRecord(
                    owner_id=owner_id,
                    kind=kind,
                    snapshot={
                        "profile": after,
                        "changed_fields": changed,
                        "score": score.model_dump(mode="json"),
                    },
                )
            )
        return profile
