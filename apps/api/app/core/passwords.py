from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
import secrets

SCRYPT_N = 2**14
SCRYPT_R = 8
SCRYPT_P = 1
SCRYPT_DKLEN = 32


class PasswordHasher:
    async def hash(self, password: str) -> str:
        return await asyncio.to_thread(self._hash_sync, password)

    async def verify(self, password: str, encoded_hash: str) -> bool:
        return await asyncio.to_thread(self._verify_sync, password, encoded_hash)

    @staticmethod
    def _hash_sync(password: str) -> str:
        salt = secrets.token_bytes(16)
        digest = hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt,
            n=SCRYPT_N,
            r=SCRYPT_R,
            p=SCRYPT_P,
            dklen=SCRYPT_DKLEN,
        )
        salt_value = base64.urlsafe_b64encode(salt).decode("ascii")
        digest_value = base64.urlsafe_b64encode(digest).decode("ascii")
        return f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}${salt_value}${digest_value}"

    @staticmethod
    def _verify_sync(password: str, encoded_hash: str) -> bool:
        try:
            algorithm, n, r, p, salt_value, digest_value = encoded_hash.split("$", 5)
            if algorithm != "scrypt":
                return False
            parsed_n, parsed_r, parsed_p = int(n), int(r), int(p)
            if (parsed_n, parsed_r, parsed_p) != (SCRYPT_N, SCRYPT_R, SCRYPT_P):
                return False
            salt = base64.urlsafe_b64decode(salt_value.encode("ascii"))
            expected = base64.urlsafe_b64decode(digest_value.encode("ascii"))
            if len(salt) != 16 or len(expected) != SCRYPT_DKLEN:
                return False
            actual = hashlib.scrypt(
                password.encode("utf-8"),
                salt=salt,
                n=parsed_n,
                r=parsed_r,
                p=parsed_p,
                dklen=len(expected),
            )
        except (ValueError, TypeError):
            return False
        return hmac.compare_digest(actual, expected)
