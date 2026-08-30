from typing import Annotated

from fastapi import APIRouter, Depends, Response

from app.core.avatar_integration import (
    AvatarAssetSigner,
    get_avatar_asset_signer,
    get_avatar_service,
    get_community_service,
    get_current_actor,
    get_current_user_id,
    read_avatar_asset,
)
from app.core.storage import PrivateObjectStorage, get_private_object_storage
from app.domains.avatar.router import create_avatar_router
from app.domains.community.router import create_community_router
from app.domains.inbody.router import router as inbody_router
from app.domains.training.router import router as training_router
from app.domains.users.router import router as users_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(inbody_router)
api_v1_router.include_router(training_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(create_avatar_router(get_avatar_service, get_current_user_id))
api_v1_router.include_router(
    create_community_router(get_community_service, get_current_actor)
)


@api_v1_router.get("/avatar-assets/{token}", include_in_schema=False)
async def get_avatar_asset(
    token: str,
    storage: Annotated[PrivateObjectStorage, Depends(get_private_object_storage)],
    signer: Annotated[AvatarAssetSigner, Depends(get_avatar_asset_signer)],
) -> Response:
    content, content_type = await read_avatar_asset(token, storage, signer)
    return Response(
        content=content,
        media_type=content_type,
        headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"},
    )
