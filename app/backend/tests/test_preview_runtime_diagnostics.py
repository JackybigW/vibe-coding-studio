import pytest
from routers.workspace_runtime import build_runtime_failure_report


def test_preview_runtime_failure_report_contains_reason_code():
    diagnostic = build_runtime_failure_report(
        service="backend",
        phase="healthcheck",
        reason_code="backend_healthcheck_timeout",
        detected_root="/workspace/app/backend",
        attempted_command="cd /workspace/app/backend && .venv/bin/python -m uvicorn server:app --host 0.0.0.0 --port 8000",
        stderr_tail="",
    )
    assert diagnostic["reason_code"] == "backend_healthcheck_timeout"
    assert diagnostic["service"] == "backend"
    assert diagnostic["phase"] == "healthcheck"
    assert diagnostic["detected_root"] == "/workspace/app/backend"


def test_preview_runtime_failure_report_includes_all_required_fields():
    diagnostic = build_runtime_failure_report(
        service="backend",
        phase="bootstrap",
        reason_code="python_dependency_install_failed",
    )
    required_fields = {"service", "phase", "reason_code", "detected_root", "detected_entrypoint", "attempted_command", "stderr_tail", "suggested_fix"}
    assert required_fields.issubset(set(diagnostic.keys()))
