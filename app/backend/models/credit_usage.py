from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Credit_usage(Base):
    __tablename__ = "credit_usage"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    amount = Column(Integer, nullable=False)
    action = Column(String, nullable=False)
    model = Column(String, nullable=True)
    project_id = Column(Integer, nullable=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)