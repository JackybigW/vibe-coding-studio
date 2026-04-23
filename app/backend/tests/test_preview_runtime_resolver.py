import json
from pathlib import Path

from services.preview_runtime_resolver import resolve_preview_runtime_model


# ---------------------------------------------------------------------------
# Regression fixture helper
# ---------------------------------------------------------------------------


def _feedback_board_workspace(tmp_path: Path) -> Path:
    """Creates a workspace matching the recent feedback-board failure pattern:
    frontend under app/frontend, backend under app/backend with server.py,
    manifest uses uv run uvicorn."""
    workspace = tmp_path / "workspace"
    (workspace / "app" / "frontend").mkdir(parents=True)
    (workspace / "app" / "frontend" / "package.json").write_text(
        '{"name":"frontend","scripts":{"dev":"vite"}}',
        encoding="utf-8",
    )
    (workspace / "app" / "backend").mkdir(parents=True)
    (workspace / "app" / "backend" / "server.py").write_text(
        "from fastapi import FastAPI\napp = FastAPI()\n@app.get('/health')\ndef health(): return {'status': 'ok'}\n",
        encoding="utf-8",
    )
    (workspace / "app" / "backend" / "requirements.txt").write_text(
        "fastapi==0.109.0\nuvicorn[standard]==0.27.0\n",
        encoding="utf-8",
    )
    (workspace / ".atoms").mkdir()
    (workspace / ".atoms" / "preview.json").write_text(
        '{"frontend":{"command":"cd /workspace/app/frontend && pnpm run dev -- --host 0.0.0.0 --port 3000","healthcheck_path":"/"},'
        '"backend":{"command":"cd /workspace/app/backend && uv run uvicorn server:app --host 0.0.0.0 --port 8000","healthcheck_path":"/health"}}',
        encoding="utf-8",
    )
    return workspace


def test_resolver_prefers_manifest_backend_command_but_normalizes_uvicorn():
    workspace = Path("/tmp/workspace")
    model = resolve_preview_runtime_model(
        workspace_root=workspace,
        manifest={
            "frontend": {
                "command": "cd /workspace/app/frontend && pnpm run dev -- --host 0.0.0.0 --port 3000",
                "healthcheck_path": "/",
            },
            "backend": {
                "command": "cd /workspace/app/backend && uv run uvicorn server:app --host 0.0.0.0 --port 8000",
                "healthcheck_path": "/health",
            },
        },
        existing_paths={
            "/workspace/app/frontend/package.json",
            "/workspace/app/backend/server.py",
            "/workspace/app/backend/requirements.txt",
        },
        python_fastapi_files={"/workspace/app/backend/server.py": "app"},
    )

    assert model.backend is not None
    assert model.backend.root == "/workspace/app/backend"
    assert model.backend.import_target == "server:app"
    assert model.backend.start_strategy == "python_venv_uvicorn"
    assert model.backend.healthcheck_path == "/health"


def test_resolver_falls_back_to_server_py_when_main_py_is_missing():
    workspace = Path("/tmp/workspace")
    model = resolve_preview_runtime_model(
        workspace_root=workspace,
        manifest=None,
        existing_paths={
            "/workspace/app/frontend/package.json",
            "/workspace/app/backend/server.py",
            "/workspace/app/backend/requirements.txt",
        },
        python_fastapi_files={"/workspace/app/backend/server.py": "app"},
    )

    assert model.backend is not None
    assert model.backend.root == "/workspace/app/backend"
    assert model.backend.import_target == "server:app"


def test_resolver_emits_backend_entrypoint_not_found_diagnostic():
    workspace = Path("/tmp/workspace")
    model = resolve_preview_runtime_model(
        workspace_root=workspace,
        manifest=None,
        existing_paths={
            "/workspace/app/frontend/package.json",
            "/workspace/app/backend/requirements.txt",
        },
        python_fastapi_files={},
    )

    assert model.backend is None
    assert model.diagnostics[0].reason_code == "backend_entrypoint_not_found"


# ---------------------------------------------------------------------------
# Feedback-board regression tests
# ---------------------------------------------------------------------------


def test_feedback_board_resolver_normalizes_backend_without_uv(tmp_path):
    """Regression: feedback-board pattern with uv run uvicorn must not require uv."""
    workspace = _feedback_board_workspace(tmp_path)
    manifest_path = workspace / ".atoms" / "preview.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    existing_paths = {
        str(workspace / "app" / "frontend" / "package.json"),
        str(workspace / "app" / "backend" / "server.py"),
        str(workspace / "app" / "backend" / "requirements.txt"),
    }
    python_fastapi_files = {
        str(workspace / "app" / "backend" / "server.py"): "app",
    }

    model = resolve_preview_runtime_model(
        workspace_root=workspace,
        manifest=manifest,
        existing_paths=existing_paths,
        python_fastapi_files=python_fastapi_files,
    )

    assert model.backend is not None, "backend should be resolved"
    assert model.backend.import_target == "server:app"
    assert model.backend.start_strategy == "python_venv_uvicorn"
    assert "uv run" not in model.backend.start_command, "start_command must not use uv run"
    assert ".venv/bin/python" in model.backend.start_command


def test_feedback_board_resolver_does_not_produce_false_success_without_entrypoint(tmp_path):
    """Regression: workspace with backend root but no recognizable entrypoint should not produce false-success."""
    workspace = _feedback_board_workspace(tmp_path)
    # Remove server.py to simulate no recognizable entrypoint
    (workspace / "app" / "backend" / "server.py").unlink()

    manifest_path = workspace / ".atoms" / "preview.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    existing_paths = {
        str(workspace / "app" / "frontend" / "package.json"),
        str(workspace / "app" / "backend" / "requirements.txt"),
    }

    model = resolve_preview_runtime_model(
        workspace_root=workspace,
        manifest=manifest,
        existing_paths=existing_paths,
        python_fastapi_files={},
    )

    # When entrypoint can't be resolved from manifest alone,
    # backend should be None and diagnostics should explain why
    assert model.backend is None or model.diagnostics, (
        "backend without a resolvable entrypoint must either return None or emit diagnostics"
    )
