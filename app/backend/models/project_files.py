from core.database import Base
from sqlalchemy import Boolean, Column, DateTime, Integer, String


class Project_files(Base):
    __tablename__ = "project_files"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    project_id = Column(Integer, nullable=False)
    file_path = Column(String, nullable=False)
    file_name = Column(String, nullable=False)
    content = Column(String, nullable=True)
    language = Column(String, nullable=True)
    is_directory = Column(Boolean, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)