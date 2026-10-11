from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from database.connection import get_db
from auth_deps import require_parent
from pydantic import BaseModel
from datetime import datetime
from services import stats_service, analytics_service
from routers.sessions import SESSION_SELECT, enrich, insert_session

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

def _ensure_link(cursor, parent_id: int, child_id: int) -> None:
    cursor.execute("SELECT id FROM parent_children WHERE parent_id = %s AND child_id = %s", (parent_id, child_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=403, detail="Этот ученик не привязан к вашему аккаунту")


@router.get("/children")
async def get_children(current_user: dict = Depends(require_parent)):
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
            raise HTTPException(status_code=400, detail="Этот код принадлежит не ученику")
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
    with get_db() as conn:
        cursor = conn.cursor()
        _ensure_link(cursor, current_user["id"], child_id)
        return stats_service.dashboard_stats(cursor, child_id)

@router.get("/children/{child_id}/weekly")
async def get_child_weekly(child_id: int, current_user: dict = Depends(require_parent)):
    with get_db() as conn:
        cursor = conn.cursor()
        _ensure_link(cursor, current_user["id"], child_id)
        return stats_service.weekly_stats(cursor, child_id)

@router.get("/children/{child_id}/sessions")
async def get_child_sessions(child_id: int, current_user: dict = Depends(require_parent)):
    with get_db() as conn:
        cursor = conn.cursor()
        _ensure_link(cursor, current_user["id"], child_id)
        cursor.execute(
            SESSION_SELECT + " WHERE ss.user_id = %s ORDER BY COALESCE(ss.completed_at, ss.scheduled_at, ss.created_at) DESC",
            (child_id,),
        )
        return [enrich(s) for s in cursor.fetchall()]

@router.post("/children/{child_id}/sessions")
async def create_session_for_child(child_id: int, session_data: CreateChildSessionRequest, current_user: dict = Depends(require_parent)):
    with get_db() as conn:
        cursor = conn.cursor()
        _ensure_link(cursor, current_user["id"], child_id)
        return insert_session(cursor, child_id, session_data)

@router.get("/children/{child_id}/subjects")
async def get_child_subjects(child_id: int, current_user: dict = Depends(require_parent)):
    with get_db() as conn:
        cursor = conn.cursor()
        _ensure_link(cursor, current_user["id"], child_id)
        cursor.execute("SELECT id, name, color FROM subjects WHERE user_id = %s ORDER BY name", (child_id,))
        return cursor.fetchall()



@router.get("/children/{child_id}/overview")
async def get_child_overview(child_id: int, days: int = 30, current_user: dict = Depends(require_parent)):
    with get_db() as conn:
        cursor = conn.cursor()
        _ensure_link(cursor, current_user["id"], child_id)
        cursor.execute("SELECT id, name, email FROM users WHERE id = %s", (child_id,))
        child = cursor.fetchone()
        if not child:
            raise HTTPException(status_code=404, detail="Ученик не найден")
        return analytics_service.child_overview(cursor, child, days)


@router.get("/children/{child_id}/subjects/{subject_id}")
async def get_child_subject_detail(child_id: int, subject_id: int, days: int = 30, current_user: dict = Depends(require_parent)):
    with get_db() as conn:
        cursor = conn.cursor()
        _ensure_link(cursor, current_user["id"], child_id)
        detail = analytics_service.subject_detail(cursor, child_id, subject_id, days)
        if detail is None:
            raise HTTPException(status_code=404, detail="Предмет не найден")
        return detail
