from fastapi import APIRouter, Depends, HTTPException
from database.connection import get_db
from auth import get_current_user
from pydantic import BaseModel
from typing import Optional
import secrets

router = APIRouter(prefix="/api/profile", tags=["profile"])

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    theme: Optional[str] = None

@router.get("")
async def get_profile(current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, email, name, role, avatar_url, theme, created_at FROM users WHERE id = %s",
            (current_user["id"],)
        )
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        if user.get("created_at"):
            user["created_at"] = user["created_at"].isoformat()
        return user

@router.put("")
async def update_profile(profile_update: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        
        updates = []
        values = []
        if profile_update.name is not None:
            if not profile_update.name.strip():
                raise HTTPException(status_code=400, detail="Имя не может быть пустым")
            updates.append("name = %s")
            values.append(profile_update.name.strip()[:255])
        if profile_update.theme is not None:
            if profile_update.theme not in ("light", "dark"):
                raise HTTPException(status_code=400, detail="Тема может быть light или dark")
            updates.append("theme = %s")
            values.append(profile_update.theme)
        
        if not updates:
            raise HTTPException(status_code=400, detail="Нет полей для обновления")
        
        values.append(current_user["id"])
        cursor.execute(
            f"UPDATE users SET {', '.join(updates)} WHERE id = %s",
            values
        )
        
        cursor.execute(
            "SELECT id, email, name, role, avatar_url, theme, created_at FROM users WHERE id = %s",
            (current_user["id"],)
        )
        user = cursor.fetchone()
        if user and user.get("created_at"):
            user["created_at"] = user["created_at"].isoformat()
        return user

@router.get("/invite-code")
async def get_my_invite_code(current_user: dict = Depends(get_current_user)):
    """Код для родителя (только у ученика)."""
    if current_user.get("role") != "student":
        raise HTTPException(status_code=400, detail="Код для родителя доступен только ученикам")
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT code FROM user_invite_codes WHERE user_id = %s ORDER BY created_at DESC LIMIT 1",
                       (current_user["id"],))
        row = cursor.fetchone()
        if row:
            return {"code": row["code"]}
        code = secrets.token_hex(4).upper()
        cursor.execute("INSERT INTO user_invite_codes (user_id, code) VALUES (%s, %s)",
                       (current_user["id"], code))
        return {"code": code}

@router.post("/invite-code")
async def generate_invite_code(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "student":
        raise HTTPException(status_code=400, detail="Код для родителя доступен только ученикам")
    with get_db() as conn:
        cursor = conn.cursor()
        code = secrets.token_hex(4).upper()
        cursor.execute("DELETE FROM user_invite_codes WHERE user_id = %s", (current_user["id"],))
        cursor.execute("INSERT INTO user_invite_codes (user_id, code) VALUES (%s, %s)",
                       (current_user["id"], code))
        return {"code": code}

