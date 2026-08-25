from fastapi import APIRouter

from app.domains.inbody.router import router as inbody_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(inbody_router)
