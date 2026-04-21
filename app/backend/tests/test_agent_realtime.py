from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from routers.agent_realtime import router


class _FakeCurrentUser:
    def __init__(self, user_id: str = "user-1"):
        self.id = user_id
        self.email = "test@example.com"
        self.name = "Test User"
        self.role = "user"


def _make_client(monkeypatch):
    from dependencies.auth import get_current_user

    async def _fake_get_current_user():
        return _FakeCurrentUser()

    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_current_user] = _fake_get_current_user
    return TestClient(app)


def test_issue_session_ticket_and_reject_invalid_websocket(monkeypatch):
    client = _make_client(monkeypatch)

    response = client.post("/api/v1/agent/session-ticket", json={"project_id": 42, "model": "gpt-4.1"})
    assert response.status_code == 200

    payload = response.json()
    assert payload["project_id"] == 42
    assert payload["assistant_role"] == "engineer"
    ticket = payload["ticket"]
    assert isinstance(ticket, str)
    assert ticket

    with client.websocket_connect("/api/v1/agent/session/ws?ticket=invalid-ticket") as websocket:
        message = websocket.receive_json()
        assert message == {"type": "error", "code": "invalid_ticket"}
        try:
            websocket.receive_json()
            raise AssertionError("expected websocket to close after invalid ticket")
        except WebSocketDisconnect:
            pass

    with client.websocket_connect(f"/api/v1/agent/session/ws?ticket={ticket}") as websocket:
        message = websocket.receive_json()
        assert message == {
            "type": "session.state",
            "status": "idle",
            "project_id": 42,
            "assistant_role": "engineer",
        }
