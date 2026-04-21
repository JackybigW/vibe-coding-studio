# Leader Engineer Realtime Orchestration Design

Date: 2026-04-21
Status: Proposed
Branch: `feature/leader-engineer-realtime-orchestration`

## Summary

Atoms should split realtime behavior into two distinct planes:

- a **control plane** for `leader`, `engineer`, editor sync, progress, terminal summaries, and stop/cancel
- an **app plane** for the generated SaaS app running inside App Viewer

The recommended design is:

- move the agent session from `POST + SSE` to a dedicated authenticated WebSocket session
- keep App Viewer on the existing same-origin preview gateway over HTTP, with WebSocket pass-through for the app itself
- make `leader` the only agent that speaks directly to the user in the left chat panel
- keep `engineer` mostly invisible to the user, emitting structured progress, file-change, and terminal events instead of raw chat messages
- stream workspace changes into the editor as the engineer writes, so the right pane updates during execution rather than only after a final snapshot
- make stop/cancel a first-class session command, not a best-effort fetch abort

This is a `WebSocket-first orchestration + HTTP preview runtime` design, not a full rewrite of every app API onto WebSocket.

## Problem Statement

The current system can run an SWE agent and then bring up preview, but it does not match the product behavior required for a leader-engineer experience.

Current gaps:

- the left chat still renders raw agent/tool events as chat content, so users see terminal commands and code-like details instead of a coherent leader narrative
- the primary runtime path is still modeled as `request -> long SSE stream -> final workspace sync`, which is awkward for stop, interrupt, agent delegation, and resumable state
- workspace updates reach the right editor only after a snapshot/sync boundary, not as live edits while the engineer is working
- App Viewer is now full-stack same-origin preview, but it is a separate concern from agent orchestration and should not be overloaded onto the same realtime channel
- there is no durable control model for `leader directs engineer`, `user stops run`, `engineer reports progress`, or `session reconnects`

As a result:

- the user experience feels like one noisy agent instead of a leader coordinating work
- stop/cancel semantics are weak
- editor updates lag behind the agent
- the architecture will get harder to extend once multi-agent orchestration becomes more central

## Goals

- Make `leader` the user-facing agent in the left chat panel.
- Let `leader` stream user-facing reasoning and progress in real time.
- Let `leader` direct `engineer` work internally during the same realtime session.
- Stream workspace file updates into the right editor while the engineer is working.
- Keep App Viewer interactive for real app flows like navigation, forms, auth, subscriptions, and other backend-backed behavior.
- Allow the user to stop the current run at any time.
- Preserve the current same-origin preview gateway for the generated app runtime.
- Keep the design compatible with future reconnect/resume and richer multi-agent coordination.

## Non Goals

- Rewrite all CRUD APIs to WebSocket.
- Replace the existing same-origin preview gateway with a remote-DOM or streamed-UI protocol.
- Build multiplayer collaboration or CRDT-based co-editing in this iteration.
- Expose every engineer/tool event directly in the chat transcript.
- Solve production deployment of generated apps beyond preview/runtime concerns.

## Current Findings

### 1. The chat plane and work plane are still conflated

Relevant files:

- [app/frontend/src/components/ChatPanel.tsx](/Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration/app/frontend/src/components/ChatPanel.tsx)
- [app/backend/routers/agent_runtime.py](/Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration/app/backend/routers/agent_runtime.py)

Current behavior:

- the frontend consumes SSE events and appends `assistant`, `tool_call`, and `tool_result` into the left message list
- terminal details and tool payloads leak into the main conversation surface
- the backend has one agent stream, not an explicit leader/engineer session model

This prevents a clean “leader talks, engineer works” user experience.

### 2. Editor updates are delayed behind backend sync boundaries

Relevant files:

- [app/frontend/src/contexts/WorkspaceContext.tsx](/Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration/app/frontend/src/contexts/WorkspaceContext.tsx)
- [app/backend/routers/agent_runtime.py](/Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration/app/backend/routers/agent_runtime.py)

Current behavior:

- the backend snapshots the workspace after `agent.run()` completes
- the frontend reloads files on `workspace_sync`
- the editor does not see intermediate edits while the engineer is actively writing

### 3. App Viewer is already its own runtime plane

Relevant files:

- [app/backend/routers/preview_gateway.py](/Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration/app/backend/routers/preview_gateway.py)
- [app/frontend/src/pages/ProjectWorkspace.tsx](/Users/jackywang/Documents/atoms/.worktrees/feature-leader-engineer-realtime-orchestration/app/frontend/src/pages/ProjectWorkspace.tsx)

Current behavior:

- App Viewer runs a real frontend/backend preview through same-origin gateway routes
- the app inside the iframe can already use HTTP and preview WebSocket pass-through

This means App Viewer is not the problem that the orchestration WebSocket needs to solve. It should remain a browser/runtime concern, not an agent-control concern.

## Approaches Considered

### Option A: Extend the current SSE model

Description:

- keep `POST /api/v1/agent/run`
- add more SSE event types for leader progress, file changes, stop state, and engineer activity
- add extra HTTP endpoints for cancel/interrupt/session state

Pros:

- smallest immediate diff
- preserves more of the current backend path
- lower short-term migration cost

Cons:

- still splits realtime state across SSE down + HTTP up
- stop, delegation, and session resume remain awkward
- harder to model leader-engineer orchestration cleanly
- chat/event coupling likely remains messy

Decision:

- rejected as a temporary patch, not a good foundation

### Option B: Hybrid dual-plane architecture

Description:

- move the agent/orchestration session onto WebSocket
- keep App Viewer on the current same-origin preview gateway over HTTP
- allow preview gateway WebSocket pass-through for the app itself
- leave normal CRUD APIs on REST

Pros:

- cleanly matches the product model
- gives `leader`, `engineer`, stop, progress, and editor sync one realtime control channel
- does not force preview/runtime resources into an unnatural WebSocket-only model
- avoids rewriting all CRUD APIs

Cons:

- the system uses three communication modes: REST, orchestration WebSocket, preview HTTP/WS proxy
- requires frontend and backend session-state refactor

Decision:

- recommended

### Option C: Full WebSocket for everything

Description:

- migrate agent orchestration, editor sync, preview control, and broader app interactions onto WebSocket

Pros:

- most uniform protocol story
- long-term could support richer collaboration primitives

Cons:

- far larger migration
- wrong abstraction for App Viewer page/resource loading
- would conflate platform control traffic with generated app runtime traffic

Decision:

- rejected for this iteration

## Recommended Design

## 1. Two Plane Architecture

Atoms should explicitly separate:

- **Control Plane**
  - leader stream
  - engineer progress
  - terminal summaries
  - file patches
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

This preserves browser-native app behavior inside App Viewer while giving the platform a robust realtime orchestration channel.

## 2. Session Model

Introduce a first-class realtime orchestration session per active workspace run.

Recommended session identity:

- `session_id`
- `project_id`
- `user_id`
- `run_id`
- `status`: `idle | starting | running | stopping | stopped | failed | completed`
- `leader_state`
- `engineer_state`
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

## 3. Role Model

### Leader

Visible to the user.

Responsibilities:

- receives the user message
- streams the user-facing explanation
- announces the plan or progress in natural language
- decides when to hand work to engineer
- decides when to summarize tool outcomes
- reports completion, failure, or blocked state

### Engineer

Not a normal chat participant.

Responsibilities:

- edits files
- runs commands
- emits structured progress/status
- emits file-change events
- emits terminal/tool events for debug surfaces

UI rule:

- left chat panel renders leader output only
- engineer output appears as progress/status and editor/terminal updates, not raw chat dumps

## 4. WebSocket Protocol

Use typed events instead of overloading chat messages.

### Client To Server

- `session.start`
  - start realtime orchestration for a project
- `user.message`
  - user prompt for leader
- `run.stop`
  - user stops current run
- `session.resume`
  - reconnect to existing session state
- `ui.state`
  - optional lightweight hints like current tab/open file
- `ping`
  - heartbeat

### Server To Client

- `session.state`
  - session lifecycle and status changes
- `leader.delta`
  - streaming leader text chunks
- `leader.message_done`
  - final leader message boundary
- `progress`
  - short user-facing progress entries
- `engineer.state`
  - hidden engineer status for UI state/debug
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

Reason for `file.snapshot` instead of diff-first protocol:

- current backend tools already operate in file-sized edits
- snapshot-per-write is simpler and less fragile than introducing CRDTs or textual patch-merging immediately
- this still gives the user “live writing” if snapshots are emitted after each tool mutation

## 5. Backend Orchestrator

Replace the current `POST + SSE` orchestration path with a WebSocket-oriented session manager.

Recommended backend units:

- `agent_realtime.py`
  - WebSocket router and session protocol
- `agent_session_manager.py`
  - create/reuse/stop sessions
- `leader_orchestrator.py`
  - top-level user-facing orchestration logic
- `engineer_runtime.py`
  - workspace-scoped code-writing execution
- `workspace_event_emitter.py`
  - emits file/terminal/progress events

Behavior:

- leader consumes the user message
- leader streams early acknowledgement and high-level plan
- leader starts engineer work
- engineer writes files and emits structured events
- leader continues to stream progress summaries while engineer runs
- when engineer finishes, leader summarizes outcome and next suggested action

## 6. Workspace Streaming

The editor should update while the engineer works, not only after a final sync.

Recommended behavior:

- instrument file-writing tools to emit `file.snapshot` after each successful write/replace operation
- instrument file creation/deletion to emit `file.changed`
- frontend updates the in-memory workspace immediately
- persistence to `project_files` remains on the backend, but UI responsiveness should not wait for a later query reload

First iteration rule:

- agent owns the edited file during an active run
- if the user edits the same file mid-run, frontend should warn and prefer the latest explicit user change after the run completes

This avoids needing collaborative merge logic in the first release.

## 7. Stop And Cancellation

Stop must be a first-class orchestration control.

Recommended flow:

1. user sends `run.stop`
2. backend marks session `stopping`
3. leader receives cancellation
4. engineer tool execution is interrupted or prevented from starting the next step
5. backend emits `run.stopped`
6. leader streams a final short stopped message if possible

Rules:

- partial file writes already completed remain in the workspace
- no new tool executions should begin after stop is accepted
- preview should remain usable for whatever state is already on disk

## 8. Terminal And Chat Separation

The left chat panel should not be a raw event dump.

Recommended rendering rules:

- `leader.delta` only updates the main assistant message
- `progress` renders compact status rows under or beside the leader message
- `terminal.log` goes only to the terminal panel
- `engineer.state` can drive subtle UI badges/spinners, not chat bubbles
- raw tool arguments and tool results should be hidden behind debug affordances, not promoted into the main transcript

This preserves clarity while still keeping deep debug visibility available.

## 9. Frontend Changes

### Chat Panel

Refactor into a realtime session client:

- opens WebSocket via `realtime_ticket`
- sends `user.message`
- renders one active leader streaming bubble
- renders stop button against session state, not only `AbortController`

### Workspace Context

Expand to own:

- session status
- leader stream buffer
- progress list
- terminal log buffer
- current file snapshots
- preview state

### Code Editor

Add runtime behavior:

- apply `file.snapshot` immediately to the open file buffer
- update file tree on `file.changed`
- optionally surface “agent is editing this file” state

### Project Workspace

Keep:

- preview iframe via same-origin preview gateway
- degraded/ready preview status

Add:

- clearer separation between `chat`, `editor`, `preview`, and `terminal` event sources

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
- resend latest leader message buffer
- resend latest open-file snapshot state
- do not attempt mid-tool replay

## 12. Testing Strategy

Backend tests:

- WebSocket ticket issuance and validation
- session start/stop lifecycle
- leader stream events
- engineer progress events
- file snapshot emission during writes
- stop cancelling further work
- preview state events still propagate

Frontend tests:

- ChatPanel leader streaming
- stop button wiring to `run.stop`
- terminal panel isolation from chat panel
- WorkspaceContext file snapshot application
- editor updates while session is active
- reconnect/session resume behavior for current buffers

Manual smoke tests:

- user prompt -> leader starts streaming immediately
- engineer writes files visible in editor while run is active
- preview refreshes without waiting for final run completion
- stop interrupts active work
- App Viewer still supports normal app interactions and app websocket pass-through

## 13. Migration Strategy

Phase 1:

- add realtime ticket endpoint
- add orchestration WebSocket session
- keep current single-agent backend logic behind the new transport
- left chat renders leader-only stream

Phase 2:

- split leader-visible stream from engineer/internal events
- add `file.snapshot`, `progress`, `terminal.log`
- update editor live while engineer writes
- add first-class stop handling

Phase 3:

- formalize leader -> engineer orchestration
- add reconnect/resume
- refine terminal/debug surfaces and progress UI

This sequence keeps the system working at every step while moving toward the full leader-engineer experience.

## Risks And Tradeoffs

- introducing a realtime session layer adds server-side state and lifecycle complexity
- user edits during active engineer writes need explicit conflict policy
- hiding engineer details from chat can make debugging harder unless terminal/debug surfaces stay strong
- the system will intentionally keep multiple protocols: REST, orchestration WS, preview HTTP/WS proxy

These tradeoffs are acceptable because they map cleanly to the real product model instead of forcing one protocol to serve two different planes.

## Decision

Implement Atoms as a **dual-plane realtime system**:

- **control plane**: WebSocket for leader/engineer orchestration, stop, progress, terminal summaries, and live workspace updates
- **app plane**: existing same-origin preview gateway for the generated app, including WebSocket pass-through when the app itself needs it

This is the smallest design that honestly satisfies the product requirement:

- leader talks to the customer
- engineer works in the workspace
- editor updates live
- user can stop anytime
- App Viewer remains a real interactive SaaS app surface
