import json

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from openmanus_runtime.llm import split_thinking_content
from openmanus_runtime.schema import Message
from openmanus_runtime.streaming import StreamingSWEAgent

from routers.agent_runtime import router


class FakeAgent:
    name = "swe"

    def __init__(self, *args, event_emitter=None, **kwargs):
        self._emit = event_emitter

    async def run(self, request: str):
        await self._emit({"type": "assistant", "agent": "swe", "content": f"Working on: {request}"})
        return "finished"


def test_agent_run_sse_stream(monkeypatch):
    monkeypatch.setattr("routers.agent_runtime.StreamingSWEAgent", FakeAgent)
    monkeypatch.setattr("routers.agent_runtime.build_agent_llm", lambda model: None)

    app = FastAPI()
    app.include_router(router)

    with TestClient(app) as client:
        response = client.post("/api/v1/agent/run", json={"prompt": "build a todo app"})

    assert response.status_code == 200
    body = response.text
    assert 'event: session' in body
    assert 'event: assistant' in body
    assert 'event: done' in body

    done_line = next(line for line in body.splitlines() if line.startswith("data: ") and '"type": "done"' in line)
    done_payload = json.loads(done_line.removeprefix("data: "))
    assert done_payload["status"] == "success"


def test_split_thinking_content_extracts_visible_content():
    thinking, content = split_thinking_content("<think>\ninspect files\n</think>\n\nFinal answer")

    assert thinking == "inspect files"
    assert content == "Final answer"


@pytest.mark.asyncio
async def test_streaming_agent_emits_thinking():
    events = []

    class FakeStreamingAgent(StreamingSWEAgent):
        async def think(self):
            self.memory.add_message(
                Message.assistant_message("Visible output", thinking="Hidden chain of thought")
            )
            return False

    async def emit(event):
        events.append(event)

    agent = FakeStreamingAgent(event_emitter=emit)
    result = await agent.step()

    assert result == "Thinking complete - no action needed"
    assert events == [
        {
            "type": "assistant",
            "content": "Visible output",
            "thinking": "Hidden chain of thought",
            "agent": "swe",
        }
    ]
