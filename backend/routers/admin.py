"""Admin API - users management, statistics"""
from fastapi import APIRouter, Depends, Query, HTTPException
from database.connection import get_db
from auth_deps import require_admin
from datetime import date, timedelta
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/admin", tags=["admin"])

class UpdateUserRequest(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None
    theme: Optional[str] = None

@router.get("/users")
async def get_all_users(
    current_user: dict = Depends(require_admin),
    role: str = Query(None),
    search: str = Query(None)
):
    """Get all users with optional filters"""
    with get_db() as conn:
        cursor = conn.cursor()
        if role:
            cursor.execute(
                """SELECT id, email, name, role, theme, created_at FROM users 
                   WHERE role = %s ORDER BY created_at DESC""",
                (role,)
            )
        elif search:
            search_term = f"%{search}%"
            cursor.execute(
                """SELECT id, email, name, role, theme, created_at FROM users 
                   WHERE name LIKE %s OR email LIKE %s ORDER BY created_at DESC""",
                (search_term, search_term)
            )
        else:
            cursor.execute(
                "SELECT id, email, name, role, theme, created_at FROM users ORDER BY created_at DESC"
            )
        rows = cursor.fetchall()
        result = []
        for r in rows:
            item = dict(r)
            if item.get("created_at") and hasattr(item["created_at"], "isoformat"):
                item["created_at"] = item["created_at"].isoformat()
            result.append(item)
        return result

@router.get("/stats")
async def get_admin_stats(current_user: dict = Depends(require_admin)):
    """Admin dashboard statistics"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as cnt FROM users")
        total_users = cursor.fetchone()["cnt"]
        cursor.execute("SELECT COUNT(*) as cnt FROM users WHERE role = 'student'")
        students = cursor.fetchone()["cnt"]
        cursor.execute("SELECT COUNT(*) as cnt FROM users WHERE role = 'parent'")
        parents = cursor.fetchone()["cnt"]
        cursor.execute("SELECT COUNT(*) as cnt FROM study_sessions WHERE status = 'completed'")
        completed_sessions = cursor.fetchone()["cnt"]
        cursor.execute("SELECT COALESCE(SUM(duration_minutes), 0) as total FROM study_sessions WHERE status = 'completed'")
        total_minutes = cursor.fetchone()["total"] or 0
        today = date.today().isoformat()
        cursor.execute("SELECT COUNT(*) as cnt FROM study_sessions WHERE status = 'completed' AND DATE(completed_at) = %s", (today,))
        today_sessions = cursor.fetchone()["cnt"]
        cursor.execute("SELECT COUNT(*) as cnt FROM study_time_logs WHERE date = %s", (today,))
        today_active = cursor.fetchone()["cnt"]
        week_ago = (date.today() - timedelta(days=7)).isoformat()
        cursor.execute("SELECT date, COUNT(DISTINCT user_id) as active, SUM(minutes_studied) as minutes FROM study_time_logs WHERE date >= %s GROUP BY date ORDER BY date", (week_ago,))
        weekly = cursor.fetchall()
        weekly_data = [{"date": str(r["date"]), "activeUsers": r["active"], "minutes": r["minutes"] or 0} for r in weekly]
        return {
            "totalUsers": total_users,
            "students": students,
            "parents": parents,
            "completedSessions": completed_sessions,
            "totalMinutes": total_minutes,
            "todaySessions": today_sessions,
            "todayActiveUsers": today_active,
            "weeklyActivity": weekly_data
        }


@router.put("/users/{user_id}")
async def update_user(user_id: int, payload: UpdateUserRequest, current_user: dict = Depends(require_admin)):
    allowed_roles = {"student", "parent", "teacher", "admin"}
    allowed_themes = {"light", "dark"}
    if payload.role is not None and payload.role not in allowed_roles:
        raise HTTPException(status_code=400, detail="Недопустимая роль")
    if payload.theme is not None and payload.theme not in allowed_themes:
        raise HTTPException(status_code=400, detail="Недопустимая тема")

    updates = []
    values = []
    if payload.email is not None:
        updates.append("email = %s")
        values.append(payload.email.strip())
    if payload.name is not None:
        updates.append("name = %s")
        values.append(payload.name.strip())
    if payload.role is not None:
        updates.append("role = %s")
        values.append(payload.role)
    if payload.theme is not None:
        updates.append("theme = %s")
        values.append(payload.theme)

    if not updates:
        raise HTTPException(status_code=400, detail="Нет полей для обновления")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE id = %s", (user_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        try:
            values.append(user_id)
            cursor.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = %s", values)
        except Exception:
            # Likely duplicate email or other constraint
            raise HTTPException(status_code=400, detail="Не удалось обновить пользователя")
        cursor.execute("SELECT id, email, name, role, theme, created_at FROM users WHERE id = %s", (user_id,))
        row = cursor.fetchone()
        if row and row.get("created_at") and hasattr(row["created_at"], "isoformat"):
            row["created_at"] = row["created_at"].isoformat()
        return row
