from fastapi import APIRouter

api_v1_router = APIRouter(prefix="/api/v1")

# Feature workstreams export an APIRouter from their domain package. Workstream 01
# adds one include_router(...) call here only after the feature branch is merged.
