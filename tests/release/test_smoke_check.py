from __future__ import annotations

import json
from unittest.mock import patch

import pytest

from deployment.smoke_check import check, main


class FakeResponse:
    def __init__(self, payload: dict[str, str]) -> None:
        self.payload = payload

    def __enter__(self) -> FakeResponse:
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def read(self, limit: int) -> bytes:
        return json.dumps(self.payload).encode("utf-8")


def test_smoke_check_accepts_only_expected_safe_payload() -> None:
    with patch("deployment.smoke_check.urlopen", return_value=FakeResponse({"status": "ok"})):
        check("https://api.bonyan.test", "/health", "ok")

    with (
        patch(
            "deployment.smoke_check.urlopen",
            return_value=FakeResponse({"status": "unexpected"}),
        ),
        pytest.raises(SystemExit, match="unexpected safe payload"),
    ):
        check("https://api.bonyan.test", "/health", "ok")


def test_release_smoke_cli_rejects_plain_http(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("sys.argv", ["smoke_check.py", "http://api.bonyan.test"])
    with pytest.raises(SystemExit, match="require an HTTPS"):
        main()
