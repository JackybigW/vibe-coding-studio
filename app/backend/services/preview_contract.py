import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class PreviewServiceConfig:
    command: str
    healthcheck_path: str = "/"


@dataclass(frozen=True)
class PreviewContract:
    frontend: PreviewServiceConfig
    backend: PreviewServiceConfig | None = None


def load_preview_contract(host_root: Path) -> PreviewContract | None:
    manifest_path = Path(host_root) / ".atoms" / "preview.json"
    if not manifest_path.exists():
        return None

    payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    frontend = PreviewServiceConfig(**payload["frontend"])
    backend_payload = payload.get("backend")
    backend = PreviewServiceConfig(**backend_payload) if backend_payload else None
    return PreviewContract(frontend=frontend, backend=backend)
