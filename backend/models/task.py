from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[datetime] = None

class TaskCreate(TaskBase):
    subject_id: int

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    is_completed: Optional[bool] = None
    due_date: Optional[datetime] = None

class TaskResponse(TaskBase):
    id: int
    subject_id: int
    is_completed: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
