from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import date, datetime

from database.connection import get_db
from models.session import SessionCreate, SessionUpdate, SessionResponse
from auth import get_current_user
from services.stats_service import to_local_naive
from services import achievements_service

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

ALLOWED_STATUSES = {"planned", "in_progress", "completed", "cancelled"}

SESSION_SELECT = """
    SELECT ss.id, ss.user_id, ss.subject_id, ss.goal, ss.work_interval, ss.short_break, ss.long_break,
           ss.intervals_count, ss.duration_minutes, ss.status, ss.scheduled_at, ss.started_at,
           ss.completed_at, ss.created_at, ss.updated_at,
           s.name AS subject_name, s.color AS subject_color
    FROM study_sessions ss
    LEFT JOIN subjects s ON s.id = ss.subject_id
"""


def enrich(sess: dict) -> dict:
    if not sess:
        return sess
    sess = dict(sess)
    sess["subject_name"] = sess.get("subject_name") or "Общее"
    sess["subject_color"] = sess.get("subject_color") or "#7012CE"
    dt = sess.get("scheduled_at") or sess.get("completed_at") or sess.get("created_at")
    sess["date"] = dt.strftime("%d.%m.%Y") if isinstance(dt, datetime) else ""
    for k, v in list(sess.items()):
        if isinstance(v, (datetime, date)):
            sess[k] = v.isoformat()
    return sess


def fetch_session(cursor, session_id: int) -> Optional[dict]:
    cursor.execute(SESSION_SELECT + " WHERE ss.id = %s", (session_id,))
    return cursor.fetchone()


def insert_session(cursor, user_id: int, data) -> dict:
    """Общая для ученика и родителя."""
    if data.subject_id:
        cursor.execute("SELECT id FROM subjects WHERE id = %s AND user_id = %s", (data.subject_id, user_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Предмет не найден")
    if not (data.goal or "").strip():
        raise HTTPException(status_code=400, detail="Укажите цель сессии")
    for name in ("work_interval", "short_break", "long_break", "intervals_count"):
        if getattr(data, name) is None or getattr(data, name) < 1:
            raise HTTPException(status_code=400, detail=f"Некорректное значение {name}")
    duration_minutes = data.work_interval * data.intervals_count
    cursor.execute(
        """INSERT INTO study_sessions
           (user_id, subject_id, goal, work_interval, short_break, long_break, intervals_count, duration_minutes, scheduled_at)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (user_id, data.subject_id, data.goal.strip(), data.work_interval, data.short_break,
         data.long_break, data.intervals_count, duration_minutes, to_local_naive(data.scheduled_at)),
    )
    return enrich(fetch_session(cursor, cursor.lastrowid))


@router.get("", response_model=List[SessionResponse])
async def get_sessions(
    status_filter: Optional[str] = Query(None, alias="status"),
    status_filter_legacy: Optional[str] = Query(None, alias="status_filter"),
    current_user: dict = Depends(get_current_user),
):
    status_value = status_filter or status_filter_legacy
    with get_db() as conn:
        cursor = conn.cursor()
        if status_value:
            cursor.execute(
                SESSION_SELECT + " WHERE ss.user_id = %s AND ss.status = %s ORDER BY ss.created_at DESC",
                (current_user["id"], status_value),
            )
        else:
            cursor.execute(SESSION_SELECT + " WHERE ss.user_id = %s ORDER BY ss.created_at DESC", (current_user["id"],))
        return [enrich(s) for s in cursor.fetchall()]


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: int, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        sess = fetch_session(cursor, session_id)
        if not sess or sess["user_id"] != current_user["id"]:
            raise HTTPException(status_code=404, detail="Сессия не найдена")
        return enrich(sess)


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(session: SessionCreate, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        return insert_session(conn.cursor(), current_user["id"], session)


def _log_completion(cursor, user_id: int, minutes: int, subject_id, when: datetime) -> None:
    day = when.date()
    cursor.execute("SELECT id FROM study_time_logs WHERE user_id = %s AND date = %s", (user_id, day))
    if cursor.fetchone():
        cursor.execute(
            "UPDATE study_time_logs SET minutes_studied = minutes_studied + %s WHERE user_id = %s AND date = %s",
            (minutes, user_id, day),
        )
    else:
        cursor.execute(
            """INSERT INTO study_time_logs (user_id, date, subject_id, minutes_studied, tasks_completed)
               VALUES (%s, %s, %s, %s, 0)""",
            (user_id, day, subject_id, minutes),
        )


@router.put("/{session_id}", response_model=SessionResponse)
async def update_session(session_id: int, session_update: SessionUpdate, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        current = fetch_session(cursor, session_id)
        if not current or current["user_id"] != current_user["id"]:
            raise HTTPException(status_code=404, detail="Сессия не найдена")

        if session_update.status is not None and session_update.status not in ALLOWED_STATUSES:
            raise HTTPException(status_code=400, detail="Недопустимый статус сессии")

        updates, values = [], []
        if session_update.goal is not None:
            if not session_update.goal.strip():
                raise HTTPException(status_code=400, detail="Цель не может быть пустой")
            updates.append("goal = %s")
            values.append(session_update.goal.strip())
        if session_update.status is not None:
            updates.append("status = %s")
            values.append(session_update.status)
        if session_update.started_at is not None:
            updates.append("started_at = %s")
            values.append(to_local_naive(session_update.started_at))
        if session_update.duration_minutes is not None:
            if session_update.duration_minutes < 0:
                raise HTTPException(status_code=400, detail="Длительность не может быть отрицательной")
            updates.append("duration_minutes = %s")
            values.append(session_update.duration_minutes)

        completing = session_update.status == "completed" and current["status"] != "completed"
        completed_at = to_local_naive(session_update.completed_at)
        if completing and completed_at is None:
            completed_at = datetime.now()
        if completed_at is not None:
            updates.append("completed_at = %s")
            values.append(completed_at)

        if not updates:
            raise HTTPException(status_code=400, detail="Нет полей для обновления")

        values.append(session_id)
        cursor.execute(f"UPDATE study_sessions SET {', '.join(updates)} WHERE id = %s", values)

        # время пишем только один раз, чтобы повторный запрос не удвоил минуты
        if completing:
            minutes = session_update.duration_minutes if session_update.duration_minutes is not None else int(current["duration_minutes"] or 0)
            if minutes > 0:
                _log_completion(cursor, current_user["id"], minutes, current["subject_id"], completed_at)
            achievements_service.refresh(cursor, current_user["id"])

        return enrich(fetch_session(cursor, session_id))


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: int, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM study_sessions WHERE id = %s AND user_id = %s", (session_id, current_user["id"]))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Сессия не найдена")
