from openmanus_runtime.config import LLMSettings
from openmanus_runtime.streaming import resolve_llm_settings_for_model


def _patch_llm_settings(monkeypatch, settings):
    monkeypatch.setattr("openmanus_runtime.streaming.config._config.llm", settings)


def test_resolve_llm_settings_uses_named_provider_for_mimo_model(monkeypatch):
    minimax = LLMSettings(model="MiniMax-M2.7", base_url="https://minimax.invalid/v1", api_key="minimax-key")
    mimo = LLMSettings(model="mimo-v2.5-pro", base_url="https://mimo.invalid/v1", api_key="mimo-key")
    deepseek = LLMSettings(model="deepseek-v4-pro", base_url="https://deepseek.invalid", api_key="deepseek-key")

    _patch_llm_settings(monkeypatch, {"default": minimax, "mimo": mimo, "deepseek": deepseek})

    resolved = resolve_llm_settings_for_model("mimo-v2.5-pro")

    assert resolved.model == "mimo-v2.5-pro"
    assert resolved.base_url == "https://mimo.invalid/v1"
    assert resolved.api_key == "mimo-key"


def test_resolve_llm_settings_uses_named_provider_for_deepseek_model(monkeypatch):
    minimax = LLMSettings(model="MiniMax-M2.7", base_url="https://minimax.invalid/v1", api_key="minimax-key")
    mimo = LLMSettings(model="mimo-v2.5-pro", base_url="https://mimo.invalid/v1", api_key="mimo-key")
    deepseek = LLMSettings(model="deepseek-v4-pro", base_url="https://deepseek.invalid", api_key="deepseek-key")

    _patch_llm_settings(monkeypatch, {"default": minimax, "mimo": mimo, "deepseek": deepseek})

    resolved = resolve_llm_settings_for_model("deepseek-v4-pro")

    assert resolved.model == "deepseek-v4-pro"
    assert resolved.base_url == "https://deepseek.invalid"
    assert resolved.api_key == "deepseek-key"


def test_resolve_llm_settings_keeps_default_provider_for_unknown_model(monkeypatch):
    minimax = LLMSettings(model="MiniMax-M2.7", base_url="https://minimax.invalid/v1", api_key="minimax-key")
    mimo = LLMSettings(model="mimo-v2.5-pro", base_url="https://mimo.invalid/v1", api_key="mimo-key")

    _patch_llm_settings(monkeypatch, {"default": minimax, "mimo": mimo})

    resolved = resolve_llm_settings_for_model("custom-model")

    assert resolved.model == "custom-model"
    assert resolved.base_url == "https://minimax.invalid/v1"
    assert resolved.api_key == "minimax-key"
