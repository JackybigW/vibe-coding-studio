from pathlib import Path

from services.preview_runtime_resolver import resolve_preview_runtime_model


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
