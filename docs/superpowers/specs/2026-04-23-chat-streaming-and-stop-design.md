# Chat Streaming And Stop Design

## Goal

Improve the left-side workspace chat experience during agent execution by making assistant replies feel continuously streamed and by giving the user a clear way to stop the current run.

This design covers only the left chat surface. It intentionally does not change right-side file editor streaming or preview runtime behavior.

The feature should provide:

1. Typewriter-style rendering for assistant reply text in the chat panel.
2. A separate agent progress feed shown as grey small text in a collapsible section, hidden by default.
3. A run-state-aware action button that replaces the send button with a red stop control while the agent is working.
4. Predictable stop behavior that halts the current run as soon as the existing realtime backend can cooperate.

## Non-Goals

- Streaming file edits into the right-side code editor.
- Changing the websocket protocol shape unless a small additive tweak becomes necessary.
- Implementing hard process termination for in-flight LLM calls or long-running shell commands.
- Merging terminal output into the main chat transcript.

## Current State

The existing system already has the core transport needed for this work:

- The frontend opens a websocket session through `agentRealtime.ts`.
- The backend emits `assistant.delta`, `assistant.message_done`, `progress`, `terminal.log`, and `run.stopped`.
- The chat panel currently appends assistant text directly as it arrives, so visual streaming quality depends entirely on upstream chunk shape.
- The send button already has access to a `stopRun()` websocket frame, but the UX is still centered around sending rather than stopping.

This means the feature is mainly a frontend state-machine and rendering problem, not a backend transport rewrite.

## Product Decisions

### Assistant Text

Assistant main reply content should appear with a smooth typewriter effect.

The UI should not render each websocket delta verbatim. Instead, it should buffer incoming text and reveal it to the user at a controlled cadence. This avoids jagged jumps when upstream deltas are uneven.

### Progress Feed

Progress information should not pollute the assistant reply body.

The chat panel should show a separate collapsible "agent progress" area that:

- is hidden by default
- uses grey, smaller text
- updates live while the run is active
- is driven only by `progress` events

`terminal.log` remains in the terminal surface and is not duplicated into the chat panel for this iteration.

### Stop Control

When the agent is running, the send button should be replaced in-place by a red stop-style button.

Design requirements:

- keep the same footprint as the send button to avoid layout shift
- use icon-first presentation rather than a required `Stop` text label
- communicate a dangerous interrupt action through color and hover state
- enter a disabled or pending visual state immediately after click

## Functional Requirements

### 1. Typewriter Rendering

When a run is active and assistant text is streaming:

1. Incoming `assistant.delta` text is appended to a raw buffer.
2. A frontend render loop gradually reveals buffered text into the visible assistant bubble.
3. When `assistant.message_done` arrives, the remaining buffered text is flushed immediately and committed as a normal message.

The render loop should reveal a small chunk at a time rather than a single character only. This keeps the effect readable for both Chinese and English responses without making long answers artificially slow.

### 2. Progress Feed

While a run is active:

- incoming `progress` events append to a transient progress feed
- the feed is displayed in a collapsible section under or near the active assistant response
- the section is collapsed by default for each new run
- duplicate consecutive progress lines should continue to be suppressed using the existing logic

When the run ends, the feed may remain visible if expanded, but it should no longer update.

### 3. Stop Behavior

While the session status is `running` or the chat panel is still finishing streamed rendering for the active run:

- the send action is replaced by the red stop action
- pressing Enter must not send a new prompt
- clicking the stop action sends the existing `run.stop` websocket frame

After stop is requested:

- the UI immediately enters a stopping state
- additional outgoing sends are blocked
- newly arriving assistant deltas for the current run are ignored
- already rendered text stays visible
- unrendered buffered text is not force-flushed after stop

When `run.stopped` is received, the temporary run state is cleared and normal send behavior is restored.

## State Model

Add explicit transient UI state to the chat panel for active streaming.

Recommended state split:

- `activeAssistantRawBuffer`
  The complete text received so far from websocket deltas for the active assistant message.
- `activeAssistantRendered`
  The portion currently visible in the UI.
- `isTyping`
  Whether the typewriter loop is still catching up to the raw buffer.
- `isStopping`
  Whether the user has requested stop and the UI is waiting for the run to settle.
- `isProgressExpanded`
  Whether the progress feed is currently expanded. Reset to collapsed on each new run.

This separation is necessary because the source transport cadence and the desired visual cadence are different concerns.

## Event Handling Design

### `session.state = running`

- Reset transient assistant streaming state.
- Reset progress feed expansion to collapsed.
- Clear any previous stopping state.
- Preserve historical messages already committed to the transcript.

### `assistant.delta`

- If `isStopping` is false, append content to `activeAssistantRawBuffer`.
- Ensure the typewriter loop is running.
- Do not directly append the whole delta to the rendered message.

### Typewriter Tick

Each tick:

- compare raw buffer length to rendered length
- reveal the next small slice
- continue until rendered catches raw

The tick interval should be short enough to feel live, but chunk size should scale modestly with backlog so large deltas do not stall visually.

### `assistant.message_done`

- Flush any remaining raw buffer immediately into the rendered output.
- Commit the finished assistant message into chat history.
- Clear transient active assistant buffers.

### `progress`

- Append to the run-local progress list shown in the collapsible feed.
- Do not merge progress text into the assistant body.

### `run.stopped`

- Stop the typewriter loop.
- Ignore any additional current-run assistant deltas that arrive late.
- Preserve already rendered assistant content.
- Clear stopping state.
- Restore the normal send action.

### `session.state = completed | failed`

- If the run ends normally, allow `assistant.message_done` to finalize the visible message.
- Once the run is settled, clear stop-related transient state.

## UX Details

### Chat Layout

The active assistant reply should continue to render in the main message stream where users already expect to read it.

The progress feed should be visually secondary:

- small font
- muted grey color
- compact spacing
- explicit expand/collapse affordance

The goal is to let the user focus on the reply first and inspect work progress only when desired.

### Stop Button Visuals

The stop control should:

- replace the send button in-place
- use a red danger style
- use a stop icon such as square or stop-circle
- enter a disabled/pending visual state after click until stop resolution

The input box may remain editable while the run is active, but sending must stay disabled until the run has stopped or completed.

## Failure And Edge Cases

### Uneven Delta Sizes

Large upstream deltas should not dump instantly into the bubble. The typewriter loop must smooth them visually.

### Stop During Active Streaming

If the user stops mid-message:

- keep already rendered text
- discard unrevealed buffered text
- do not fabricate a completed assistant message from partial hidden content

### Late Events After Stop

The frontend should defensively ignore late `assistant.delta` events for the stopped run to avoid "zombie" text continuing after the user pressed stop.

### New Run After Stop

Starting a new run must fully reset the transient streaming buffers so content from the previous interrupted run cannot leak into the next one.

## Testing Strategy

Add focused frontend tests around the chat panel behavior.

Minimum coverage:

1. `assistant.delta` updates are rendered progressively rather than only as a final whole message.
2. `assistant.message_done` flushes the remaining buffered text and commits the final assistant message.
3. `progress` entries appear in a collapsible feed that is hidden by default.
4. Running state swaps the send button to the red stop control.
5. Clicking the stop control calls `stopRun()`.
6. After `run.stopped`, the UI returns to normal send mode.
7. Deltas arriving after stop do not continue the interrupted assistant output.

## Implementation Scope

Expected file touch set for the implementation phase:

- `app/frontend/src/components/ChatPanel.tsx`
- `app/frontend/src/components/ChatPanel.test.tsx`

No backend changes are expected for the first iteration unless implementation reveals a small protocol gap.

## Open Questions Resolved

- The progress feed will use `progress` events only.
- `terminal.log` remains outside the chat panel.
- The right-side editor will not receive streaming code updates in this iteration.
- Stop is a cooperative stop built on the existing realtime stop event, not a hard kill.
