from fastapi import APIRouter, Depends, HTTPException
from database.connection import get_db
from auth import get_current_user
from pydantic import BaseModel
import secrets
import pymysql

router = APIRouter(prefix="/api/profile", tags=["profile"])

class ProfileUpdate(BaseModel):
    name: str = None
    theme: str = None

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
            raise HTTPException(status_code=404, detail="User not found")
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
            updates.append("name = %s")
            values.append(profile_update.name)
        if profile_update.theme is not None:
            updates.append("theme = %s")
            values.append(profile_update.theme)
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
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
    """Get or create invite code for parent linking (students only)"""
    if current_user.get("role") != "student":
        raise HTTPException(status_code=400, detail="Только студенты могут создавать коды для родителей")
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
    """Generate new invite code (replaces old one)"""
    if current_user.get("role") != "student":
        raise HTTPException(status_code=400, detail="Только студенты могут создавать коды")
    with get_db() as conn:
        cursor = conn.cursor()
        code = secrets.token_hex(4).upper()
        cursor.execute("DELETE FROM user_invite_codes WHERE user_id = %s", (current_user["id"],))
        cursor.execute("INSERT INTO user_invite_codes (user_id, code) VALUES (%s, %s)",
                       (current_user["id"], code))
        return {"code": code}

