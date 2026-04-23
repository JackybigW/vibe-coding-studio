# Chat Streaming And Stop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add typewriter-style streaming for left-side assistant replies, a hidden-by-default collapsible progress feed, and a red in-place stop control that replaces the send button while an agent run is active.

**Architecture:** Keep the existing realtime websocket protocol and move the new behavior into `ChatPanel`. Split incoming assistant text into a raw buffer and a rendered buffer so the UI can smooth uneven `assistant.delta` chunks. Keep `progress` visually separate from the main transcript, and wire the stop button to the existing `run.stop` flow without changing backend contracts.

**Tech Stack:** React 18, TypeScript, Vitest, Testing Library, existing websocket session helpers, existing shadcn button primitives, lucide-react icons.

---

## File Structure

- Modify: `app/frontend/src/components/ChatPanel.tsx`
  Introduce transient streaming state, a render-loop effect, progress disclosure UI, and the red stop-button state machine.
- Modify: `app/frontend/src/components/ChatPanel.test.tsx`
  Add regression coverage for progressive assistant rendering, hidden progress UI, stop-button swapping, and post-stop event suppression.

## Task 1: Add buffered typewriter rendering for assistant text

**Files:**
- Modify: `app/frontend/src/components/ChatPanel.tsx`
- Test: `app/frontend/src/components/ChatPanel.test.tsx`

- [ ] **Step 1: Write the failing streaming test**

Add a regression test that proves `assistant.delta` no longer lands fully in the UI in a single synchronous paint and that `assistant.message_done` flushes the remaining content.

```tsx
it("renders assistant text progressively and flushes on message_done", async () => {
  vi.useFakeTimers();

  render(
    <WorkspaceProvider>
      <WorkspaceHarness>
        <ChatPanel mode="engineer" />
      </WorkspaceHarness>
    </WorkspaceProvider>
  );

  fireEvent.change(screen.getByPlaceholderText(/Describe what you want to build/i), {
    target: { value: "build auth" },
  });
  fireEvent.click(screen.getAllByRole("button").at(-1)!);

  await waitFor(() => expect(realtimeHarness.sendUserMessage).toHaveBeenCalled());

  act(() => {
    realtimeHarness.onEvent?.({
      type: "assistant.delta",
      agent: "swe",
      content: "Streaming reply that should not appear all at once.",
    });
  });

  expect(
    screen.queryByText("Streaming reply that should not appear all at once.")
  ).not.toBeInTheDocument();

  act(() => {
    vi.advanceTimersByTime(120);
  });

  expect(screen.getByText(/Streaming reply/)).toBeInTheDocument();

  act(() => {
    realtimeHarness.onEvent?.({ type: "assistant.message_done", agent: "swe" });
  });

  expect(
    await screen.findByText("Streaming reply that should not appear all at once.")
  ).toBeInTheDocument();

  vi.useRealTimers();
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
cd /Users/jackywang/Documents/atoms/app/frontend
pnpm test -- src/components/ChatPanel.test.tsx
```

Expected: FAIL because `ChatPanel` currently concatenates `assistant.delta` directly into `activeAssistantMessage` and does not maintain a buffered render loop.

- [ ] **Step 3: Introduce raw/rendered streaming state and a flush loop**

In `app/frontend/src/components/ChatPanel.tsx`, replace the single active-assistant string with separate raw and rendered buffers plus a timer-driven reveal effect.

Use a shape like this near the current streaming state:

```tsx
const TYPEWRITER_TICK_MS = 24;
const MIN_CHARS_PER_TICK = 2;
const MAX_CHARS_PER_TICK = 12;

const [activeAssistantRendered, setActiveAssistantRendered] = useState("");
const [isTyping, setIsTyping] = useState(false);

const activeAssistantRawRef = useRef("");
const activeAssistantRenderedRef = useRef("");
const ignoreAssistantEventsRef = useRef(false);
const typingTimerRef = useRef<number | null>(null);
```

Add small helpers so state resets stay centralized:

```tsx
const stopTypingLoop = useCallback(() => {
  if (typingTimerRef.current !== null) {
    window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = null;
  }
}, []);

const resetActiveAssistantState = useCallback(() => {
  stopTypingLoop();
  activeAssistantRawRef.current = "";
  activeAssistantRenderedRef.current = "";
  ignoreAssistantEventsRef.current = false;
  activeAssistantAgentRef.current = "engineer";
  setActiveAssistantAgent("engineer");
  setActiveAssistantRendered("");
  setIsTyping(false);
}, [stopTypingLoop]);
```

Add the flush loop effect:

```tsx
useEffect(() => {
  if (!isTyping) return;

  const tick = () => {
    const raw = activeAssistantRawRef.current;
    const rendered = activeAssistantRenderedRef.current;

    if (rendered.length >= raw.length) {
      setIsTyping(false);
      typingTimerRef.current = null;
      return;
    }

    const backlog = raw.length - rendered.length;
    const chars = Math.max(
      MIN_CHARS_PER_TICK,
      Math.min(MAX_CHARS_PER_TICK, Math.ceil(backlog / 6))
    );
    const nextRendered = raw.slice(0, rendered.length + chars);
    activeAssistantRenderedRef.current = nextRendered;
    setActiveAssistantRendered(nextRendered);
    typingTimerRef.current = window.setTimeout(tick, TYPEWRITER_TICK_MS);
  };

  typingTimerRef.current = window.setTimeout(tick, TYPEWRITER_TICK_MS);
  return stopTypingLoop;
}, [isTyping, stopTypingLoop]);
```

Update event handling:

```tsx
if (event.type === "assistant.delta") {
  if (ignoreAssistantEventsRef.current) return;
  const nextAgent = event.agent || "engineer";
  activeAssistantAgentRef.current = nextAgent;
  setActiveAssistantAgent(nextAgent);
  activeAssistantRawRef.current = `${activeAssistantRawRef.current}${event.content}`;
  setIsTyping(true);
  return;
}

if (event.type === "assistant.message_done") {
  const content = activeAssistantRawRef.current.trim();
  if (content) {
    stopTypingLoop();
    activeAssistantRenderedRef.current = activeAssistantRawRef.current;
    setActiveAssistantRendered(activeAssistantRawRef.current);
    const assistantMessage: Message = {
      role: "assistant",
      agent: activeAssistantAgentRef.current,
      content,
      model: selectedModel,
      created_at: new Date().toISOString(),
    };
    appendMessage(assistantMessage);
    void saveMessage(assistantMessage);
  }
  resetActiveAssistantState();
  setIsLoading(false);
  setIsStreaming(false);
  return;
}
```

Render `activeAssistantRendered` in place of the old `activeAssistantMessage` bubble state.

- [ ] **Step 4: Run the focused test to verify the new streaming path passes**

Run:

```bash
cd /Users/jackywang/Documents/atoms/app/frontend
pnpm test -- src/components/ChatPanel.test.tsx
```

Expected: PASS for the new streaming test and no regression in the existing assistant message tests.

- [ ] **Step 5: Commit Task 1**

```bash
cd /Users/jackywang/Documents/atoms
git add app/frontend/src/components/ChatPanel.tsx app/frontend/src/components/ChatPanel.test.tsx
git commit -m "feat(chat): smooth assistant streaming output"
```

## Task 2: Add collapsible progress feed and red stop-button mode

**Files:**
- Modify: `app/frontend/src/components/ChatPanel.tsx`
- Test: `app/frontend/src/components/ChatPanel.test.tsx`

- [ ] **Step 1: Write the failing UI tests for hidden progress and stop-button swapping**

Add tests that prove the progress feed is hidden by default and that a running session swaps the send button for a stop control that calls `stopRun()`.

```tsx
it("keeps progress hidden by default and reveals it when expanded", async () => {
  render(
    <WorkspaceProvider>
      <WorkspaceHarness>
        <ChatPanel mode="engineer" />
      </WorkspaceHarness>
    </WorkspaceProvider>
  );

  fireEvent.change(screen.getByPlaceholderText(/Describe what you want to build/i), {
    target: { value: "build auth" },
  });
  fireEvent.click(screen.getAllByRole("button").at(-1)!);

  await waitFor(() => expect(realtimeHarness.sendUserMessage).toHaveBeenCalled());

  act(() => {
    realtimeHarness.onEvent?.({ type: "progress", label: "Editing src/App.tsx" });
  });

  expect(screen.queryByText("Editing src/App.tsx")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /agent progress/i }));

  expect(screen.getByText("Editing src/App.tsx")).toBeInTheDocument();
});

it("replaces send with a stop control during a run and calls stopRun when clicked", async () => {
  render(
    <WorkspaceProvider>
      <WorkspaceHarness>
        <ChatPanel mode="engineer" />
      </WorkspaceHarness>
    </WorkspaceProvider>
  );

  fireEvent.change(screen.getByPlaceholderText(/Describe what you want to build/i), {
    target: { value: "build auth" },
  });
  fireEvent.click(screen.getAllByRole("button").at(-1)!);

  await waitFor(() => expect(realtimeHarness.sendUserMessage).toHaveBeenCalled());

  const stopButton = screen.getByRole("button", { name: /stop agent/i });
  fireEvent.click(stopButton);

  expect(realtimeHarness.stopRun).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run the focused test file to verify the new UI expectations fail**

Run:

```bash
cd /Users/jackywang/Documents/atoms/app/frontend
pnpm test -- src/components/ChatPanel.test.tsx
```

Expected: FAIL because the current component renders progress inline in chat and the send button does not switch into a distinct stop-control mode.

- [ ] **Step 3: Implement the progress disclosure and stop-control UI**

In `app/frontend/src/components/ChatPanel.tsx`, add a collapsed-by-default progress disclosure state:

```tsx
const [isProgressExpanded, setIsProgressExpanded] = useState(false);
const [isStopping, setIsStopping] = useState(false);
```

Reset progress disclosure on each new run start:

```tsx
setIsLoading(true);
setIsStreaming(true);
setIsStopping(false);
setIsProgressExpanded(false);
resetActiveAssistantState();
```

Render the active progress feed as muted secondary UI only when there is run-local progress:

```tsx
{progressItems.length > 0 ? (
  <div className="mt-3 rounded-xl border border-white/10 bg-white/5">
    <button
      type="button"
      className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-zinc-400"
      aria-expanded={isProgressExpanded}
      aria-label="Agent progress"
      onClick={() => setIsProgressExpanded((value) => !value)}
    >
      <span className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5" />
        Agent progress
      </span>
      {isProgressExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
    </button>
    {isProgressExpanded ? (
      <div className="border-t border-white/10 px-3 py-2 text-xs leading-5 text-zinc-400">
        {progressItems.map((item, index) => (
          <div key={`${item}-${index}`}>{item}</div>
        ))}
      </div>
    ) : null}
  </div>
) : null}
```

Swap the send button in place:

```tsx
const showStopButton = isLoading || isStreaming || isTyping || isStopping;
```

```tsx
{showStopButton ? (
  <Button
    type="button"
    variant="destructive"
    size="icon"
    aria-label="Stop agent"
    disabled={isStopping}
    onClick={handleStop}
    className="shrink-0 rounded-full"
  >
    {isStopping ? <Loader2 className="h-4 w-4 animate-spin" /> : <StopCircle className="h-4 w-4" />}
  </Button>
) : (
  <Button
    type="button"
    size="icon"
    onClick={handleSend}
    disabled={!input.trim()}
    className="shrink-0 rounded-full"
  >
    <Send className="h-4 w-4" />
  </Button>
)}
```

Update `handleStop`:

```tsx
const handleStop = () => {
  if (isStopping) return;
  sessionRef.current?.stopRun();
  setIsStopping(true);
  addTerminalLog("$ engineer stop requested");
};
```

Update Enter handling so active runs cannot send another prompt:

```tsx
if (e.key === "Enter" && !e.shiftKey) {
  e.preventDefault();
  if (isLoading || isStreaming || isTyping || isStopping) return;
  handleSend();
}
```

- [ ] **Step 4: Run the focused tests to verify the new UI behavior passes**

Run:

```bash
cd /Users/jackywang/Documents/atoms/app/frontend
pnpm test -- src/components/ChatPanel.test.tsx
```

Expected: PASS for the new progress disclosure and stop-control tests, plus the earlier streaming tests.

- [ ] **Step 5: Commit Task 2**

```bash
cd /Users/jackywang/Documents/atoms
git add app/frontend/src/components/ChatPanel.tsx app/frontend/src/components/ChatPanel.test.tsx
git commit -m "feat(chat): add progress disclosure and stop control"
```

## Task 3: Harden stop semantics and add regression coverage for late events

**Files:**
- Modify: `app/frontend/src/components/ChatPanel.tsx`
- Test: `app/frontend/src/components/ChatPanel.test.tsx`

- [ ] **Step 1: Write the failing stop-regression test**

Add a test proving that after stop is requested, late `assistant.delta` events do not continue the interrupted message and that `run.stopped` restores normal send mode.

```tsx
it("ignores late assistant deltas after stop and restores send mode on run.stopped", async () => {
  vi.useFakeTimers();

  render(
    <WorkspaceProvider>
      <WorkspaceHarness>
        <ChatPanel mode="engineer" />
      </WorkspaceHarness>
    </WorkspaceProvider>
  );

  fireEvent.change(screen.getByPlaceholderText(/Describe what you want to build/i), {
    target: { value: "build auth" },
  });
  fireEvent.click(screen.getAllByRole("button").at(-1)!);

  await waitFor(() => expect(realtimeHarness.sendUserMessage).toHaveBeenCalled());

  act(() => {
    realtimeHarness.onEvent?.({ type: "assistant.delta", agent: "swe", content: "Partial output" });
    vi.advanceTimersByTime(120);
  });

  fireEvent.click(screen.getByRole("button", { name: /stop agent/i }));
  expect(realtimeHarness.stopRun).toHaveBeenCalledTimes(1);

  act(() => {
    realtimeHarness.onEvent?.({ type: "assistant.delta", agent: "swe", content: " should be ignored" });
    realtimeHarness.onEvent?.({ type: "run.stopped" });
    vi.runOnlyPendingTimers();
  });

  expect(screen.queryByText("Partial output should be ignored")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();

  vi.useRealTimers();
});
```

- [ ] **Step 2: Run the focused test file to verify the stop-regression test fails**

Run:

```bash
cd /Users/jackywang/Documents/atoms/app/frontend
pnpm test -- src/components/ChatPanel.test.tsx
```

Expected: FAIL because the current stop path clears state immediately and does not guard against late assistant deltas from the stopped run.

- [ ] **Step 3: Implement stop-guard behavior and final cleanup rules**

In `app/frontend/src/components/ChatPanel.tsx`, use the ignore ref and stopping state consistently:

```tsx
if (event.type === "run.stopped") {
  ignoreAssistantEventsRef.current = true;
  stopTypingLoop();
  setIsLoading(false);
  setIsStreaming(false);
  setIsTyping(false);
  setIsStopping(false);
  addTerminalLog("$ engineer run stopped");
  return;
}
```

Guard the terminal error path the same way:

```tsx
if (event.type === "error") {
  ignoreAssistantEventsRef.current = true;
  stopTypingLoop();
  // keep existing appendMessage behavior for the error payload
  setIsLoading(false);
  setIsStreaming(false);
  setIsTyping(false);
  setIsStopping(false);
}
```

When a fresh run starts in `handleSend`, clear the ignore flag and previous transient state before opening a new session:

```tsx
sessionRef.current?.close();
sessionRef.current = null;
resetActiveAssistantState();
setIsStopping(false);
```

Keep already rendered partial text visible after stop by not blanking `activeAssistantRendered` inside the `run.stopped` branch.

- [ ] **Step 4: Run the full focused suite and lint the component**

Run:

```bash
cd /Users/jackywang/Documents/atoms/app/frontend
pnpm test -- src/components/ChatPanel.test.tsx
pnpm lint -- src/components/ChatPanel.tsx src/components/ChatPanel.test.tsx
```

Expected:

- `vitest` passes for the full `ChatPanel` test file
- `eslint` reports no errors for the modified component and test file

- [ ] **Step 5: Commit Task 3**

```bash
cd /Users/jackywang/Documents/atoms
git add app/frontend/src/components/ChatPanel.tsx app/frontend/src/components/ChatPanel.test.tsx
git commit -m "fix(chat): harden stop-state streaming behavior"
```
