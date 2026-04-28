import os
from pathlib import Path

import pytest
from dotenv import load_dotenv
from openai import OpenAI

from openmanus_runtime.llm import split_thinking_content


def _load_local_env_files():
    backend_root = Path(__file__).resolve().parents[1]
    for env_file in (
        backend_root / ".env",
        backend_root.parent / ".env",
        backend_root.parent.parent / ".env",
    ):
        if env_file.is_file():
            load_dotenv(env_file, override=False)


def _provider_config(provider: str) -> tuple[str, str, str]:
    if provider == "minimax":
        return (
            os.getenv("APP_AI_DEFAULT_MODEL", "MiniMax-M2.7"),
            os.getenv("APP_AI_BASE_URL", ""),
            os.getenv("APP_AI_KEY", ""),
        )

    prefix = f"APP_AI_{provider.upper()}"
    return (
        os.getenv(f"{prefix}_MODEL", ""),
        os.getenv(f"{prefix}_BASE_URL", ""),
        os.getenv(f"{prefix}_KEY", ""),
    )


@pytest.mark.parametrize("provider", ["minimax", "mimo", "deepseek"])
def test_openai_compatible_provider_returns_visible_content(provider):
    _load_local_env_files()
    if os.getenv("APP_AI_ENABLE_LIVE_MODEL_TESTS") != "1":
        pytest.skip("Set APP_AI_ENABLE_LIVE_MODEL_TESTS=1 to call external LLM providers.")

    model, base_url, api_key = _provider_config(provider)
    if not (model and base_url and api_key):
        pytest.skip(f"{provider} provider is not configured.")

    marker = f"atoms-{provider}-ok"
    client = OpenAI(api_key=api_key, base_url=base_url.rstrip("/"), timeout=60.0)
    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": "You are a smoke test endpoint. Return the requested marker in the final answer.",
            },
            {"role": "user", "content": f"Reply with exactly this marker in the final answer: {marker}"},
        ],
        temperature=0,
        max_tokens=256,
    )

    message = response.choices[0].message
    raw_content = (message.content or "").strip()
    message_dump = message.model_dump() if hasattr(message, "model_dump") else {}
    reasoning_content = (message_dump.get("reasoning_content") or "").strip()
    thinking, visible = split_thinking_content(raw_content)
    visible = visible.strip()

    print(
        {
            "provider": provider,
            "model": model,
            "has_raw_content": bool(raw_content),
            "raw_starts_with_think": raw_content.startswith("<think>"),
            "has_reasoning_content": bool(reasoning_content),
            "thinking_extracted": bool(thinking),
            "visible": visible,
            "visible_contains_marker": marker in visible,
        }
    )

    assert raw_content or reasoning_content
    assert visible
