import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class PreviewServiceConfig:
    command: str
    healthcheck_path: str = "/"


@dataclass(frozen=True)
class PreviewContract:
    frontend: PreviewServiceConfig
    backend: PreviewServiceConfig | None = None


def _parse_service_config(
    payload: Any,
    *,
    default_healthcheck_path: str,
) -> PreviewServiceConfig | None:
    if payload is None:
        return None

    if isinstance(payload, str):
        return PreviewServiceConfig(
            command=payload,
            healthcheck_path=default_healthcheck_path,
        )

    if isinstance(payload, dict):
        return PreviewServiceConfig(
            command=payload["command"],
            healthcheck_path=payload.get("healthcheck_path", default_healthcheck_path),
        )

    raise TypeError(f"Unsupported preview service config payload: {type(payload)!r}")


def load_preview_contract(host_root: Path) -> PreviewContract | None:
    manifest_path = Path(host_root) / ".atoms" / "preview.json"
    if not manifest_path.exists():
        return None

    payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    frontend = _parse_service_config(payload["frontend"], default_healthcheck_path="/")
    backend_payload = payload.get("backend")
    backend = _parse_service_config(
        backend_payload,
        default_healthcheck_path=payload.get("healthcheck", "/health"),
    )
    assert frontend is not None
    return PreviewContract(frontend=frontend, backend=backend)
