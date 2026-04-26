"""
Tests for agent conversation behavior:
- Non-implementation inputs (hello/hi/你好) should stop after 1 LLM call
- Implementation inputs (build a website) should call draft_plan and not prematurely stop
"""
import pytest
from typing import Any

from openmanus_runtime.agent.toolcall import ToolCallAgent
from openmanus_runtime.schema import AssistantResponse, Function, ToolCall
from openmanus_runtime.tool.base import BaseTool, ToolResult
from openmanus_runtime.tool.tool_collection import ToolCollection
from openmanus_runtime.tool import Terminate


class MockDraftPlanTool(BaseTool):
    name: str = "draft_plan"
    description: str = "Draft a plan for the user"

    async def execute(self, **kwargs: Any) -> ToolResult:
        return ToolResult(output="Plan drafted and awaiting approval.")


def _text_response(content: str) -> AssistantResponse:
    return AssistantResponse(content=content, tool_calls=[])


def _tool_response(name: str, args: str = "{}") -> AssistantResponse:
    return AssistantResponse(
        content="",
        tool_calls=[ToolCall(id=f"call_{name}", function=Function(name=name, arguments=args))],
    )


def _make_agent(extra_tools: list | None = None) -> ToolCallAgent:
    tools = [Terminate()]
    if extra_tools:
        tools.extend(extra_tools)
    return ToolCallAgent(
        name="test_agent",
        available_tools=ToolCollection(*tools),
        max_steps=20,
    )


# ---------------------------------------------------------------------------
# Non-implementation inputs: should stop after exactly 1 LLM call
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.parametrize("user_input", ["hello", "hi", "你好", "hey there", "what's up"])
async def test_conversational_input_stops_quickly(user_input: str):
    agent = _make_agent()
    call_count = 0

    async def fake_ask_tool(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        return _text_response("Hello! How can I help you today?")

    agent.llm.ask_tool = fake_ask_tool  # type: ignore[method-assign]

    await agent.run(user_input)

    # Agent should stop after at most 2 LLM calls for conversational input:
    # step 1 = first greeting, step 2 = detects loop (no tools, 2 text replies) → FINISHED
    assert call_count <= 2, (
        f"Expected ≤2 LLM calls for conversational input '{user_input}', got {call_count}. "
        "Agent is looping instead of stopping."
    )


@pytest.mark.asyncio
@pytest.mark.parametrize("user_input", ["hello", "hi", "你好"])
async def test_conversational_input_does_not_reach_max_steps(user_input: str):
    agent = _make_agent()
    agent.max_steps = 100
    call_count = 0

    async def fake_ask_tool(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        return _text_response("Hi there!")

    agent.llm.ask_tool = fake_ask_tool  # type: ignore[method-assign]

    await agent.run(user_input)

    assert call_count < 5, (
        f"Agent made {call_count} LLM calls for '{user_input}' — it is looping."
    )


# ---------------------------------------------------------------------------
# Implementation inputs: should call draft_plan, not terminate prematurely
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.parametrize("user_input", [
    "帮我写一个网站",
    "build me a todo app",
    "完成一个用户登录功能",
    "create a REST API for user management",
])
async def test_implementation_input_calls_draft_plan(user_input: str):
    agent = _make_agent(extra_tools=[MockDraftPlanTool()])
    responses = iter([
        _tool_response("draft_plan", '{"plan": "1. Setup\\n2. Build\\n3. Test"}'),
        _tool_response("terminate", '{"status": "success"}'),
    ])

    async def fake_ask_tool(*args, **kwargs):
        return next(responses)

    agent.llm.ask_tool = fake_ask_tool  # type: ignore[method-assign]

    await agent.run(user_input)

    tool_messages = [m for m in agent.messages if m.role == "tool"]
    called_tools = [m.name for m in tool_messages]

    assert "draft_plan" in called_tools, (
        f"Expected draft_plan to be called for implementation input '{user_input}'. "
        f"Tools called: {called_tools}"
    )


@pytest.mark.asyncio
async def test_implementation_input_does_not_stop_before_draft_plan():
    """Agent must NOT immediately FINISH before calling draft_plan."""
    agent = _make_agent(extra_tools=[MockDraftPlanTool()])
    step_count = 0

    async def fake_ask_tool(*args, **kwargs):
        nonlocal step_count
        step_count += 1
        if step_count == 1:
            return _tool_response("draft_plan", '{"plan": "1. Setup\\n2. Build"}')
        return _tool_response("terminate", '{"status": "success"}')

    agent.llm.ask_tool = fake_ask_tool  # type: ignore[method-assign]

    await agent.run("帮我做一个个人主页")

    assert step_count >= 2, (
        "Agent stopped before reaching draft_plan — it terminated too early."
    )
