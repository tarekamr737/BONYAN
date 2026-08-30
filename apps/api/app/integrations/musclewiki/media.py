from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import json
import re
import secrets
import threading
import time
from collections import OrderedDict
from collections.abc import Iterator, Mapping
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Protocol
from urllib import error, request
from urllib.parse import urlparse

from app.core.errors import AppError

_RANGE_PATTERN = re.compile(r"bytes=(?:\d+-\d*|\d*-\d+)$")
_RESPONSE_HEADERS = ("Accept-Ranges", "Content-Length", "Content-Range", "Content-Type")


class _ReadableResponse(Protocol):
    headers: Mapping[str, str]
    status: int

    def close(self) -> None: ...

    def read(self, amount: int = -1) -> bytes: ...


@dataclass(frozen=True, slots=True)
class VerifiedMediaToken:
    provider_url: str
    expires_at: datetime


@dataclass(frozen=True, slots=True)
class _MediaRegistryEntry:
    provider_url: str
    user_id: str
    expires_at: int


class MuscleWikiMediaRegistry:
    def __init__(self, max_items: int = 512) -> None:
        self._max_items = max(1, max_items)
        self._items: OrderedDict[str, _MediaRegistryEntry] = OrderedDict()
        self._lock = threading.Lock()

    def register(self, *, provider_url: str, user_id: str, expires_at: int) -> str:
        nonce = secrets.token_urlsafe(24)
        entry = _MediaRegistryEntry(
            provider_url=_validated_provider_url(provider_url),
            user_id=user_id,
            expires_at=expires_at,
        )
        with self._lock:
            self._remove_expired_locked(int(time.time()))
            self._items[nonce] = entry
            while len(self._items) > self._max_items:
                self._items.popitem(last=False)
        return nonce

    def resolve(self, nonce: str, *, user_id: str, expires_at: int) -> str:
        now = int(time.time())
        with self._lock:
            self._remove_expired_locked(now)
            entry = self._items.get(nonce)
            if (
                entry is None
                or entry.user_id != user_id
                or entry.expires_at != expires_at
                or entry.expires_at <= now
            ):
                raise ValueError("unknown media access")
            self._items.move_to_end(nonce)
            return entry.provider_url

    def _remove_expired_locked(self, now: int) -> None:
        expired = [key for key, item in self._items.items() if item.expires_at <= now]
        for key in expired:
            self._items.pop(key, None)


_DEFAULT_MEDIA_REGISTRY = MuscleWikiMediaRegistry()


class MuscleWikiMediaSigner:
    def __init__(self, secret: bytes, registry: MuscleWikiMediaRegistry | None = None) -> None:
        self._secret = secret
        self._registry = registry or _DEFAULT_MEDIA_REGISTRY

    def sign(self, *, provider_url: str, user_id: str, expires_in_seconds: int) -> str:
        expires_at = int(time.time()) + expires_in_seconds
        nonce = self._registry.register(
            provider_url=provider_url,
            user_id=user_id,
            expires_at=expires_at,
        )
        payload = {"exp": expires_at, "nonce": nonce, "sub": user_id}
        encoded_payload = _urlsafe_encode(
            json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
        )
        signature = hmac.new(self._secret, encoded_payload.encode("ascii"), hashlib.sha256).digest()
        return f"{encoded_payload}.{_urlsafe_encode(signature)}"

    def verify(self, token: str, *, user_id: str) -> VerifiedMediaToken:
        try:
            encoded_payload, encoded_signature = token.split(".", 1)
            expected_signature = hmac.new(
                self._secret, encoded_payload.encode("ascii"), hashlib.sha256
            ).digest()
            supplied_signature = _urlsafe_decode(encoded_signature)
            if not hmac.compare_digest(expected_signature, supplied_signature):
                raise ValueError("invalid signature")
            payload = json.loads(_urlsafe_decode(encoded_payload))
            expires_at = int(payload["exp"])
            if expires_at <= int(time.time()):
                raise ValueError("expired token")
            if payload["sub"] != user_id:
                raise ValueError("wrong user")
            provider_url = self._registry.resolve(
                str(payload["nonce"]), user_id=user_id, expires_at=expires_at
            )
        except (
            binascii.Error,
            KeyError,
            TypeError,
            ValueError,
            json.JSONDecodeError,
            UnicodeDecodeError,
        ) as exc:
            raise AppError(
                "musclewiki_media_unavailable",
                "This exercise media link is no longer available.",
                404,
            ) from exc
        return VerifiedMediaToken(
            provider_url=provider_url,
            expires_at=datetime.fromtimestamp(expires_at, UTC),
        )


@dataclass(slots=True)
class MediaRelayResponse:
    body: Iterator[bytes]
    headers: dict[str, str]
    status_code: int


class MuscleWikiMediaRelay:
    def open(self, provider_url: str, *, range_header: str | None) -> MediaRelayResponse:
        headers: dict[str, str] = {}
        if range_header is not None:
            if not _RANGE_PATTERN.fullmatch(range_header):
                raise AppError("invalid_media_range", "The requested media range is invalid.", 416)
            headers["Range"] = range_header

        upstream_request = request.Request(
            _validated_provider_url(provider_url), headers=headers, method="GET"
        )
        try:
            response = request.urlopen(upstream_request, timeout=15)
        except (error.HTTPError, error.URLError, TimeoutError) as exc:
            raise AppError(
                "musclewiki_media_unavailable",
                "Exercise media is temporarily unavailable.",
                503,
            ) from exc

        status_code = getattr(response, "status", 200)
        content_type = response.headers.get("Content-Type", "").partition(";")[0].lower()
        if status_code not in (200, 206) or not content_type.startswith("video/"):
            response.close()
            raise AppError(
                "musclewiki_media_unavailable",
                "Exercise media is temporarily unavailable.",
                503,
            )
        response_headers = _copy_response_headers(response.headers)
        response_headers["Cache-Control"] = "private, no-store"
        response_headers["X-Content-Type-Options"] = "nosniff"
        return MediaRelayResponse(
            body=_iter_response(response),
            headers=response_headers,
            status_code=status_code,
        )


def _iter_response(response: _ReadableResponse, chunk_size: int = 64 * 1024) -> Iterator[bytes]:
    try:
        while chunk := response.read(chunk_size):
            yield chunk
    finally:
        response.close()


def _copy_response_headers(headers: Mapping[str, str]) -> dict[str, str]:
    return {name: value for name in _RESPONSE_HEADERS if (value := headers.get(name))}


def _urlsafe_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _urlsafe_decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def _validated_provider_url(value: object) -> str:
    text = str(value).strip()
    parsed = urlparse(text)
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValueError("media URL must be HTTPS")
    return text
