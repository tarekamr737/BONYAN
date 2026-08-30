from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from urllib.parse import urlparse

from app.core.errors import AppError


@dataclass(frozen=True, slots=True)
class VerifiedMediaToken:
    provider_url: str
    expires_at: datetime


class MuscleWikiMediaSigner:
    def __init__(self, secret: bytes) -> None:
        self._secret = secret

    def sign(self, *, provider_url: str, user_id: str, expires_in_seconds: int) -> str:
        expires_at = int(time.time()) + expires_in_seconds
        payload = {
            "exp": expires_at,
            "sub": user_id,
            "url": _validated_provider_url(provider_url),
        }
        encoded_payload = _urlsafe_encode(
            json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
        )
        signature = hmac.new(
            self._secret, encoded_payload.encode("ascii"), hashlib.sha256
        ).digest()
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
            provider_url = _validated_provider_url(payload["url"])
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
