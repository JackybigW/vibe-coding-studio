# Engineer First Realtime Workspace Streaming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current `POST + SSE` SWE interaction with an engineer-first WebSocket control plane that keeps code and tool noise out of chat, streams file writes into the editor during execution, and preserves the existing full-stack App Viewer preview runtime.

**Architecture:** Extract the current SWE run logic into a reusable backend engineer runtime, then add an authenticated realtime ticket plus WebSocket router for the platform control plane. Feed assistant text, progress, terminal logs, file snapshots, and preview status into frontend realtime state owned by `WorkspaceContext`, while keeping App Viewer on the existing same-origin preview gateway.

**Tech Stack:** FastAPI, Starlette WebSocket/TestClient, Pydantic, existing OpenManus runtime tooling, React, Vite, Vitest, React Testing Library

---

## File Structure

### Backend

- Create: `app/backend/schemas/agent_realtime.py`
  - Pydantic message types for realtime ticket issuance and control-plane envelopes.
- Create: `app/backend/services/agent_realtime.py`
  - In-memory ticket/session registry and session lifecycle helpers.
- Create: `app/backend/services/engineer_runtime.py`
  - Shared backend runtime that executes the SWE flow and emits typed control-plane events.
- Create: `app/backend/services/workspace_event_emitter.py`
  - Maps tool/runtime activity into `assistant.delta`, `progress`, `terminal.log`, `file.snapshot`, `file.changed`, and `preview.state`.
- Create: `app/backend/routers/agent_realtime.py`
  - `POST /api/v1/agent/session-ticket` and `WS /api/v1/agent/session/ws`.
- Modify: `app/backend/routers/agent_runtime.py`
  - Keep as compatibility adapter by delegating to the shared engineer runtime instead of owning all orchestration logic inline.
- Modify: `app/backend/openmanus_runtime/streaming.py`
  - Stop exposing raw tool events as chat events; route them through the workspace event emitter.
- Modify: `app/backend/openmanus_runtime/tool/file_operators.py`
  - Emit file snapshots and file tree metadata when writes happen.
- Modify: `app/backend/openmanus_runtime/tool/str_replace_editor.py`
  - Preserve tool behavior while ensuring file events are emitted for create, replace, insert, and undo flows.
- Test: `app/backend/tests/test_agent_realtime.py`
  - New backend coverage for ticket issuance, websocket lifecycle, assistant stream, stop, and live file events.
- Test: `app/backend/tests/test_agent_runtime.py`
  - Update compatibility-route tests so the old `POST /run` path still delegates correctly.
- Test: `app/backend/tests/test_agent_runtime_workspace.py`
  - Add file-event coverage for workspace writes.

### Frontend

- Create: `app/frontend/src/lib/agentRealtime.ts`
  - WebSocket client wrapper and typed event dispatcher.
- Create: `app/frontend/src/lib/agentRealtime.test.ts`
  - Protocol parsing, stop wiring, and reconnect-oriented unit coverage.
- Create: `app/frontend/src/components/ChatPanel.test.tsx`
  - Regression coverage for engineer-only chat rendering and progress display.
- Modify: `app/frontend/src/contexts/WorkspaceContext.tsx`
  - Own realtime session status, progress state, live file snapshots, and terminal logs.
- Modify: `app/frontend/src/contexts/WorkspaceContext.test.tsx`
  - Cover live file snapshot application and session state updates.
- Modify: `app/frontend/src/components/ChatPanel.tsx`
  - Replace SSE fetch flow with websocket session flow; render only user text + engineer stream + compact progress.
- Modify: `app/frontend/src/pages/ProjectWorkspace.tsx`
  - Consume richer workspace status without changing the preview transport.
- Modify: `app/frontend/src/pages/ProjectWorkspace.test.tsx`
  - Ensure preview behavior still works while realtime session state is active.
- Delete: `app/frontend/src/lib/sse.test.ts`
  - Remove if no longer used after cutover.
- Delete: `app/frontend/src/lib/sse.ts`
  - Remove if no longer used after cutover.

## Task 1: Add Backend Realtime Protocol And Authenticated Ticket Flow

**Files:**
- Create: `app/backend/schemas/agent_realtime.py`
- Create: `app/backend/services/agent_realtime.py`
- Create: `app/backend/routers/agent_realtime.py`
- Test: `app/backend/tests/test_agent_realtime.py`

- [ ] **Step 1: Write the failing backend ticket and websocket auth tests**

```python
from fastapi import FastAPI
from fastapi.testclient import TestClient

from routers.agent_realtime import router
from schemas.auth import UserResponse


def test_issue_session_ticket_and_reject_invalid_websocket(monkeypatch):
    app = FastAPI()
    app.include_router(router)

    from dependencies.auth import get_current_user

    async def fake_get_current_user():
        return UserResponse(id="user-1", email="test@example.com", name="Test", role="user")

    app.dependency_overrides[get_current_user] = fake_get_current_user

    with TestClient(app) as client:
        ticket_response = client.post(
            "/api/v1/agent/session-ticket",
            json={"project_id": 42, "model": "gpt-5-chat"},
        )
        assert ticket_response.status_code == 200
        payload = ticket_response.json()
        assert payload["project_id"] == 42
        assert payload["assistant_role"] == "engineer"
        assert payload["ticket"]

        with client.websocket_connect(
            "/api/v1/agent/session/ws?ticket=bad-ticket"
        ) as websocket:
            message = websocket.receive_json()
            assert message["type"] == "error"
            assert message["code"] == "invalid_ticket"
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
source /Users/jackywang/Documents/atoms/app/backend/.venv/bin/activate && \
cd /Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration/app/backend && \
pytest tests/test_agent_realtime.py::test_issue_session_ticket_and_reject_invalid_websocket -v
```

Expected: FAIL with `ModuleNotFoundError` or `ImportError` because `routers.agent_realtime` and the realtime schema/service files do not exist yet.

- [ ] **Step 3: Write the minimal ticket schema, service, and router**

```python
# app/backend/schemas/agent_realtime.py
from datetime import datetime

from pydantic import BaseModel


class RealtimeTicketRequest(BaseModel):
    project_id: int
    model: str | None = None


class RealtimeTicketResponse(BaseModel):
    ticket: str
    project_id: int
    assistant_role: str = "engineer"
    expires_at: datetime
```

```python
# app/backend/services/agent_realtime.py
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from uuid import uuid4


@dataclass
class RealtimeTicket:
    ticket: str
    user_id: str
    project_id: int
    model: str | None
    expires_at: datetime


@dataclass
class AgentRealtimeService:
    _tickets: dict[str, RealtimeTicket] = field(default_factory=dict)

    def issue_ticket(self, *, user_id: str, project_id: int, model: str | None) -> RealtimeTicket:
        ticket = RealtimeTicket(
            ticket=uuid4().hex,
            user_id=user_id,
            project_id=project_id,
            model=model,
            expires_at=datetime.now(UTC) + timedelta(minutes=5),
        )
        self._tickets[ticket.ticket] = ticket
        return ticket

    def consume_ticket(self, ticket: str) -> RealtimeTicket | None:
        stored = self._tickets.pop(ticket, None)
        if stored is None:
            return None
        if stored.expires_at <= datetime.now(UTC):
            return None
        return stored
```

```python
# app/backend/routers/agent_realtime.py
from fastapi import APIRouter, Depends, WebSocket

from dependencies.auth import get_current_user
from schemas.agent_realtime import RealtimeTicketRequest, RealtimeTicketResponse
from schemas.auth import UserResponse
from services.agent_realtime import AgentRealtimeService

router = APIRouter(prefix="/api/v1/agent", tags=["agent-realtime"])
service = AgentRealtimeService()


@router.post("/session-ticket", response_model=RealtimeTicketResponse)
async def issue_session_ticket(
    request: RealtimeTicketRequest,
    current_user: UserResponse = Depends(get_current_user),
):
    ticket = service.issue_ticket(
        user_id=str(current_user.id),
        project_id=request.project_id,
        model=request.model,
    )
    return RealtimeTicketResponse(
        ticket=ticket.ticket,
        project_id=ticket.project_id,
        expires_at=ticket.expires_at,
    )


@router.websocket("/session/ws")
async def connect_agent_session(websocket: WebSocket, ticket: str):
    await websocket.accept()
    consumed = service.consume_ticket(ticket)
    if consumed is None:
        await websocket.send_json({"type": "error", "code": "invalid_ticket"})
        await websocket.close(code=4401)
        return
    await websocket.send_json(
        {
            "type": "session.state",
            "status": "idle",
            "project_id": consumed.project_id,
            "assistant_role": "engineer",
        }
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
source /Users/jackywang/Documents/atoms/app/backend/.venv/bin/activate && \
cd /Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration/app/backend && \
pytest tests/test_agent_realtime.py::test_issue_session_ticket_and_reject_invalid_websocket -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration && \
git add app/backend/schemas/agent_realtime.py app/backend/services/agent_realtime.py app/backend/routers/agent_realtime.py app/backend/tests/test_agent_realtime.py && \
git commit -m "feat(realtime): add websocket ticket flow"
```

## Task 2: Extract Shared Engineer Runtime And Stream Assistant Events Over WebSocket

**Files:**
- Create: `app/backend/services/engineer_runtime.py`
- Modify: `app/backend/routers/agent_realtime.py`
- Modify: `app/backend/routers/agent_runtime.py`
- Modify: `app/backend/tests/test_agent_realtime.py`
- Modify: `app/backend/tests/test_agent_runtime.py`

- [ ] **Step 1: Write the failing websocket session test for engineer streaming**

```python
def test_websocket_user_message_streams_engineer_reply(monkeypatch):
    from services.agent_realtime import service as realtime_service

    monkeypatch.setattr(
        "services.engineer_runtime.run_engineer_session",
        lambda **kwargs: kwargs["event_sink"](
            {"type": "assistant.delta", "content": "Working on auth flow"}
        ),
    )

    app = FastAPI()
    app.include_router(router)

    from dependencies.auth import get_current_user

    async def fake_get_current_user():
        return UserResponse(id="user-1", email="test@example.com", name="Test", role="user")

    app.dependency_overrides[get_current_user] = fake_get_current_user

    with TestClient(app) as client:
        ticket = client.post(
            "/api/v1/agent/session-ticket",
            json={"project_id": 7, "model": "gpt-5-chat"},
        ).json()["ticket"]
        with client.websocket_connect(f"/api/v1/agent/session/ws?ticket={ticket}") as websocket:
            websocket.receive_json()
            websocket.send_json(
                {"type": "user.message", "project_id": 7, "prompt": "build auth"}
            )
            assert websocket.receive_json() == {
                "type": "assistant.delta",
                "content": "Working on auth flow",
            }
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
source /Users/jackywang/Documents/atoms/app/backend/.venv/bin/activate && \
cd /Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration/app/backend && \
pytest tests/test_agent_realtime.py::test_websocket_user_message_streams_engineer_reply -v
```

Expected: FAIL because `services.engineer_runtime` and websocket `user.message` handling do not exist yet.

- [ ] **Step 3: Extract the shared engineer runtime and route websocket messages into it**

```python
# app/backend/services/engineer_runtime.py
from collections.abc import Awaitable, Callable

EventSink = Callable[[dict[str, object]], Awaitable[None]]


async def run_engineer_session(
    *,
    user_id: str,
    project_id: int,
    prompt: str,
    model: str | None,
    event_sink: EventSink,
) -> None:
    await event_sink({"type": "session.state", "status": "running"})
    await event_sink({"type": "assistant.delta", "content": f"Working on: {prompt}"})
    await event_sink({"type": "assistant.message_done"})
    await event_sink({"type": "session.state", "status": "completed"})
```

```python
# app/backend/routers/agent_realtime.py
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect

from dependencies.auth import get_current_user
from schemas.agent_realtime import RealtimeTicketRequest, RealtimeTicketResponse
from services.agent_realtime import AgentRealtimeService
from services.engineer_runtime import run_engineer_session

# app/backend/routers/agent_realtime.py
# inside connect_agent_session after the initial session.state send
    try:
        while True:
            payload = await websocket.receive_json()
            if payload["type"] == "user.message":
                async def send_event(event: dict[str, object]) -> None:
                    await websocket.send_json(event)

                await run_engineer_session(
                    user_id=consumed.user_id,
                    project_id=consumed.project_id,
                    prompt=str(payload["prompt"]),
                    model=consumed.model,
                    event_sink=send_event,
                )
    except WebSocketDisconnect:
        return
```

```python
# app/backend/routers/agent_runtime.py
from services.engineer_runtime import run_engineer_session

# inside the SSE compatibility route, replace the inline agent.run block with:
            await run_engineer_session(
                user_id=user_id,
                project_id=project_id,
                prompt=request.prompt,
                model=request.model,
                event_sink=emit,
            )
```

- [ ] **Step 4: Run the targeted backend websocket and compatibility tests**

Run:

```bash
source /Users/jackywang/Documents/atoms/app/backend/.venv/bin/activate && \
cd /Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration/app/backend && \
pytest tests/test_agent_realtime.py::test_websocket_user_message_streams_engineer_reply tests/test_agent_runtime.py::test_agent_run_sse_stream -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration && \
git add app/backend/services/engineer_runtime.py app/backend/routers/agent_realtime.py app/backend/routers/agent_runtime.py app/backend/tests/test_agent_realtime.py app/backend/tests/test_agent_runtime.py && \
git commit -m "feat(realtime): stream engineer runs over websocket"
```

## Task 3: Emit Progress, Terminal Logs, Live File Snapshots, And Stop Events

**Files:**
- Create: `app/backend/services/workspace_event_emitter.py`
- Modify: `app/backend/openmanus_runtime/streaming.py`
- Modify: `app/backend/openmanus_runtime/tool/file_operators.py`
- Modify: `app/backend/openmanus_runtime/tool/str_replace_editor.py`
- Modify: `app/backend/services/engineer_runtime.py`
- Modify: `app/backend/tests/test_agent_realtime.py`
- Modify: `app/backend/tests/test_agent_runtime_workspace.py`

- [ ] **Step 1: Write the failing tests for file snapshots and stop**

```python
@pytest.mark.asyncio
async def test_project_file_operator_emits_snapshot_on_write(tmp_path):
    events: list[dict[str, object]] = []
    operator = ProjectFileOperator(
        host_root=tmp_path,
        container_root=Path("/workspace"),
        event_sink=events.append,
    )

    await operator.write_file("/workspace/src/App.tsx", "export default function App() {}")

    assert events == [
        {
            "type": "file.snapshot",
            "path": "src/App.tsx",
            "content": "export default function App() {}",
        }
    ]


def test_websocket_run_stop_emits_run_stopped(monkeypatch):
    monkeypatch.setattr(
        "services.engineer_runtime.run_engineer_session",
        fake_long_running_engineer_session,
    )

    app = FastAPI()
    app.include_router(router)

    from dependencies.auth import get_current_user

    async def fake_get_current_user():
        return UserResponse(id="user-1", email="test@example.com", name="Test", role="user")

    app.dependency_overrides[get_current_user] = fake_get_current_user

    with TestClient(app) as client:
        ticket = client.post(
            "/api/v1/agent/session-ticket",
            json={"project_id": 9, "model": "gpt-5-chat"},
        ).json()["ticket"]
        with client.websocket_connect(f"/api/v1/agent/session/ws?ticket={ticket}") as websocket:
            websocket.receive_json()
            websocket.send_json(
                {"type": "user.message", "project_id": 9, "prompt": "build auth"}
            )
            websocket.send_json({"type": "run.stop"})
            assert websocket.receive_json() == {"type": "run.stopped"}
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
source /Users/jackywang/Documents/atoms/app/backend/.venv/bin/activate && \
cd /Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration/app/backend && \
pytest tests/test_agent_runtime_workspace.py::test_project_file_operator_emits_snapshot_on_write tests/test_agent_realtime.py::test_websocket_run_stop_emits_run_stopped -v
```

Expected: FAIL because `ProjectFileOperator` does not emit file events and the websocket session does not implement stop semantics.

- [ ] **Step 3: Implement a workspace event emitter, wire file writes to it, and add stop handling**

```python
# app/backend/services/workspace_event_emitter.py
from dataclasses import dataclass
from pathlib import Path
from collections.abc import Awaitable, Callable

EventSink = Callable[[dict[str, object]], Awaitable[None]]


@dataclass
class WorkspaceEventEmitter:
    event_sink: EventSink

    async def assistant_delta(self, content: str) -> None:
        await self.event_sink({"type": "assistant.delta", "content": content})

    async def progress(self, label: str) -> None:
        await self.event_sink({"type": "progress", "label": label})

    async def terminal_log(self, line: str) -> None:
        await self.event_sink({"type": "terminal.log", "content": line})

    async def file_snapshot(self, root: Path, file_path: Path, content: str) -> None:
        await self.event_sink(
            {
                "type": "file.snapshot",
                "path": str(file_path.relative_to(root)),
                "content": content,
            }
        )
```

```python
# app/backend/openmanus_runtime/tool/file_operators.py
class ProjectFileOperator(LocalFileOperator):
    def __init__(self, host_root: Path, container_root: Path, event_sink=None):
        self.host_root = Path(host_root)
        self.container_root = Path(container_root)
        self._event_sink = event_sink

    async def write_file(self, path: PathLike, content: str) -> None:
        host_path = self._to_host_path(path)
        host_path.parent.mkdir(parents=True, exist_ok=True)
        await super().write_file(host_path, content)
        if self._event_sink is not None:
            await self._event_sink(
                {
                    "type": "file.snapshot",
                    "path": str(host_path.relative_to(self.host_root)),
                    "content": content,
                }
            )
```

```python
# app/backend/openmanus_runtime/streaming.py
            if message.tool_calls:
                for tool_call in message.tool_calls:
                    await self._emit(
                        "terminal.log",
                        content=f"$ tool {tool_call.function.name}",
                    )
                    await self._emit(
                        "progress",
                        label=f"Running {tool_call.function.name}",
                    )
```

```python
# app/backend/services/engineer_runtime.py
async def run_engineer_session(
    *,
    user_id: str,
    project_id: int,
    prompt: str,
    model: str | None,
    event_sink: EventSink,
    stop_event: asyncio.Event | None = None,
) -> None:
    if stop_event and stop_event.is_set():
        await event_sink({"type": "run.stopped"})
        return
    await event_sink({"type": "session.state", "status": "running"})
    await event_sink({"type": "assistant.delta", "content": f"Working on: {prompt}"})
    if stop_event and stop_event.is_set():
        await event_sink({"type": "run.stopped"})
        return
    await event_sink({"type": "assistant.message_done"})
    await event_sink({"type": "session.state", "status": "completed"})
```

```python
# app/backend/routers/agent_realtime.py
            if payload["type"] == "run.stop":
                session.stop_event.set()
                await websocket.send_json({"type": "run.stopped"})
                continue
```

- [ ] **Step 4: Run the targeted backend tests**

Run:

```bash
source /Users/jackywang/Documents/atoms/app/backend/.venv/bin/activate && \
cd /Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration/app/backend && \
pytest tests/test_agent_runtime_workspace.py tests/test_agent_realtime.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration && \
git add app/backend/services/workspace_event_emitter.py app/backend/openmanus_runtime/streaming.py app/backend/openmanus_runtime/tool/file_operators.py app/backend/openmanus_runtime/tool/str_replace_editor.py app/backend/services/engineer_runtime.py app/backend/tests/test_agent_realtime.py app/backend/tests/test_agent_runtime_workspace.py && \
git commit -m "feat(realtime): stream workspace and stop events"
```

## Task 4: Add Frontend Realtime Client And Live Workspace State

**Files:**
- Create: `app/frontend/src/lib/agentRealtime.ts`
- Create: `app/frontend/src/lib/agentRealtime.test.ts`
- Modify: `app/frontend/src/contexts/WorkspaceContext.tsx`
- Modify: `app/frontend/src/contexts/WorkspaceContext.test.tsx`

- [ ] **Step 1: Write the failing frontend realtime client and workspace state tests**

```typescript
import { describe, expect, it, vi } from "vitest";
import { createAgentRealtimeSession } from "./agentRealtime";

describe("createAgentRealtimeSession", () => {
  it("sends user.message and stop frames over websocket", () => {
    const sent: string[] = [];
    class FakeSocket {
      onopen: (() => void) | null = null;
      constructor() {
        queueMicrotask(() => this.onopen?.());
      }
      send(value: string) {
        sent.push(value);
      }
    }

    const session = createAgentRealtimeSession({
      WebSocketImpl: FakeSocket as unknown as typeof WebSocket,
      url: "ws://example.test",
    });

    session.sendUserMessage({ projectId: 1, prompt: "build auth" });
    session.stopRun();

    expect(sent).toEqual([
      JSON.stringify({ type: "user.message", project_id: 1, prompt: "build auth" }),
      JSON.stringify({ type: "run.stop" }),
    ]);
  });
});
```

```typescript
it("applies file.snapshot updates without calling reloadFiles", async () => {
  const { result } = renderHook(() => useWorkspace(), { wrapper: WorkspaceProvider });
  act(() => {
    result.current.applyFileSnapshot({
      path: "src/App.tsx",
      content: "export default function App() { return <main />; }",
    });
  });
  expect(result.current.files.find((file) => file.file_path === "src/App.tsx")?.content)
    .toContain("return <main />");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration/app/frontend && \
pnpm test -- --run src/lib/agentRealtime.test.ts src/contexts/WorkspaceContext.test.tsx
```

Expected: FAIL because the websocket client wrapper and `applyFileSnapshot` state API do not exist yet.

- [ ] **Step 3: Implement the websocket client and live workspace state helpers**

```typescript
// app/frontend/src/lib/agentRealtime.ts
export type AgentRealtimeEvent =
  | { type: "session.state"; status: string }
  | { type: "assistant.delta"; content: string }
  | { type: "assistant.message_done" }
  | { type: "progress"; label: string }
  | { type: "terminal.log"; content: string }
  | { type: "file.snapshot"; path: string; content: string }
  | { type: "file.changed"; path: string }
  | { type: "preview.state"; frontend_status?: string; backend_status?: string }
  | { type: "run.stopped" }
  | { type: "error"; message?: string };

export function createAgentRealtimeSession({
  WebSocketImpl = WebSocket,
  url,
  onEvent,
}: {
  WebSocketImpl?: typeof WebSocket;
  url: string;
  onEvent?: (event: AgentRealtimeEvent) => void;
}) {
  const socket = new WebSocketImpl(url);
  socket.onmessage = (message) => {
    onEvent?.(JSON.parse(String(message.data)) as AgentRealtimeEvent);
  };

  return {
    sendUserMessage({ projectId, prompt }: { projectId: number; prompt: string }) {
      socket.send(JSON.stringify({ type: "user.message", project_id: projectId, prompt }));
    },
    stopRun() {
      socket.send(JSON.stringify({ type: "run.stop" }));
    },
  };
}
```

```typescript
// app/frontend/src/contexts/WorkspaceContext.tsx
const [sessionStatus, setSessionStatus] = useState("idle");
const [progressItems, setProgressItems] = useState<string[]>([]);

const applyFileSnapshot = useCallback(({ path, content }: { path: string; content: string }) => {
  setFiles((prev) => {
    const existing = prev.find((file) => file.file_path === path);
    if (existing) {
      return prev.map((file) =>
        file.file_path === path
          ? {
              id: file.id,
              file_path: file.file_path,
              file_name: file.file_name,
              content,
              language: file.language,
              is_directory: file.is_directory,
            }
          : file
      );
    }
    return prev.concat({
      file_path: path,
      file_name: getFileName(path),
      content,
      language: getLanguageFromPath(path),
      is_directory: false,
    });
  });
  setFileVersion((value) => value + 1);
}, []);

const applyRealtimeEvent = useCallback((event: AgentRealtimeEvent) => {
  if (event.type === "session.state") {
    setSessionStatus(event.status);
    return;
  }
  if (event.type === "progress") {
    setProgressItems((items) => items.concat(event.label));
    return;
  }
  if (event.type === "terminal.log") {
    addTerminalLog(event.content);
    return;
  }
  if (event.type === "file.snapshot") {
    applyFileSnapshot({ path: event.path, content: event.content });
    return;
  }
}, [addTerminalLog, applyFileSnapshot]);
```

- [ ] **Step 4: Run the targeted frontend tests**

Run:

```bash
cd /Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration/app/frontend && \
pnpm test -- --run src/lib/agentRealtime.test.ts src/contexts/WorkspaceContext.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration && \
git add app/frontend/src/lib/agentRealtime.ts app/frontend/src/lib/agentRealtime.test.ts app/frontend/src/contexts/WorkspaceContext.tsx app/frontend/src/contexts/WorkspaceContext.test.tsx && \
git commit -m "feat(frontend): add realtime workspace state"
```

## Task 5: Cut ChatPanel Over To Engineer-Only WebSocket Rendering

**Files:**
- Create: `app/frontend/src/components/ChatPanel.test.tsx`
- Modify: `app/frontend/src/components/ChatPanel.tsx`
- Modify: `app/frontend/src/pages/ProjectWorkspace.tsx`
- Modify: `app/frontend/src/pages/ProjectWorkspace.test.tsx`
- Delete: `app/frontend/src/lib/sse.ts`
- Delete: `app/frontend/src/lib/sse.test.ts`

- [ ] **Step 1: Write the failing ChatPanel regression tests**

```typescript
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

it("shows engineer progress without rendering raw tool call payloads", async () => {
  render(<ChatPanel mode="engineer" />);

  realtimeHarness.emit({ type: "assistant.delta", content: "Updating auth flow" });
  realtimeHarness.emit({ type: "progress", label: "Editing src/App.tsx" });
  realtimeHarness.emit({ type: "terminal.log", content: "$ pnpm test" });

  expect(await screen.findByText("Updating auth flow")).toBeInTheDocument();
  expect(screen.getByText("Editing src/App.tsx")).toBeInTheDocument();
  expect(screen.queryByText("$ pnpm test")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration/app/frontend && \
pnpm test -- --run src/components/ChatPanel.test.tsx src/pages/ProjectWorkspace.test.tsx
```

Expected: FAIL because `ChatPanel` still uses `fetch + SSE`, still appends `tool_call` and `tool_result`, and has no websocket harness to drive the test.

- [ ] **Step 3: Replace the SSE chat flow with a websocket session flow and engineer-only rendering**

```typescript
// app/frontend/src/components/ChatPanel.tsx
import { createAgentRealtimeSession } from "@/lib/agentRealtime";

const [activeAssistantMessage, setActiveAssistantMessage] = useState("");

const handleRealtimeEvent = useCallback((event: AgentRealtimeEvent) => {
  applyRealtimeEvent(event);

  if (event.type === "assistant.delta") {
    setActiveAssistantMessage((value) => value + event.content);
    return;
  }

  if (event.type === "assistant.message_done") {
    appendMessage({
      role: "assistant",
      agent: "engineer",
      content: activeAssistantMessage,
      created_at: new Date().toISOString(),
    });
    setActiveAssistantMessage("");
    return;
  }
}, [activeAssistantMessage, applyRealtimeEvent, appendMessage]);

const handleSend = async () => {
  const nextPrompt = input.trim();
  if (!nextPrompt || !projectId) {
    return;
  }

  const authHeaders = buildAuthHeaders();
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authHeaders.Authorization) {
    requestHeaders.Authorization = authHeaders.Authorization;
  }
  const ticketResponse = await fetch(`${getAPIBaseURL()}/api/v1/agent/session-ticket`, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify({ project_id: projectId, model: selectedModel }),
  });
  const { ticket } = await ticketResponse.json();
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const session = createAgentRealtimeSession({
    url: `${protocol}://${window.location.host}/api/v1/agent/session/ws?ticket=${ticket}`,
    onEvent: handleRealtimeEvent,
  });
  session.sendUserMessage({ projectId: Number(projectId), prompt: userMsg.content });
};
```

```tsx
// render branch inside ChatPanel.tsx
{progressItems.length > 0 && (
  <div className="mt-3 space-y-1">
    {progressItems.map((item) => (
      <div key={item} className="text-xs text-[#A1A1AA]">
        {item}
      </div>
    ))}
  </div>
)}
```

```typescript
// app/frontend/src/pages/ProjectWorkspace.tsx
const isRunActive = sessionStatus === "starting" || sessionStatus === "running";
```

- [ ] **Step 4: Run the targeted frontend tests**

Run:

```bash
cd /Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration/app/frontend && \
pnpm test -- --run src/components/ChatPanel.test.tsx src/pages/ProjectWorkspace.test.tsx src/contexts/WorkspaceContext.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration && \
git add app/frontend/src/components/ChatPanel.tsx app/frontend/src/components/ChatPanel.test.tsx app/frontend/src/pages/ProjectWorkspace.tsx app/frontend/src/pages/ProjectWorkspace.test.tsx app/frontend/src/lib/sse.ts app/frontend/src/lib/sse.test.ts && \
git commit -m "feat(chat): switch engineer panel to websocket streaming"
```

## Task 6: Full Verification, Docker Smoke, And Cleanup

**Files:**
- Modify: `app/backend/tests/test_agent_realtime.py`
- Modify: `app/frontend/src/lib/agentRealtime.test.ts`
- Modify: `docs/superpowers/specs/2026-04-21-leader-engineer-realtime-orchestration-design.md` (only if any naming drift must be corrected)

- [ ] **Step 1: Add final regression tests for preview continuity and compatibility**

```python
def test_sse_agent_route_still_emits_preview_ready_after_runtime_delegate(monkeypatch):
    monkeypatch.setattr("routers.agent_runtime.run_engineer_session", fake_preview_ready_runtime)

    app = FastAPI()
    app.include_router(router)

    from dependencies.auth import get_current_user
    from core.database import get_db

    async def fake_get_current_user():
        return UserResponse(id="user-1", email="test@example.com", name="Test", role="user")

    async def fake_get_db():
        yield FakeDB()

    app.dependency_overrides[get_current_user] = fake_get_current_user
    app.dependency_overrides[get_db] = fake_get_db

    with TestClient(app) as client:
        response = client.post("/api/v1/agent/run", json={"prompt": "build", "project_id": 1})

    assert response.status_code == 200
    assert 'event: preview_ready' in response.text
```

```typescript
it("keeps preview iframe mounted while realtime session updates arrive", async () => {
  render(<ProjectWorkspace />);

  realtimeHarness.emit({ type: "session.state", status: "running" });
  realtimeHarness.emit({
    type: "preview.state",
    frontend_status: "running",
    backend_status: "running",
  });

  expect(await screen.findByTitle("App Viewer")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the full backend and frontend automated suites**

Run:

```bash
source /Users/jackywang/Documents/atoms/app/backend/.venv/bin/activate && \
cd /Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration/app/backend && \
pytest tests/test_agent_realtime.py tests/test_agent_runtime.py tests/test_agent_runtime_workspace.py tests/test_workspace_runtime.py tests/test_preview_gateway.py -v
```

Run:

```bash
cd /Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration/app/frontend && \
pnpm test -- --run && \
pnpm build
```

Expected: all targeted backend tests PASS, all frontend tests PASS, frontend build PASS.

- [ ] **Step 3: Run the local docker smoke test for the full path**

Run:

```bash
cd /Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration && \
docker build -t atoms-sandbox:latest -f docker/atoms-sandbox/Dockerfile . && \
docker run --rm -d --name atoms-realtime-smoke -p 3300:3000 -p 8300:8000 atoms-sandbox:latest
```

Then verify:

```bash
curl -I http://127.0.0.1:3300/ && \
curl -I http://127.0.0.1:8300/health
```

Expected: `HTTP/1.1 200 OK` for both endpoints.

- [ ] **Step 4: Manual smoke in the app**

Run:

```bash
source /Users/jackywang/Documents/atoms/app/backend/.venv/bin/activate && \
cd /Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration/app/backend && \
uvicorn main:app --reload --port 8000
```

Run separately:

```bash
cd /Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration/app/frontend && \
pnpm dev --host 0.0.0.0 --port 3000
```

Verify manually:

- send a prompt from the workspace
- confirm left chat shows only engineer text plus compact progress
- confirm raw terminal commands stay in terminal, not chat
- confirm file edits appear in the editor while the run is still active
- confirm App Viewer still loads and is clickable
- confirm stop halts the run without clearing already-written files

- [ ] **Step 5: Commit**

```bash
cd /Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration && \
git add app/backend/tests/test_agent_realtime.py app/backend/tests/test_agent_runtime.py app/backend/tests/test_agent_runtime_workspace.py app/frontend/src/lib/agentRealtime.test.ts app/frontend/src/components/ChatPanel.test.tsx app/frontend/src/pages/ProjectWorkspace.test.tsx && \
git commit -m "test(realtime): verify engineer-first websocket flow"
```

## Spec Coverage Check

- Backend control-plane auth and websocket transport: Task 1
- Shared engineer runtime and compatibility path: Task 2
- Progress, terminal separation, live file streaming, and stop: Task 3
- Frontend realtime state and live editor updates: Task 4
- Engineer-only chat rendering and preview continuity: Task 5
- Automated verification, docker smoke, and manual smoke: Task 6

## Notes

- Keep `POST /api/v1/agent/run` as a compatibility adapter until Task 6 passes. Do not delete it earlier.
- Do not touch the same-origin preview gateway transport in this plan. The app plane is already correct enough for this iteration.
- Do not introduce a `leader` agent in this plan. That remains a later follow-up on top of the websocket foundation built here.
