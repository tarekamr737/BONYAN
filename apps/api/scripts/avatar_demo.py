from datetime import UTC, datetime
from uuid import uuid4

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.domains.avatar.contracts import (
    AvatarGenerationRequest,
    BodyAvatarPresentation,
    BodyAvatarStyle,
    BodyMetricsSnapshot,
    BodyMetricsSource,
)
from app.domains.avatar.schemas import ManualBodyMeasurementsRequest
from app.domains.avatar.shape import classify_body_shape
from app.integrations.avatar.mock import MockAvatarProvider

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8082"],
    allow_methods=["*"],
    allow_headers=["*"],
)
metrics = BodyMetricsSnapshot(
    178, 82, 18.5, 36.2, datetime(2026, 8, 24, 9, 30, tzinfo=UTC), BodyMetricsSource.INBODY
)
avatars: list[dict[str, object]] = []
images: dict[str, bytes] = {}


@app.get("/api/v1/avatars/measurement-status")
def measurement_status(
    presentation: BodyAvatarPresentation = BodyAvatarPresentation.MEN,
) -> dict[str, object]:
    return {
        "available": True,
        "source": metrics.source.value,
        "recorded_at": metrics.recorded_at,
        "body_fat_available": metrics.body_fat_percentage is not None,
        "muscle_mass_available": metrics.skeletal_muscle_mass_kg is not None,
        "shape_profile": classify_body_shape(metrics, presentation).value,
    }


@app.put("/api/v1/avatars/manual-measurements", status_code=204)
def save_manual_measurements(payload: ManualBodyMeasurementsRequest) -> Response:
    global metrics
    metrics = BodyMetricsSnapshot(
        payload.height_cm,
        payload.weight_kg,
        payload.body_fat_percentage,
        payload.skeletal_muscle_mass_kg,
        datetime.now(UTC),
        BodyMetricsSource.PROFILE,
    )
    return Response(status_code=204)


@app.get("/api/v1/avatars")
def list_avatars() -> dict[str, object]:
    return {"items": avatars}


@app.post("/api/v1/avatars")
async def create_avatar(request: Request) -> dict[str, object]:
    body = await request.json()
    presentation = BodyAvatarPresentation(body.get("presentation", "men"))
    result = await MockAvatarProvider(model="bonyan-cinematic-demo").generate(
        AvatarGenerationRequest(metrics, BodyAvatarStyle.CINEMATIC_3D, presentation)
    )
    avatar_id = str(uuid4())
    images[avatar_id] = result.content
    now = datetime.now(UTC)
    avatar = {
        "id": avatar_id,
        "state": "ready_for_review",
        "style": "cinematic_3d",
        "presentation": presentation.value,
        "shape_profile": classify_body_shape(metrics, presentation).value,
        "preview_url": f"http://127.0.0.1:8000/demo/{avatar_id}.png",
        "approved": False,
        "public_in_community": False,
        "failure_code": None,
        "measurement_source": metrics.source.value,
        "measurements_recorded_at": metrics.recorded_at,
        "created_at": now,
        "updated_at": now,
    }
    avatars.insert(0, avatar)
    return avatar


@app.get("/demo/{avatar_id}.png")
def avatar_image(avatar_id: str) -> Response:
    return Response(images[avatar_id], media_type="image/png")
