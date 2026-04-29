# Alex Orchestration Layer Design

Date: 2026-04-22
Status: Proposed
Branch: `main`

## Summary

Vibe Coding Studio should introduce a lightweight orchestration layer for the user-facing `engineer` agent without rewriting the existing runtime foundation.

This design adds five tightly scoped components:

- a bootstrap workflow that forces the engineer onto the right project rails before implementation
- a `draft_plan` approval gate for new implementation requests and feature expansions
- a two-layer execution system composed of `implementation plan + todo + persistent task store`
- runtime path guardrails that restrict where the engineer can write
- on-demand skill loading so the system prompt stays close to the original Vibe Coding Studio prompt instead of becoming a giant instruction dump

This iteration intentionally does **not** redesign long-term agent memory. Normal chat/message history remains unchanged. The `draft_plan` artifact is short-lived in runtime memory, while `implementation plan` and `todo` are persisted as files and the task graph is persisted in a backend-owned store.

## Problem Statement

The current engineer runtime can execute tools, write files, and bring up preview, but it still lacks the orchestration discipline that the original Vibe Coding Studio prompt assumes.

Current gaps:

- the engineer does not have a required bootstrap sequence before implementation
- there is no true `draft_plan` approval gate between user request and code generation
- planning and execution state are mixed together instead of split into user-visible scope, agent execution plan, short-term todo state, and persistent task state
- runtime path protections are not strong enough to encode the original Vibe Coding Studio protected-path model
- skill knowledge is available in files, but there is no dedicated progressive-disclosure mechanism for loading them on demand
- the current prompt and runtime can therefore drift into premature implementation, incorrect file placement, or unnecessary context bloat

As a result:

- user intent confirmation is weak
- execution can start before the scope is explicitly approved
- multi-step work lacks durable orchestration state
- the prompt must carry too much responsibility by itself

## Goals

- Preserve the original Vibe Coding Studio engineer personality and workflow as much as possible.
- Add a real `draft_plan` tool for implementation requests and feature additions.
- Keep `draft_plan` short and approval-oriented.
- Require user approval in the left chat UI before implementation begins.
- Persist the detailed implementation plan and todo file in the workspace.
- Persist execution task state outside the chat context.
- Enforce protected paths and allowed write targets at runtime.
- Load detailed skill content only when needed.
- Avoid designing the long-term agent memory subsystem in this iteration.

## Non-Goals

- Redesign message history storage.
- Build long-term semantic memory for the engineer.
- Recreate all original Vibe Coding Studio platform tools such as `BackendManager`, `ImageCreator`, or `CheckUI`.
- Replace the existing realtime transport or preview architecture.
- Introduce a separate `leader` agent in this iteration.
- Fully solve template lifecycle automation in this iteration.

## Current Findings

### 1. The original Vibe Coding Studio prompt assumes an orchestration system, not just a raw coding agent

Relevant file:

- [skills/system_prompt.md](/Users/jackywang/Documents/atoms/skills/system_prompt.md)

The reference prompt assumes these workflow primitives already exist:

- backend analysis before implementation
- `draft_plan` as the first action for implementation work
- user approval before coding
- template initialization after approval
- `todo.md` before coding
- protected paths
- skill docs read before feature implementation

This means the prompt is not self-sufficient. It is written for a runtime that already provides orchestration tools and workflow state.

### 2. The current runtime executes work, but does not yet enforce the original workflow

Relevant files:

- [app/backend/services/engineer_runtime.py](/Users/jackywang/Documents/atoms/app/backend/services/engineer_runtime.py)
- [app/backend/openmanus_runtime/prompt/swe.py](/Users/jackywang/Documents/atoms/app/backend/openmanus_runtime/prompt/swe.py)
- [app/backend/openmanus_runtime/tool/file_operators.py](/Users/jackywang/Documents/atoms/app/backend/openmanus_runtime/tool/file_operators.py)

Current behavior:

- the engineer receives a workspace-scoped prompt
- the engineer can edit files and run commands
- preview contract instructions are injected
- realtime events are already streamed into the UI

Missing behavior:

- no explicit bootstrap phase
- no formal approval gate
- no separation between short approval plan and full execution plan
- no task persistence layer
- no progressive skill loading tool

### 3. The learn-claude-code reference separates knowledge, todos, and tasks into different layers

Relevant files:

- [s03_todo_write.py](/Users/jackywang/Documents/learn/learn-claude-code/agents/s03_todo_write.py)
- [s05_skill_loading.py](/Users/jackywang/Documents/learn/learn-claude-code/agents/s05_skill_loading.py)
- [s07_task_system.py](/Users/jackywang/Documents/learn/learn-claude-code/agents/s07_task_system.py)

Important takeaways:

- `s05` shows that the system prompt should contain skill metadata only, with full content loaded on demand
- `s03` shows that todo state should be explicit, structured, and visible during execution
- `s07` shows that execution state should live outside the chat transcript so it survives interruption and context loss

These patterns map cleanly onto the missing orchestration pieces in Vibe Coding Studio.

## Recommended Design

## 1. Bootstrap Workflow

The engineer should not start implementation immediately after every user message.

Instead, the runtime should classify each inbound user request into one of two broad modes:

- **implementation mode**
  - build something new
  - modify an existing feature
  - add a new feature
  - fix a feature-level bug
- **conversation mode**
  - greeting
  - clarification
  - explanation
  - status request
  - non-implementation discussion

Only implementation mode enters the orchestration workflow below.

### Bootstrap sequence for implementation mode

When an implementation request arrives, the runtime should force this sequence:

1. classify whether backend/data/AI features are involved
2. read project guidance docs in a deterministic order
3. decide whether `draft_plan` is required
4. block code-writing execution until the approval flow is resolved

Required read order:

1. `/workspace/app/backend/README.md` if backend/data/auth/storage/API concerns are present
2. `/workspace/app/frontend/README.md` if present
3. relevant skill docs, loaded on demand

This makes bootstrap a runtime-owned phase, not just a best-effort instruction inside a prompt.

### Bootstrap output

Bootstrap should produce a transient execution context containing:

- request classification
- backend-analysis result
- required docs to read
- required skill names
- whether `draft_plan` is mandatory

This execution context belongs to the current run, not long-term memory.

## 2. Draft Plan

`draft_plan` is a user-facing approval tool. It is not the same thing as the detailed implementation plan.

### When `draft_plan` is required

The engineer should call `draft_plan` only when:

- the user asks for a new implementation
- the user asks to add or expand features
- the user asks for a non-trivial code change that alters product behavior

It should not be required for:

- greetings
- clarifying questions
- pure explanations
- passive review of existing code
- small conversational follow-ups that do not request implementation

### Shape of `draft_plan`

`draft_plan` should be:

- short
- approval-oriented
- visible in the left chat
- stored in runtime memory for the current approval flow

Recommended structure:

- numbered list only
- 3 to 7 items
- no subsections
- no detailed file paths
- no code

Example shape:

1. Create the landing page and navigation between homepage and knowledge base
2. Add a knowledge base section covering RAG, fine-tuning, and Git usage
3. Update the project styling and preview configuration so the site runs correctly

### Approval UX

After `draft_plan` is emitted:

- the left chat renders the plan as a structured pending-approval card
- the user can click `Approve`
- optional future extension: user can reject or request changes

Until approval happens:

- the engineer may discuss scope
- the engineer may refine the short plan
- the engineer must not begin implementation

### Persistence model

This design keeps `draft_plan` itself short-lived:

- it is retained in normal message history as part of the transcript
- it is also held in runtime memory while waiting for approval
- it does **not** need its own durable storage model in this iteration

## 3. Implementation Plan

Once the user approves `draft_plan`, the engineer should create a real implementation plan artifact for execution.

### Purpose

The implementation plan is agent-facing execution scaffolding.

It should:

- expand the approved scope into concrete implementation steps
- map features to files/modules
- establish execution order
- give the todo/task layers a stable source of truth

### Persistence

The implementation plan must be written to the workspace.

Recommended location:

- `docs/plans/YYYY-MM-DD-<feature-slug>.md`

This keeps it separate from user-visible chat and from short-lived todo state.

### Relationship to the superpowers writing-plans skill

Vibe Coding Studio should borrow the **structure and rigor** of `writing-plans`, but not treat it as identical to `draft_plan`.

The implementation-plan writer should preserve these ideas:

- explicit file ownership and file paths
- bite-sized steps
- concrete execution details
- no placeholders

But it should be adapted for Vibe Coding Studio:

- location under the project `docs/` tree
- focus on what the engineer needs to execute inside this workspace
- no requirement to expose the full detailed plan directly to the user for approval

## 4. Todo

`todo` is the engineer's short-horizon execution checklist.

It is not a substitute for the implementation plan or the task store.

### Purpose

`todo` should answer:

- what is the engineer doing now
- what comes next
- what has already been completed

### Persistence

`todo` must be written to the workspace as a human-readable file.

Recommended location:

- `docs/todo.md`

### Constraints

Borrowing from `s03`, the todo model should enforce:

- a bounded number of items
- only one `in_progress` item at a time
- explicit statuses: `pending | in_progress | completed`

### Runtime behavior

The engineer should update `todo`:

- after approval and before implementation
- when moving to a new major execution step
- when a step is completed

The left chat should show progress derived from the current todo/task state instead of raw tool chatter.

## 5. Task Store

The task store is the durable execution state that survives interruption, stop, retry, and context loss.

This layer should borrow its model from `s07`.

### Purpose

The task store should persist:

- execution units
- status
- ordering/dependencies
- current active step

### Recommended shape

Each task should contain at least:

- `id`
- `project_id`
- `request_id` or run linkage
- `subject`
- `description`
- `status`
- `blocked_by`
- `owner`
- `source_plan_path`

Allowed statuses for this iteration:

- `pending`
- `in_progress`
- `completed`
- `blocked`

### Storage model

This design does not mandate file-vs-database implementation yet.

The requirement is architectural:

- task state must live **outside** the conversational transcript
- the runtime must be able to reload it after interruption

Because Vibe Coding Studio already has backend services and persistence, the recommended implementation direction is a backend-owned store rather than plain `.tasks/*.json` files.

### Relationship to todo

- `task_store` is the durable machine-readable source of truth
- `todo.md` is the compact human-readable short checklist derived from current execution state

They should stay synchronized, but they are not the same layer.

## 6. Path Guardrails

The original Vibe Coding Studio prompt assumes protected paths. Vibe Coding Studio should enforce them in runtime, not just describe them in text.

### Protected paths

The engineer must never modify:

- `/workspace/app/backend/core/**`
- `/workspace/app/backend/models/**`
- `/workspace/app/backend/main.py`
- `/workspace/app/backend/lambda_handler.py`

### Allowed top-level write targets

For this iteration, writes should be limited to:

- `/workspace/app/frontend/**`
- `/workspace/app/backend/**`
- `/workspace/docs/**`
- `/workspace/.atoms/**`

Subject to the protected-path exclusions above.

### Enforcement points

Guardrails should be enforced in the file-operation layer, not just by prompt:

- path validation inside `ProjectFileOperator`
- path validation inside the editing tool
- optional execution-phase checks that reject large writes before approval

### Approval guard

Before `draft_plan` approval:

- broad implementation writes should be rejected
- bootstrap reads are still allowed
- plan and todo artifacts may be written once the runtime has entered the planning phase

This prevents silent scope jumps from chat into code generation.

## 7. Skill Loading

Vibe Coding Studio should adopt the `s05` progressive-disclosure pattern.

### Layer 1: skill index in the system prompt

The system prompt should contain only:

- skill names
- short descriptions
- maybe a few trigger hints

It should not inline full skill contents.

### Layer 2: full skill body via tool

Add a `load_skill` or `load_doc` tool that returns:

- full markdown body of the requested skill/doc
- optionally wrapped in a machine-identifiable envelope

Recommended first-class skills/docs:

- `web_sdk`
- `custom_api`
- `object_storage`
- `ai_capability`
- future project-local skills such as `alex-fullstack-workspace`

### Why this matters

This keeps the prompt closer to the original Vibe Coding Studio prompt while still giving the engineer access to full project-specific instructions when needed.

## 8. System Prompt Minimal Revision

Vibe Coding Studio should keep the original system prompt mostly intact and only adapt the parts that depend on the new orchestration layer.

### Preserve

Keep the following original ideas:

- MVP-first bias
- backend analysis
- `draft_plan` before implementation work
- `todo.md` before implementation
- protected paths
- skills/docs before specialized work
- lint/build expectation after coding

### Adjust

The prompt should be minimally revised so that:

- `draft_plan` refers to the new short approval tool
- detailed execution planning is delegated to the implementation-plan layer
- skills are loaded on demand instead of embedded in full
- protected-path restrictions reflect runtime-enforced guardrails
- unavailable future platform tools are not described as if they already exist

### Explicitly defer

Do not solve in this prompt revision:

- long-term memory design
- complete recreation of all original Vibe Coding Studio platform tools
- template orchestration beyond what the current runtime actually supports

## End-to-End Flow

Recommended flow for a new implementation request:

1. user sends implementation request
2. runtime classifies request as implementation mode
3. bootstrap workflow runs
4. engineer calls `draft_plan`
5. left chat shows plan card with `Approve`
6. user approves
7. engineer writes implementation plan to `docs/plans/...`
8. engineer writes `docs/todo.md`
9. runtime creates persistent task-store entries
10. implementation begins
11. left chat shows progress derived from todo/task state
12. right editor shows file updates
13. preview/runtime flow continues as it does today

For non-implementation requests:

1. user sends normal conversational message
2. runtime classifies request as conversation mode
3. no `draft_plan`
4. engineer responds normally

## Testing Strategy

This design should eventually be validated with tests covering:

- request classification into implementation vs conversation mode
- `draft_plan` required for feature work
- no implementation writes before approval
- implementation plan written after approval
- `docs/todo.md` creation and update behavior
- task-store persistence across reconnect/refresh
- protected-path rejection
- allowed-path acceptance
- skill metadata exposure in prompt
- on-demand skill loading

## Open Questions Deferred

These are intentionally out of scope for this spec:

- how long-term agent memory should be designed
- whether task state should live in database tables, JSON files, or both
- whether rejected plans need structured revision loops in the first iteration
- whether template initialization should become a first-class tool immediately

## Recommendation

Implement this orchestration layer in the following order:

1. bootstrap workflow
2. `draft_plan`, implementation-plan writer, todo, and task-store scaffolding
3. path guardrails
4. skill loading
5. minimal system-prompt revision

This order preserves the current runtime while adding the minimum orchestration structure needed to make Alex behave much more like the original Vibe Coding Studio engineer workflow.
