import hashlib
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from models.agent_realtime_tickets import AgentRealtimeTickets


@dataclass(slots=True)
class AgentRealtimeTicket:
    ticket: str
    user_id: str
    project_id: int
    expires_at: datetime
    model: Optional[str] = None


class AgentRealtimeService:
    def __init__(self, ttl_minutes: int = 5):
        self._ttl_minutes = ttl_minutes

    @staticmethod
    def _hash_ticket(ticket: str) -> str:
        return hashlib.sha256(ticket.encode("utf-8")).hexdigest()

    @staticmethod
    def _supports_update_returning(db: AsyncSession) -> bool:
        bind = db.get_bind()
        dialect = getattr(bind, "dialect", None)
        return bool(getattr(dialect, "update_returning", False))

    async def _cleanup_stale_tickets(self, db: AsyncSession, now: datetime) -> None:
        await db.execute(delete(AgentRealtimeTickets).where(AgentRealtimeTickets.expires_at <= now))

    async def issue_ticket(
        self,
        db: AsyncSession,
        *,
        user_id: str,
        project_id: int,
        model: Optional[str] = None,
    ) -> AgentRealtimeTicket:
        raw_ticket = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=self._ttl_minutes)
        record = AgentRealtimeTickets(
            ticket_hash=self._hash_ticket(raw_ticket),
            user_id=str(user_id),
            project_id=int(project_id),
            model=model,
            expires_at=expires_at,
        )
        try:
            await self._cleanup_stale_tickets(db, datetime.now(timezone.utc))
            db.add(record)
            await db.commit()
        except Exception:
            await db.rollback()
            raise

        return AgentRealtimeTicket(
            ticket=raw_ticket,
            user_id=str(user_id),
            project_id=int(project_id),
            model=model,
            expires_at=expires_at,
        )

    async def consume_ticket(self, db: AsyncSession, ticket: str) -> Optional[AgentRealtimeTicket]:
        ticket_hash = self._hash_ticket(ticket)
        now = datetime.now(timezone.utc)

        try:
            await self._cleanup_stale_tickets(db, now)

            if self._supports_update_returning(db):
                row = await self._consume_ticket_with_returning(db, ticket_hash, now)
            else:
                row = await self._consume_ticket_with_fallback(db, ticket_hash, now)

            await db.commit()
        except Exception:
            await db.rollback()
            raise

        if row is None:
            return None

        return AgentRealtimeTicket(
            ticket=ticket,
            user_id=row["user_id"],
            project_id=int(row["project_id"]),
            model=row["model"],
            expires_at=row["expires_at"],
        )

    async def _consume_ticket_with_returning(
        self,
        db: AsyncSession,
        ticket_hash: str,
        now: datetime,
    ):
        stmt = (
            update(AgentRealtimeTickets)
            .where(AgentRealtimeTickets.ticket_hash == ticket_hash)
            .where(AgentRealtimeTickets.consumed_at.is_(None))
            .where(AgentRealtimeTickets.expires_at > now)
            .values(consumed_at=now)
            .returning(
                AgentRealtimeTickets.user_id,
                AgentRealtimeTickets.project_id,
                AgentRealtimeTickets.model,
                AgentRealtimeTickets.expires_at,
            )
        )
        result = await db.execute(stmt)
        return result.mappings().one_or_none()

    async def _consume_ticket_with_fallback(
        self,
        db: AsyncSession,
        ticket_hash: str,
        now: datetime,
    ):
        select_stmt = (
            select(
                AgentRealtimeTickets.id,
                AgentRealtimeTickets.user_id,
                AgentRealtimeTickets.project_id,
                AgentRealtimeTickets.model,
                AgentRealtimeTickets.expires_at,
            )
            .where(AgentRealtimeTickets.ticket_hash == ticket_hash)
            .where(AgentRealtimeTickets.consumed_at.is_(None))
            .where(AgentRealtimeTickets.expires_at > now)
            .with_for_update()
        )
        row = (await db.execute(select_stmt)).mappings().one_or_none()
        if row is None:
            return None

        update_stmt = (
            update(AgentRealtimeTickets)
            .where(AgentRealtimeTickets.id == row["id"])
            .where(AgentRealtimeTickets.consumed_at.is_(None))
            .where(AgentRealtimeTickets.expires_at > now)
            .values(consumed_at=now)
        )
        result = await db.execute(update_stmt)
        if result.rowcount != 1:
            return None

        return row


_agent_realtime_service = AgentRealtimeService()


def get_agent_realtime_service() -> AgentRealtimeService:
    return _agent_realtime_service
