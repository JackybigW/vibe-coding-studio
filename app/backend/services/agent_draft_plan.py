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
    # NOTE: In-memory store — incompatible with multi-worker deployments
    # (uvicorn --workers N). Each worker has its own instance, so a
    # WebSocket on worker-A cannot approve a plan stored in worker-B.
    # Use a shared store (Redis, DB) for production multi-worker setups.

    def __init__(self) -> None:
        self._plans: dict[tuple[int, str], DraftPlanState] = {}

    def put(self, project_id: int, request_key: str, items: list) -> asyncio.Event:
        state = DraftPlanState(project_id=project_id, request_key=request_key, items=items)
        self._plans[(project_id, request_key)] = state
        return state._approval_event

    def approve(self, project_id: int, request_key: str) -> Optional[DraftPlanState]:
        state = self._plans.get((project_id, request_key))
        if state is None:
            return None
        state.approved = True
        state._approval_event.set()
        return state

    def get(self, project_id: int, request_key: str) -> Optional[DraftPlanState]:
        return self._plans.get((project_id, request_key))

    def delete(self, project_id: int, request_key: str) -> None:
        self._plans.pop((project_id, request_key), None)


_service_instance: Optional[AgentDraftPlanService] = None


def get_agent_draft_plan_service() -> AgentDraftPlanService:
    global _service_instance
    if _service_instance is None:
        _service_instance = AgentDraftPlanService()
    return _service_instance
