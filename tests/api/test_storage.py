from __future__ import annotations

import asyncio

import pytest

from app.core.storage import LocalPrivateObjectStorage


def test_local_private_storage_put_metadata_and_delete(tmp_path) -> None:
    storage = LocalPrivateObjectStorage(tmp_path)

    asyncio.run(
        storage.put(
            key="inbody/owner/document",
            content=b"private-report",
            content_type="application/pdf",
        )
    )
    metadata = asyncio.run(storage.get_metadata(key="inbody/owner/document"))

    assert metadata is not None
    assert metadata.byte_size == len(b"private-report")
    assert metadata.content_type == "application/pdf"
    assert asyncio.run(storage.read(key="inbody/owner/document")) == b"private-report"

    asyncio.run(storage.delete(key="inbody/owner/document"))
    assert asyncio.run(storage.get_metadata(key="inbody/owner/document")) is None


def test_local_private_storage_rejects_path_traversal(tmp_path) -> None:
    storage = LocalPrivateObjectStorage(tmp_path)

    with pytest.raises(ValueError):
        asyncio.run(
            storage.put(
                key="../public/report.pdf",
                content=b"private-report",
                content_type="application/pdf",
            )
        )
