from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.training.substitution_models import (
    SessionSubstitutionEvent,
    SessionSubstitutionProposal,
)


class SubstitutionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def proposal(
        self, owner_id: str, proposal_id: UUID
    ) -> SessionSubstitutionProposal | None:
        result = await self.session.execute(
            select(SessionSubstitutionProposal)
            .where(
                SessionSubstitutionProposal.owner_id == owner_id,
                SessionSubstitutionProposal.id == proposal_id,
            )
            .with_for_update()
        )
        return result.scalar_one_or_none()

    async def approval_key_used(self, owner_id: str, key: str) -> bool:
        # Serialize keys across different proposals and sessions for this owner.
        await self.session.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
            {"key": f"substitution:{owner_id}:{key}"},
        )
        result = await self.session.scalar(
            select(SessionSubstitutionProposal.id).where(
                SessionSubstitutionProposal.owner_id == owner_id,
                SessionSubstitutionProposal.approval_key == key,
            )
        )
        return result is not None

    async def save(self, proposal: SessionSubstitutionProposal) -> None:
        self.session.add(proposal)
        await self.session.flush()

    async def pending(self, owner: str, session_id: UUID):
        return list(
            await self.session.scalars(
                select(SessionSubstitutionProposal)
                .where(
                    SessionSubstitutionProposal.owner_id == owner,
                    SessionSubstitutionProposal.session_id == session_id,
                    SessionSubstitutionProposal.status == "pending",
                    SessionSubstitutionProposal.expires_at > datetime.now(UTC),
                )
                .order_by(SessionSubstitutionProposal.expires_at.desc())
                .limit(10)
            )
        )

    async def event(self, **values) -> SessionSubstitutionEvent:
        event = SessionSubstitutionEvent(**values)
        self.session.add(event)
        await self.session.flush()
        return event
