import asyncio
import json
from typing import AsyncGenerator

from fastapi import APIRouter
from openmanus_runtime.config import config as openmanus_config
from openmanus_runtime.streaming import StreamingSWEAgent, build_agent_llm
from schemas.agent_runtime import AgentRunRequest
from sse_starlette.sse import EventSourceResponse


router = APIRouter(prefix="/api/v1/agent", tags=["agent"])


@router.post("/run")
async def run_agent(request: AgentRunRequest):
    queue: asyncio.Queue[dict | None] = asyncio.Queue()

    async def emit(event: dict) -> None:
        await queue.put(event)

    async def run_task() -> None:
        try:
            llm = build_agent_llm(request.model)
            agent = (
                StreamingSWEAgent(llm=llm, event_emitter=emit)
                if llm is not None
                else StreamingSWEAgent(event_emitter=emit)
            )
            await emit(
                {
                    "type": "session",
                    "agent": agent.name,
                    "workspace_root": str(openmanus_config.workspace_root),
                    "status": "started",
                }
            )
            task_prompt = (
                f"You must work inside this workspace root: {openmanus_config.workspace_root}\n"
                "Use absolute paths for file edits, and change into this directory before running bash commands.\n\n"
                f"User request:\n{request.prompt}"
            )
            result = await agent.run(task_prompt)
            await emit(
                {
                    "type": "done",
                    "agent": agent.name,
                    "status": "success",
                    "result": result,
                }
            )
        except Exception as exc:
            await emit(
                {
                    "type": "error",
                    "status": "failure",
                    "error": str(exc),
                }
            )
        finally:
            await queue.put(None)

    async def event_generator() -> AsyncGenerator[dict, None]:
        task = asyncio.create_task(run_task())
        try:
            while True:
                event = await queue.get()
                if event is None:
                    break
                yield {
                    "event": event["type"],
                    "data": json.dumps(event, ensure_ascii=False),
                }
        finally:
            await task

    return EventSourceResponse(event_generator(), media_type="text/event-stream")
