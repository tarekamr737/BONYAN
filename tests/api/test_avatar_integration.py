from __future__ import annotations

import asyncio

import pytest

from app.core.avatar_integration import AvatarAssetSigner, SharedPrivateAvatarStorage
from app.core.errors import AppError
from app.core.storage import LocalPrivateObjectStorage


def test_avatar_asset_tokens_are_scoped_and_tamper_evident(tmp_path) -> None:
    signer = AvatarAssetSigner(b"a" * 32)
    token = signer.sign("avatars/private.png", expires_in_seconds=300)

    assert signer.verify(token) == "avatars/private.png"
    with pytest.raises(AppError):
        signer.verify(f"{token}tampered")
    with pytest.raises(AppError):
        signer.verify("not-a-token")
    with pytest.raises(AppError):
        signer.verify(signer.sign("inbody/private.pdf", expires_in_seconds=300))


def test_avatar_storage_uses_shared_private_store_and_signed_urls(tmp_path) -> None:
    async def scenario() -> None:
        object_storage = LocalPrivateObjectStorage(tmp_path)
        signer = AvatarAssetSigner(b"b" * 32)
        storage = SharedPrivateAvatarStorage(
            object_storage,
            signer,
            "https://api.bonyan.test",
        )

        object_key = await storage.put_private(b"\x89PNG\r\n\x1a\nprivate", "image/png")
        url = await storage.create_read_url(object_key, expires_in_seconds=300)

        assert object_key.startswith("avatars/")
        assert object_key not in url
        assert url.startswith("https://api.bonyan.test/api/v1/avatar-assets/")
        assert await storage.get_private(object_key) == b"\x89PNG\r\n\x1a\nprivate"
        await storage.delete_private(object_key)
        assert await object_storage.get_metadata(key=object_key) is None

    asyncio.run(scenario())
