from __future__ import annotations

import re
import subprocess
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
FORBIDDEN_SUFFIXES = (".pem", ".key", ".p12", ".pfx", ".jks", ".keystore")
SECRET_PATTERNS = {
    "private key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "GitHub token": re.compile(r"\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b"),
    "AWS access key": re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"),
}


def tracked_files() -> list[Path]:
    result = subprocess.run(
        [
            "git",
            "-c",
            f"safe.directory={REPOSITORY_ROOT.as_posix()}",
            "ls-files",
            "-z",
        ],
        cwd=REPOSITORY_ROOT,
        check=True,
        capture_output=True,
    )
    return [
        REPOSITORY_ROOT / item.decode("utf-8")
        for item in result.stdout.split(b"\0")
        if item
    ]


def test_sensitive_file_types_and_dotenv_files_are_not_tracked() -> None:
    violations = []
    for path in tracked_files():
        relative = path.relative_to(REPOSITORY_ROOT).as_posix()
        if path.name == ".env" or path.name.startswith(".env.") and path.name != ".env.example":
            violations.append(relative)
        if relative.lower().endswith(FORBIDDEN_SUFFIXES):
            violations.append(relative)

    assert violations == [], f"sensitive files are tracked: {sorted(set(violations))}"


def test_tracked_text_does_not_contain_high_confidence_secret_material() -> None:
    violations = []
    for path in tracked_files():
        try:
            content = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        for label, pattern in SECRET_PATTERNS.items():
            if pattern.search(content):
                violations.append(f"{path.relative_to(REPOSITORY_ROOT).as_posix()}: {label}")

    assert violations == [], "possible committed secrets:\n" + "\n".join(violations)
