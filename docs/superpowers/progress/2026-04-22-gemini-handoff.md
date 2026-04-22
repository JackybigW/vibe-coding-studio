# Gemini Handoff

## Repo
- Path: `/Users/jackywang/Documents/atoms`
- Active branch: `feature/alex-orchestration-layer`
- Backend venv: `/Users/jackywang/Documents/atoms/app/backend/.venv`

## Product Goal
Atoms is a local-first AI app-building workspace.

The intended user flow is:
1. User creates a new project.
2. New project starts with an empty `/workspace`.
3. User sends an implementation request.
4. Engineer agent classifies the request.
5. If it is an implementation request, the agent must:
   - call `draft_plan`
   - wait for user approval in chat
   - write `docs/plans/*.md`
   - write `docs/todo.md`
   - then implement step by step
6. Files should appear in the right-side editor in real time.
7. App Viewer should eventually run the generated app.
8. If the user sends a casual message like `hello`, the system should not start sandbox/build flow.

## Current Architecture

### Backend
- Entry: `/Users/jackywang/Documents/atoms/app/backend/main.py`
- Routers:
  - `/Users/jackywang/Documents/atoms/app/backend/routers/agent_realtime.py`
  - `/Users/jackywang/Documents/atoms/app/backend/routers/workspace_runtime.py`
  - `/Users/jackywang/Documents/atoms/app/backend/routers/projects.py`
- Runtime/orchestration:
  - `/Users/jackywang/Documents/atoms/app/backend/services/engineer_runtime.py`
  - `/Users/jackywang/Documents/atoms/app/backend/services/agent_bootstrap.py`
  - `/Users/jackywang/Documents/atoms/app/backend/services/approval_gate.py`
  - `/Users/jackywang/Documents/atoms/app/backend/services/agent_task_store.py`
  - `/Users/jackywang/Documents/atoms/app/backend/services/agent_draft_plan.py`
- Sandbox:
  - `/Users/jackywang/Documents/atoms/app/backend/services/sandbox_runtime.py`
- Workspace/file tools:
  - `/Users/jackywang/Documents/atoms/app/backend/openmanus_runtime/tool/file_operators.py`
  - `/Users/jackywang/Documents/atoms/app/backend/openmanus_runtime/tool/bash.py`
  - `/Users/jackywang/Documents/atoms/app/backend/openmanus_runtime/tool/draft_plan.py`
  - `/Users/jackywang/Documents/atoms/app/backend/openmanus_runtime/tool/todo_write.py`
  - `/Users/jackywang/Documents/atoms/app/backend/openmanus_runtime/tool/load_skill.py`

### Frontend
- Workspace state:
  - `/Users/jackywang/Documents/atoms/app/frontend/src/contexts/WorkspaceContext.tsx`
- Chat runtime:
  - `/Users/jackywang/Documents/atoms/app/frontend/src/components/ChatPanel.tsx`
- Editor:
  - `/Users/jackywang/Documents/atoms/app/frontend/src/components/CodeEditor.tsx`
- Workspace page:
  - `/Users/jackywang/Documents/atoms/app/frontend/src/pages/ProjectWorkspace.tsx`

## Important Current Behaviors

### 1. Conversation vs implementation
- `hello` / `test` / small talk should classify as `conversation`
- `conversation` mode should not start sandbox
- This was recently fixed in:
  - `/Users/jackywang/Documents/atoms/app/backend/services/engineer_runtime.py`

### 2. Sandbox stale container self-healing
- Deterministic container names are reused per project.
- If an old container exists with the wrong image/workspace/env, the runtime should remove and recreate it.
- This was recently fixed in:
  - `/Users/jackywang/Documents/atoms/app/backend/services/sandbox_runtime.py`

### 3. Real terminal/run logs
- Backend file logs are written to:
  - `/Users/jackywang/Documents/atoms/app/backend/logs/app_YYYYMMDD_HHMMSS.log`
- Per-project latest run logs are now persisted under:
  - `/tmp/atoms_workspaces/.agent_runs/<user_id>/<project_id>/latest.json`
  - `/tmp/atoms_workspaces/.agent_runs/<user_id>/<project_id>/latest.jsonl`
- Relevant files:
  - `/Users/jackywang/Documents/atoms/app/backend/services/agent_run_logs.py`
  - `/Users/jackywang/Documents/atoms/app/backend/routers/agent_realtime.py`
  - `/Users/jackywang/Documents/atoms/app/backend/schemas/agent_realtime.py`
  - `/Users/jackywang/Documents/atoms/app/frontend/src/contexts/WorkspaceContext.tsx`

### 4. Empty workspace is the intended initialization state
- This is important.
- The system prompt and guardrails assume the agent creates the project structure itself.
- Atoms official behavior is closer to an empty `/workspace` than a pre-seeded React template.

## Root Cause Just Identified
The main issue during the latest test run was not guardrails.

The real cause was:
- `/Users/jackywang/Documents/atoms/app/frontend/src/components/CodeEditor.tsx`
- When a project had no `project_files`, it automatically seeded:
  - `src/App.tsx`
  - `src/index.css`
  - `package.json`
- That made new projects start as a Vite/Tailwind app even though the orchestration layer expects a blank workspace.
- The agent then tried to write into `src/...`, but backend guardrails only allow writes under:
  - `/workspace/app/frontend`
  - `/workspace/app/backend`
  - `/workspace/docs`
  - `/workspace/.atoms`
- So the agent got stuck after plan approval, not because the model was weak, but because the initial workspace shape contradicted the allowed structure.

## Latest Fixes Already Made But Not Yet Committed

### Backend/logging/runtime
- `/Users/jackywang/Documents/atoms/app/backend/main.py`
  - log dir now resolves under `app/backend/logs`
  - default log level reduced to `INFO`
  - `aiosqlite` / `sqlalchemy.engine` noise suppressed
- `/Users/jackywang/Documents/atoms/app/backend/services/agent_run_logs.py`
  - new latest-run log persistence
- `/Users/jackywang/Documents/atoms/app/backend/routers/agent_realtime.py`
  - new `GET /api/v1/agent/projects/{project_id}/latest-run-logs`
- `/Users/jackywang/Documents/atoms/app/backend/services/engineer_runtime.py`
  - step logs recorded and emitted
  - conversation mode short-circuit
- `/Users/jackywang/Documents/atoms/app/backend/services/sandbox_runtime.py`
  - stale container self-healing

### Frontend
- `/Users/jackywang/Documents/atoms/app/frontend/src/contexts/WorkspaceContext.tsx`
  - terminal now loads latest persisted run logs
  - placeholder terminal logs removed
- `/Users/jackywang/Documents/atoms/app/frontend/src/components/CodeEditor.tsx`
  - default file seeding removed
  - empty workspace state added

## Current Modified / Uncommitted Files
- `/Users/jackywang/Documents/atoms/app/backend/main.py`
- `/Users/jackywang/Documents/atoms/app/backend/routers/agent_realtime.py`
- `/Users/jackywang/Documents/atoms/app/backend/schemas/agent_realtime.py`
- `/Users/jackywang/Documents/atoms/app/backend/services/engineer_runtime.py`
- `/Users/jackywang/Documents/atoms/app/backend/services/sandbox_runtime.py`
- `/Users/jackywang/Documents/atoms/app/backend/tests/test_agent_runtime.py`
- `/Users/jackywang/Documents/atoms/app/backend/tests/test_sandbox_runtime.py`
- `/Users/jackywang/Documents/atoms/app/backend/services/agent_run_logs.py`
- `/Users/jackywang/Documents/atoms/app/backend/tests/test_agent_run_logs.py`
- `/Users/jackywang/Documents/atoms/app/frontend/src/components/CodeEditor.tsx`
- `/Users/jackywang/Documents/atoms/app/frontend/src/components/CodeEditor.test.tsx`
- `/Users/jackywang/Documents/atoms/app/frontend/src/contexts/WorkspaceContext.tsx`
- `/Users/jackywang/Documents/atoms/app/frontend/src/contexts/WorkspaceContext.test.tsx`

## Local Files That Are Reference-Only
Do not accidentally include these unless explicitly intended:
- `/Users/jackywang/Documents/atoms/docs/superpowers/specs/2026-04-22-alex-orchestration-design.md`
- `/Users/jackywang/Documents/atoms/skills/ai_capability.md`
- `/Users/jackywang/Documents/atoms/skills/custom_api.md`
- `/Users/jackywang/Documents/atoms/skills/object_storage.md`
- `/Users/jackywang/Documents/atoms/skills/web_sdk.md`

## Relevant Current Logs
- Backend process log:
  - `/Users/jackywang/Documents/atoms/app/backend/logs/app_20260422_153319.log`
- Example problematic project latest run log:
  - `/tmp/atoms_workspaces/.agent_runs/google-oauth2|104825119025028827664/4/latest.jsonl`

## What Gemini Should Verify First
1. New project creation no longer seeds default `project_files`.
2. Opening a brand new project shows empty editor state instead of seeded React files.
3. Sending an implementation request in a brand new project now causes the agent to create files under the intended structure, not inherit `src/*`.
4. Terminal shows real latest-run logs and survives page refresh.
5. Conversation requests still skip sandbox.

## Suggested Local Verification Commands

### Backend tests
```bash
PYTHONPATH=/Users/jackywang/Documents/atoms/app/backend \
/Users/jackywang/Documents/atoms/app/backend/.venv/bin/pytest \
  /Users/jackywang/Documents/atoms/app/backend/tests/test_agent_run_logs.py \
  /Users/jackywang/Documents/atoms/app/backend/tests/test_agent_runtime.py \
  /Users/jackywang/Documents/atoms/app/backend/tests/test_sandbox_runtime.py \
  /Users/jackywang/Documents/atoms/app/backend/tests/test_agent_realtime.py -q
```

### Frontend tests
```bash
cd /Users/jackywang/Documents/atoms/app/frontend
pnpm test -- --run \
  src/components/CodeEditor.test.tsx \
  src/contexts/WorkspaceContext.test.tsx \
  src/components/ChatPanel.test.tsx
```

### Frontend build
```bash
cd /Users/jackywang/Documents/atoms/app/frontend
pnpm build
```

## Practical Next Step
The most important next step is not more architecture work.

It is:
- create a brand new project
- confirm it is truly empty
- run one implementation request end to end
- inspect terminal, latest run logs, and resulting file structure

That is the highest-signal debugging path right now.
