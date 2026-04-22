from typing import Any, Optional

from openmanus_runtime.exceptions import ToolError
from openmanus_runtime.tool.base import BaseTool, CLIResult


def _render_todo_markdown(items: list[dict]) -> str:
    lines = ["# Todo\n\n"]
    for item in items:
        status = item.get("status", "pending")
        check = "x" if status == "completed" else " "
        lines.append(f"- [{check}] {item.get('text', '')}\n")
    return "".join(lines)


class TodoWriteTool(BaseTool):
    name: str = "todo_write"
    description: str = (
        "Write or update docs/todo.md with the current task checklist. "
        "At most one item may be in_progress at a time."
    )
    parameters: dict = {
        "type": "object",
        "properties": {
            "items": {
                "type": "array",
                "description": "Ordered list of todo items.",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "text": {"type": "string"},
                        "status": {
                            "type": "string",
                            "enum": ["pending", "in_progress", "completed"],
                        },
                    },
                    "required": ["id", "text", "status"],
                },
            },
        },
        "required": ["items"],
    }

    # Injected via create()
    _file_operator: Any = None
    _event_sink: Any = None

    @classmethod
    def create(cls, file_operator: Any, event_sink: Any) -> "TodoWriteTool":
        tool = cls()
        tool._file_operator = file_operator
        tool._event_sink = event_sink
        return tool

    async def execute(self, items: Optional[list] = None, **_kwargs) -> CLIResult:
        if items is None:
            items = []
        in_progress = [i for i in items if i.get("status") == "in_progress"]
        if len(in_progress) > 1:
            raise ToolError("At most one item may be in_progress at a time")

        content = _render_todo_markdown(items)
        await self._file_operator.write_file("/workspace/docs/todo.md", content)

        event = {"type": "todo.updated", "items": items}
        result = self._event_sink(event)
        if hasattr(result, "__await__"):
            await result

        return CLIResult(output=f"docs/todo.md updated with {len(items)} items.")
