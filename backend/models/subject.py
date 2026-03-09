from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SubjectBase(BaseModel):
    name: str
    color: str = "#7012CE"
    category: Optional[str] = None

class SubjectCreate(SubjectBase):
    pass

class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    category: Optional[str] = None
    time_studied_minutes: Optional[int] = None

class SubjectResponse(SubjectBase):
    id: int
    user_id: int
    time_studied_minutes: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
