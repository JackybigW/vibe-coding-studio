from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Messages(Base):
    __tablename__ = "messages"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    project_id = Column(Integer, nullable=False)
    role = Column(String, nullable=False)
    content = Column(String, nullable=False)
    model = Column(String, nullable=True)
    agent = Column(String, nullable=True)
    tokens_used = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)