"""Minimal starter templates for new projects.

Each template contains the files needed for the Docker sandbox's start-dev
script to successfully launch a Vite dev server.  Content is intentionally
minimal — the AI agent replaces everything on the first implementation run.
"""

from __future__ import annotations

import json
from typing import Dict, List

# ---------------------------------------------------------------------------
# React (Vite + React + TypeScript)
# ---------------------------------------------------------------------------

_REACT_PACKAGE_JSON = json.dumps(
    {
        "name": "atoms-project",
        "private": True,
        "version": "0.0.0",
        "type": "module",
        "scripts": {"dev": "vite", "build": "vite build", "preview": "vite preview"},
        "dependencies": {"react": "^19.0.0", "react-dom": "^19.0.0"},
        "devDependencies": {
            "@types/react": "^19.0.0",
            "@types/react-dom": "^19.0.0",
            "@vitejs/plugin-react": "^4.3.0",
            "typescript": "~5.7.0",
            "vite": "^6.0.0",
        },
    },
    indent=2,
)

_REACT_VITE_CONFIG = """\
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
"""

_REACT_TSCONFIG = json.dumps(
    {
        "compilerOptions": {
            "target": "ES2020",
            "module": "ESNext",
            "moduleResolution": "bundler",
            "jsx": "react-jsx",
            "strict": True,
            "esModuleInterop": True,
            "skipLibCheck": True,
        },
        "include": ["src"],
    },
    indent=2,
)

_REACT_INDEX_HTML = """\
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Atoms Project</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
"""

_REACT_MAIN_TSX = """\
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
"""

_REACT_APP_TSX = """\
function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Hello from Atoms!</h1>
      <p>Start chatting with the AI to build your project.</p>
    </div>
  )
}

export default App
"""

REACT_TEMPLATE: List[Dict[str, object]] = [
    {"file_path": "package.json", "content": _REACT_PACKAGE_JSON, "is_directory": False},
    {"file_path": "vite.config.ts", "content": _REACT_VITE_CONFIG, "is_directory": False},
    {"file_path": "tsconfig.json", "content": _REACT_TSCONFIG, "is_directory": False},
    {"file_path": "index.html", "content": _REACT_INDEX_HTML, "is_directory": False},
    {"file_path": "src/main.tsx", "content": _REACT_MAIN_TSX, "is_directory": False},
    {"file_path": "src/App.tsx", "content": _REACT_APP_TSX, "is_directory": False},
]

# ---------------------------------------------------------------------------
# Vue (Vite + Vue + TypeScript)
# ---------------------------------------------------------------------------

_VUE_PACKAGE_JSON = json.dumps(
    {
        "name": "atoms-project",
        "private": True,
        "version": "0.0.0",
        "type": "module",
        "scripts": {"dev": "vite", "build": "vite build", "preview": "vite preview"},
        "dependencies": {"vue": "^3.5.0"},
        "devDependencies": {
            "@vitejs/plugin-vue": "^5.2.0",
            "typescript": "~5.7.0",
            "vite": "^6.0.0",
        },
    },
    indent=2,
)

_VUE_VITE_CONFIG = """\
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
})
"""

_VUE_TSCONFIG = json.dumps(
    {
        "compilerOptions": {
            "target": "ES2020",
            "module": "ESNext",
            "moduleResolution": "bundler",
            "strict": True,
            "esModuleInterop": True,
            "skipLibCheck": True,
        },
        "include": ["src"],
    },
    indent=2,
)

_VUE_INDEX_HTML = """\
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Atoms Project</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
"""

_VUE_MAIN_TS = """\
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
"""

_VUE_APP_VUE = """\
<script setup lang="ts">
</script>

<template>
  <div style="padding: 2rem; font-family: system-ui, sans-serif;">
    <h1>Hello from Atoms!</h1>
    <p>Start chatting with the AI to build your project.</p>
  </div>
</template>
"""

VUE_TEMPLATE: List[Dict[str, object]] = [
    {"file_path": "package.json", "content": _VUE_PACKAGE_JSON, "is_directory": False},
    {"file_path": "vite.config.ts", "content": _VUE_VITE_CONFIG, "is_directory": False},
    {"file_path": "tsconfig.json", "content": _VUE_TSCONFIG, "is_directory": False},
    {"file_path": "index.html", "content": _VUE_INDEX_HTML, "is_directory": False},
    {"file_path": "src/main.ts", "content": _VUE_MAIN_TS, "is_directory": False},
    {"file_path": "src/App.vue", "content": _VUE_APP_VUE, "is_directory": False},
]

# ---------------------------------------------------------------------------
# HTML (plain Vite + vanilla JS)
# ---------------------------------------------------------------------------

_HTML_PACKAGE_JSON = json.dumps(
    {
        "name": "atoms-project",
        "private": True,
        "version": "0.0.0",
        "type": "module",
        "scripts": {"dev": "vite", "build": "vite build", "preview": "vite preview"},
        "devDependencies": {
            "vite": "^6.0.0",
        },
    },
    indent=2,
)

_HTML_VITE_CONFIG = """\
import { defineConfig } from 'vite'

export default defineConfig({})
"""

_HTML_INDEX_HTML = """\
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Atoms Project</title>
  </head>
  <body>
    <div id="app">
      <h1>Hello from Atoms!</h1>
      <p>Start chatting with the AI to build your project.</p>
    </div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
"""

_HTML_MAIN_JS = """\
document.querySelector('#app h1')?.addEventListener('click', () => {
  alert('Hello from Atoms!')
})
"""

HTML_TEMPLATE: List[Dict[str, object]] = [
    {"file_path": "package.json", "content": _HTML_PACKAGE_JSON, "is_directory": False},
    {"file_path": "vite.config.ts", "content": _HTML_VITE_CONFIG, "is_directory": False},
    {"file_path": "index.html", "content": _HTML_INDEX_HTML, "is_directory": False},
    {"file_path": "src/main.js", "content": _HTML_MAIN_JS, "is_directory": False},
]

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

_TEMPLATES: Dict[str, List[Dict[str, object]]] = {
    "react": REACT_TEMPLATE,
    "vue": VUE_TEMPLATE,
    "html": HTML_TEMPLATE,
}


def get_template_files(framework: str | None) -> List[Dict[str, object]]:
    """Return minimal starter files for *framework*.

    Returns files in the format expected by
    :meth:`ProjectWorkspaceService.materialize_files`, i.e. a list of dicts
    with keys ``file_path``, ``content`` and ``is_directory``.
    """
    resolved = (framework or "react").lower()
    if resolved not in _TEMPLATES:
        raise ValueError(
            f"Unsupported framework: {framework!r}. "
            f"Supported: {', '.join(sorted(_TEMPLATES))}"
        )
    return _TEMPLATES[resolved]
