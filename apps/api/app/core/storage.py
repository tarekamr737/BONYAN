from __future__ import annotations

import asyncio
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Annotated, Protocol

from fastapi import Depends

from app.core.config import Settings, get_settings


@dataclass(frozen=True)
class PrivateObjectMetadata:
    key: str
    content_type: str
    byte_size: int


class PrivateObjectStorage(Protocol):
    async def put(self, *, key: str, content: bytes, content_type: str) -> None: ...

    async def delete(self, *, key: str) -> None: ...

    async def get_metadata(self, *, key: str) -> PrivateObjectMetadata | None: ...

    async def read(self, *, key: str) -> bytes: ...


class LocalPrivateObjectStorage:
    """Private development adapter; production storage remains provider-neutral."""

    def __init__(self, root: Path) -> None:
        self.root = root.resolve()

    async def put(self, *, key: str, content: bytes, content_type: str) -> None:
        path = self._path_for(key)

        def write() -> None:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
            path.with_suffix(path.suffix + ".content-type").write_text(
                content_type,
                encoding="utf-8",
            )

        await asyncio.to_thread(write)

    async def delete(self, *, key: str) -> None:
        path = self._path_for(key)

        def remove() -> None:
            path.unlink(missing_ok=True)
            path.with_suffix(path.suffix + ".content-type").unlink(missing_ok=True)

        await asyncio.to_thread(remove)

    async def get_metadata(self, *, key: str) -> PrivateObjectMetadata | None:
        path = self._path_for(key)

        def read() -> PrivateObjectMetadata | None:
            if not path.is_file():
                return None
            content_type_path = path.with_suffix(path.suffix + ".content-type")
            content_type = (
                content_type_path.read_text(encoding="utf-8")
                if content_type_path.is_file()
                else "application/octet-stream"
            )
            return PrivateObjectMetadata(
                key=key,
                content_type=content_type,
                byte_size=path.stat().st_size,
            )

        return await asyncio.to_thread(read)

    async def read(self, *, key: str) -> bytes:
        """Return request-scoped bytes without creating a durable public URL."""
        return await asyncio.to_thread(self._path_for(key).read_bytes)

    def _path_for(self, key: str) -> Path:
        parts = PurePosixPath(key).parts
        if not parts or any(part in {"", ".", ".."} for part in parts):
            raise ValueError("private object key is invalid")
        path = self.root.joinpath(*parts).resolve()
        if not path.is_relative_to(self.root):
            raise ValueError("private object key escapes storage root")
        return path


def get_private_object_storage(
    settings: Annotated[Settings, Depends(get_settings)],
) -> PrivateObjectStorage:
    return LocalPrivateObjectStorage(settings.private_storage_root)
