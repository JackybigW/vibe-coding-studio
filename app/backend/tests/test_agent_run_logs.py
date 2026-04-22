from pathlib import Path

from services.agent_run_logs import AgentRunLogStore


def test_agent_run_log_store_persists_latest_run_entries(tmp_path: Path):
    store = AgentRunLogStore(base_root=tmp_path)

    recorder = store.start_run(user_id="user-1", project_id=42)
    recorder.system("run started")
    recorder.progress("Editing src/App.tsx")
    recorder.terminal("$ tool str_replace_editor")
    recorder.error("Preview failed")
    recorder.set_status("failed")

    latest = store.read_latest_run(user_id="user-1", project_id=42)

    assert latest is not None
    assert latest["run_id"] == recorder.run_id
    assert latest["status"] == "failed"
    assert [entry["kind"] for entry in latest["entries"]] == ["system", "progress", "terminal", "error"]
    assert latest["entries"][0]["content"] == "$ [system] run started"
    assert latest["entries"][1]["content"] == "> Editing src/App.tsx"
    assert latest["entries"][3]["content"] == "! Preview failed"


def test_agent_run_log_store_overwrites_previous_latest_run(tmp_path: Path):
    store = AgentRunLogStore(base_root=tmp_path)

    first = store.start_run(user_id="user-1", project_id=42)
    first.system("first run")
    first.set_status("completed")

    second = store.start_run(user_id="user-1", project_id=42)
    second.system("second run")
    second.set_status("running")

    latest = store.read_latest_run(user_id="user-1", project_id=42)

    assert latest is not None
    assert latest["run_id"] == second.run_id
    assert latest["status"] == "running"
    assert [entry["content"] for entry in latest["entries"]] == ["$ [system] second run"]
