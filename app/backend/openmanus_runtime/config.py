import os
import threading
from pathlib import Path
from typing import Dict, Optional

from pydantic import BaseModel, Field


def get_project_root() -> Path:
    return Path(__file__).resolve().parents[1]


PROJECT_ROOT = get_project_root()
WORKSPACE_ROOT = Path(
    os.getenv("OPENMANUS_WORKSPACE_ROOT", str(PROJECT_ROOT / "workspace"))
).resolve()


class LLMSettings(BaseModel):
    model: str = Field(..., description="Model name")
    base_url: str = Field(..., description="API base URL")
    api_key: str = Field(..., description="API key")
    max_tokens: int = Field(4096, description="Maximum number of tokens per request")
    max_input_tokens: Optional[int] = Field(
        None,
        description="Maximum input tokens to use across all requests (None for unlimited).",
    )
    temperature: float = Field(0.0, description="Sampling temperature")
    api_type: str = Field("openai", description="API type")
    api_version: str = Field("", description="Azure OpenAI version if applicable")


class SandboxSettings(BaseModel):
    use_sandbox: bool = Field(False, description="Whether to use the sandbox")


class AppConfig(BaseModel):
    llm: Dict[str, LLMSettings]
    sandbox: SandboxSettings = Field(default_factory=SandboxSettings)


class Config:
    _instance = None
    _lock = threading.Lock()
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._initialized:
            with self._lock:
                if not self._initialized:
                    self._config = self._load_initial_config()
                    self._initialized = True

    def _load_initial_config(self) -> AppConfig:
        default_llm = LLMSettings(
            model=os.getenv("OPENMANUS_MODEL", os.getenv("APP_AI_DEFAULT_MODEL", "MiniMax-M2.7-highspeed")),
            base_url=os.getenv("OPENMANUS_BASE_URL", os.getenv("APP_AI_BASE_URL", "https://api.openai.com/v1")),
            api_key=os.getenv("OPENMANUS_API_KEY", os.getenv("APP_AI_KEY", "")),
            max_tokens=int(os.getenv("OPENMANUS_MAX_TOKENS", "4096")),
            max_input_tokens=(
                int(os.getenv("OPENMANUS_MAX_INPUT_TOKENS"))
                if os.getenv("OPENMANUS_MAX_INPUT_TOKENS")
                else None
            ),
            temperature=float(os.getenv("OPENMANUS_TEMPERATURE", "0")),
            api_type=os.getenv("OPENMANUS_API_TYPE", "openai"),
            api_version=os.getenv("OPENMANUS_API_VERSION", ""),
        )
        return AppConfig(llm={"default": default_llm}, sandbox=SandboxSettings())

    @property
    def llm(self) -> Dict[str, LLMSettings]:
        return self._config.llm

    @property
    def sandbox(self) -> SandboxSettings:
        return self._config.sandbox

    @property
    def workspace_root(self) -> Path:
        WORKSPACE_ROOT.mkdir(parents=True, exist_ok=True)
        return WORKSPACE_ROOT

    @property
    def root_path(self) -> Path:
        return PROJECT_ROOT


config = Config()
