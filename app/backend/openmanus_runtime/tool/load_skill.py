from typing import Any, Optional
from openmanus_runtime.tool.base import BaseTool, CLIResult


class LoadSkillTool(BaseTool):
    name: str = "load_skill"
    description: str = (
        "Load the full content of an available skill or doc by name. "
        "Use describe_skills first (from the system prompt) to see available names."
    )
    parameters: dict = {
        "type": "object",
        "properties": {
            "name": {
                "type": "string",
                "description": "Skill name, e.g. 'web_sdk', 'custom_api', 'object_storage', 'ai_capability'.",
            },
        },
        "required": ["name"],
    }

    _loader: Any = None

    @classmethod
    def create(cls, loader: Any) -> "LoadSkillTool":
        tool = cls()
        tool._loader = loader
        return tool

    async def execute(self, name: str = "", **_kwargs) -> CLIResult:
        if not name:
            return CLIResult(error="name is required")
        content = self._loader.load(name) if self._loader else None
        if content is None:
            available = list(self._loader.describe_available().keys()) if self._loader else []
            return CLIResult(error=f"Skill '{name}' not found. Available: {available}")
        return CLIResult(output=content)
