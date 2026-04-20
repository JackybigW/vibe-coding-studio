from datetime import datetime, timedelta, timezone
import secrets


PREVIEW_SESSION_TTL = timedelta(hours=8)


def new_preview_session_fields(now: datetime | None = None) -> dict[str, object]:
    issued_at = now or datetime.now(timezone.utc)
    return {
        "preview_session_key": secrets.token_urlsafe(24),
        "preview_expires_at": issued_at + PREVIEW_SESSION_TTL,
        "frontend_status": "starting",
        "backend_status": "stopped",
    }


def build_preview_urls(preview_session_key: str) -> dict[str, str]:
    return {
        "preview_frontend_url": f"/preview/{preview_session_key}/frontend/",
        "preview_backend_url": f"/preview/{preview_session_key}/backend/",
    }
