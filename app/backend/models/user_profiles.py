from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class User_profiles(Base):
    __tablename__ = "user_profiles"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    display_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    credits = Column(Integer, nullable=True)
    plan = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)