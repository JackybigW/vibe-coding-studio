import json

from services.preview_contract import load_preview_contract


def test_load_preview_contract_reads_frontend_and_backend(tmp_path):
    atoms_dir = tmp_path / ".atoms"
    atoms_dir.mkdir()
    (atoms_dir / "preview.json").write_text(
        json.dumps(
            {
                "frontend": {
                    "command": "pnpm run dev -- --host 0.0.0.0 --port 3000",
                    "healthcheck_path": "/"
                },
                "backend": {
                    "command": "uv run uvicorn app.main:app --host 0.0.0.0 --port 8000",
                    "healthcheck_path": "/health"
                }
            }
        ),
        encoding="utf-8",
    )

    contract = load_preview_contract(tmp_path)

    assert contract.frontend.command.startswith("pnpm run dev")
    assert contract.backend is not None
    assert contract.backend.healthcheck_path == "/health"
