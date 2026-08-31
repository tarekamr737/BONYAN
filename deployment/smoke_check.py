from __future__ import annotations

import argparse
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def check(base_url: str, path: str, expected_status: str) -> None:
    url = f"{base_url.rstrip('/')}{path}"
    request = Request(url, headers={"Accept": "application/json"})
    try:
        with urlopen(request, timeout=10) as response:
            payload = json.loads(response.read(4096).decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, ValueError) as exc:
        raise SystemExit(f"smoke check failed for {path}: {type(exc).__name__}") from None
    if payload != {"status": expected_status}:
        raise SystemExit(f"smoke check returned an unexpected safe payload for {path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify BONYAN liveness and readiness.")
    parser.add_argument("base_url", help="HTTPS API origin, without credentials or query strings")
    args = parser.parse_args()
    if not args.base_url.startswith("https://"):
        raise SystemExit("release smoke checks require an HTTPS base URL")
    check(args.base_url, "/health", "ok")
    check(args.base_url, "/ready", "ready")


if __name__ == "__main__":
    main()
