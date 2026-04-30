import importlib
import sys


def test_openmanus_config_loads_llm_settings_from_env_file(tmp_path, monkeypatch):
    env_file = tmp_path / ".env"
    env_file.write_text(
        "\n".join(
            [
                "APP_AI_BASE_URL=https://example-llm.invalid/v1",
                "APP_AI_KEY=test-key",
                "APP_AI_DEFAULT_MODEL=test-model",
            ]
        ),
        encoding="utf-8",
    )

    for key in (
        "OPENMANUS_ENV_FILE",
        "APP_AI_BASE_URL",
        "APP_AI_KEY",
        "APP_AI_DEFAULT_MODEL",
        "OPENMANUS_BASE_URL",
        "OPENMANUS_API_KEY",
        "OPENMANUS_MODEL",
    ):
        monkeypatch.delenv(key, raising=False)

    monkeypatch.setenv("OPENMANUS_ENV_FILE", str(env_file))

    sys.modules.pop("openmanus_runtime.config", None)
    config_module = importlib.import_module("openmanus_runtime.config")
    config_module = importlib.reload(config_module)

    llm_settings = config_module.config.llm["default"]

    assert llm_settings.base_url == "https://example-llm.invalid/v1"
    assert llm_settings.api_key == "test-key"
    assert llm_settings.model == "test-model"


def test_openmanus_config_defaults_to_mimo_when_provider_is_configured(tmp_path, monkeypatch):
    env_file = tmp_path / ".env"
    env_file.write_text(
        "\n".join(
            [
                "APP_AI_BASE_URL=https://api.minimax.chat/v1",
                "APP_AI_KEY=minimax-key",
                "APP_AI_MIMO_BASE_URL=https://token-plan-cn.xiaomimimo.com/v1",
                "APP_AI_MIMO_KEY=mimo-key",
                "APP_AI_MIMO_MODEL=mimo-v2.5-pro",
            ]
        ),
        encoding="utf-8",
    )

    for key in (
        "OPENMANUS_ENV_FILE",
        "APP_AI_BASE_URL",
        "APP_AI_KEY",
        "APP_AI_DEFAULT_MODEL",
        "APP_AI_MIMO_BASE_URL",
        "APP_AI_MIMO_KEY",
        "APP_AI_MIMO_MODEL",
        "OPENMANUS_BASE_URL",
        "OPENMANUS_API_KEY",
        "OPENMANUS_MODEL",
    ):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("OPENMANUS_ENV_FILE", str(env_file))

    sys.modules.pop("openmanus_runtime.config", None)
    config_module = importlib.import_module("openmanus_runtime.config")
    config_module = importlib.reload(config_module)

    llm_settings = config_module.config.llm["default"]

    assert llm_settings.model == "mimo-v2.5-pro"
    assert llm_settings.base_url == "https://token-plan-cn.xiaomimimo.com/v1"
    assert llm_settings.api_key == "mimo-key"


def test_openmanus_config_loads_named_openai_compatible_providers(tmp_path, monkeypatch):
    env_file = tmp_path / ".env"
    env_file.write_text(
        "\n".join(
            [
                "APP_AI_BASE_URL=https://api.minimax.chat/v1",
                "APP_AI_KEY=minimax-key",
                "APP_AI_DEFAULT_MODEL=mimo-v2.5-pro",
                "APP_AI_MIMO_BASE_URL=https://token-plan-cn.xiaomimimo.com/v1",
                "APP_AI_MIMO_KEY=mimo-key",
                "APP_AI_MIMO_MODEL=mimo-v2.5-pro",
                "APP_AI_DEEPSEEK_BASE_URL=https://api.deepseek.com",
                "APP_AI_DEEPSEEK_KEY=deepseek-key",
                "APP_AI_DEEPSEEK_MODEL=deepseek-v4-pro",
            ]
        ),
        encoding="utf-8",
    )

    for key in (
        "OPENMANUS_ENV_FILE",
        "APP_AI_BASE_URL",
        "APP_AI_KEY",
        "APP_AI_DEFAULT_MODEL",
        "APP_AI_MIMO_BASE_URL",
        "APP_AI_MIMO_KEY",
        "APP_AI_MIMO_MODEL",
        "APP_AI_DEEPSEEK_BASE_URL",
        "APP_AI_DEEPSEEK_KEY",
        "APP_AI_DEEPSEEK_MODEL",
        "OPENMANUS_BASE_URL",
        "OPENMANUS_API_KEY",
        "OPENMANUS_MODEL",
    ):
        monkeypatch.delenv(key, raising=False)

    monkeypatch.setenv("OPENMANUS_ENV_FILE", str(env_file))

    sys.modules.pop("openmanus_runtime.config", None)
    config_module = importlib.import_module("openmanus_runtime.config")
    config_module = importlib.reload(config_module)

    assert config_module.config.llm["default"].model == "mimo-v2.5-pro"
    assert config_module.config.llm["default"].base_url == "https://token-plan-cn.xiaomimimo.com/v1"
    assert config_module.config.llm["default"].api_key == "mimo-key"
    assert config_module.config.llm["mimo"].model == "mimo-v2.5-pro"
    assert config_module.config.llm["mimo"].base_url == "https://token-plan-cn.xiaomimimo.com/v1"
    assert config_module.config.llm["mimo"].api_key == "mimo-key"
    assert config_module.config.llm["deepseek"].model == "deepseek-v4-pro"
    assert config_module.config.llm["deepseek"].base_url == "https://api.deepseek.com"
    assert config_module.config.llm["deepseek"].api_key == "deepseek-key"
