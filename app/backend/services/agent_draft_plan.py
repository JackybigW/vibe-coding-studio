import asyncio
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class DraftPlanState:
    project_id: int
    request_key: str
    items: list[dict[str, str]]
    approved: bool = False
    _approval_event: asyncio.Event = field(default_factory=asyncio.Event, repr=False)


class AgentDraftPlanService:
    def __init__(self):
        self._plans: dict[tuple[int, str], DraftPlanState] = {}

    def put(self, state: DraftPlanState) -> asyncio.Event:
        key = (state.project_id, state.request_key)
        self._plans[key] = state
        return state._approval_event

    def approve(self, project_id: int, request_key: str) -> Optional[DraftPlanState]:
        key = (project_id, request_key)
        state = self._plans.get(key)
        if state is None:
            return None
        state.approved = True
        state._approval_event.set()
        return state

    def get(self, project_id: int, request_key: str) -> Optional[DraftPlanState]:
        return self._plans.get((project_id, request_key))


_service_instance: Optional[AgentDraftPlanService] = None


def get_agent_draft_plan_service() -> AgentDraftPlanService:
    global _service_instance
    if _service_instance is None:
        _service_instance = AgentDraftPlanService()
    return _service_instance
