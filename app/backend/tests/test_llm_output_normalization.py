from openmanus_runtime.llm import normalize_assistant_message_content


class FakeMessage:
    def __init__(self, content, reasoning_content=None):
        self.content = content
        self._reasoning_content = reasoning_content

    def model_dump(self):
        return {"reasoning_content": self._reasoning_content}


def test_normalize_assistant_message_content_extracts_minimax_think_block():
    thinking, visible = normalize_assistant_message_content(
        FakeMessage("<think>hidden reasoning</think>\nvisible answer")
    )

    assert thinking == "hidden reasoning"
    assert visible == "visible answer"


def test_normalize_assistant_message_content_uses_deepseek_reasoning_field():
    thinking, visible = normalize_assistant_message_content(
        FakeMessage("visible answer", reasoning_content="hidden reasoning")
    )

    assert thinking == "hidden reasoning"
    assert visible == "visible answer"
