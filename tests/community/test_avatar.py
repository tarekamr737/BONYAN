from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from uuid import UUID

import pytest
from pydantic import ValidationError

from app.core.errors import AppError
from app.domains.avatar.contracts import (
    AvatarGenerationRequest,
    AvatarGenerationResult,
    AvatarProvider,
    AvatarState,
    BodyAvatarPresentation,
    BodyAvatarStyle,
    BodyMetricsSnapshot,
    BodyMetricsSource,
)
from app.domains.avatar.models import AvatarRecord
from app.domains.avatar.schemas import (
    CreateAvatarRequest,
    ManualBodyMeasurementsRequest,
)
from app.domains.avatar.service import AvatarService
from app.integrations.avatar.mock import (
    CinematicBodyProfile,
    MockAvatarProvider,
    select_cinematic_body_profile,
)

MEASURED_AT = datetime(2026, 8, 24, 9, 30, tzinfo=UTC)
CONFIRMED_METRICS = BodyMetricsSnapshot(
    height_cm=178,
    weight_kg=82,
    body_fat_percentage=18.5,
    skeletal_muscle_mass_kg=36.2,
    recorded_at=MEASURED_AT,
    source=BodyMetricsSource.INBODY,
)


class FakeAvatarRepository:
    def __init__(self) -> None:
        self.items: dict[UUID, AvatarRecord] = {}

    async def add(self, avatar: AvatarRecord) -> None:
        self.items[avatar.id] = avatar

    async def get_for_owner(
        self, avatar_id: UUID, owner_id: str
    ) -> AvatarRecord | None:
        avatar = self.items.get(avatar_id)
        return avatar if avatar and avatar.owner_id == owner_id else None

    async def list_for_owner(self, owner_id: str) -> list[AvatarRecord]:
        return sorted(
            (avatar for avatar in self.items.values() if avatar.owner_id == owner_id),
            key=lambda avatar: (avatar.created_at, avatar.id),
            reverse=True,
        )

    async def save(self, avatar: AvatarRecord) -> None:
        self.items[avatar.id] = avatar

    async def delete(self, avatar: AvatarRecord) -> None:
        self.items.pop(avatar.id, None)


class FakePrivateStorage:
    def __init__(self) -> None:
        self.items: dict[str, tuple[bytes, str]] = {}
        self.deleted: list[str] = []
        self._counter = 0

    async def put_private(self, content: bytes, media_type: str) -> str:
        self._counter += 1
        key = f"private/avatar-{self._counter}"
        self.items[key] = (content, media_type)
        return key

    async def get_private(self, object_key: str) -> bytes:
        return self.items[object_key][0]

    async def create_read_url(self, object_key: str, *, expires_in_seconds: int) -> str:
        assert object_key in self.items
        return (
            f"https://private-storage.test/read/{object_key}?ttl={expires_in_seconds}"
        )

    async def delete_private(self, object_key: str) -> None:
        self.items.pop(object_key, None)
        self.deleted.append(object_key)


class FakeBodyMetricsReader:
    def __init__(
        self, snapshot: BodyMetricsSnapshot | None = CONFIRMED_METRICS
    ) -> None:
        self.snapshot = snapshot
        self.requests: list[str] = []
        self.manual_saves: list[str] = []

    async def latest_confirmed(self, owner_id: str) -> BodyMetricsSnapshot | None:
        self.requests.append(owner_id)
        return self.snapshot

    async def save_manual(self, owner_id: str, snapshot: BodyMetricsSnapshot) -> None:
        self.manual_saves.append(owner_id)
        self.snapshot = snapshot


def make_service(
    *,
    provider: AvatarProvider | None = None,
    timeout_seconds: float = 0.1,
    metrics_reader: FakeBodyMetricsReader | None = None,
) -> tuple[
    AvatarService, FakeAvatarRepository, FakePrivateStorage, FakeBodyMetricsReader
]:
    repository = FakeAvatarRepository()
    storage = FakePrivateStorage()
    reader = metrics_reader or FakeBodyMetricsReader()
    service = AvatarService(
        repository,
        provider or MockAvatarProvider(),
        storage,
        reader,
        manual_metrics_writer=reader,
        provider_timeout_seconds=timeout_seconds,
    )
    return service, repository, storage, reader


def create_request() -> CreateAvatarRequest:
    return CreateAvatarRequest(style=BodyAvatarStyle.CINEMATIC_3D)


def test_confirmed_metrics_generate_private_result_without_storing_raw_values() -> None:
    async def scenario() -> None:
        service, repository, storage, reader = make_service()
        view = await service.create("user-1", create_request())

        assert view.state is AvatarState.READY_FOR_REVIEW
        assert view.public_in_community is False
        assert view.measurement_source == "inbody"
        assert view.presentation == "men"
        assert view.shape_profile == "fit"
        assert view.measurements_recorded_at == MEASURED_AT
        assert reader.requests == ["user-1"]
        assert await service.get_community_identity("user-1", view.id) is None
        serialized = str(view.model_dump(mode="json")).lower()
        assert "weight" not in serialized
        assert "body_fat" not in serialized
        assert "muscle" not in serialized
        record = repository.items[view.id]
        assert record.generated_object_key in storage.items
        assert record.generated_media_type == "image/png"
        assert not hasattr(record, "source_object_key")

    asyncio.run(scenario())


def test_measurement_status_shares_availability_not_measurement_values() -> None:
    async def scenario() -> None:
        service, _, _, _ = make_service()

        status = await service.measurement_status("user-1")
        serialized = status.model_dump(mode="json")

        assert serialized == {
            "available": True,
            "source": "inbody",
            "recorded_at": "2026-08-24T09:30:00Z",
            "body_fat_available": True,
            "muscle_mass_available": True,
            "shape_profile": "fit",
        }
        assert "82" not in str(serialized)
        assert "178" not in str(serialized)

    asyncio.run(scenario())


def test_manual_measurements_become_the_confirmed_shape_source() -> None:
    async def scenario() -> None:
        service, _, _, reader = make_service()

        await service.save_manual_measurements(
            "user-1",
            ManualBodyMeasurementsRequest(
                height_cm=165,
                weight_kg=95,
                body_fat_percentage=40,
                skeletal_muscle_mass_kg=25,
            ),
        )
        status = await service.measurement_status(
            "user-1", BodyAvatarPresentation.WOMEN
        )

        assert reader.manual_saves == ["user-1"]
        assert status.source == "profile"
        assert status.shape_profile == "full"
        assert status.body_fat_available is True
        serialized = status.model_dump(mode="json")
        assert set(serialized) == {
            "available",
            "source",
            "recorded_at",
            "body_fat_available",
            "muscle_mass_available",
            "shape_profile",
        }

    asyncio.run(scenario())


def test_manual_measurements_reject_impossible_muscle_mass() -> None:
    with pytest.raises(ValidationError):
        ManualBodyMeasurementsRequest(
            height_cm=165,
            weight_kg=70,
            skeletal_muscle_mass_kg=70,
        )


def test_missing_confirmed_metrics_block_generation_before_storage() -> None:
    async def scenario() -> None:
        reader = FakeBodyMetricsReader(None)
        service, repository, storage, _ = make_service(metrics_reader=reader)

        with pytest.raises(AppError) as error:
            await service.create("user-1", create_request())

        assert error.value.code == "body_metrics_required"
        assert error.value.status_code == 409
        assert not repository.items
        assert not storage.items

    asyncio.run(scenario())


def test_request_rejects_uploaded_photos_and_body_measurements() -> None:
    with pytest.raises(ValidationError):
        CreateAvatarRequest.model_validate(
            {
                "style": "cinematic_3d",
                "source_image_base64": "private-photo",
                "weight_kg": 82,
                "body_fat_percentage": 18.5,
            }
        )


def test_mock_selects_distinct_cinematic_profiles_from_confirmed_metrics() -> None:
    async def scenario() -> None:
        provider = MockAvatarProvider()
        first = await provider.generate(
            AvatarGenerationRequest(
                metrics=CONFIRMED_METRICS,
                style=BodyAvatarStyle.CINEMATIC_3D,
            )
        )
        second = await provider.generate(
            AvatarGenerationRequest(
                metrics=BodyMetricsSnapshot(
                    height_cm=165,
                    weight_kg=98,
                    body_fat_percentage=34,
                    skeletal_muscle_mass_kg=31,
                    recorded_at=MEASURED_AT,
                    source=BodyMetricsSource.INBODY,
                ),
                style=BodyAvatarStyle.CINEMATIC_3D,
            )
        )

        assert first.content.startswith(b"\x89PNG\r\n\x1a\n")
        assert second.content.startswith(b"\x89PNG\r\n\x1a\n")
        assert first.content != second.content

    asyncio.run(scenario())


def test_skeletal_muscle_mass_can_select_the_strong_profile() -> None:
    baseline = BodyMetricsSnapshot(
        height_cm=178,
        weight_kg=86,
        body_fat_percentage=20,
        skeletal_muscle_mass_kg=35,
        recorded_at=MEASURED_AT,
        source=BodyMetricsSource.INBODY,
    )
    higher_muscle = BodyMetricsSnapshot(
        height_cm=178,
        weight_kg=86,
        body_fat_percentage=20,
        skeletal_muscle_mass_kg=39,
        recorded_at=MEASURED_AT,
        source=BodyMetricsSource.INBODY,
    )

    assert select_cinematic_body_profile(baseline) is CinematicBodyProfile.FIT
    assert select_cinematic_body_profile(higher_muscle) is CinematicBodyProfile.STRONG


def test_women_shape_thresholds_and_assets_are_distinct() -> None:
    metrics = BodyMetricsSnapshot(
        height_cm=165,
        weight_kg=65,
        body_fat_percentage=27,
        skeletal_muscle_mass_kg=25,
        recorded_at=MEASURED_AT,
        source=BodyMetricsSource.INBODY,
    )
    assert (
        select_cinematic_body_profile(metrics, BodyAvatarPresentation.WOMEN)
        is CinematicBodyProfile.FIT
    )

    async def scenario() -> None:
        provider = MockAvatarProvider()
        men = await provider.generate(
            AvatarGenerationRequest(metrics, BodyAvatarStyle.CINEMATIC_3D)
        )
        women = await provider.generate(
            AvatarGenerationRequest(
                metrics, BodyAvatarStyle.CINEMATIC_3D, BodyAvatarPresentation.WOMEN
            )
        )
        assert men.content != women.content

    asyncio.run(scenario())


@pytest.mark.parametrize(
    ("presentation", "weight", "body_fat", "muscle", "expected"),
    [
        (BodyAvatarPresentation.MEN, 55, 9, 26, CinematicBodyProfile.SKINNY),
        (BodyAvatarPresentation.MEN, 68, 14, 31, CinematicBodyProfile.SLIM),
        (BodyAvatarPresentation.MEN, 82, 23, 33, CinematicBodyProfile.NORMAL),
        (BodyAvatarPresentation.MEN, 82, 18, 36, CinematicBodyProfile.FIT),
        (BodyAvatarPresentation.MEN, 90, 22, 42, CinematicBodyProfile.STRONG),
        (BodyAvatarPresentation.MEN, 100, 29, 40, CinematicBodyProfile.FULL),
        (BodyAvatarPresentation.WOMEN, 45, 18, 18, CinematicBodyProfile.SKINNY),
        (BodyAvatarPresentation.WOMEN, 55, 23, 21, CinematicBodyProfile.SLIM),
        (BodyAvatarPresentation.WOMEN, 68, 31, 23, CinematicBodyProfile.NORMAL),
        (BodyAvatarPresentation.WOMEN, 65, 27, 25, CinematicBodyProfile.FIT),
        (BodyAvatarPresentation.WOMEN, 75, 30, 30, CinematicBodyProfile.STRONG),
        (BodyAvatarPresentation.WOMEN, 82, 37, 28, CinematicBodyProfile.FULL),
    ],
)
def test_six_shape_profiles_cover_men_and_women(
    presentation: BodyAvatarPresentation,
    weight: float,
    body_fat: float,
    muscle: float,
    expected: CinematicBodyProfile,
) -> None:
    metrics = BodyMetricsSnapshot(
        height_cm=178 if presentation is BodyAvatarPresentation.MEN else 165,
        weight_kg=weight,
        body_fat_percentage=body_fat,
        skeletal_muscle_mass_kg=muscle,
        recorded_at=MEASURED_AT,
        source=BodyMetricsSource.INBODY,
    )
    assert select_cinematic_body_profile(metrics, presentation) is expected


def test_approval_does_not_publish_without_a_second_explicit_action() -> None:
    async def scenario() -> None:
        service, _, _, _ = make_service()
        created = await service.create("user-1", create_request())

        approved = await service.approve("user-1", created.id)
        assert approved.approved is True
        assert approved.public_in_community is False
        assert await service.get_community_identity("user-1", created.id) is None

        published = await service.set_public_use("user-1", created.id, enabled=True)
        identity = await service.get_community_identity("user-1", created.id)
        assert published.public_in_community is True
        assert identity is not None
        assert identity.avatar_id == created.id

    asyncio.run(scenario())


def test_provider_failure_is_safe_and_retryable() -> None:
    async def scenario() -> None:
        service, repository, storage, _ = make_service(
            provider=MockAvatarProvider(fail_with="provider_unavailable")
        )
        view = await service.create("user-1", create_request())

        assert view.state is AvatarState.FAILED
        assert view.failure_code == "provider_unavailable"
        assert view.preview_url is None
        assert repository.items[view.id].generated_object_key is None
        assert not storage.items

    asyncio.run(scenario())


def test_provider_timeout_leaves_metrics_available_for_retry() -> None:
    class SlowProvider:
        async def generate(
            self, request: AvatarGenerationRequest
        ) -> AvatarGenerationResult:
            del request
            await asyncio.sleep(0.02)
            return AvatarGenerationResult(
                content=b"\x89PNG\r\n\x1a\nlate", media_type="image/png", model="TBD"
            )

    async def scenario() -> None:
        service, repository, storage, reader = make_service(
            provider=SlowProvider(), timeout_seconds=0.001
        )

        view = await service.create("user-1", create_request())

        assert view.state is AvatarState.FAILED
        assert view.failure_code == "provider_timeout"
        assert repository.items[view.id].generated_object_key is None
        assert reader.snapshot is CONFIRMED_METRICS
        assert not storage.items

    asyncio.run(scenario())


def test_unexpected_provider_failure_becomes_retryable_state() -> None:
    class ExplodingProvider:
        async def generate(
            self, request: AvatarGenerationRequest
        ) -> AvatarGenerationResult:
            del request
            raise RuntimeError("provider internals must not escape")

    async def scenario() -> None:
        service, repository, storage, _ = make_service(provider=ExplodingProvider())

        view = await service.create("user-1", create_request())

        assert view.state is AvatarState.FAILED
        assert view.failure_code == "generation_failed"
        assert repository.items[view.id].generated_object_key is None
        assert not storage.items

    asyncio.run(scenario())


def test_regeneration_uses_latest_confirmed_metrics_and_replaces_asset() -> None:
    async def scenario() -> None:
        service, repository, storage, reader = make_service()
        created = await service.create("user-1", create_request())
        old_key = repository.items[created.id].generated_object_key
        reader.snapshot = BodyMetricsSnapshot(
            height_cm=178,
            weight_kg=78,
            body_fat_percentage=15,
            skeletal_muscle_mass_kg=37,
            recorded_at=datetime(2026, 8, 25, 10, tzinfo=UTC),
            source=BodyMetricsSource.INBODY,
        )

        regenerated = await service.regenerate("user-1", created.id)
        new_key = repository.items[created.id].generated_object_key

        assert regenerated.state is AvatarState.READY_FOR_REVIEW
        assert reader.snapshot is not None
        assert regenerated.measurements_recorded_at == reader.snapshot.recorded_at
        assert new_key != old_key
        assert old_key in storage.deleted
        assert new_key in storage.items

    asyncio.run(scenario())


def test_delete_removes_only_generated_asset_and_record() -> None:
    async def scenario() -> None:
        service, repository, storage, _ = make_service()
        created = await service.create("user-1", create_request())
        generated_key = repository.items[created.id].generated_object_key

        await service.delete("user-1", created.id)

        assert created.id not in repository.items
        assert storage.deleted == [generated_key]
        assert not storage.items

    asyncio.run(scenario())


def test_cross_user_access_and_mutations_return_not_found() -> None:
    async def scenario() -> None:
        service, repository, storage, _ = make_service()
        created = await service.create("owner", create_request())
        original_key = repository.items[created.id].generated_object_key

        with pytest.raises(AppError) as error:
            await service.get("someone-else", created.id)
        assert error.value.code == "avatar_not_found"
        assert error.value.status_code == 404

        mutations = [
            lambda: service.approve("someone-else", created.id),
            lambda: service.regenerate("someone-else", created.id),
            lambda: service.set_public_use("someone-else", created.id, enabled=True),
            lambda: service.delete("someone-else", created.id),
        ]
        for mutate in mutations:
            with pytest.raises(AppError) as mutation_error:
                await mutate()
            assert mutation_error.value.code == "avatar_not_found"

        assert repository.items[created.id].generated_object_key == original_key
        assert original_key in storage.items
        assert not storage.deleted

    asyncio.run(scenario())


def test_avatar_list_is_owner_scoped_and_never_serializes_metrics() -> None:
    async def scenario() -> None:
        service, _, _, _ = make_service()
        own = await service.create("owner", create_request())
        await service.create("other", create_request())

        result = await service.list_owned("owner")

        assert [avatar.id for avatar in result.items] == [own.id]
        serialized = str(result.model_dump(mode="json")).lower()
        assert "weight" not in serialized
        assert "body_fat" not in serialized
        assert "muscle" not in serialized

    asyncio.run(scenario())
