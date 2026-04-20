from typing import Optional

from pydantic import BaseModel


class WorkspaceRuntimeStatusResponse(BaseModel):
    project_id: int
    status: str
    container_name: str
    preview_url: str
    frontend_port: Optional[int] = None
    backend_port: Optional[int] = None
