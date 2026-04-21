import re
from dataclasses import dataclass


IMPLEMENTATION_KEYWORDS = (
    "build",
    "implement",
    "create",
    "新增",
    "添加",
    "修改",
    "增加",
    "fix",
)
FRONTEND_KEYWORDS = (
    "frontend",
    "front-end",
    "ui",
    "ux",
    "landing page",
    "widget",
)
BACKEND_KEYWORDS = (
    "api",
    "backend",
    "database",
    "auth",
    "storage",
    "payment",
    "后端",
    "接口",
)

_IMPLEMENTATION_PATTERN = re.compile(r"\b(?:build|implement|create|fix)\b", re.IGNORECASE)
_BACKEND_PATTERN = re.compile(r"\b(?:api|backend|database|auth|storage|payment)\b", re.IGNORECASE)
_FRONTEND_IMPLEMENTATION_PATTERN = re.compile(
    r"\b(?:build|implement|create|fix)\b.*\b(?:frontend|front-end|ui|ux|landing page|widget)\b",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class BootstrapContext:
    mode: str
    requires_backend_readme: bool
    requires_draft_plan: bool


def _contains_keyword(prompt: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in prompt for keyword in keywords)


def classify_user_request(prompt: str) -> BootstrapContext:
    lowered = prompt.lower()
    implementation = (
        bool(_IMPLEMENTATION_PATTERN.search(lowered))
        or bool(_FRONTEND_IMPLEMENTATION_PATTERN.search(lowered))
        or _contains_keyword(prompt, IMPLEMENTATION_KEYWORDS[3:])
        or _contains_keyword(prompt, FRONTEND_KEYWORDS)
    )
    backend = bool(_BACKEND_PATTERN.search(lowered)) or _contains_keyword(prompt, BACKEND_KEYWORDS)
    return BootstrapContext(
        mode="implementation" if implementation else "conversation",
        requires_backend_readme=backend,
        requires_draft_plan=implementation,
    )


def build_bootstrap_context(prompt: str) -> BootstrapContext:
    return classify_user_request(prompt)
