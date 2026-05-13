from fastapi import APIRouter, Depends, HTTPException
from typing import List
from database.connection import get_db
from auth import get_current_user

router = APIRouter(prefix="/api/achievements", tags=["achievements"])

@router.get("")
async def get_all_achievements(current_user: dict = Depends(get_current_user)):
    """Список всех достижений + прогресс пользователя"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT a.id, a.code, a.title, a.description, a.icon_name, a.color,
                   COALESCE(ua.progress, 0) as progress,
                   ua.unlocked_at
            FROM achievements a
            LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = %s
            ORDER BY a.id
        """, (current_user["id"],))
        rows = cursor.fetchall()
        result = []
        for r in rows:
            result.append({
                "id": r["id"],
                "code": r["code"],
                "title": r["title"],
                "description": r["description"],
                "icon_name": r["icon_name"],
                "color": r["color"],
                "progress": r["progress"],
                "unlocked": r["unlocked_at"] is not None,
                "unlocked_at": r["unlocked_at"].isoformat() if r["unlocked_at"] else None
            })
        return result
