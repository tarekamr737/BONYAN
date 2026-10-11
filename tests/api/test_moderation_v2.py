from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.auth import CurrentUser, get_current_user
from app.core.config import Settings, get_settings
from app.core.database import get_db_session
from app.main import create_app


def test_moderation_requires_authentication_and_server_configured_role():
    app = create_app()
    settings = Settings(_env_file=None, api_env="test")
    app.dependency_overrides[get_settings] = lambda: settings

    async def unused_db():
        yield object()

    app.dependency_overrides[get_db_session] = unused_db
    with TestClient(app) as client:
        assert client.get("/api/v1/community/moderation/reports").status_code == 401
        app.dependency_overrides[get_current_user] = lambda: CurrentUser(id=str(uuid4()))
        assert client.get("/api/v1/community/moderation/role").json() == {"can_moderate": False}
        response = client.get("/api/v1/community/moderation/reports")
        assert response.status_code == 403 and response.json()["error"]["code"] == "forbidden"
        response = client.post(
            f"/api/v1/community/moderation/reports/{uuid4()}/decision", json={"decision": "hide"}
        )
        assert response.status_code == 403
        # No provider means no fake claim, voucher, value or code can be minted.
        claim = client.post(f"/api/v1/game/wallet/claims/{uuid4()}")
        assert claim.status_code == 503 and "code" not in claim.json().get("reward", {})
