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
    AvatarSourceImage,
    AvatarSourcePhotoRepository,
    AvatarState,
    BodyAvatarPresentation,
    BodyAvatarStyle,
    BodyMetricsReader,
    BodyMetricsSnapshot,
    BodyMetricsSource,
    ManualBodyMetricsWriter,
    PrivateAvatarStorage,
)
from app.domains.avatar.models import AvatarRecord, AvatarSourcePhotoRecord
from app.domains.avatar.repository import AvatarRepository
from app.domains.avatar.schemas import (
    AvatarListView,
    AvatarMeasurementStatusView,
    AvatarSourcePhotoView,
    AvatarView,
    CreateAvatarRequest,
    ManualBodyMeasurementsRequest,
)
from app.domains.avatar.shape import classify_body_shape
from app.domains.avatar.validation import validate_generated_image, validate_source_image


class AvatarService:
    def __init__(
        self,
        repository: AvatarRepository,
        provider: AvatarProvider,
        storage: PrivateAvatarStorage,
        body_metrics_reader: BodyMetricsReader,
        manual_metrics_writer: ManualBodyMetricsWriter | None = None,
        source_photo_repository: AvatarSourcePhotoRepository | None = None,
        *,
        provider_timeout_seconds: float = 30,
    ) -> None:
        self._repository = repository
        self._provider = provider
        self._storage = storage
        self._body_metrics_reader = body_metrics_reader
        self._manual_metrics_writer = manual_metrics_writer
        self._source_photo_repository = source_photo_repository
        self._provider_timeout_seconds = provider_timeout_seconds

    async def create(self, owner_id: str, request: CreateAvatarRequest) -> AvatarView:
        metrics = await self._require_body_metrics(owner_id)
        if request.source_photo_id is not None:
            await self._require_source_photo(owner_id, request.source_photo_id)
        now = datetime.now(UTC)
        avatar = AvatarRecord(
            id=uuid4(),
            owner_id=owner_id,
            source_photo_id=request.source_photo_id,
            generated_object_key=None,
            generated_media_type=None,
            state=AvatarState.REQUESTED,
            style=request.style.value,
            presentation=request.presentation.value,
            shape_profile=classify_body_shape(metrics, request.presentation).value,
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

    async def save_source_photo(
        self, owner_id: str, content: bytes, media_type: str
    ) -> AvatarSourcePhotoView:
        if self._source_photo_repository is None:
            raise AppError(
                code="avatar_source_unavailable",
                message="Source photo uploads are unavailable right now.",
                status_code=503,
            )
        source = validate_source_image(content, media_type)
        object_key = await self._storage.put_private(source.content, source.media_type)
        record = AvatarSourcePhotoRecord(
            id=uuid4(),
            owner_id=owner_id,
            object_key=object_key,
            media_type=source.media_type,
            created_at=datetime.now(UTC),
        )
        try:
            await self._source_photo_repository.add(record)
        except Exception:
            await self._storage.delete_private(object_key)
            raise
        return AvatarSourcePhotoView(id=record.id)

    async def delete_source_photo(self, owner_id: str, source_photo_id: UUID) -> None:
        source_photo = await self._require_source_photo(owner_id, source_photo_id)
        try:
            await self._storage.delete_private(source_photo.object_key)
        except Exception as exc:
            raise AppError(
                code="avatar_source_delete_incomplete",
                message="The source photo could not be deleted. Try again.",
                status_code=503,
            ) from exc
        if self._source_photo_repository is None:
            raise RuntimeError("source photo repository validation did not run")
        await self._source_photo_repository.delete(source_photo)

    async def measurement_status(
        self,
        owner_id: str,
        presentation: BodyAvatarPresentation = BodyAvatarPresentation.MEN,
    ) -> AvatarMeasurementStatusView:
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
            shape_profile=classify_body_shape(metrics, presentation).value,
        )

    async def save_manual_measurements(
        self, owner_id: str, request: ManualBodyMeasurementsRequest
    ) -> None:
        if self._manual_metrics_writer is None:
            raise AppError(
                code="manual_measurements_unavailable",
                message="Manual measurements are not available right now.",
                status_code=503,
            )
        snapshot = BodyMetricsSnapshot(
            height_cm=request.height_cm,
            weight_kg=request.weight_kg,
            body_fat_percentage=request.body_fat_percentage,
            skeletal_muscle_mass_kg=request.skeletal_muscle_mass_kg,
            recorded_at=datetime.now(UTC),
            source=BodyMetricsSource.PROFILE,
        )
        await self._manual_metrics_writer.save_manual(owner_id, snapshot)

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
            source_image = await self._read_source_image(avatar)
            result = await asyncio.wait_for(
                self._provider.generate(
                    AvatarGenerationRequest(
                        metrics=metrics,
                        style=BodyAvatarStyle(avatar.style),
                        presentation=BodyAvatarPresentation(avatar.presentation),
                        source_image=source_image,
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
        avatar.shape_profile = classify_body_shape(
            metrics, BodyAvatarPresentation(avatar.presentation)
        ).value
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
            presentation=avatar.presentation,
            shape_profile=avatar.shape_profile,
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

    async def _require_source_photo(self, owner_id: str, source_photo_id: UUID):
        if self._source_photo_repository is None:
            raise AppError(
                code="avatar_source_unavailable",
                message="Source photo uploads are unavailable right now.",
                status_code=503,
            )
        source_photo = await self._source_photo_repository.get_for_owner(
            source_photo_id, owner_id
        )
        if source_photo is None:
            raise AppError(
                code="avatar_source_not_found",
                message="Source photo not found.",
                status_code=404,
            )
        return source_photo

    async def _read_source_image(self, avatar: AvatarRecord) -> AvatarSourceImage | None:
        if avatar.source_photo_id is None:
            return None
        source_photo = await self._require_source_photo(avatar.owner_id, avatar.source_photo_id)
        content = await self._storage.get_private(source_photo.object_key)
        source = validate_source_image(content, source_photo.media_type)
        return AvatarSourceImage(content=source.content, media_type=source.media_type)
