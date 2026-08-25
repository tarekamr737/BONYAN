from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.core.errors import AppError
from app.domains.avatar.contracts import (
    AvatarCommunityIdentity,
    AvatarGenerationRequest,
    AvatarProvider,
    AvatarProviderError,
    AvatarState,
    BodyAvatarStyle,
    BodyMetricsReader,
    BodyMetricsSnapshot,
    PrivateAvatarStorage,
)
from app.domains.avatar.models import AvatarRecord
from app.domains.avatar.repository import AvatarRepository
from app.domains.avatar.schemas import (
    AvatarListView,
    AvatarMeasurementStatusView,
    AvatarView,
    CreateAvatarRequest,
)
from app.domains.avatar.validation import validate_generated_image


class AvatarService:
    def __init__(
        self,
        repository: AvatarRepository,
        provider: AvatarProvider,
        storage: PrivateAvatarStorage,
        body_metrics_reader: BodyMetricsReader,
        *,
        provider_timeout_seconds: float = 30,
    ) -> None:
        self._repository = repository
        self._provider = provider
        self._storage = storage
        self._body_metrics_reader = body_metrics_reader
        self._provider_timeout_seconds = provider_timeout_seconds

    async def create(self, owner_id: str, request: CreateAvatarRequest) -> AvatarView:
        metrics = await self._require_body_metrics(owner_id)
        now = datetime.now(UTC)
        avatar = AvatarRecord(
            id=uuid4(),
            owner_id=owner_id,
            generated_object_key=None,
            generated_media_type=None,
            state=AvatarState.REQUESTED,
            style=request.style.value,
            provider_model="TBD",
            measurement_source=metrics.source.value,
            measurements_recorded_at=metrics.recorded_at,
            failure_code=None,
            is_public=False,
            created_at=now,
            updated_at=now,
        )
        await self._repository.add(avatar)
        await self._generate(avatar, metrics)
        return await self._to_view(avatar)

    async def measurement_status(self, owner_id: str) -> AvatarMeasurementStatusView:
        metrics = await self._body_metrics_reader.latest_confirmed(owner_id)
        if metrics is None:
            return AvatarMeasurementStatusView(
                available=False,
                source=None,
                recorded_at=None,
            )
        return AvatarMeasurementStatusView(
            available=True,
            source=metrics.source.value,
            recorded_at=metrics.recorded_at,
            body_fat_available=metrics.body_fat_percentage is not None,
            muscle_mass_available=metrics.skeletal_muscle_mass_kg is not None,
        )

    async def get(self, owner_id: str, avatar_id: UUID) -> AvatarView:
        avatar = await self._require_owned(owner_id, avatar_id)
        return await self._to_view(avatar)

    async def list_owned(self, owner_id: str) -> AvatarListView:
        avatars = await self._repository.list_for_owner(owner_id)
        return AvatarListView(items=[await self._to_view(avatar) for avatar in avatars])

    async def approve(self, owner_id: str, avatar_id: UUID) -> AvatarView:
        avatar = await self._require_owned(owner_id, avatar_id)
        if avatar.state is not AvatarState.READY_FOR_REVIEW:
            raise AppError(
                code="avatar_not_ready",
                message="Only an avatar ready for review can be approved.",
                status_code=409,
            )
        avatar.state = AvatarState.APPROVED
        avatar.is_public = False
        self._touch(avatar)
        await self._repository.save(avatar)
        return await self._to_view(avatar)

    async def reject(self, owner_id: str, avatar_id: UUID) -> AvatarView:
        avatar = await self._require_owned(owner_id, avatar_id)
        if avatar.state is not AvatarState.READY_FOR_REVIEW:
            raise AppError(
                code="avatar_not_ready",
                message="Only an avatar ready for review can be rejected.",
                status_code=409,
            )
        avatar.state = AvatarState.REJECTED
        avatar.is_public = False
        self._touch(avatar)
        await self._repository.save(avatar)
        return await self._to_view(avatar)

    async def regenerate(self, owner_id: str, avatar_id: UUID) -> AvatarView:
        avatar = await self._require_owned(owner_id, avatar_id)
        if avatar.state is AvatarState.PROCESSING:
            raise AppError(
                code="avatar_processing",
                message="Avatar generation is already in progress.",
                status_code=409,
            )
        metrics = await self._require_body_metrics(owner_id)
        avatar.is_public = False
        await self._generate(avatar, metrics)
        return await self._to_view(avatar)

    async def set_public_use(
        self, owner_id: str, avatar_id: UUID, *, enabled: bool
    ) -> AvatarView:
        avatar = await self._require_owned(owner_id, avatar_id)
        if enabled and avatar.state is not AvatarState.APPROVED:
            raise AppError(
                code="avatar_not_approved",
                message="Approve this avatar before using it in the community.",
                status_code=409,
            )
        avatar.is_public = enabled
        self._touch(avatar)
        await self._repository.save(avatar)
        return await self._to_view(avatar)

    async def delete(self, owner_id: str, avatar_id: UUID) -> None:
        avatar = await self._require_owned(owner_id, avatar_id)
        try:
            if avatar.generated_object_key:
                await self._storage.delete_private(avatar.generated_object_key)
        except Exception as exc:
            raise AppError(
                code="avatar_delete_incomplete",
                message="The avatar could not be deleted. Try again.",
                status_code=503,
            ) from exc
        await self._repository.delete(avatar)

    async def get_community_identity(
        self, owner_id: str, avatar_id: UUID
    ) -> AvatarCommunityIdentity | None:
        avatar = await self._repository.get_for_owner(avatar_id, owner_id)
        if (
            avatar is None
            or avatar.state is not AvatarState.APPROVED
            or not avatar.is_public
            or avatar.generated_object_key is None
        ):
            return None
        image_url = await self._storage.create_read_url(
            avatar.generated_object_key, expires_in_seconds=300
        )
        return AvatarCommunityIdentity(avatar_id=avatar.id, image_url=image_url)

    async def _generate(self, avatar: AvatarRecord, metrics: BodyMetricsSnapshot) -> None:
        previous_generated_key = avatar.generated_object_key
        avatar.state = AvatarState.PROCESSING
        avatar.failure_code = None
        avatar.is_public = False
        self._touch(avatar)
        await self._repository.save(avatar)
        try:
            result = await asyncio.wait_for(
                self._provider.generate(
                    AvatarGenerationRequest(
                        metrics=metrics,
                        style=BodyAvatarStyle(avatar.style),
                    )
                ),
                timeout=self._provider_timeout_seconds,
            )
            generated = validate_generated_image(result.content, result.media_type)
            generated_key = await self._storage.put_private(
                generated.content, generated.media_type
            )
        except TimeoutError:
            avatar.state = AvatarState.FAILED
            avatar.failure_code = "provider_timeout"
            self._touch(avatar)
            await self._repository.save(avatar)
            return
        except AvatarProviderError as exc:
            avatar.state = AvatarState.FAILED
            avatar.failure_code = exc.code
            self._touch(avatar)
            await self._repository.save(avatar)
            return
        except AppError as exc:
            avatar.state = AvatarState.FAILED
            avatar.failure_code = exc.code
            self._touch(avatar)
            await self._repository.save(avatar)
            return
        except Exception:
            avatar.state = AvatarState.FAILED
            avatar.failure_code = "generation_failed"
            self._touch(avatar)
            await self._repository.save(avatar)
            return

        avatar.generated_object_key = generated_key
        avatar.generated_media_type = generated.media_type
        avatar.provider_model = result.model or "TBD"
        avatar.measurement_source = metrics.source.value
        avatar.measurements_recorded_at = metrics.recorded_at
        avatar.state = AvatarState.READY_FOR_REVIEW
        avatar.failure_code = None
        self._touch(avatar)
        await self._repository.save(avatar)
        if previous_generated_key and previous_generated_key != generated_key:
            await self._storage.delete_private(previous_generated_key)

    async def _require_owned(self, owner_id: str, avatar_id: UUID) -> AvatarRecord:
        avatar = await self._repository.get_for_owner(avatar_id, owner_id)
        if avatar is None:
            raise AppError(
                code="avatar_not_found",
                message="Avatar not found.",
                status_code=404,
            )
        return avatar

    async def _to_view(self, avatar: AvatarRecord) -> AvatarView:
        preview_url = None
        if avatar.generated_object_key and avatar.state is not AvatarState.FAILED:
            preview_url = await self._storage.create_read_url(
                avatar.generated_object_key, expires_in_seconds=300
            )
        return AvatarView(
            id=avatar.id,
            state=avatar.state,
            style=avatar.style,
            preview_url=preview_url,
            approved=avatar.state is AvatarState.APPROVED,
            public_in_community=avatar.is_public,
            failure_code=avatar.failure_code,
            measurement_source=avatar.measurement_source,
            measurements_recorded_at=avatar.measurements_recorded_at,
            created_at=avatar.created_at,
            updated_at=avatar.updated_at,
        )

    @staticmethod
    def _touch(avatar: AvatarRecord) -> None:
        avatar.updated_at = datetime.now(UTC)

    async def _require_body_metrics(self, owner_id: str) -> BodyMetricsSnapshot:
        metrics = await self._body_metrics_reader.latest_confirmed(owner_id)
        if metrics is None:
            raise AppError(
                code="body_metrics_required",
                message="Add confirmed height and weight data before creating your body avatar.",
                status_code=409,
            )
        return metrics
