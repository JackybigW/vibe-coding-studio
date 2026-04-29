from starlette.requests import Request
from fastapi import FastAPI
from fastapi.testclient import TestClient
from datetime import datetime, timezone

from routers import auth as auth_router
from routers.auth import get_dynamic_backend_url, get_frontend_app_url


def _make_request(
    *,
    host: str = "127.0.0.1:8000",
    scheme: str = "http",
    headers: list[tuple[bytes, bytes]] | None = None,
) -> Request:
    scope = {
        "type": "http",
        "http_version": "1.1",
        "method": "GET",
        "scheme": scheme,
        "path": "/api/v1/auth/login",
        "raw_path": b"/api/v1/auth/login",
        "query_string": b"",
        "headers": headers or [(b"host", host.encode("utf-8"))],
        "client": ("127.0.0.1", 12345),
        "server": ("127.0.0.1", 8000),
    }
    return Request(scope)


def test_get_dynamic_backend_url_prefers_configured_backend_url_without_proxy_headers(monkeypatch):
    monkeypatch.setenv("PYTHON_BACKEND_URL", "http://localhost:8000")

    request = _make_request()

    assert get_dynamic_backend_url(request) == "http://localhost:8000"


def test_get_dynamic_backend_url_prefers_forwarded_host_when_present(monkeypatch):
    monkeypatch.setenv("PYTHON_BACKEND_URL", "http://localhost:8000")
    request = _make_request(
        headers=[
            (b"host", b"127.0.0.1:8000"),
            (b"x-forwarded-host", b"preview.example.com"),
            (b"x-forwarded-proto", b"https"),
        ]
    )

    assert get_dynamic_backend_url(request) == "https://preview.example.com"


def test_get_frontend_app_url_prefers_configured_frontend_url(monkeypatch):
    monkeypatch.setenv("FRONTEND_URL", "http://localhost:3000")
    request = _make_request()

    assert get_frontend_app_url(request) == "http://localhost:3000"


def test_oidc_callback_returns_app_token_in_url_fragment(monkeypatch):
    class FakeTokenResponse:
        status_code = 200

        def json(self):
            return {"id_token": "id-token", "access_token": "access-token"}

    class FakeAsyncClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, *args, **kwargs):
            return FakeTokenResponse()

    class FakeAuthService:
        def __init__(self, db):
            pass

        async def get_and_delete_oidc_state(self, state):
            return {"nonce": "nonce", "code_verifier": "verifier"}

        async def get_or_create_user(self, platform_sub, email, name):
            return type("User", (), {"id": platform_sub, "email": email, "name": name, "role": "user", "last_login": None})()

        async def issue_app_token(self, user):
            return "app-token", datetime(2026, 1, 1, tzinfo=timezone.utc), {}

    async def fake_validate_id_token(id_token, access_token=None):
        return {"sub": "google-sub", "email": "user@example.com", "name": "User", "nonce": "nonce"}

    async def fake_get_db():
        yield object()

    monkeypatch.setattr(auth_router.httpx, "AsyncClient", FakeAsyncClient)
    monkeypatch.setattr(auth_router, "AuthService", FakeAuthService)
    monkeypatch.setattr(auth_router, "validate_id_token", fake_validate_id_token)
    monkeypatch.setattr(auth_router.settings, "oidc_client_id", "client-id")
    monkeypatch.setattr(auth_router.settings, "oidc_client_secret", "client-secret")
    monkeypatch.setattr(auth_router.settings, "oidc_issuer_url", "https://accounts.google.com")
    monkeypatch.setattr(auth_router.settings, "frontend_url", "http://localhost:3000")

    from core.database import get_db

    app = FastAPI()
    app.include_router(auth_router.router)
    app.dependency_overrides[get_db] = fake_get_db

    with TestClient(app, follow_redirects=False) as client:
        response = client.get("/api/v1/auth/callback?code=code&state=state")

    assert response.status_code == 302
    location = response.headers["location"]
    assert location.startswith("http://localhost:3000/auth/callback#")
    assert "?token=" not in location
    assert "#token=app-token" in location
