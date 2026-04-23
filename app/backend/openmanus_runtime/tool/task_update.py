from typing import Any, Optional

from openmanus_runtime.exceptions import ToolError
from openmanus_runtime.tool.base import BaseTool, CLIResult

class TaskUpdateTool(BaseTool):
    name: str = "task_update"
    description: str = (
        "Update the status of a specific task. "
        "Status can be 'in_progress' or 'completed'. "
        "When a task is marked 'completed', it is automatically removed from other tasks' blocked_by lists."
    )
    parameters: dict = {
        "type": "object",
        "properties": {
            "task_id": {
                "type": "string",
                "description": "The ID of the task to update.",
            },
            "status": {
                "type": "string",
                "enum": ["in_progress", "completed"],
            },
        },
        "required": ["task_id", "status"],
    }

    _event_sink: Any = None
    _task_store_factory: Any = None
    _project_id: int = 0
    _request_key: str = ""
    _approval_gate: Any = None

    @classmethod
    def create(
        cls,
        event_sink: Any,
        task_store_factory: Any,
        project_id: int,
        request_key: str = "",
        approval_gate: Any = None,
    ) -> "TaskUpdateTool":
        tool = cls()
        tool._event_sink = event_sink
        tool._task_store_factory = task_store_factory
        tool._project_id = project_id
        tool._request_key = request_key
        tool._approval_gate = approval_gate
        return tool

    async def execute(self, task_id: str, status: str, **_kwargs) -> CLIResult:
        if not self._task_store_factory or not self._project_id:
            raise ToolError("Task store not configured")

        effective_request_key = self._request_key
        if not effective_request_key and self._approval_gate:
            effective_request_key = self._approval_gate.approved_request_key or ""
        if not effective_request_key:
            raise ToolError("task_update requires a request_key")

        store = self._task_store_factory()
        
        # Check if another task is already in progress when setting to in_progress
        if status == "in_progress":
            tasks = await store.list_tasks(project_id=self._project_id, request_key=effective_request_key)
            in_prog = [t for t in tasks if t.status == "in_progress" and t.task_key != task_id]
            if in_prog:
                raise ToolError(f"Task '{in_prog[0].task_key}' is currently in_progress. Complete it first.")
            
            # Check blockers
            task_obj = next((t for t in tasks if t.task_key == task_id), None)
            if not task_obj:
                raise ToolError(f"Task '{task_id}' not found.")
            if task_obj.blocked_by:
                raise ToolError(f"Task '{task_id}' is blocked by {task_obj.blocked_by}. Complete them first.")

        # Update
        tasks = await store.list_tasks(project_id=self._project_id, request_key=effective_request_key)
        task_obj = next((t for t in tasks if t.task_key == task_id), None)
        if not task_obj:
            raise ToolError(f"Task '{task_id}' not found.")
            
        await store.update_task(task_id=task_obj.id, status=status)
        
        # Re-fetch for event
        tasks = await store.list_tasks(project_id=self._project_id, request_key=effective_request_key)
        summaries = [
            {
                "id": t.id,
                "task_key": t.task_key,
                "subject": t.subject,
                "status": t.status,
                "blocked_by": t.blocked_by,
            }
            for t in tasks
        ]

        if self._approval_gate is not None:
            has_active = any(t.status == "in_progress" for t in tasks)
            if has_active:
                self._approval_gate.notify_task_active()
            else:
                self._approval_gate.notify_no_active_task()

        summary_event = {"type": "task_store.summary", "tasks": summaries}
        result = self._event_sink(summary_event)
        if hasattr(result, "__await__"):
            await result

        return CLIResult(output=f"Task '{task_id}' updated to {status}.")
