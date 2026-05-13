from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SessionBase(BaseModel):
    goal: str
    subject_id: Optional[int] = None
    work_interval: int = 25
    short_break: int = 5
    long_break: int = 15
    intervals_count: int = 4
    scheduled_at: Optional[datetime] = None

class SessionCreate(SessionBase):
    pass

class SessionUpdate(BaseModel):
    goal: Optional[str] = None
    status: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None

class SessionResponse(SessionBase):
    id: int
    user_id: int
    duration_minutes: int
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    subject_name: Optional[str] = None
    subject_color: Optional[str] = None
    date: Optional[str] = None

    class Config:
        from_attributes = True
