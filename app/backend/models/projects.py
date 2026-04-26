from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String, UniqueConstraint


class Projects(Base):
    __tablename__ = "projects"
    __table_args__ = (
        UniqueConstraint("user_id", "project_number", name="uq_user_project_number"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    project_number = Column(Integer, nullable=False, default=0)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, nullable=True)
    visibility = Column(String, nullable=True)
    framework = Column(String, nullable=True)
    thumbnail_url = Column(String, nullable=True)
    deploy_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)