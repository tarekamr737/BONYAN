from __future__ import annotations

import asyncio
import json
import os
import time
from pathlib import Path

import httpx
import pytest


@pytest.mark.live
def test_full_provider_staging_flow(record_property) -> None:
    required = {
        "BONYAN_STAGING_BASE_URL": os.getenv("BONYAN_STAGING_BASE_URL"),
        "BONYAN_STAGING_TOKEN": os.getenv("BONYAN_STAGING_TOKEN"),
        "BONYAN_LIVE_OCR_MANIFEST": os.getenv("BONYAN_LIVE_OCR_MANIFEST"),
        "BONYAN_LIVE_AVATAR_MANIFEST": os.getenv("BONYAN_LIVE_AVATAR_MANIFEST"),
    }
    if os.getenv("BONYAN_RUN_FULL_STAGING") != "1" or not all(required.values()):
        pytest.skip("set BONYAN_RUN_FULL_STAGING=1 and all staging fixture variables")
    ocr_manifest = json.loads(
        Path(required["BONYAN_LIVE_OCR_MANIFEST"]).read_text(encoding="utf-8")
    )
    avatar_manifest = json.loads(
        Path(required["BONYAN_LIVE_AVATAR_MANIFEST"]).read_text(encoding="utf-8")
    )
    assert avatar_manifest.get("consent_confirmed") is True
    report = ocr_manifest["cases"][0]
    report_path = Path(report["path"])
    report_content = report_path.read_bytes()
    source_path = Path(avatar_manifest["source_path"])
    source_content = source_path.read_bytes()

    async def scenario() -> None:
        base_url = required["BONYAN_STAGING_BASE_URL"].rstrip("/")
        headers = {"Authorization": f"Bearer {required['BONYAN_STAGING_TOKEN']}"}
        scan_id = avatar_id = source_photo_id = None

        started = time.perf_counter()
        async with httpx.AsyncClient(
            base_url=base_url, headers=headers, timeout=120, follow_redirects=False
        ) as client:
            health = await client.get("/health", headers={})
            health.raise_for_status()
            try:
                uploaded = await client.post(
                    "/api/v1/inbody/scans",
                    files={
                        "report": (
                            report_path.name,
                            report_content,
                            report["content_type"],
                        )
                    },
                )
                uploaded.raise_for_status()
                scan = uploaded.json()["scan"]
                scan_id = scan["id"]
                assert scan["status"] == "review_required"

                confirmed = await client.post(f"/api/v1/inbody/scans/{scan_id}/confirm")
                confirmed.raise_for_status()
                assert confirmed.json()["status"] == "confirmed"

                plan = await client.post("/api/v1/training/plans", json={})
                plan.raise_for_status()

                coach = await client.post(
                    "/api/v1/training/coach",
                    json={"message": "Show my current workout plan."},
                )
                coach.raise_for_status()
                assert coach.json()["response"]

                source_upload = await client.post(
                    "/api/v1/avatars/source-photos",
                    files={
                        "photo": (
                            source_path.name,
                            source_content,
                            avatar_manifest["media_type"],
                        )
                    },
                )
                source_upload.raise_for_status()
                source_photo_id = source_upload.json()["id"]

                generated = await client.post(
                    "/api/v1/avatars",
                    json={"source_photo_id": source_photo_id},
                )
                generated.raise_for_status()
                avatar = generated.json()
                avatar_id = avatar["id"]
                assert avatar["state"] == "ready_for_review"
                assert avatar["public_in_community"] is False

                approved = await client.post(f"/api/v1/avatars/{avatar_id}/approve")
                approved.raise_for_status()
                assert approved.json()["public_in_community"] is False

                published = await client.put(
                    f"/api/v1/avatars/{avatar_id}/community-use", json={"enabled": True}
                )
                published.raise_for_status()
                assert published.json()["public_in_community"] is True
            finally:
                if avatar_id:
                    await client.delete(f"/api/v1/avatars/{avatar_id}")
                if source_photo_id:
                    await client.delete(f"/api/v1/avatars/source-photos/{source_photo_id}")
                if scan_id:
                    await client.delete(f"/api/v1/inbody/scans/{scan_id}")
        record_property("full_staging_latency_ms", round((time.perf_counter() - started) * 1000, 2))

    asyncio.run(scenario())
