from datetime import UTC, datetime, timedelta
from uuid import UUID

from app.core.errors import AppError
from app.domains.avatar.service import AvatarService
from app.domains.game.community_repository import GameCommunityRepository
from app.domains.game.models import Challenge
from app.domains.game.repository import GameRepository
from app.domains.game.rules import progress_for_habits
from app.domains.game.schemas import (
    ChallengeView,
    FriendsView,
    FriendView,
    LeagueEntry,
    LeagueView,
    SeasonView,
)
from app.domains.users.coaching_schemas import CoachingPreferences
from app.domains.users.privacy import PrivacyRepository


class GameCommunityService:
    def __init__(self, repository: GameCommunityRepository, avatars: AvatarService | None = None):
        self.repository = repository
        self.game = GameRepository(repository.session)
        self.privacy = PrivacyRepository(repository.session)
        self.avatars = avatars

    async def opt_in(self, owner: str, enabled: bool):
        target = await self.game.targets(owner, datetime.now(UTC))
        season = await self.game.season(datetime.now(UTC))
        if enabled:
            await self.repository.join(target, season.id)
        else:
            target.league_opt_in = False

    async def league(self, owner: str, mode: str) -> LeagueView:
        now = datetime.now(UTC)
        target = await self.game.targets(owner, now)
        season = await self.game.season(now)
        friendships = await self.repository.friendships(owner)
        friends = [
            item.member_b if item.member_a == owner else item.member_a
            for item in friendships
            if item.status == "accepted"
        ]
        members = (
            await self.repository.participants(target, mode, friends)
            if target.league_opt_in
            else []
        )
        owners = [member.owner_id for member in members]
        weekly = await self.repository.scores(owners, target.week_start)
        totals = (
            await self.repository.scores(owners, target.week_start, True)
            if mode == "all_time"
            else weekly
        )
        profiles = await self.repository.profiles(owners)
        public_avatars = (
            await self.avatars.get_public_identities_for_owners(owners)
            if self.avatars and owners
            else {}
        )
        ranking = []
        for member in members:
            if await self.privacy.blocked(owner, member.owner_id):
                continue
            rows = [row for row in weekly if row["owner_id"] == member.owner_id]
            counts = {row["category"]: max(0, row["count"]) for row in rows}
            profile = profiles.get(member.owner_id)
            preferences = (
                CoachingPreferences.model_validate(profile.coaching or {})
                if profile
                else CoachingPreferences()
            )
            progress = progress_for_habits(counts, member.workout_days, member.goal, preferences)
            points = max(
                0, sum(row["points"] for row in totals if row["owner_id"] == member.owner_id)
            )
            permission = await self.privacy.get(member.owner_id)
            display_name = (
                profile.display_name
                if profile and permission.display_name and profile.display_name
                else "BONYAN member"
            )
            identity = public_avatars.get(member.owner_id)
            ranking.append(
                (
                    points,
                    member.joined_at,
                    member.owner_id,
                    LeagueEntry(
                        rank=None,
                        display_name=display_name,
                        avatar_url=identity.image_url if identity else None,
                        points=points,
                        is_me=member.owner_id == owner,
                        progress_score=progress.value if permission.progress else None,
                        unranked_reason=None if progress.ranked else "insufficient_coverage",
                    ),
                )
            )
        ranking.sort(
            key=lambda item: (item[3].unranked_reason is not None, -item[0], item[1], item[2])
        )
        next_rank = 1
        for _, _, _, item in ranking:
            if item.unranked_reason is None:
                item.rank = next_rank
                next_rank += 1
        entries = [item[3] for item in ranking]
        return LeagueView(
            mode=mode,
            opted_in=target.league_opt_in,
            week_end=target.week_start + timedelta(days=7),
            season=SeasonView.model_validate(season, from_attributes=True),
            personal_rank=next((item.rank for item in entries if item.is_me), None),
            participants=entries,
        )

    async def friends(self, owner: str) -> FriendsView:
        identity = await self.repository.identity(owner)
        relationships = await self.repository.friendships(owner)
        others = [
            item.member_b if item.member_a == owner else item.member_a for item in relationships
        ]
        profiles = await self.repository.profiles(others)
        views = []
        for item, other in zip(relationships, others, strict=True):
            if await self.privacy.blocked(owner, other):
                continue
            profile = profiles.get(other)
            name = (
                profile.display_name
                if profile and (await self.privacy.get(other)).display_name
                else "BONYAN member"
            )
            views.append(
                FriendView(
                    id=item.id,
                    display_name=name or "BONYAN member",
                    status=item.status,
                    incoming=item.recipient_id == owner,
                )
            )
        return FriendsView(invite_code=identity.invite_code, items=views)

    async def invite_friend(self, owner: str, code: UUID):
        other = await self.repository.identity_by_code(code)
        if (
            other is None
            or other.owner_id == owner
            or await self.privacy.blocked(owner, other.owner_id)
        ):
            raise AppError("friend_unavailable", "This invitation is unavailable.", 404)
        await self.repository.invite(owner, other.owner_id)

    async def reply_friend(self, owner: str, id: UUID, accept: bool):
        friendship = await self.repository.friendship(owner, id)
        if friendship is None or friendship.recipient_id != owner:
            raise AppError("friend_unavailable", "This invitation is unavailable.", 404)
        if friendship.status != "pending":
            if friendship.status == ("accepted" if accept else "declined"):
                return
            raise AppError("invitation_closed", "This invitation is no longer pending.", 409)
        if await self.privacy.blocked(owner, friendship.inviter_id):
            raise AppError("friend_unavailable", "This invitation is unavailable.", 404)
        friendship.status = "accepted" if accept else "declined"

    async def create_challenge(self, owner: str, friendship_id: UUID, category: str):
        await self.game.lock(owner)
        friendship = await self.repository.friendship(owner, friendship_id)
        if friendship is None or friendship.status != "accepted":
            raise AppError("friend_unavailable", "Choose a mutually accepted friend.", 404)
        recipient = friendship.member_b if friendship.member_a == owner else friendship.member_a
        if await self.privacy.blocked(owner, recipient):
            raise AppError("friend_unavailable", "This friend is unavailable.", 404)
        challenges = await self.repository.challenges(owner)
        active = [
            item
            for item in challenges
            if item.status in {"invited", "active"} and item.ends_at > datetime.now(UTC)
        ]
        existing = next(
            (
                item
                for item in active
                if item.creator_id == owner
                and item.recipient_id == recipient
                and item.category == category
            ),
            None,
        )
        if existing:
            return existing
        if len(active) >= 3:
            raise AppError(
                "challenge_limit", "Finish an existing challenge before adding another.", 409
            )
        now = datetime.now(UTC)
        challenge = Challenge(
            creator_id=owner,
            recipient_id=recipient,
            category=category,
            target_points=20 if category == "workout" else 10,
            status="invited",
            starts_at=now,
            ends_at=now + timedelta(days=7),
        )
        self.repository.session.add(challenge)
        await self.repository.session.flush()
        return challenge

    async def reply_challenge(self, owner: str, id: UUID, accept: bool):
        challenge = await self.repository.challenge(owner, id)
        if (
            challenge is None
            or challenge.recipient_id != owner
            or await self.privacy.blocked(owner, challenge.creator_id)
        ):
            raise AppError("challenge_unavailable", "This challenge is unavailable.", 404)
        if challenge.status != "invited" or challenge.ends_at <= datetime.now(UTC):
            raise AppError("challenge_closed", "This challenge is no longer pending.", 409)
        challenge.status = "active" if accept else "declined"
        if accept:
            challenge.starts_at = datetime.now(UTC)
            challenge.ends_at = challenge.starts_at + timedelta(days=7)

    async def challenges(self, owner: str) -> list[ChallengeView]:
        result = []
        for challenge in await self.repository.challenges(owner):
            other = (
                challenge.recipient_id if challenge.creator_id == owner else challenge.creator_id
            )
            if await self.privacy.blocked(owner, other):
                continue
            mine = await self.repository.challenge_points(challenge, owner)
            theirs = await self.repository.challenge_points(challenge, other)
            status = challenge.status
            if status in {"active", "invited"} and challenge.ends_at <= datetime.now(UTC):
                status = (
                    "completed"
                    if status == "active" and min(mine, theirs) >= challenge.target_points
                    else "expired"
                )
            result.append(
                ChallengeView(
                    id=challenge.id,
                    category=challenge.category,
                    status=status,
                    incoming=challenge.recipient_id == owner,
                    target_points=challenge.target_points,
                    my_points=mine if challenge.status != "invited" else 0,
                    friend_points=theirs if challenge.status == "active" else 0,
                    starts_at=challenge.starts_at,
                    ends_at=challenge.ends_at,
                )
            )
        return result
