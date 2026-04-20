import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from routers.workspace_runtime import router
from schemas.auth import UserResponse


# ---------------------------------------------------------------------------
# Shared test fixtures
# ---------------------------------------------------------------------------

fake_user = UserResponse(id="user-1", email="test@example.com", name="Test", role="user")


class FakeDB:
    """Minimal async DB session stub that has no records."""

    async def execute(self, *args, **kwargs):
        return _FakeResult([])

    async def commit(self):
        pass

    async def refresh(self, obj):
        pass

    def add(self, obj):
        pass

    async def rollback(self):
        pass


class _FakeResult:
    def __init__(self, items):
        self._items = items

    def scalar_one_or_none(self):
        return None

    def scalar(self):
        return 0

    def scalars(self):
        return self

    def all(self):
        return self._items


def _make_client() -> TestClient:
    from dependencies.auth import get_current_user
    from core.database import get_db

    app = FastAPI()
    app.include_router(router)

    async def fake_get_current_user():
        return fake_user

    async def fake_get_db():
        yield FakeDB()

    app.dependency_overrides[get_current_user] = fake_get_current_user
    app.dependency_overrides[get_db] = fake_get_db

    return TestClient(app)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_ensure_workspace_runtime_returns_preview_url(monkeypatch):
    async def _fake_ensure(*args, **kwargs):
        return _FakeSession()

    monkeypatch.setattr(
        "routers.workspace_runtime.ensure_runtime_for_project",
        _fake_ensure,
    )

    client = _make_client()
    response = client.post("/api/v1/workspace-runtime/projects/42/ensure")
    assert response.status_code == 200
    assert response.json()["preview_url"].endswith("/preview/")


def test_preview_proxy_requires_running_session():
    client = _make_client()
    response = client.get("/api/v1/workspace-runtime/projects/42/preview/")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class _FakeSession:
    status = "running"
    container_name = "atoms-user-1-42"
    frontend_port = 3000
    backend_port = 8000
