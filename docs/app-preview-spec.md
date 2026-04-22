# Atoms App Preview — Technical Spec

> Version: 1.0 | Date: 2026-04-22
> Purpose: Reference spec for implementing the Atoms-style App Preview system. Your agent should use this document as the single source of truth.

---

## 1. Overview

The App Preview (also called "App Viewer") is the core interactive component that lets users see their generated application running in real-time, select elements, replace content, and publish. It is NOT a client-side code compiler — it is a **real Vite dev server running behind an iframe**.

### Key Capabilities

| Feature | Description |
|---------|-------------|
| Live Preview | Real-time rendering of the user's project as files change |
| Element Selection | Click any element in the preview to select it |
| Replace Elements | Describe a replacement for the selected element via chat input |
| Add/Exchange Images | Select an element, then upload or swap images |
| Device Frames | Desktop / Tablet / Mobile viewport switching |
| Refresh | Manual refresh button to reload the preview |
| Publish | Deploy the built project to a public URL |

---

## 2. Architecture

### 2.1 System Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     Platform Frontend (React)                     │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    ProjectWorkspace                          │ │
│  │                                                              │ │
│  │  ┌──────────────┐  ┌────────────────────────────────────┐  │ │
│  │  │  ChatPanel   │  │         App Viewer (iframe)         │  │ │
│  │  │              │  │  ┌──────────────────────────────┐  │  │ │
│  │  │  User msg    │  │  │  User's Generated App        │  │  │ │
│  │  │  AI response │  │  │  (React + shadcn/ui + TW)    │  │  │ │
│  │  │  Tool calls  │  │  │                              │  │  │ │
│  │  │              │  │  │  ← HMR auto-refresh          │  │  │ │
│  │  └──────┬───────┘  │  └──────────────────────────────┘  │  │ │
│  │         │          └──────────────┬─────────────────────┘  │ │
│  │         │                        │ PostMessage ↕           │ │
│  │         │                        │                         │ │
│  │  ┌──────▼────────────────────────▼──────────────────────┐ │ │
│  │  │              PreviewBridge Service                    │ │ │
│  │  │  - Manage iframe lifecycle                            │ │ │
│  │  │  - Inject selection overlay script                    │ │ │
│  │  │  - Handle PostMessage communication                   │ │ │
│  │  │  - Coordinate element selection state                 │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP (Vite HMR WebSocket)
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                  Backend: Vite Dev Server Process                 │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Vite Dev Server (localhost:PORT)                           │ │
│  │  - Serves the user's project at /                           │ │
│  │  - HMR WebSocket at /@vite/client                           │ │
│  │  - Compiles TSX → JS, PostCSS → CSS, etc.                  │ │
│  │  - Resolves node_modules imports                            │ │
│  │  - Handles Tailwind JIT compilation                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  File System:                                                     │
│  /workspace/projects/{project_id}/                                │
│  ├── package.json                                                 │
│  ├── vite.config.ts                                               │
│  ├── tailwind.config.ts                                           │
│  ├── tsconfig.json                                                │
│  ├── index.html                                                   │
│  ├── public/                                                      │
│  └── src/                                                         │
│      ├── App.tsx                                                  │
│      ├── main.tsx                                                 │
│      ├── components/                                              │
│      └── ...                                                      │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow: File Change → Preview Update

```
1. Agent writes file via tool (Editor.write / create_file tool)
       │
       ▼
2. File saved to disk at /workspace/projects/{id}/src/...
       │
       ▼
3. Vite file watcher detects change (chokidar)
       │
       ▼
4. Vite recompiles affected modules (TSX → JS, CSS processing)
       │
       ▼
5. HMR WebSocket pushes update to iframe
       │
       ▼
6. iframe hot-reloads the changed module (no full page refresh for most changes)
       │
       ▼
7. User sees updated preview instantly (~100-300ms latency)
```

---

## 3. Component Specifications

### 3.1 PreviewBridge Service

The central service that manages the iframe lifecycle and communication.

**File**: `src/services/PreviewBridge.ts`

```typescript
interface PreviewBridgeConfig {
  projectPath: string;       // Root path of the user's project on disk
  devServerUrl: string;      // e.g., "http://localhost:5173"
  iframeRef: HTMLIFrameElement;
}

interface ElementSelection {
  selector: string;          // CSS selector path to the element
  tagName: string;           // e.g., "button", "div", "img"
  textContent: string;       // Visible text (truncated)
  rect: {                    // Position relative to iframe viewport
    x: number;
    y: number;
    width: number;
    height: number;
  };
  attributes: Record<string, string>;  // Element attributes
  sourceFile?: string;       // Which component file this element belongs to
  componentStack?: string[]; // React component hierarchy
}

class PreviewBridge {
  // Start the dev server process
  async startDevServer(projectPath: string): Promise<string>;
  
  // Stop the dev server process
  async stopDevServer(): Promise<void>;
  
  // Inject the selection overlay script into the iframe
  injectSelectionOverlay(): void;
  
  // Listen for element selection events from iframe
  onElementSelected(callback: (selection: ElementSelection) => void): void;
  
  // Highlight an element in the iframe
  highlightElement(selector: string): void;
  
  // Clear any active selection highlight
  clearHighlight(): void;
  
  // Refresh the iframe
  refresh(): void;
  
  // Switch viewport size
  setViewport(device: 'desktop' | 'tablet' | 'mobile'): void;
  
  // Destroy and cleanup
  destroy(): void;
}
```

### 3.2 Selection Overlay Script

This script is injected into the iframe's page to enable element selection. It must NOT interfere with the user's app behavior.

**File**: `src/services/selection-overlay.ts`

**Behavior:**

1. **Inspect Mode Toggle**: When the user activates "inspect mode" (via a button in the App Viewer toolbar), the overlay becomes active.

2. **Hover Highlight**: As the mouse moves over elements, a semi-transparent colored border appears around the hovered element.

3. **Click to Select**: Clicking an element:
   - Prevents the element's default click behavior
   - Captures the element's CSS selector path, bounding rect, tag name, text content, and attributes
   - Sends this data to the parent window via `postMessage`
   - Shows a persistent highlight on the selected element

4. **Escape to Deselect**: Pressing Escape clears the selection.

**Key Implementation Details:**

```typescript
// selection-overlay.ts — runs inside the iframe

interface SelectionOverlayConfig {
  highlightColor: string;    // e.g., "rgba(99, 102, 241, 0.3)" (indigo with alpha)
  borderColor: string;       // e.g., "#6366F1" (indigo-500)
  borderWidth: number;       // e.g., 2
  ignoreSelectors: string[]; // e.g., ["script", "style", "#vite-overlay"]
}

// Generate a unique CSS selector for an element
function getCssSelector(el: HTMLElement): string {
  // Strategy: nth-child path from body, optimized for readability
  // e.g., "body > div#root > div.container > header > nav > button.cta-btn"
  const path: string[] = [];
  let current: HTMLElement | null = el;
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      selector += `#${current.id}`;
    } else if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).slice(0, 2);
      selector += `.${classes.join('.')}`;
    }
    // Add nth-child if there are siblings of the same type
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (s) => s.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }
    path.unshift(selector);
    current = current.parentElement;
  }
  return path.join(' > ');
}

// Create highlight overlay element
function createHighlightOverlay(rect: DOMRect): HTMLDivElement {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: ${rect.top}px;
    left: ${rect.left}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    background: rgba(99, 102, 241, 0.15);
    border: 2px solid #6366F1;
    border-radius: 4px;
    pointer-events: none;
    z-index: 999999;
    transition: all 0.1s ease;
  `;
  return overlay;
}

// PostMessage protocol
function notifyParent(type: string, data: any) {
  window.parent.postMessage({
    source: 'atoms-preview',
    type,
    data,
  }, '*');  // In production, restrict to specific origin
}
```

### 3.3 PostMessage Protocol

All communication between the parent window and the iframe uses `window.postMessage`.

**Messages from iframe → parent:**

| Message Type | Payload | When |
|-------------|---------|------|
| `element-hovered` | `{ selector, rect, tagName }` | Mouse hovers over an element in inspect mode |
| `element-selected` | `ElementSelection` | User clicks an element in inspect mode |
| `selection-cleared` | `{}` | User presses Escape or clicks empty space |
| `preview-ready` | `{ url }` | iframe finishes loading the page |
| `preview-error` | `{ message, stack }` | Runtime error in the user's app |
| `navigation` | `{ url, title }` | User's app navigates to a new route |

**Messages from parent → iframe:**

| Message Type | Payload | When |
|-------------|---------|------|
| `enable-inspect` | `{}` | User activates inspect mode |
| `disable-inspect` | `{}` | User deactivates inspect mode |
| `highlight-element` | `{ selector }` | Parent wants to highlight a specific element |
| `clear-highlight` | `{}` | Clear current highlight |
| `navigate` | `{ path }` | Navigate the preview to a specific route |

### 3.4 App Viewer Component

**File**: `src/components/AppViewer.tsx`

**Props:**

```typescript
interface AppViewerProps {
  projectId: string;
  devServerUrl: string;       // URL of the running Vite dev server
  onElementSelected?: (selection: ElementSelection) => void;
  onPublish?: (url: string) => void;
}
```

**State:**

```typescript
interface AppViewerState {
  device: 'desktop' | 'tablet' | 'mobile';
  inspectMode: boolean;
  selectedElement: ElementSelection | null;
  hoveredElement: ElementSelection | null;
  isLoading: boolean;
  error: string | null;
  currentUrl: string;         // Current URL path in the preview
}
```

**UI Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ [🖥️] [📱] [📲]  │  🔗 localhost:5173  │  [🔄] [🔍]  │  ← Toolbar
├─────────────────────────────────────────────────────────┤
│                                                         │
│    ┌─────────────────────────────────────────────┐      │
│    │                                             │      │
│    │         User's App (iframe)                 │      │
│    │                                             │      │
│    │    ┌──────────────────────┐                 │      │
│    │    │ Selection Highlight  │                 │      │  ← Overlay
│    │    └──────────────────────┘                 │      │
│    │                                             │      │
│    └─────────────────────────────────────────────┘      │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ Selected: <button class="cta-btn">  │ [Replace] [Add]  │  ← Selection bar
└─────────────────────────────────────────────────────────┘
```

**Viewport Dimensions:**

| Device | Width | Height | Scale |
|--------|-------|--------|-------|
| Desktop | 100% | 100% | 1.0 |
| Tablet | 768px | 1024px | auto-fit |
| Mobile | 375px | 812px | auto-fit |

---

## 4. Backend: Dev Server Management

### 4.1 Dev Server Lifecycle

The backend is responsible for starting, managing, and stopping Vite dev server processes for each project.

**API Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/projects/:id/preview/start` | POST | Start dev server for a project |
| `/api/v1/projects/:id/preview/stop` | POST | Stop dev server |
| `/api/v1/projects/:id/preview/status` | GET | Check if dev server is running |
| `/api/v1/projects/:id/preview/restart` | POST | Restart dev server |

**Start Preview Flow:**

```
1. POST /api/v1/projects/:id/preview/start
2. Backend checks if dev server already running for this project
3. If not, spawn a new Vite process:
   a. cd /workspace/projects/{project_id}
   b. pnpm install (if node_modules missing)
   c. pnpm run dev --port {assigned_port} --host
4. Wait for Vite to be ready (poll localhost:{port} or parse stdout)
5. Return { url: "http://localhost:{port}", status: "running" }
```

**Process Management:**

```python
# backend/services/preview_service.py

import asyncio
import subprocess
from typing import Optional

class PreviewManager:
    """Manages Vite dev server processes for project previews."""
    
    def __init__(self):
        self._processes: dict[int, asyncio.subprocess.Process] = {}
        self._ports: dict[int, int] = {}
        self._base_port = 5173  # Starting port
    
    async def start(self, project_id: int, project_path: str) -> dict:
        """Start a Vite dev server for the given project."""
        if project_id in self._processes:
            proc = self._processes[project_id]
            if proc.returncode is None:
                return {"url": f"http://localhost:{self._ports[project_id]}", "status": "running"}
        
        port = self._allocate_port(project_id)
        
        # Install dependencies if needed
        if not os.path.exists(os.path.join(project_path, "node_modules")):
            install_proc = await asyncio.create_subprocess_exec(
                "pnpm", "install",
                cwd=project_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await install_proc.wait()
        
        # Start Vite dev server
        proc = await asyncio.create_subprocess_exec(
            "pnpm", "run", "dev", "--port", str(port), "--host",
            cwd=project_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env={**os.environ, "FORCE_COLOR": "0"},
        )
        
        self._processes[project_id] = proc
        self._ports[project_id] = port
        
        # Wait for Vite to be ready (parse stdout for "ready in")
        ready = await self._wait_for_ready(proc, port)
        
        if ready:
            return {"url": f"http://localhost:{port}", "status": "running"}
        else:
            return {"url": None, "status": "error", "message": "Dev server failed to start"}
    
    async def stop(self, project_id: int) -> dict:
        """Stop the dev server for the given project."""
        if project_id in self._processes:
            proc = self._processes[project_id]
            proc.terminate()
            try:
                await asyncio.wait_for(proc.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                proc.kill()
            del self._processes[project_id]
            del self._ports[project_id]
        return {"status": "stopped"}
    
    async def status(self, project_id: int) -> dict:
        """Check if the dev server is running."""
        if project_id in self._processes:
            proc = self._processes[project_id]
            if proc.returncode is None:
                return {"url": f"http://localhost:{self._ports[project_id]}", "status": "running"}
            else:
                del self._processes[project_id]
                del self._ports[project_id]
        return {"url": None, "status": "stopped"}
    
    def _allocate_port(self, project_id: int) -> int:
        """Allocate a unique port for a project."""
        used_ports = set(self._ports.values())
        port = self._base_port
        while port in used_ports:
            port += 1
        return port
    
    async def _wait_for_ready(self, proc, port: int, timeout: float = 15.0) -> bool:
        """Wait for Vite to print 'ready' message."""
        try:
            start = asyncio.get_event_loop().time()
            while asyncio.get_event_loop().time() - start < timeout:
                line = await asyncio.wait_for(proc.stdout.readline(), timeout=1.0)
                if b"ready" in line.lower() or b"local" in line.lower():
                    return True
                if proc.returncode is not None:
                    return False
        except (asyncio.TimeoutError, Exception):
            pass
        # Fallback: try HTTP request
        import aiohttp
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"http://localhost:{port}", timeout=aiohttp.ClientTimeout(total=2)):
                    return True
        except:
            return False
        return False
```

### 4.2 File Write Integration

When the agent writes files, they must be saved to the project's directory on disk so Vite can detect changes.

**Critical**: The agent's `create_file` / `edit_file` tools must write to the actual filesystem path, NOT just to a database. The database is for persistence/metadata; the filesystem is for Vite.

```
Agent creates file → Save to BOTH:
  1. Database (project_files table) — for persistence, history, sharing
  2. Filesystem (/workspace/projects/{id}/src/...) — for Vite HMR
```

### 4.3 Vite Configuration for Preview

The user's project needs a specific Vite config to work correctly inside an iframe:

```typescript
// vite.config.ts — in the user's generated project
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',       // Allow connections from any host
    port: 5173,             // Will be overridden by --port flag
    strictPort: false,
    hmr: {
      overlay: true,        // Show error overlay in iframe
    },
    cors: true,             // Enable CORS for iframe access
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

---

## 5. Element Selection & Replacement Flow

### 5.1 Selection Flow

```
1. User clicks "Inspect" button (🔍) in App Viewer toolbar
2. Parent sends postMessage { type: 'enable-inspect' } to iframe
3. Selection overlay activates inside iframe
4. User hovers over elements → highlight appears
5. User clicks an element:
   a. iframe captures click, prevents default
   b. iframe sends postMessage { type: 'element-selected', data: ElementSelection }
   c. Parent receives selection, shows selection bar at bottom
   d. Selection bar shows: tag name, classes, text preview
   e. Two action buttons appear: "Replace" and "Add Image"
```

### 5.2 Replace Element Flow

```
1. User clicks "Replace" button
2. Chat input auto-fills with context:
   "Replace the <button class='cta-btn'>Submit</button> element with..."
3. User describes the replacement (e.g., "a gradient purple button with 'Get Started' text")
4. Agent receives the message with element context:
   - selector: "body > div#root > div > header > button.cta-btn"
   - sourceFile: "src/components/Hero.tsx" (if determinable)
   - surroundingCode: (lines around the element in the source file)
5. Agent edits the source file to make the replacement
6. File saved → Vite HMR → Preview updates
```

### 5.3 Source File Mapping (Advanced)

To map a selected DOM element back to its source React component, use one of these approaches:

**Option A: React DevTools Protocol (Recommended)**
- Inject a script that uses `__REACT_DEVTOOLS_GLOBAL_HOOK__` to traverse the fiber tree
- From a DOM node, walk up the fiber tree to find the component name and source location
- Requires `@vitejs/plugin-react` with `jsxRuntime: 'automatic'` (default in Vite React template)

**Option B: Data Attributes (Simpler, Good for MVP)**
- During code generation, the agent adds `data-component` and `data-source` attributes:
  ```tsx
  <button data-component="Hero" data-source="src/components/Hero.tsx:12" className="cta-btn">
    Submit
  </button>
  ```
- The selection overlay reads these attributes when an element is clicked
- Simpler but requires agent cooperation

**Option C: AST-based Source Mapping (Most Accurate)**
- Parse the project's source files into ASTs
- Build a mapping: JSX element → source file + line number
- When an element is selected, match its CSS selector + text content against the AST map
- Most accurate but complex to implement

**Recommendation**: Start with **Option B** for MVP, upgrade to **Option A** later.

---

## 6. Error Handling

### 6.1 Vite Error Overlay

Vite already shows a built-in error overlay when there are compile errors. This works inside the iframe by default. No special handling needed.

### 6.2 Runtime Errors

Catch runtime errors in the iframe and forward them to the parent:

```typescript
// Inside the selection overlay script
window.onerror = (message, source, lineno, colno, error) => {
  notifyParent('preview-error', {
    message: String(message),
    stack: error?.stack,
    source,
    lineno,
    colno,
  });
};

window.addEventListener('unhandledrejection', (event) => {
  notifyParent('preview-error', {
    message: `Unhandled Promise: ${event.reason}`,
    stack: event.reason?.stack,
  });
});
```

### 6.3 Dev Server Crash

If the Vite process crashes:
1. Backend detects process exit (non-zero return code)
2. Backend sends WebSocket/SSE notification to frontend
3. Frontend shows "Preview disconnected" state with a "Restart" button
4. User clicks "Restart" → POST `/api/v1/projects/:id/preview/restart`

---

## 7. Security Considerations

### 7.1 iframe Sandboxing

```html
<iframe
  src={devServerUrl}
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
  allow="clipboard-read; clipboard-write"
/>
```

- `allow-scripts`: Required for React to run
- `allow-same-origin`: Required for HMR WebSocket connection
- `allow-forms`: Required if user's app has forms
- `allow-popups`: Required if user's app opens new windows
- Do NOT add `allow-top-navigation`: prevents the iframe from redirecting the parent page

### 7.2 Port Isolation

Each project gets its own port. Never expose the Vite dev server to the public internet — it should only be accessible from the platform backend/frontend (same machine or internal network).

### 7.3 PostMessage Origin Validation

```typescript
// In the parent window
window.addEventListener('message', (event) => {
  // Validate origin matches the dev server
  if (event.origin !== devServerOrigin) return;
  if (event.data?.source !== 'atoms-preview') return;
  
  // Process message
  handleMessage(event.data);
});
```

---

## 8. Performance Optimization

### 8.1 Lazy Dev Server Start

Don't start the dev server until the user navigates to the App Viewer tab. Use a "Start Preview" button or auto-start on first tab visit.

### 8.2 Dev Server Pool

For platforms with many concurrent users, maintain a pool of pre-warmed Vite processes. When a user needs a preview, assign a pre-started process and point it to the project directory.

### 8.3 Idle Timeout

Stop dev servers after N minutes of inactivity to save resources:

```python
IDLE_TIMEOUT = 30 * 60  # 30 minutes

# Background task: check for idle servers periodically
async def cleanup_idle_servers():
    while True:
        for project_id, last_activity in list(activity_tracker.items()):
            if time.time() - last_activity > IDLE_TIMEOUT:
                await preview_manager.stop(project_id)
        await asyncio.sleep(60)
```

---

## 9. Implementation Checklist

### Phase 1: Basic Live Preview (MVP)
- [ ] Backend: PreviewManager service with start/stop/status
- [ ] Backend: API endpoints for preview lifecycle
- [ ] Backend: File write to filesystem (not just DB)
- [ ] Frontend: AppViewer component with iframe pointing to dev server URL
- [ ] Frontend: Device viewport switching (desktop/tablet/mobile)
- [ ] Frontend: Refresh button
- [ ] Frontend: Loading/error states

### Phase 2: Element Selection
- [ ] Frontend: Selection overlay script (inject into iframe)
- [ ] Frontend: PostMessage communication layer
- [ ] Frontend: Inspect mode toggle in toolbar
- [ ] Frontend: Hover highlight on elements
- [ ] Frontend: Click to select with persistent highlight
- [ ] Frontend: Selection bar showing element info

### Phase 3: Element Replacement
- [ ] Frontend: "Replace" button in selection bar
- [ ] Frontend: Auto-fill chat input with element context
- [ ] Agent: Parse element context from chat message
- [ ] Agent: Locate source file and edit the specific element
- [ ] Frontend: "Add/Exchange Image" button in selection bar

### Phase 4: Polish & Production
- [ ] Backend: Idle timeout for dev servers
- [ ] Backend: Dev server crash detection and auto-restart
- [ ] Frontend: Runtime error forwarding to parent
- [ ] Frontend: Source file mapping (data attributes → React DevTools)
- [ ] Security: PostMessage origin validation
- [ ] Security: Port isolation verification

---

## 10. Key Differences from Current Implementation

| Aspect | Current (buildPreviewHtml) | Atoms Approach |
|--------|---------------------------|----------------|
| Compilation | Babel standalone in browser | Vite dev server on backend |
| Module resolution | Imports stripped | Full node_modules support |
| CSS processing | Raw CSS only | PostCSS, Tailwind JIT, CSS modules |
| React features | Limited (basic hooks) | Full React (lazy, Suspense, context) |
| Preview method | iframe `srcDoc` | iframe `src` pointing to dev server URL |
| Update mechanism | Rebuild entire HTML string | Vite HMR (incremental module replacement) |
| Element selection | Not implemented | Overlay script + PostMessage |
| Error display | None | Vite error overlay + forwarded errors |
| npm packages | Not supported | Full support via Vite |
| TypeScript | Stripped by regex | Compiled by Vite (esbuild) |

---

## 11. Technology Stack Summary

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Dev Server | **Vite 5+** | Fast HMR, TSX/TS compilation, module resolution |
| Framework | **React 18+** | User's app framework |
| UI Library | **shadcn/ui + Tailwind CSS** | Component library + styling |
| Process Management | **asyncio.subprocess** (Python) | Spawn/manage Vite processes |
| iframe Communication | **PostMessage API** | Parent ↔ iframe bidirectional messaging |
| Element Selection | **DOM API + Overlay** | Click-to-select with visual highlight |
| Source Mapping | **data attributes** (MVP) → **React DevTools** (v2) | Map DOM elements to source files |
| Error Handling | **Vite overlay + onerror** | Compile errors + runtime errors |
| Port Allocation | **Dynamic port assignment** | Isolate projects on different ports |