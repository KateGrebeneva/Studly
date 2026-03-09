from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str = "student"

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    avatar_url: Optional[str] = None
    theme: str = "light"
    created_at: datetime

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
