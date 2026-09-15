from __future__ import annotations

import io
import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.storage import PrivateObjectStorage
from app.domains.avatar.validation import MAX_SOURCE_IMAGE_BYTES, validate_source_image
from app.domains.users.models import UserProfile
from app.domains.users.schemas import UserProfileView

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class StoredProfilePhoto:
    content: bytes
    media_type: str
    updated_at: datetime


@dataclass(slots=True)
class ProfilePhotoService:
    session: AsyncSession
    storage: PrivateObjectStorage

    async def save(self, owner_id: str, content: bytes, media_type: str) -> UserProfileView:
        try:
            source = validate_source_image(content, media_type)
            with Image.open(io.BytesIO(source.content)) as original:
                pixel_count = original.width * original.height
                if original.width < 64 or original.height < 64 or pixel_count > 36_000_000:
                    raise ValueError("profile photo dimensions are unsupported")
                original.load()
                prepared = ImageOps.exif_transpose(original).convert("RGB")
                prepared.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
                output = io.BytesIO()
                prepared.save(output, format="JPEG", optimize=True, quality=88)
                image_content = output.getvalue()
        except (
            AppError,
            Image.DecompressionBombError,
            OSError,
            UnidentifiedImageError,
            ValueError,
        ) as exc:
            raise AppError(
                "invalid_profile_photo",
                "Choose a valid JPEG, PNG, or WebP photo smaller than 10 MB.",
                400,
            ) from exc
        profile = await self._profile(owner_id)
        if profile is None:
            profile = UserProfile(owner_id=owner_id)
            self.session.add(profile)
            await self.session.flush()

        object_key = f"profile-photos/{owner_id}/profile-{uuid4()}.jpg"
        previous_key = profile.profile_photo_object_key
        await self.storage.put(
            key=object_key,
            content=image_content,
            content_type="image/jpeg",
        )
        try:
            profile.profile_photo_object_key = object_key
            profile.profile_photo_media_type = "image/jpeg"
            profile.profile_photo_updated_at = datetime.now(UTC)
            await self.session.flush()
            await self.session.commit()
            await self.session.refresh(profile)
        except Exception:
            await self.storage.delete(key=object_key)
            raise
        if previous_key and previous_key != object_key:
            try:
                await self.storage.delete(key=previous_key)
            except Exception:
                # The committed profile already points to the new valid object. A failed cleanup
                # must not roll that reference back to the obsolete object.
                logger.warning("profile_photo_previous_object_cleanup_failed")
        return UserProfileView.model_validate(profile)

    async def read(self, owner_id: str) -> StoredProfilePhoto:
        profile = await self._profile(owner_id)
        if profile is None or not profile.profile_photo_object_key:
            raise AppError("profile_photo_not_found", "No profile photo has been added yet.", 404)
        try:
            content = await self.storage.read(key=profile.profile_photo_object_key)
        except FileNotFoundError as exc:
            raise AppError(
                "profile_photo_not_found", "No profile photo has been added yet.", 404
            ) from exc
        return StoredProfilePhoto(
            content=content,
            media_type=profile.profile_photo_media_type or "application/octet-stream",
            updated_at=profile.profile_photo_updated_at or profile.updated_at,
        )

    async def delete(self, owner_id: str) -> None:
        profile = await self._profile(owner_id)
        if profile is None or not profile.profile_photo_object_key:
            return
        object_key = profile.profile_photo_object_key
        profile.profile_photo_object_key = None
        profile.profile_photo_media_type = None
        profile.profile_photo_updated_at = None
        await self.session.flush()
        await self.session.commit()
        try:
            await self.storage.delete(key=object_key)
        except Exception:
            # The profile no longer exposes the object. Cleanup can be retried operationally.
            logger.warning("profile_photo_deleted_object_cleanup_failed")

    async def _profile(self, owner_id: str) -> UserProfile | None:
        return await self.session.scalar(
            select(UserProfile)
            .where(UserProfile.owner_id == owner_id)
            .execution_options(populate_existing=True)
        )


async def delete_profile_photo_account_data(
    session: AsyncSession, storage: PrivateObjectStorage, owner_id: str
) -> None:
    keys = await session.scalars(
        select(UserProfile.profile_photo_object_key).where(UserProfile.owner_id == owner_id)
    )
    for key in keys:
        if key:
            await storage.delete(key=key)


PROFILE_PHOTO_UPLOAD_LIMIT = MAX_SOURCE_IMAGE_BYTES + 1
