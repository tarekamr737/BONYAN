from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass
from urllib.request import Request, urlopen

from app.core.config import Settings
from app.core.errors import AppError

logger = logging.getLogger("bonyan.email")


@dataclass(slots=True)
class VerificationEmailSender:
    settings: Settings

    async def send(self, email: str, code: str) -> None:
        if self.settings.email_provider == "console":
            # Local development uses EMAIL_CONSOLE_CODE. Never place the address or
            # authentication code in logs, where either value may be retained or exported.
            logger.info("development_email_verification_requested")
            return
        await asyncio.to_thread(self._send_resend, email, code)

    def _send_resend(self, email: str, code: str) -> None:
        api_key = self.settings.resend_api_key
        if api_key is None:
            raise AppError("email_unavailable", "Email delivery is unavailable.", 503)
        payload = json.dumps(
            {
                "from": self.settings.email_from,
                "to": [email],
                "subject": f"{code} is your BONYAN verification code",
                "html": (
                    "<div style='font-family:Arial,sans-serif'>"
                    "<h2>Verify your BONYAN email</h2>"
                    f"<p>Your one-time code is <strong style='font-size:24px'>{code}</strong>.</p>"
                    f"<p>It expires in {self.settings.email_verification_minutes} minutes.</p>"
                    "</div>"
                ),
            }
        ).encode("utf-8")
        request = Request(
            "https://api.resend.com/emails",
            data=payload,
            headers={
                "Authorization": f"Bearer {api_key.get_secret_value()}",
                "Content-Type": "application/json",
                "User-Agent": "BONYAN/0.1",
            },
            method="POST",
        )
        try:
            with urlopen(request, timeout=15) as response:  # noqa: S310
                if response.status >= 300:
                    raise OSError("email provider rejected the request")
        except OSError as exc:
            raise AppError(
                "email_unavailable", "Could not send the verification email.", 503
            ) from exc
