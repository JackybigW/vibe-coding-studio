"""
Preview runtime resolver.

Converts raw workspace layout information (file tree, optional manifest)
into a normalized PreviewRuntimeModel that downstream startup logic can
consume without touching raw filenames or brittle string parsing.
"""

from __future__ import annotations

import re
import shlex
from dataclasses import dataclass, field
from pathlib import Path


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class PreviewRuntimeDiagnostic:
    service: str
    phase: str
    reason_code: str
    message: str
    detected_root: str = ""
    detected_entrypoint: str = ""
    attempted_command: str = ""


@dataclass(frozen=True)
class PreviewServiceRuntime:
    service: str
    root: str
    healthcheck_path: str
    start_strategy: str
    start_command: str
    import_target: str = ""


@dataclass(frozen=True)
class PreviewRuntimeModel:
    frontend: PreviewServiceRuntime | None
    backend: PreviewServiceRuntime | None
    diagnostics: list[PreviewRuntimeDiagnostic] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

_UVICORN_IMPORT_RE = re.compile(r"uvicorn\s+(\S+?)(?:\s+--|$)")


def _extract_uvicorn_import_target(command: str) -> str | None:
    """Return the import_target (e.g. 'server:app') from a uvicorn command."""
    match = _UVICORN_IMPORT_RE.search(command)
    if match:
        return match.group(1)
    return None


_BACKEND_MARKER_FILES = ("requirements.txt", "pyproject.toml")
_BACKEND_CANDIDATE_SUFFIXES = ("app/backend", "backend", "")
_FRONTEND_MARKER_FILES = ("package.json",)
_FRONTEND_CANDIDATE_SUFFIXES = ("app/frontend", "frontend", "")


def _find_root_from_existing_paths(
    existing_paths: set[str],
    marker_files: tuple[str, ...],
    candidate_suffixes: tuple[str, ...],
) -> str | None:
    """
    Find a service root by scanning existing_paths for marker files.

    Strategy:
    1. Build the set of all roots that have at least one marker file by
       stripping the marker filename from matching paths.
    2. Score each detected root by the priority order of candidate_suffixes
       (earlier suffix = lower index = higher priority).
    3. Return the highest-priority root, or None if nothing found.

    This approach is workspace_root-agnostic so it works even when the
    container path (e.g. /workspace/...) differs from the host workspace_root
    (e.g. /tmp/workspace/...).
    """
    # Collect all roots that own at least one marker file
    found_roots: list[str] = []
    for path in existing_paths:
        for marker in marker_files:
            if path.endswith(f"/{marker}"):
                root = path[: -(len(marker) + 1)]  # strip /marker
                if root not in found_roots:
                    found_roots.append(root)

    if not found_roots:
        return None

    # Score by candidate suffix priority (lower index = higher priority)
    def _priority(root: str) -> int:
        for idx, suffix in enumerate(candidate_suffixes):
            if suffix == "":
                return len(candidate_suffixes) - 1  # workspace root = lowest
            if root.endswith(f"/{suffix}"):
                return idx
        return len(candidate_suffixes)  # unrecognized suffix, lowest priority

    found_roots.sort(key=_priority)
    return found_roots[0]


def _find_backend_root(
    workspace_root: Path,  # kept for API symmetry; not used in path matching
    existing_paths: set[str],
) -> str | None:
    """Return the highest-priority root that has requirements.txt or pyproject.toml."""
    return _find_root_from_existing_paths(
        existing_paths,
        marker_files=_BACKEND_MARKER_FILES,
        candidate_suffixes=_BACKEND_CANDIDATE_SUFFIXES,
    )


def _find_frontend_root(
    workspace_root: Path,  # kept for API symmetry; not used in path matching
    existing_paths: set[str],
) -> str | None:
    """Return the highest-priority root that has package.json."""
    return _find_root_from_existing_paths(
        existing_paths,
        marker_files=_FRONTEND_MARKER_FILES,
        candidate_suffixes=_FRONTEND_CANDIDATE_SUFFIXES,
    )


def _resolve_import_target(
    backend_root: str,
    manifest_backend_command: str | None,
    existing_paths: set[str],
    python_fastapi_files: dict[str, str],
) -> str | None:
    """
    Resolve the uvicorn import target (e.g. 'server:app') using the priority
    order defined in the spec.
    """
    # 1. Manifest command containing 'uvicorn'
    if manifest_backend_command and "uvicorn" in manifest_backend_command:
        target = _extract_uvicorn_import_target(manifest_backend_command)
        if target:
            # Verify the module file actually exists in existing_paths before
            # trusting the manifest-extracted target.  The module name is the
            # part before the colon (e.g. "server" from "server:app").
            module_name = target.split(":")[0]
            candidate = f"{backend_root}/{module_name}.py"
            if candidate in existing_paths:
                return target
            # File not present — fall through to heuristic resolution so that
            # callers either get a verified target or a diagnostic.

    # 2. main.py -> main:app
    if f"{backend_root}/main.py" in existing_paths:
        return "main:app"

    # 3. server.py -> server:app
    if f"{backend_root}/server.py" in existing_paths:
        return "server:app"

    # 4. app.py -> app:app
    if f"{backend_root}/app.py" in existing_paths:
        return "app:app"

    # 5. Any file in python_fastapi_files under backend_root
    for filepath, symbol in python_fastapi_files.items():
        if filepath.startswith(backend_root + "/"):
            stem = Path(filepath).stem
            return f"{stem}:{symbol}"

    return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def resolve_preview_runtime_model(
    *,
    workspace_root: Path,
    manifest: dict | None,
    existing_paths: set[str],
    python_fastapi_files: dict[str, str],
) -> PreviewRuntimeModel:
    """
    Resolve a PreviewRuntimeModel from workspace layout information.

    Parameters
    ----------
    workspace_root:
        Root of the workspace (used to build candidate paths).
    manifest:
        Parsed preview.json manifest dict, or None if absent.
    existing_paths:
        Set of absolute path strings for files that exist in the workspace.
    python_fastapi_files:
        Mapping of absolute filepath -> FastAPI app symbol name for every
        Python file detected to export a FastAPI application.

    Returns
    -------
    PreviewRuntimeModel
        Resolved runtimes for frontend and backend, plus any diagnostics.
    """
    diagnostics: list[PreviewRuntimeDiagnostic] = []

    # ------------------------------------------------------------------
    # Frontend
    # ------------------------------------------------------------------
    frontend_runtime: PreviewServiceRuntime | None = None
    frontend_root = _find_frontend_root(workspace_root, existing_paths)

    if frontend_root is not None:
        manifest_frontend = manifest.get("frontend") if manifest else None
        if isinstance(manifest_frontend, dict):
            frontend_command = manifest_frontend.get(
                "command",
                f"pnpm run dev -- --host 0.0.0.0 --port 3000",
            )
            frontend_healthcheck = manifest_frontend.get("healthcheck_path", "/")
        else:
            frontend_command = f"pnpm run dev -- --host 0.0.0.0 --port 3000"
            frontend_healthcheck = "/"

        frontend_runtime = PreviewServiceRuntime(
            service="frontend",
            root=frontend_root,
            healthcheck_path=frontend_healthcheck,
            start_strategy="pnpm_dev",
            start_command=frontend_command,
        )

    # ------------------------------------------------------------------
    # Backend
    # ------------------------------------------------------------------
    backend_runtime: PreviewServiceRuntime | None = None
    backend_root = _find_backend_root(workspace_root, existing_paths)

    if backend_root is not None:
        manifest_backend = (manifest or {}).get("backend") if manifest else None
        manifest_backend_command: str | None = None
        backend_healthcheck = "/health"

        if isinstance(manifest_backend, dict):
            manifest_backend_command = manifest_backend.get("command")
            backend_healthcheck = manifest_backend.get("healthcheck_path", "/health")

        import_target = _resolve_import_target(
            backend_root=backend_root,
            manifest_backend_command=manifest_backend_command,
            existing_paths=existing_paths,
            python_fastapi_files=python_fastapi_files,
        )

        if import_target is None:
            diagnostics.append(
                PreviewRuntimeDiagnostic(
                    service="backend",
                    phase="entrypoint_resolution",
                    reason_code="backend_entrypoint_not_found",
                    message=(
                        f"No resolvable Python entrypoint found under {backend_root}. "
                        "Expected main.py, server.py, app.py, or a FastAPI file."
                    ),
                    detected_root=backend_root,
                )
            )
        else:
            quoted_root = shlex.quote(backend_root)
            quoted_venv_python = shlex.quote(f"{backend_root}/.venv/bin/python")
            quoted_import_target = shlex.quote(import_target)
            start_command = (
                f"cd {quoted_root} && "
                f"{quoted_venv_python} -m uvicorn {quoted_import_target} "
                f"--host 0.0.0.0 --port 8000"
            )
            backend_runtime = PreviewServiceRuntime(
                service="backend",
                root=backend_root,
                healthcheck_path=backend_healthcheck,
                start_strategy="python_venv_uvicorn",
                start_command=start_command,
                import_target=import_target,
            )

    return PreviewRuntimeModel(
        frontend=frontend_runtime,
        backend=backend_runtime,
        diagnostics=diagnostics,
    )
