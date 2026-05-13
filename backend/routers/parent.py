"""Parent API - manage children, view results, plan sessions"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from database.connection import get_db
from auth import get_current_user
from auth_deps import require_parent
from pydantic import BaseModel
from datetime import date, datetime
import secrets
import pymysql

router = APIRouter(prefix="/api/parent", tags=["parent"])

class LinkChildRequest(BaseModel):
    code: str

class CreateChildSessionRequest(BaseModel):
    goal: str
    subject_id: Optional[int] = None
    work_interval: int = 25
    short_break: int = 5
    long_break: int = 15
    intervals_count: int = 4
    scheduled_at: Optional[datetime] = None

@router.get("/children")
async def get_children(current_user: dict = Depends(require_parent)):
    """Get list of linked children"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT u.id, u.name, u.email, u.role, pc.created_at
            FROM users u
            JOIN parent_children pc ON pc.child_id = u.id
            WHERE pc.parent_id = %s
            ORDER BY u.name
        """, (current_user["id"],))
        rows = cursor.fetchall()
        result = []
        for r in rows:
            item = dict(r)
            if item.get("created_at") and hasattr(item["created_at"], "isoformat"):
                item["created_at"] = item["created_at"].isoformat()
            result.append(item)
        return result

@router.post("/children/link")
async def link_child_by_code(req: LinkChildRequest, current_user: dict = Depends(require_parent)):
    """Link a child by their invite code"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT user_id FROM user_invite_codes WHERE code = %s AND (expires_at IS NULL OR expires_at > NOW())",
            (req.code.strip().upper(),)
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=400, detail="Код недействителен или истёк")
        child_id = row["user_id"]
        if child_id == current_user["id"]:
            raise HTTPException(status_code=400, detail="Нельзя привязать себя")
        cursor.execute("SELECT role FROM users WHERE id = %s", (child_id,))
        child = cursor.fetchone()
        if not child or child["role"] != "student":
            raise HTTPException(status_code=400, detail="Код принадлежит не студенту")
        cursor.execute(
            "INSERT IGNORE INTO parent_children (parent_id, child_id) VALUES (%s, %s)",
            (current_user["id"], child_id)
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=400, detail="Ребёнок уже привязан")
        cursor.execute("SELECT id, name, email FROM users WHERE id = %s", (child_id,))
        return cursor.fetchone()

@router.delete("/children/{child_id}")
async def unlink_child(child_id: int, current_user: dict = Depends(require_parent)):
    """Remove child link"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM parent_children WHERE parent_id = %s AND child_id = %s",
            (current_user["id"], child_id)
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Связь не найдена")
        return {"ok": True}

@router.get("/children/{child_id}/stats")
async def get_child_stats(child_id: int, current_user: dict = Depends(require_parent)):
    """Get child's dashboard stats"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM parent_children WHERE parent_id = %s AND child_id = %s",
                       (current_user["id"], child_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=403, detail="Доступ запрещён")
        today = date.today().isoformat()
        cursor.execute("""
            SELECT COALESCE(SUM(minutes_studied), 0) as time_studied,
                   COALESCE(SUM(tasks_completed), 0) as tasks_completed
            FROM study_time_logs WHERE user_id = %s AND date = %s
        """, (child_id, today))
        row = cursor.fetchone()
        cursor.execute("""
            SELECT COUNT(*) as cnt FROM study_sessions 
            WHERE user_id = %s AND status = 'completed' AND DATE(completed_at) = %s
        """, (child_id, today))
        sessions_today = cursor.fetchone()["cnt"]
        cursor.execute("""
            SELECT COUNT(DISTINCT date) as streak FROM (
                SELECT date FROM study_time_logs 
                WHERE user_id = %s AND minutes_studied > 0
                ORDER BY date DESC LIMIT 30
            ) t
        """, (child_id,))
        streak = cursor.fetchone()["streak"] or 0
        return {
            "timeStudied": row["time_studied"] or 0,
            "tasksCompleted": row["tasks_completed"] or 0,
            "sessionsCompleted": sessions_today,
            "streak": min(30, streak)
        }

@router.get("/children/{child_id}/weekly")
async def get_child_weekly(child_id: int, current_user: dict = Depends(require_parent)):
    """Get child's weekly stats for chart"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM parent_children WHERE parent_id = %s AND child_id = %s",
                       (current_user["id"], child_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=403, detail="Доступ запрещён")
        cursor.execute("""
            SELECT date, SUM(minutes_studied) as time, SUM(tasks_completed) as tasks
            FROM study_time_logs
            WHERE user_id = %s AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY date ORDER BY date
        """, (child_id,))
        rows = cursor.fetchall()
        days = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
        result = []
        for r in rows:
            d = r["date"]
            wd = (d.weekday() + 1) % 7
            result.append({
                "day": days[wd],
                "time": r["time"] or 0,
                "tasks": r["tasks"] or 0,
                "date": d.isoformat()
            })
        return result

@router.get("/children/{child_id}/sessions")
async def get_child_sessions(child_id: int, current_user: dict = Depends(require_parent)):
    """Get child's sessions"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM parent_children WHERE parent_id = %s AND child_id = %s",
                       (current_user["id"], child_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=403, detail="Доступ запрещён")
        cursor.execute("""
            SELECT ss.id, ss.user_id, ss.subject_id, ss.goal, ss.work_interval, ss.short_break, ss.long_break,
                   ss.intervals_count, ss.duration_minutes, ss.status, ss.scheduled_at, ss.started_at, ss.completed_at,
                   ss.created_at, ss.updated_at
            FROM study_sessions ss
            WHERE ss.user_id = %s
            ORDER BY ss.created_at DESC
        """, (child_id,))
        sessions = cursor.fetchall()
        for s in sessions:
            for k, v in s.items():
                if isinstance(v, datetime):
                    s[k] = v.isoformat()
            if s.get("subject_id"):
                cursor.execute("SELECT name, color FROM subjects WHERE id = %s", (s["subject_id"],))
                subj = cursor.fetchone()
                s["subject_name"] = subj["name"] if subj else "Общее"
                s["subject_color"] = subj["color"] if subj else "#7012CE"
            else:
                s["subject_name"] = "Общее"
                s["subject_color"] = "#7012CE"
            dt = s.get("scheduled_at") or s.get("completed_at") or s.get("created_at")
            s["date"] = dt[:10] if isinstance(dt, str) else (dt.strftime("%d.%m.%Y") if dt else "")
        return sessions

@router.post("/children/{child_id}/sessions")
async def create_session_for_child(child_id: int, session_data: CreateChildSessionRequest, current_user: dict = Depends(require_parent)):
    """Create a study session for a linked child"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM parent_children WHERE parent_id = %s AND child_id = %s",
                       (current_user["id"], child_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=403, detail="Доступ запрещён")
        goal = session_data.goal
        subject_id = session_data.subject_id
        work_interval = session_data.work_interval
        short_break = session_data.short_break
        long_break = session_data.long_break
        intervals_count = session_data.intervals_count
        scheduled_at = session_data.scheduled_at
        duration_minutes = work_interval * intervals_count
        if subject_id:
            cursor.execute("SELECT id FROM subjects WHERE id = %s AND user_id = %s", (subject_id, child_id))
            if not cursor.fetchone():
                raise HTTPException(status_code=400, detail="Предмет не найден")
        cursor.execute("""
            INSERT INTO study_sessions (user_id, subject_id, goal, work_interval, short_break, long_break,
                intervals_count, duration_minutes, scheduled_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (child_id, subject_id, goal, work_interval, short_break, long_break, intervals_count, duration_minutes, scheduled_at))
        sid = cursor.lastrowid
        cursor.execute("SELECT * FROM study_sessions WHERE id = %s", (sid,))
        row = cursor.fetchone()
        if row:
            for k, v in list((row or {}).items()):
                if isinstance(v, datetime):
                    row[k] = v.isoformat()
            if row.get('subject_id'):
                cursor.execute("SELECT name, color FROM subjects WHERE id = %s", (row['subject_id'],))
                subj = cursor.fetchone()
                row['subject_name'] = subj['name'] if subj else 'Общее'
                row['subject_color'] = subj['color'] if subj else '#7012CE'
            else:
                row['subject_name'] = 'Общее'
                row['subject_color'] = '#7012CE'
        return row

@router.get("/children/{child_id}/subjects")
async def get_child_subjects(child_id: int, current_user: dict = Depends(require_parent)):
    """Get child's subjects for session creation"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM parent_children WHERE parent_id = %s AND child_id = %s",
                       (current_user["id"], child_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=403, detail="Доступ запрещён")
        cursor.execute("SELECT id, name, color FROM subjects WHERE user_id = %s ORDER BY name", (child_id,))
        return cursor.fetchall()

