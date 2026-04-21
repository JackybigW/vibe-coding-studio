from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String, func


class AgentRealtimeTickets(Base):
    __tablename__ = "agent_realtime_tickets"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    ticket_hash = Column(String(64), nullable=False, unique=True, index=True)
    user_id = Column(String, nullable=False)
    project_id = Column(Integer, nullable=False)
    model = Column(String(128), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    consumed_at = Column(DateTime(timezone=True), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
