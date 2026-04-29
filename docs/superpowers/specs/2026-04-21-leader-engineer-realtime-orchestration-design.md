# Engineer First Realtime Workspace Streaming Design

Date: 2026-04-21
Status: Proposed
Branch: `feature/leader-engineer-realtime-orchestration`

## Summary

Vibe Coding Studio should split realtime behavior into two distinct planes:

- a **control plane** for the platform-owned SWE session, progress, terminal summaries, file updates, and stop/cancel
- an **app plane** for the generated SaaS app running inside App Viewer

For this iteration, Vibe Coding Studio should **not** introduce a separate `leader` agent yet.

The recommended staged design is:

- keep the current `engineer` SWE as the only user-facing chat participant
- move the control plane from `POST + SSE` to an authenticated WebSocket session
- keep App Viewer on the existing same-origin preview gateway over HTTP, with WebSocket pass-through for the app itself
- stop rendering raw tool calls, tool results, and code dumps in the left chat panel
- stream workspace file updates into the editor while the engineer writes, so the right pane changes during execution rather than only after a final sync
- make stop/cancel a first-class session command, not a best-effort fetch abort

This is an **engineer-first realtime foundation**. A separate `leader -> engineer` orchestration layer can be added later on top of the same transport and event model.

## Problem Statement

The current system can run an SWE agent and then bring up preview, but the user experience is still wrong for an interactive coding workspace.

Current gaps:

- the left chat renders raw `assistant`, `tool_call`, and `tool_result` events as normal chat content
- users therefore see terminal commands, JSON arguments, and code-like payloads in the main conversation surface
- workspace updates reach the right editor only after a snapshot/sync boundary, not as live edits while the engineer is working
- the runtime path is still modeled as `request -> long SSE stream -> final workspace sync`, which is awkward for stop, reconnect, and durable session state
- App Viewer is already a separate full-stack runtime plane and should not be overloaded onto the same semantics as platform control messages

As a result:

- the engineer feels noisy instead of focused
- the user cannot clearly distinguish progress updates from implementation details
- editor updates lag behind the agent
- stop/cancel is weak
- the current transport is not a good base for later multi-agent orchestration

## Goals

- Keep `engineer` as the only user-facing chat participant for this phase.
- Let `engineer` stream short natural-language progress updates in real time.
- Remove raw terminal commands, tool payloads, and code dumps from the main chat transcript.
- Stream workspace file updates into the right editor while the engineer is actively writing.
- Keep App Viewer interactive for real app flows like navigation, forms, auth, subscriptions, and backend-backed behavior.
- Allow the user to stop the current run at any time.
- Preserve the current same-origin preview gateway for the generated app runtime.
- Build a transport and event model that can later support a separate `leader` without redoing the foundation.

## Non Goals

- Introduce a separate `leader` agent in this iteration.
- Rewrite all CRUD APIs to WebSocket.
- Replace the existing same-origin preview gateway with a remote DOM or streamed UI protocol.
- Build multiplayer collaboration or CRDT-based co-editing in this iteration.
- Expose every engineer/tool event directly in the chat transcript.
- Solve production deployment of generated apps beyond preview/runtime concerns.

## Current Findings

### 1. Chat currently mixes user-facing progress with raw tool output

Relevant files:

- [app/frontend/src/components/ChatPanel.tsx](/Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration/app/frontend/src/components/ChatPanel.tsx)
- [app/backend/openmanus_runtime/streaming.py](/Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration/app/backend/openmanus_runtime/streaming.py)
- [app/backend/routers/agent_runtime.py](/Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration/app/backend/routers/agent_runtime.py)

Current behavior:

- the backend emits `assistant`, `tool_call`, and `tool_result`
- the frontend appends all three event types into the left message list
- terminal details and tool payloads therefore leak into the main chat transcript

This is the immediate reason users see terminal commands and code-oriented payloads in the chat panel.

### 2. Editor updates are delayed behind a final workspace sync

Relevant files:

- [app/frontend/src/contexts/WorkspaceContext.tsx](/Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration/app/frontend/src/contexts/WorkspaceContext.tsx)
- [app/backend/routers/agent_runtime.py](/Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration/app/backend/routers/agent_runtime.py)
- [app/backend/openmanus_runtime/tool/file_operators.py](/Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration/app/backend/openmanus_runtime/tool/file_operators.py)

Current behavior:

- the backend snapshots the workspace after `agent.run()` completes
- the frontend reacts to `workspace_sync` by re-querying all project files
- the editor does not see intermediate writes while the engineer is actively changing files

This is the immediate reason the right editor lags behind the actual coding work.

### 3. App Viewer is already a separate runtime plane

Relevant files:

- [app/backend/routers/preview_gateway.py](/Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration/app/backend/routers/preview_gateway.py)
- [app/frontend/src/pages/ProjectWorkspace.tsx](/Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration/app/frontend/src/pages/ProjectWorkspace.tsx)

Current behavior:

- App Viewer runs a real frontend/backend preview through same-origin gateway routes
- the app inside the iframe can already use normal HTTP behavior and preview WebSocket pass-through

This means App Viewer should remain an app/runtime concern. It should not be collapsed into the same semantics as the platform orchestration channel.

## Approaches Considered

### Option A: Patch the current SSE path

Description:

- keep `POST /api/v1/agent/run`
- filter tool events out of chat in the frontend
- add more SSE event types for progress and file writes
- keep stop as request abort plus ad hoc server behavior

Pros:

- smallest short-term diff
- fastest path to a limited cleanup

Cons:

- still splits realtime state across SSE down + HTTP up
- stop, reconnect, and session lifecycle remain awkward
- keeps a transport we already know is weak for the long-term product direction

Decision:

- rejected as too temporary

### Option B: Engineer-first hybrid dual-plane architecture

Description:

- move the platform control plane onto WebSocket
- keep only one visible assistant role for now: `engineer`
- keep App Viewer on the current same-origin preview gateway over HTTP
- allow preview gateway WebSocket pass-through for the app itself
- leave normal CRUD APIs on REST

Pros:

- directly addresses the two immediate user-facing problems
- gives progress, stop, terminal separation, and file streaming one coherent control channel
- does not force App Viewer into the wrong abstraction
- creates the right foundation for a future `leader` without forcing that complexity into this iteration

Cons:

- introduces a session-state refactor on frontend and backend
- the system still uses multiple communication modes: REST, orchestration WebSocket, preview HTTP/WS proxy

Decision:

- recommended

### Option C: Build full leader-engineer orchestration now

Description:

- introduce a visible `leader`
- split internal `engineer` work immediately
- redesign the whole chat surface around those two roles in one step

Pros:

- closest to the long-term product model

Cons:

- larger product and implementation jump
- mixes transport work, UX cleanup, role architecture, and orchestration design into one change
- higher risk of shipping none of the practical improvements quickly

Decision:

- rejected for this iteration

## Recommended Design

## 1. Two Plane Architecture

Vibe Coding Studio should explicitly separate:

- **Control Plane**
  - engineer chat stream
  - progress updates
  - terminal summaries
  - file snapshots
  - stop/cancel
  - session lifecycle
- **App Plane**
  - App Viewer iframe
  - generated app frontend resources
  - generated app backend API traffic
  - generated app WebSocket/SSE traffic

Rule:

- control plane runs through a platform-owned WebSocket session
- app plane runs through the existing same-origin preview gateway

This preserves browser-native app behavior inside App Viewer while giving the platform a robust realtime control channel.

## 2. Session Model

Introduce a first-class realtime session per active workspace run.

Recommended session identity:

- `session_id`
- `project_id`
- `user_id`
- `run_id`
- `status`: `idle | starting | running | stopping | stopped | failed | completed`
- `assistant_role`: `engineer`
- `assistant_state`
- `connected_at`
- `last_heartbeat_at`

Recommended backend entrypoints:

- `POST /api/v1/agent/session-ticket`
  - authenticated REST endpoint
  - returns a short-lived `realtime_ticket`
- `WS /api/v1/agent/session/ws?ticket=<ticket>`
  - establishes the control-plane session

Reason:

- the current auth model is bearer-token based and stored in `localStorage`
- a short-lived ticket is safer than pushing the long-lived bearer token into the WebSocket URL
- this keeps preview auth and orchestration auth separate

## 3. Assistant Model

For this phase, there is only one visible assistant role:

- `engineer`

Responsibilities:

- receives the user message
- streams short natural-language acknowledgement and progress updates
- edits files
- runs commands
- emits structured terminal/debug output
- emits file-update events
- reports completion, failure, or blocked state

UI rule:

- the left chat panel renders only user messages plus the engineer's user-facing stream
- tool-level detail appears in progress rows, terminal logs, and editor updates, not as normal chat bubbles

## 4. WebSocket Protocol

Use typed events instead of overloading chat messages.

### Client To Server

- `session.start`
  - start realtime orchestration for a project
- `user.message`
  - user prompt for engineer
- `run.stop`
  - user stops current run
- `session.resume`
  - reconnect to existing session state
- `ui.state`
  - optional lightweight hints like current tab or open file
- `ping`
  - heartbeat

### Server To Client

- `session.state`
  - session lifecycle and status changes
- `assistant.delta`
  - streaming engineer text chunks for the main chat bubble
- `assistant.message_done`
  - final engineer message boundary
- `progress`
  - short user-facing progress entries such as "updating auth flow" or "wiring preview backend"
- `terminal.log`
  - terminal/debug output for terminal panel only
- `file.snapshot`
  - full content for a changed file
- `file.changed`
  - metadata-only file tree change
- `preview.state`
  - preview ready/degraded/failed state updates
- `run.stopped`
  - stop confirmed
- `error`
  - structured failure event
- `pong`
  - heartbeat response

Reason for `file.snapshot` instead of a diff-first protocol:

- current backend tools already operate in file-sized edits
- snapshot-per-write is simpler and less fragile than introducing textual patch merging immediately
- this still gives the user a live-writing experience if snapshots are emitted after each successful mutation

## 5. Backend Runtime Shape

Replace the current `POST + SSE` orchestration path with a WebSocket-oriented session manager.

Recommended backend units:

- `agent_realtime.py`
  - WebSocket router and session protocol
- `agent_session_manager.py`
  - create, reuse, stop, and clean up sessions
- `engineer_runtime.py`
  - workspace-scoped code-writing execution
- `workspace_event_emitter.py`
  - emits progress, terminal, file, and preview events

Behavior:

- engineer receives the user message
- engineer streams an immediate acknowledgement
- engineer runs tools internally
- raw tool calls and tool results are mapped into terminal/progress/file events instead of normal chat content
- engineer emits file snapshots while work is happening
- engineer sends a final concise completion or failure message at the end of the run

## 6. Workspace Streaming

The editor should update while the engineer works, not only after a final sync.

Recommended behavior:

- instrument file-writing tools to emit `file.snapshot` after each successful write or replace operation
- instrument file creation and deletion to emit `file.changed`
- frontend updates the in-memory workspace immediately
- persistence to `project_files` remains on the backend, but UI responsiveness should not wait for a later query reload

First iteration rule:

- the agent owns the edited file during an active run
- if the user edits the same file mid-run, frontend should warn and prefer the latest explicit user change after the run completes

This avoids needing collaborative merge logic in the first release.

## 7. Stop And Cancellation

Stop must be a first-class control command.

Recommended flow:

1. user sends `run.stop`
2. backend marks the session as `stopping`
3. current engineer tool execution is interrupted or the next step is prevented from starting
4. backend emits `run.stopped`
5. engineer emits a final short stopped message if possible

Rules:

- partial file writes already completed remain in the workspace
- no new tool executions should begin after stop is accepted
- preview should remain usable for whatever state is already on disk

## 8. Chat And Terminal Separation

The left chat panel should not be a raw event dump.

Recommended rendering rules:

- `assistant.delta` updates the main engineer message
- `progress` renders compact status rows under or beside the active engineer message
- `terminal.log` goes only to the terminal panel
- raw tool arguments and raw tool results should not be promoted into the main transcript
- `error` should render as a concise user-facing message, with details still available in terminal/debug surfaces

This preserves clarity while keeping deep debugging information available.

## 9. Frontend Changes

### Chat Panel

Refactor into a realtime session client:

- opens WebSocket via `realtime_ticket`
- sends `user.message`
- renders one active streaming engineer bubble
- renders stop button against session state, not only `AbortController`
- stops appending `tool_call` and `tool_result` into the message list

### Workspace Context

Expand to own:

- session status
- assistant stream buffer
- progress list
- terminal log buffer
- current file snapshots
- preview state

### Code Editor

Add runtime behavior:

- apply `file.snapshot` immediately to the open file buffer
- update file tree on `file.changed`
- optionally surface "agent is editing this file" state

### Project Workspace

Keep:

- preview iframe via same-origin preview gateway
- degraded or ready preview status

Add:

- clearer separation between chat events, terminal events, workspace file events, and preview events

## 10. Preview Integration

App Viewer remains a real browser context, not a streamed UI protocol.

Keep:

- same-origin preview frontend route
- same-origin preview backend route
- preview WebSocket pass-through

Do not route app clicks or app UI state through the orchestration WebSocket.

Meaning:

- when the user clicks inside App Viewer, that interaction belongs to the generated app
- when the user sends a prompt or stops a run, that interaction belongs to the platform control plane

## 11. Reliability

Recommended safeguards:

- heartbeat `ping/pong`
- bounded outbound event queues per session
- reconnect with `session.resume`
- explicit `run_id` so stale events can be ignored client-side
- structured error states instead of raw exception text in chat

Initial reconnect behavior:

- on reconnect, restore current `session.state`
- resend latest assistant message buffer
- resend latest open-file snapshot state
- do not attempt mid-tool replay

## 12. Testing Strategy

Backend tests:

- WebSocket ticket issuance and validation
- session start and stop lifecycle
- assistant stream events
- progress events
- file snapshot emission during writes
- stop cancelling further work
- preview state events still propagate

Frontend tests:

- ChatPanel engineer streaming
- stop button wiring to `run.stop`
- terminal panel isolation from chat panel
- WorkspaceContext file snapshot application
- editor updates while session is active
- reconnect and resume behavior for current buffers

Manual smoke tests:

- user prompt -> engineer starts streaming immediately
- engineer writes files visible in editor while run is active
- preview refreshes without waiting for final run completion
- stop interrupts active work
- App Viewer still supports normal app interactions and app WebSocket pass-through

## 13. Migration Strategy

Phase 1:

- add realtime ticket endpoint
- add orchestration WebSocket session
- keep a single visible assistant role: `engineer`
- stop rendering raw tool events in chat
- add `progress`, `terminal.log`, `file.snapshot`, and `file.changed`
- update editor live while engineer writes
- add first-class stop handling

Phase 2:

- add reconnect and resume
- refine progress UI and terminal surfaces
- add better conflict indicators when user edits files during an active run

Phase 3:

- introduce an optional `leader -> engineer` orchestration layer on top of the same transport and workspace event model

This sequence ships the immediate UX fix first while preserving the long-term architecture.

## Risks And Tradeoffs

- introducing a realtime session layer adds server-side state and lifecycle complexity
- user edits during active engineer writes need explicit conflict policy
- hiding tool details from chat can make debugging harder unless terminal/debug surfaces stay strong
- the system will intentionally keep multiple protocols: REST, orchestration WS, preview HTTP/WS proxy

These tradeoffs are acceptable because they map cleanly to the real product model instead of forcing one protocol to serve two different planes.

## Decision

Implement Vibe Coding Studio as a **dual-plane realtime system**:

- **control plane**: WebSocket for engineer chat streaming, progress, stop, terminal summaries, and live workspace updates
- **app plane**: existing same-origin preview gateway for the generated app, including WebSocket pass-through when the app itself needs it

This is the smallest design that satisfies the current requirement:

- engineer still talks to the customer
- engineer stops dumping raw commands and code into chat
- editor updates live
- user can stop anytime
- App Viewer remains a real interactive SaaS app surface
- a future leader can be added later without redoing the transport model
