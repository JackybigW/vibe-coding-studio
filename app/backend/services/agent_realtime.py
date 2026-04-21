import asyncio
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional


@dataclass(slots=True)
class AgentRealtimeTicket:
    ticket: str
    user_id: str
    project_id: int
    expires_at: datetime

    def is_expired(self, now: Optional[datetime] = None) -> bool:
        current_time = now or datetime.now(timezone.utc)
        return self.expires_at <= current_time


class AgentRealtimeService:
    def __init__(self, ttl_minutes: int = 5):
        self._ttl = timedelta(minutes=ttl_minutes)
        self._tickets: dict[str, AgentRealtimeTicket] = {}
        self._lock = asyncio.Lock()

    async def issue_ticket(self, *, user_id: str, project_id: int) -> AgentRealtimeTicket:
        async with self._lock:
            self._purge_expired_locked()
            ticket = secrets.token_urlsafe(32)
            record = AgentRealtimeTicket(
                ticket=ticket,
                user_id=str(user_id),
                project_id=int(project_id),
                expires_at=datetime.now(timezone.utc) + self._ttl,
            )
            self._tickets[ticket] = record
            return record

    async def consume_ticket(self, ticket: str) -> Optional[AgentRealtimeTicket]:
        async with self._lock:
            self._purge_expired_locked()
            return self._tickets.pop(ticket, None)

    def _purge_expired_locked(self) -> None:
        now = datetime.now(timezone.utc)
        expired = [ticket for ticket, record in self._tickets.items() if record.is_expired(now)]
        for ticket in expired:
            self._tickets.pop(ticket, None)


_agent_realtime_service = AgentRealtimeService()


def get_agent_realtime_service() -> AgentRealtimeService:
    return _agent_realtime_service
