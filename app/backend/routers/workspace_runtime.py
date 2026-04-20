import logging
import os
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from schemas.auth import UserResponse
from schemas.workspace_runtime import WorkspaceRuntimeStatusResponse
from services.preview_sessions import build_preview_urls, new_preview_session_fields
from services.project_workspace import ProjectWorkspaceService
from services.projects import ProjectsService
from services.sandbox_runtime import SandboxRuntimeService
from services.workspace_runtime_sessions import WorkspaceRuntimeSessionsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/workspace-runtime", tags=["workspace-runtime"])

_WORKSPACES_ROOT = Path(os.environ.get("ATOMS_WORKSPACES_ROOT", "/tmp/atoms_workspaces"))

HOP_BY_HOP = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "content-encoding",
}


async def ensure_runtime_for_project(
    db: AsyncSession,
    user_id: str,
    project_id: int,
):
    """
    Resolve workspace paths, start/reuse the sandbox container, read published
    ports, then upsert a WorkspaceRuntimeSessions record and return it.
    """
    sessions_service = WorkspaceRuntimeSessionsService(db)
    existing = await sessions_service.get_by_project(user_id, project_id)
    if existing and existing.status == "running":
        return existing

    workspace_service = ProjectWorkspaceService(base_root=_WORKSPACES_ROOT)
    paths = workspace_service.resolve_paths(user_id=user_id, project_id=project_id)

    sandbox_service = SandboxRuntimeService(project_root=_WORKSPACES_ROOT)
    container_name = await sandbox_service.ensure_runtime(
        user_id=user_id,
        project_id=project_id,
        host_root=paths.host_root,
    )

    ports = await sandbox_service.get_runtime_ports(container_name)

    session = await sessions_service.create(
        {
            "user_id": user_id,
            "project_id": project_id,
            "container_name": container_name,
            "status": "running",
            "preview_port": ports.get("preview_port"),
            "frontend_port": ports.get("frontend_port"),
            "backend_port": ports.get("backend_port"),
        }
    )
    return session


@router.post("/projects/{project_id}/ensure", response_model=WorkspaceRuntimeStatusResponse)
async def ensure_workspace_runtime(
    project_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    projects_service = ProjectsService(db)
    project = await projects_service.get_by_id(project_id, user_id=str(current_user.id))
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        session = await ensure_runtime_for_project(
            db=db,
            user_id=str(current_user.id),
            project_id=project_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    if not session.preview_session_key:
        preview_fields = new_preview_session_fields()
        sessions_service = WorkspaceRuntimeSessionsService(db)
        for key, value in preview_fields.items():
            setattr(session, key, value)
        await db.commit()
        await db.refresh(session)

    preview_urls = build_preview_urls(session.preview_session_key)

    return WorkspaceRuntimeStatusResponse(
        project_id=project_id,
        status=session.status,
        container_name=session.container_name,
        preview_session_key=session.preview_session_key,
        preview_expires_at=session.preview_expires_at,
        preview_frontend_url=preview_urls["preview_frontend_url"],
        preview_backend_url=preview_urls["preview_backend_url"],
        frontend_port=session.frontend_port,
        backend_port=session.backend_port,
        frontend_status=session.frontend_status,
        backend_status=session.backend_status,
    )


@router.api_route(
    "/projects/{project_id}/preview/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
)
async def proxy_preview(
    project_id: int,
    path: str,
    request: Request,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sessions_service = WorkspaceRuntimeSessionsService(db)
    session = await sessions_service.get_by_project(str(current_user.id), project_id)
    if not session or session.status != "running" or not session.frontend_port:
        raise HTTPException(status_code=404, detail="Preview runtime not found")

    upstream = f"http://127.0.0.1:{session.frontend_port}/{path}"
    timeout = httpx.Timeout(30.0, connect=5.0)
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=timeout) as client:
            upstream_response = await client.request(
                request.method,
                upstream,
                params=request.query_params,
                content=await request.body(),
                headers={k: v for k, v in request.headers.items() if k.lower() != "host"},
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Preview upstream timed out")
    except httpx.ConnectError:
        raise HTTPException(status_code=502, detail="Preview upstream not reachable")

    safe_headers = {
        k: v for k, v in upstream_response.headers.items()
        if k.lower() not in HOP_BY_HOP
    }
    return Response(
        content=upstream_response.content,
        status_code=upstream_response.status_code,
        headers=safe_headers,
    )
