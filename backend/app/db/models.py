from sqlalchemy import Column, String, JSON, DateTime
from app.db.session import Base
import uuid
import datetime

class JobModel(Base):
    __tablename__ = "jobs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    status = Column(String, default="pending")
    script_text = Column(String, nullable=False)
    aspect_ratio = Column(String, default="9:16")
    result_spec = Column(JSON, nullable=True)
    video_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
