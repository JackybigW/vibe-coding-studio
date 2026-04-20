from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class WorkspaceRuntimeStatusResponse(BaseModel):
    project_id: int
    status: str
    container_name: str
    preview_session_key: str
    preview_expires_at: Optional[datetime] = None
    preview_frontend_url: str
    preview_backend_url: str
    frontend_port: Optional[int] = None
    backend_port: Optional[int] = None
    frontend_status: Optional[str] = None
    backend_status: Optional[str] = None
