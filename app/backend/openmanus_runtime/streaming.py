import uuid
from typing import Any, Awaitable, Callable, Optional

from pydantic import Field

from openmanus_runtime.agent.swe import SWEAgent
from openmanus_runtime.config import LLMSettings, config
from openmanus_runtime.llm import LLM
from openmanus_runtime.schema import Message


EventEmitter = Callable[[dict[str, Any]], Awaitable[None]]


class StreamingSWEAgent(SWEAgent):
    event_emitter: Optional[EventEmitter] = Field(default=None, exclude=True)

    async def _emit(self, event_type: str, **payload: Any) -> None:
        if self.event_emitter is None:
            return
        await self.event_emitter({"type": event_type, **payload})

    async def step(self) -> str:
        prev_len = len(self.memory.messages)
        should_act = await self.think()
        new_messages = self.memory.messages[prev_len:]

        for message in new_messages:
            if message.role != "assistant":
                continue

            if message.content or message.thinking:
                await self._emit(
                    "assistant",
                    content=message.content,
                    thinking=message.thinking,
                    agent=self.name,
                )

            if message.tool_calls:
                for tool_call in message.tool_calls:
                    await self._emit(
                        "tool_call",
                        tool=tool_call.function.name,
                        arguments=tool_call.function.arguments,
                        tool_call_id=tool_call.id,
                    )

        if not should_act:
            return "Thinking complete - no action needed"

        return await self.act()

    async def act(self) -> str:
        if not self.tool_calls:
            return self.messages[-1].content or "No content or commands to execute"

        results = []
        for command in self.tool_calls:
            self._current_base64_image = None
            result = await self.execute_tool(command)
            tool_msg = Message.tool_message(
                content=result,
                tool_call_id=command.id,
                name=command.function.name,
                base64_image=self._current_base64_image,
            )
            self.memory.add_message(tool_msg)
            await self._emit(
                "tool_result",
                tool=command.function.name,
                tool_call_id=command.id,
                content=result,
            )
            results.append(result)

        return "\n\n".join(results)


def build_agent_llm(model: Optional[str]) -> Optional[LLM]:
    if not model:
        return None

    base_settings = config.llm["default"]
    filtered = LLMSettings(
        model=model,
        base_url=base_settings.base_url,
        api_key=base_settings.api_key,
        max_tokens=base_settings.max_tokens,
        max_input_tokens=base_settings.max_input_tokens,
        temperature=base_settings.temperature,
        api_type=base_settings.api_type,
        api_version=base_settings.api_version,
    )
    return LLM(
        config_name=f"request_{uuid.uuid4().hex}",
        llm_config={"default": filtered},
    )
