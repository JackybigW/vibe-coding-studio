import asyncio
import json
import logging
import os
from pathlib import Path
from typing import AsyncGenerator
from uuid import uuid4

from fastapi import APIRouter, Depends, Request
from openmanus_runtime.schema import Message
from openmanus_runtime.streaming import StreamingSWEAgent, build_agent_llm
from openmanus_runtime.tool.bash import ContainerBashSession
from openmanus_runtime.tool.file_operators import ProjectFileOperator
from schemas.agent_runtime import AgentRunRequest
from services.project_files import Project_filesService
from services.messages import MessagesService
from services.project_workspace import ProjectWorkspaceService
from services.sandbox_runtime import SandboxRuntimeService
from services.workspace_runtime_sessions import WorkspaceRuntimeSessionsService
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from core.database import get_db
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/agent", tags=["agent"])

_WORKSPACES_ROOT = Path(os.environ.get("ATOMS_WORKSPACES_ROOT", "/tmp/atoms_workspaces"))


def _get_workspace_service() -> ProjectWorkspaceService:
    return ProjectWorkspaceService(base_root=_WORKSPACES_ROOT)


def _get_sandbox_service() -> SandboxRuntimeService:
    return SandboxRuntimeService(project_root=_WORKSPACES_ROOT)


def _make_trace_id() -> str:
    return uuid4().hex[:12]


def _serialize_agent_history(messages: list[Message]) -> list[dict[str, object]]:
    serialized: list[dict[str, object]] = []
    for message in messages:
        item: dict[str, object] = {"role": message.role}
        if message.content is not None:
            item["content"] = message.content
        if message.thinking is not None:
            item["thinking"] = message.thinking
        if message.name is not None:
            item["name"] = message.name
        if message.tool_call_id is not None:
            item["tool_call_id"] = message.tool_call_id
        if message.tool_calls is not None:
            item["tool_calls"] = [tool_call.model_dump() for tool_call in message.tool_calls]
        serialized.append(item)
    return serialized


@router.post("/run")
async def run_agent(
    request: AgentRunRequest,
    http_request: Request,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    queue: asyncio.Queue[dict | None] = asyncio.Queue()
    trace_id = http_request.headers.get("x-trace-id") or _make_trace_id()
    logger.info(
        "[agent:%s] request received user_id=%s project_id=%s model=%s prompt_chars=%s",
        trace_id,
        current_user.id,
        request.project_id,
        request.model,
        len(request.prompt or ""),
    )

    async def emit(event: dict) -> None:
        event_with_trace = {"trace_id": trace_id, **event}
        logger.info("[agent:%s] emit event=%s", trace_id, event_with_trace.get("type"))
        await queue.put(event_with_trace)

    async def run_task() -> None:
        try:
            user_id = str(current_user.id)
            project_id = request.project_id
            logger.info("[agent:%s] run_task started", trace_id)

            # --- Resolve workspace paths and materialize project files ---
            workspace_service = _get_workspace_service()
            paths = workspace_service.resolve_paths(user_id=user_id, project_id=project_id)
            logger.info("[agent:%s] workspace resolved host_root=%s", trace_id, paths.host_root)

            files_service = Project_filesService(db)
            files_result = await files_service.get_list(
                skip=0,
                limit=10000,
                user_id=user_id,
                query_dict={"project_id": project_id},
            )
            file_records = [
                {
                    "file_path": f.file_path,
                    "content": f.content,
                    "is_directory": f.is_directory,
                }
                for f in files_result["items"]
            ]
            workspace_service.materialize_files(paths.host_root, file_records)
            logger.info("[agent:%s] materialized %s project files", trace_id, len(file_records))

            messages_service = MessagesService(db)
            message_history_result = await messages_service.get_list(
                skip=0,
                limit=200,
                user_id=user_id,
                query_dict={"project_id": project_id},
                sort="created_at",
            )
            persisted_history = [
                {
                    "role": message.role,
                    "content": message.content,
                    "agent": message.agent,
                    "model": message.model,
                    "created_at": message.created_at.isoformat() if message.created_at else None,
                }
                for message in message_history_result["items"]
            ]
            logger.info(
                "[agent:%s] persisted message history count=%s history=%s",
                trace_id,
                len(persisted_history),
                json.dumps(persisted_history, ensure_ascii=False),
            )

            # --- Ensure sandbox container is running ---
            sandbox_service = _get_sandbox_service()
            try:
                container_name = await sandbox_service.ensure_runtime(
                    user_id=user_id,
                    project_id=project_id,
                    host_root=paths.host_root,
                )
                logger.info("[agent:%s] sandbox ready container=%s", trace_id, container_name)
            except Exception as exc:
                logger.exception("[agent:%s] sandbox startup failed", trace_id)
                await emit({"type": "error", "status": "failure", "error": f"Could not start sandbox: {exc}"})
                await queue.put(None)
                return

            # --- Build project-scoped tools ---
            file_operator = ProjectFileOperator(
                host_root=paths.host_root,
                container_root=paths.container_root,
            )

            bash_session = ContainerBashSession(
                runtime_service=sandbox_service,
                container_name=container_name,
            )

            llm = build_agent_llm(request.model)
            logger.info("[agent:%s] llm constructed model=%s", trace_id, request.model)
            agent = StreamingSWEAgent.build_for_workspace(
                llm=llm,
                event_emitter=emit,
                file_operator=file_operator,
                bash_session=bash_session,  # always a ContainerBashSession now
            )
            logger.info("[agent:%s] agent built name=%s", trace_id, agent.name)

            await emit(
                {
                    "type": "session",
                    "agent": agent.name,
                    "workspace_root": str(paths.host_root),
                    "status": "started",
                }
            )

            task_prompt = (
                f"You must work inside this workspace root: /workspace\n"
                "Use absolute paths starting with /workspace for file edits, "
                "and change into this directory before running bash commands.\n"
                "After file edits, the backend will automatically run "
                "/usr/local/bin/start-dev to launch the Vite dev server on port 3000.\n"
                "Do not start the dev server yourself; focus on writing code and "
                "one-off verification commands.\n\n"
                f"User request:\n{request.prompt}"
            )
            logger.info("[agent:%s] agent.run started", trace_id)
            result = await agent.run(task_prompt)
            logger.info("[agent:%s] agent.run completed", trace_id)
            agent_messages = getattr(agent, "messages", [])
            logger.info(
                "[agent:%s] agent memory history=%s",
                trace_id,
                json.dumps(_serialize_agent_history(agent_messages), ensure_ascii=False),
            )

            # --- Snapshot and sync changed files back to DB ---
            try:
                snapshot = workspace_service.snapshot_files(paths.host_root)
                changed_paths: list[str] = []
                logger.info("[agent:%s] snapshot captured files=%s", trace_id, len(snapshot))

                for rel_path, file_info in snapshot.items():
                    file_name = Path(rel_path).name
                    # Try to find existing record for this path
                    existing_list = await files_service.get_list(
                        skip=0,
                        limit=1,
                        user_id=user_id,
                        query_dict={"project_id": project_id, "file_path": rel_path},
                    )
                    existing = existing_list["items"]
                    if existing:
                        existing_record = existing[0]
                        if existing_record.content != file_info["content"]:
                            await files_service.update(
                                existing_record.id,
                                {"content": file_info["content"]},
                                user_id=user_id,
                            )
                            changed_paths.append(rel_path)
                    else:
                        await files_service.create(
                            {
                                "project_id": project_id,
                                "file_path": rel_path,
                                "file_name": file_name,
                                "content": file_info["content"],
                                "is_directory": False,
                            },
                            user_id=user_id,
                        )
                        changed_paths.append(rel_path)

                await emit(
                    {
                        "type": "workspace_sync",
                        "changed_files": changed_paths,
                    }
                )
                logger.info("[agent:%s] workspace sync updated_files=%s", trace_id, len(changed_paths))
            except Exception as sync_exc:
                logger.warning("[agent:%s] workspace sync failed: %s", trace_id, sync_exc)

            try:
                logger.info("[agent:%s] starting preview server", trace_id)
                returncode, _, stderr = await sandbox_service.start_dev_server(container_name)
                if returncode != 0:
                    stderr_tail = stderr.strip().splitlines()[-1] if stderr.strip() else ""
                    logger.warning(
                        "[agent:%s] preview start failed returncode=%s stderr=%s",
                        trace_id,
                        returncode,
                        stderr_tail,
                    )
                    await emit(
                        {
                            "type": "preview_failed",
                            "reason": "start_dev_failed",
                            "returncode": returncode,
                            "stderr": stderr_tail,
                        }
                    )
                else:
                    ports = await sandbox_service.get_runtime_ports(container_name)
                    frontend_port = ports.get("frontend_port")
                    preview_port = ports.get("preview_port")
                    backend_port = ports.get("backend_port")
                    logger.info(
                        "[agent:%s] runtime ports frontend=%s backend=%s preview=%s",
                        trace_id,
                        frontend_port,
                        backend_port,
                        preview_port,
                    )

                    if not frontend_port:
                        logger.warning("[agent:%s] preview failed no frontend port", trace_id)
                        await emit(
                            {
                                "type": "preview_failed",
                                "reason": "no_frontend_port",
                            }
                        )
                    else:
                        logger.info("[agent:%s] waiting for preview service", trace_id)
                        ready = await sandbox_service.wait_for_service(
                            container_name=container_name,
                            port=3000,
                            timeout_seconds=60.0,
                            poll_interval_seconds=1.0,
                        )
                        logger.info("[agent:%s] preview wait completed ready=%s", trace_id, ready)
                        await WorkspaceRuntimeSessionsService(db).create(
                            {
                                "user_id": user_id,
                                "project_id": project_id,
                                "container_name": container_name,
                                "status": "running" if ready else "starting",
                                "preview_port": preview_port,
                                "frontend_port": frontend_port,
                                "backend_port": backend_port,
                            }
                        )
                        if ready:
                            await emit(
                                {
                                    "type": "preview_ready",
                                    "preview_url": (
                                        f"/api/v1/workspace-runtime/projects/{project_id}/preview/"
                                    ),
                                    "frontend_port": frontend_port,
                                }
                            )
                        else:
                            await emit(
                                {
                                    "type": "preview_failed",
                                    "reason": "timeout",
                                }
                            )
            except Exception as preview_exc:
                logger.exception("[agent:%s] preview startup failed", trace_id)
                await emit(
                    {
                        "type": "preview_failed",
                        "reason": "exception",
                        "error": str(preview_exc),
                    }
                )

            await emit(
                {
                    "type": "done",
                    "agent": agent.name,
                    "status": "success",
                    "result": result,
                }
            )
            logger.info("[agent:%s] run_task finished successfully", trace_id)
        except Exception as exc:
            logger.exception("[agent:%s] run_task failed", trace_id)
            await emit(
                {
                    "type": "error",
                    "status": "failure",
                    "error": str(exc),
                }
            )
        finally:
            logger.info("[agent:%s] run_task finalizing", trace_id)
            await queue.put(None)

    async def event_generator() -> AsyncGenerator[dict, None]:
        task = asyncio.create_task(run_task())
        try:
            while True:
                event = await queue.get()
                if event is None:
                    logger.info("[agent:%s] event_generator received sentinel", trace_id)
                    break
                logger.info("[agent:%s] yielding sse event=%s", trace_id, event["type"])
                yield {
                    "event": event["type"],
                    "data": json.dumps(event, ensure_ascii=False),
                }
        finally:
            logger.info("[agent:%s] event_generator awaiting task completion", trace_id)
            await task

    return EventSourceResponse(event_generator(), media_type="text/event-stream")
