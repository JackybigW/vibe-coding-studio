from starlette.requests import Request

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
