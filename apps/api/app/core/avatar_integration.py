from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import secrets
import time
from datetime import UTC, datetime
from pathlib import PurePosixPath
from typing import Annotated
from uuid import uuid4

from fastapi import Depends
from sqlalchemy import (
    Column,
    DateTime,
    Float,
    String,
    Table,
    insert,
    select,
    update,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user
from app.core.config import Settings, get_settings
from app.core.database import Base, get_db_session
from app.core.errors import AppError
from app.core.storage import PrivateObjectStorage, get_private_object_storage
from app.domains.avatar.contracts import (
    BodyMetricsSnapshot,
    BodyMetricsSource,
)
from app.domains.avatar.repository import (
    SqlAlchemyAvatarRepository,
    SqlAlchemyAvatarSourcePhotoRepository,
)
from app.domains.avatar.service import AvatarService
from app.domains.community.contracts import CommunityActor
from app.domains.community.repository import SqlAlchemyCommunityRepository
from app.domains.community.service import CommunityService
from app.domains.inbody.models import InBodyScan
from app.integrations.avatar.mock import MockAvatarProvider
from app.integrations.avatar.production import ProductionAvatarProvider

manual_body_metrics = Table(
    "avatar_manual_body_metrics",
    Base.metadata,
    Column("owner_id", String(128), primary_key=True),
    Column("height_cm", Float, nullable=False),
    Column("weight_kg", Float, nullable=False),
    Column("body_fat_percentage", Float, nullable=True),
    Column("skeletal_muscle_mass_kg", Float, nullable=True),
    Column("recorded_at", DateTime(timezone=True), nullable=False),
)


class AvatarAssetSigner:
    def __init__(self, secret: bytes) -> None:
        self._secret = secret

    def sign(self, object_key: str, *, expires_in_seconds: int) -> str:
        expires_at = int(time.time()) + expires_in_seconds
        payload = base64.urlsafe_b64encode(
            f"{expires_at}:{object_key}".encode()
        ).decode("ascii").rstrip("=")
        signature = hmac.new(self._secret, payload.encode("ascii"), hashlib.sha256).digest()
        encoded_signature = base64.urlsafe_b64encode(signature).decode("ascii").rstrip("=")
        return f"{payload}.{encoded_signature}"

    def verify(self, token: str) -> str:
        try:
            payload, encoded_signature = token.split(".", 1)
            expected = hmac.new(
                self._secret, payload.encode("ascii"), hashlib.sha256
            ).digest()
            supplied = base64.urlsafe_b64decode(
                encoded_signature + "=" * (-len(encoded_signature) % 4)
            )
            if not hmac.compare_digest(expected, supplied):
                raise ValueError("invalid signature")
            decoded = base64.urlsafe_b64decode(
                payload + "=" * (-len(payload) % 4)
            ).decode("utf-8")
            expires_at_text, object_key = decoded.split(":", 1)
            if int(expires_at_text) <= int(time.time()):
                raise ValueError("expired token")
            if not object_key.startswith("avatars/"):
                raise ValueError("invalid object scope")
            return object_key
        except (binascii.Error, ValueError, UnicodeDecodeError) as exc:
            raise AppError(
                code="avatar_asset_unavailable",
                message="This avatar preview is no longer available.",
                status_code=404,
            ) from exc


_DEVELOPMENT_SIGNING_SECRET = secrets.token_bytes(32)


def get_avatar_asset_signer(
    settings: Annotated[Settings, Depends(get_settings)],
) -> AvatarAssetSigner:
    configured = (
        settings.auth_jwt_secret.get_secret_value().encode("utf-8")
        if settings.auth_jwt_secret
        else _DEVELOPMENT_SIGNING_SECRET
    )
    return AvatarAssetSigner(configured)


class SharedPrivateAvatarStorage:
    def __init__(
        self,
        storage: PrivateObjectStorage,
        signer: AvatarAssetSigner,
        api_public_url: str,
    ) -> None:
        self._storage = storage
        self._signer = signer
        self._api_public_url = api_public_url.rstrip("/")

    async def put_private(self, content: bytes, media_type: str) -> str:
        suffix = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}[
            media_type
        ]
        object_key = f"avatars/{uuid4().hex}{suffix}"
        await self._storage.put(key=object_key, content=content, content_type=media_type)
        return object_key

    async def get_private(self, object_key: str) -> bytes:
        return await self._storage.read(key=object_key)

    async def create_read_url(self, object_key: str, *, expires_in_seconds: int) -> str:
        token = self._signer.sign(object_key, expires_in_seconds=expires_in_seconds)
        return f"{self._api_public_url}/api/v1/avatar-assets/{token}"

    async def delete_private(self, object_key: str) -> None:
        await self._storage.delete(key=object_key)


class SqlAlchemyBodyMetricsAdapter:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def latest_confirmed(self, owner_id: str) -> BodyMetricsSnapshot | None:
        manual = await self._latest_manual(owner_id)
        inbody = await self._latest_inbody(owner_id)
        candidates = [snapshot for snapshot in (manual, inbody) if snapshot is not None]
        return max(candidates, key=lambda snapshot: snapshot.recorded_at) if candidates else None

    async def save_manual(self, owner_id: str, snapshot: BodyMetricsSnapshot) -> None:
        existing = await self._session.scalar(
            select(manual_body_metrics.c.owner_id).where(
                manual_body_metrics.c.owner_id == owner_id
            )
        )
        values = {
            "height_cm": snapshot.height_cm,
            "weight_kg": snapshot.weight_kg,
            "body_fat_percentage": snapshot.body_fat_percentage,
            "skeletal_muscle_mass_kg": snapshot.skeletal_muscle_mass_kg,
            "recorded_at": snapshot.recorded_at,
        }
        if existing is None:
            await self._session.execute(
                insert(manual_body_metrics).values(owner_id=owner_id, **values)
            )
        else:
            await self._session.execute(
                update(manual_body_metrics)
                .where(manual_body_metrics.c.owner_id == owner_id)
                .values(**values)
            )
        await self._session.flush()

    async def _latest_manual(self, owner_id: str) -> BodyMetricsSnapshot | None:
        row = (
            await self._session.execute(
                select(manual_body_metrics).where(manual_body_metrics.c.owner_id == owner_id)
            )
        ).mappings().one_or_none()
        if row is None:
            return None
        return BodyMetricsSnapshot(
            height_cm=row["height_cm"],
            weight_kg=row["weight_kg"],
            body_fat_percentage=row["body_fat_percentage"],
            skeletal_muscle_mass_kg=row["skeletal_muscle_mass_kg"],
            recorded_at=_as_utc(row["recorded_at"]),
            source=BodyMetricsSource.PROFILE,
        )

    async def _latest_inbody(self, owner_id: str) -> BodyMetricsSnapshot | None:
        scan = await self._session.scalar(
            select(InBodyScan)
            .where(InBodyScan.owner_id == owner_id, InBodyScan.status == "confirmed")
            .order_by(InBodyScan.confirmed_at.desc().nullslast(), InBodyScan.created_at.desc())
            .limit(1)
        )
        if scan is None or not scan.result:
            return None
        measurements = {
            item.get("key"): item for item in scan.result.get("measurements", [])
        }
        height = _measurement_value(measurements.get("height"), "height")
        weight = _measurement_value(measurements.get("weight"), "weight")
        if height is None or weight is None:
            return None
        try:
            return BodyMetricsSnapshot(
                height_cm=height,
                weight_kg=weight,
                body_fat_percentage=_measurement_value(
                    measurements.get("body_fat_percentage"), "percentage"
                ),
                skeletal_muscle_mass_kg=_measurement_value(
                    measurements.get("skeletal_muscle_mass"), "weight"
                ),
                recorded_at=_as_utc(scan.confirmed_at or scan.created_at),
                source=BodyMetricsSource.INBODY,
            )
        except ValueError:
            return None


def _measurement_value(measurement: object, kind: str) -> float | None:
    if not isinstance(measurement, dict):
        return None
    value = measurement.get("value")
    if not isinstance(value, int | float):
        return None
    numeric = float(value)
    unit = str(measurement.get("unit") or "").strip().lower()
    if kind == "height":
        if unit in {"m", "meter", "meters"}:
            return numeric * 100
        if unit in {"in", "inch", "inches"}:
            return numeric * 2.54
        return numeric if unit in {"", "cm"} else None
    if kind == "weight":
        if unit in {"lb", "lbs", "pound", "pounds"}:
            return numeric * 0.45359237
        return numeric if unit in {"", "kg"} else None
    return numeric if unit in {"", "%", "percent", "percentage"} else None


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def get_current_user_id(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> str:
    return current_user.id


def get_current_actor(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> CommunityActor:
    return CommunityActor(user_id=current_user.id, display_name="BONYAN member")


def get_avatar_service(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    object_storage: Annotated[PrivateObjectStorage, Depends(get_private_object_storage)],
    signer: Annotated[AvatarAssetSigner, Depends(get_avatar_asset_signer)],
) -> AvatarService:
    metrics = SqlAlchemyBodyMetricsAdapter(session)
    storage = SharedPrivateAvatarStorage(
        object_storage, signer, settings.api_public_url
    )
    if settings.avatar_provider == "mock":
        provider = MockAvatarProvider(model=settings.avatar_model)
    else:
        api_key = settings.avatar_api_key
        if api_key is None:
            raise RuntimeError("AVATAR_API_KEY validation did not run")
        provider = ProductionAvatarProvider(
            api_key=api_key.get_secret_value(),
            model=settings.avatar_model,
            timeout_seconds=settings.avatar_timeout_seconds,
        )
    return AvatarService(
        SqlAlchemyAvatarRepository(session),
        provider,
        storage,
        metrics,
        manual_metrics_writer=metrics,
        source_photo_repository=SqlAlchemyAvatarSourcePhotoRepository(session),
        provider_timeout_seconds=settings.avatar_timeout_seconds,
    )


def get_community_service(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    avatar_service: Annotated[AvatarService, Depends(get_avatar_service)],
) -> CommunityService:
    return CommunityService(SqlAlchemyCommunityRepository(session), avatar_service)


async def read_avatar_asset(
    token: str,
    storage: PrivateObjectStorage,
    signer: AvatarAssetSigner,
) -> tuple[bytes, str]:
    object_key = signer.verify(token)
    if not PurePosixPath(object_key).parts[0] == "avatars":
        raise AppError("avatar_asset_unavailable", "Avatar not found.", 404)
    metadata = await storage.get_metadata(key=object_key)
    if metadata is None:
        raise AppError("avatar_asset_unavailable", "Avatar not found.", 404)
    return await storage.read(key=object_key), metadata.content_type
