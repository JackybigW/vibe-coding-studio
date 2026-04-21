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
