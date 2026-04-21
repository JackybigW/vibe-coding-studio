import pytest

from openmanus_runtime.agent.toolcall import ToolCallAgent
from openmanus_runtime.schema import AssistantResponse


@pytest.mark.asyncio
async def test_toolcall_agent_finishes_after_plain_text_reply_without_tools():
    agent = ToolCallAgent(max_steps=20)
    calls = {"count": 0}

    async def fake_ask_tool(*args, **kwargs):
        calls["count"] += 1
        return AssistantResponse(
            content="Hello Jacky! Tell me what you'd like to build.",
            tool_calls=[],
        )

    agent.llm.ask_tool = fake_ask_tool  # type: ignore[method-assign]

    result = await agent.run("我叫 jacky, 一个 ai")

    assert calls["count"] == 1
    assert result == "Step 1: Thinking complete - no action needed"
    assistant_messages = [message for message in agent.messages if message.role == "assistant"]
    assert len(assistant_messages) == 1
    assert assistant_messages[0].content == "Hello Jacky! Tell me what you'd like to build."
