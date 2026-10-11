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
    where, params = [], []
    if role:
        where.append("role = %s")
        params.append(role)
    if search:
        where.append("(name LIKE %s OR email LIKE %s)")
        params += [f"%{search}%", f"%{search}%"]
    sql = "SELECT id, email, name, role, theme, created_at FROM users"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY created_at DESC"
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
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
        today = date.today()
        cursor.execute(
            "SELECT COUNT(*) as cnt FROM study_sessions WHERE status = 'completed' AND DATE(completed_at) = %s",
            (today,),
        )
        today_sessions = cursor.fetchone()["cnt"]
        # активные = сегодня завершили сессию или есть запись в журнале
        cursor.execute(
            """SELECT COUNT(DISTINCT user_id) AS cnt FROM (
                   SELECT user_id FROM study_sessions WHERE status = 'completed' AND DATE(completed_at) = %s
                   UNION SELECT user_id FROM study_time_logs WHERE date = %s AND minutes_studied > 0
               ) t""",
            (today, today),
        )
        today_active = cursor.fetchone()["cnt"]
        week_start = today - timedelta(days=6)
        cursor.execute(
            """SELECT DATE(completed_at) AS d, COUNT(DISTINCT user_id) AS active, SUM(duration_minutes) AS minutes
               FROM study_sessions WHERE status = 'completed' AND DATE(completed_at) >= %s
               GROUP BY DATE(completed_at)""",
            (week_start,),
        )
        by_day = {str(r["d"]): r for r in cursor.fetchall()}
        cursor.execute(
            """SELECT date AS d, COUNT(DISTINCT user_id) AS active, SUM(minutes_studied) AS minutes
               FROM study_time_logs WHERE date >= %s GROUP BY date""",
            (week_start,),
        )
        logs = {str(r["d"]): r for r in cursor.fetchall()}
        weekly_data = []
        for i in range(7):
            d = (week_start + timedelta(days=i)).isoformat()
            a, b = by_day.get(d) or {}, logs.get(d) or {}
            weekly_data.append({
                "date": d,
                "activeUsers": max(int(a.get("active") or 0), int(b.get("active") or 0)),
                "minutes": max(int(a.get("minutes") or 0), int(b.get("minutes") or 0)),
            })
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
    if user_id == current_user["id"] and payload.role is not None and payload.role != "admin":
        raise HTTPException(status_code=400, detail="Нельзя снять с себя роль администратора")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE id = %s", (user_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        try:
            values.append(user_id)
            cursor.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = %s", values)
        except Exception:
            # скорее всего такой email уже есть
            raise HTTPException(status_code=400, detail="Не удалось обновить пользователя")
        cursor.execute("SELECT id, email, name, role, theme, created_at FROM users WHERE id = %s", (user_id,))
        row = cursor.fetchone()
        if row and row.get("created_at") and hasattr(row["created_at"], "isoformat"):
            row["created_at"] = row["created_at"].isoformat()
        return row
