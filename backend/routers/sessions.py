from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from database.connection import get_db
from models.session import SessionCreate, SessionUpdate, SessionResponse
from auth import get_current_user
from datetime import datetime
import pymysql

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

@router.get("", response_model=List[SessionResponse])
async def get_sessions(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user)
):
    with get_db() as conn:
        cursor = conn.cursor()
        if status_filter:
            cursor.execute(
                """SELECT id, user_id, subject_id, goal, work_interval, short_break, long_break, 
                   intervals_count, duration_minutes, status, scheduled_at, started_at, completed_at, 
                   created_at, updated_at 
                   FROM study_sessions 
                   WHERE user_id = %s AND status = %s 
                   ORDER BY created_at DESC""",
                (current_user["id"], status_filter)
            )
        else:
            cursor.execute(
                """SELECT id, user_id, subject_id, goal, work_interval, short_break, long_break, 
                   intervals_count, duration_minutes, status, scheduled_at, started_at, completed_at, 
                   created_at, updated_at 
                   FROM study_sessions 
                   WHERE user_id = %s 
                   ORDER BY created_at DESC""",
                (current_user["id"],)
            )
        sessions = cursor.fetchall()
        # Convert datetime objects to strings for JSON serialization
        for session in sessions:
            for key, value in session.items():
                if isinstance(value, datetime):
                    session[key] = value.isoformat()
            if session.get('subject_id'):
                cursor.execute("SELECT name, color FROM subjects WHERE id = %s", (session['subject_id'],))
                subj = cursor.fetchone()
                if subj:
                    session['subject_name'] = subj['name']
                    session['subject_color'] = subj['color']
            else:
                session['subject_name'] = 'Общее'
                session['subject_color'] = '#7012CE'
            dt = session.get('scheduled_at') or session.get('completed_at') or session.get('created_at')
            if dt:
                d = dt if isinstance(dt, datetime) else datetime.fromisoformat(str(dt).replace('Z', '+00:00'))
                session['date'] = d.strftime('%d.%m.%Y')
            else:
                session['date'] = ''
        return sessions

def _enrich_session(sess, cursor):
    """Добавляет subject_name, subject_color, date к сессии"""
    for k, v in list(sess.items()):
        if isinstance(v, datetime):
            sess[k] = v.isoformat()
    if sess.get('subject_id'):
        cursor.execute("SELECT name, color FROM subjects WHERE id = %s", (sess['subject_id'],))
        subj = cursor.fetchone()
        sess['subject_name'] = subj['name'] if subj else 'Общее'
        sess['subject_color'] = subj['color'] if subj else '#7012CE'
    else:
        sess['subject_name'] = 'Общее'
        sess['subject_color'] = '#7012CE'
    dt = sess.get('scheduled_at') or sess.get('completed_at') or sess.get('created_at')
    sess['date'] = dt[:10] if isinstance(dt, str) else (dt.strftime('%d.%m.%Y') if dt else '')
    return sess

@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: int, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """SELECT id, user_id, subject_id, goal, work_interval, short_break, long_break,
               intervals_count, duration_minutes, status, scheduled_at, started_at, completed_at,
               created_at, updated_at FROM study_sessions WHERE id = %s AND user_id = %s""",
            (session_id, current_user["id"])
        )
        sess = cursor.fetchone()
        if not sess:
            raise HTTPException(status_code=404, detail="Session not found")
        return _enrich_session(sess, cursor)

@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(session: SessionCreate, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Verify subject ownership if provided
        if session.subject_id:
            cursor.execute("SELECT id FROM subjects WHERE id = %s AND user_id = %s", (session.subject_id, current_user["id"]))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Subject not found")
        
        duration_minutes = session.work_interval * session.intervals_count
        cursor.execute(
            """INSERT INTO study_sessions 
               (user_id, subject_id, goal, work_interval, short_break, long_break, intervals_count, duration_minutes, scheduled_at) 
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (current_user["id"], session.subject_id, session.goal, session.work_interval, 
             session.short_break, session.long_break, session.intervals_count, duration_minutes, session.scheduled_at)
        )
        session_id = cursor.lastrowid
        cursor.execute(
            """SELECT id, user_id, subject_id, goal, work_interval, short_break, long_break, 
               intervals_count, duration_minutes, status, scheduled_at, started_at, completed_at, 
               created_at, updated_at 
               FROM study_sessions WHERE id = %s""",
            (session_id,)
        )
        sess = cursor.fetchone()
        if sess:
            for k, v in sess.items():
                if isinstance(v, datetime):
                    sess[k] = v.isoformat()
            if sess.get('subject_id'):
                cursor.execute("SELECT name, color FROM subjects WHERE id = %s", (sess['subject_id'],))
                subj = cursor.fetchone()
                sess['subject_name'] = subj['name'] if subj else 'Общее'
                sess['subject_color'] = subj['color'] if subj else '#7012CE'
            else:
                sess['subject_name'] = 'Общее'
                sess['subject_color'] = '#7012CE'
            dt = sess.get('scheduled_at') or sess.get('completed_at') or sess.get('created_at')
            sess['date'] = dt[:10] if isinstance(dt, str) else (dt.strftime('%d.%m.%Y') if dt else '')
        return sess

@router.put("/{session_id}", response_model=SessionResponse)
async def update_session(session_id: int, session_update: SessionUpdate, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Check ownership
        cursor.execute("SELECT id FROM study_sessions WHERE id = %s AND user_id = %s", (session_id, current_user["id"]))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Session not found")
        
        updates = []
        values = []
        if session_update.goal is not None:
            updates.append("goal = %s")
            values.append(session_update.goal)
        if session_update.status is not None:
            updates.append("status = %s")
            values.append(session_update.status)
        if session_update.started_at is not None:
            updates.append("started_at = %s")
            values.append(session_update.started_at)
        if session_update.completed_at is not None:
            updates.append("completed_at = %s")
            values.append(session_update.completed_at)
        if session_update.duration_minutes is not None:
            updates.append("duration_minutes = %s")
            values.append(session_update.duration_minutes)
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        values.append(session_id)
        cursor.execute(
            f"UPDATE study_sessions SET {', '.join(updates)} WHERE id = %s",
            values
        )
        # При завершении сессии — пишем в study_time_logs (уникальный ключ user_id, date)
        if session_update.status == 'completed':
            cursor.execute(
                """SELECT subject_id, duration_minutes FROM study_sessions WHERE id = %s""",
                (session_id,)
            )
            row = cursor.fetchone()
            if row:
                from datetime import date
                today = date.today().isoformat()
                subj_id = row['subject_id']
                mins = row['duration_minutes'] or 0
                cursor.execute(
                    """SELECT id FROM study_time_logs WHERE user_id = %s AND date = %s""",
                    (current_user["id"], today)
                )
                exists = cursor.fetchone()
                if exists:
                    cursor.execute(
                        """UPDATE study_time_logs SET minutes_studied = minutes_studied + %s WHERE user_id = %s AND date = %s""",
                        (mins, current_user["id"], today)
                    )
                else:
                    cursor.execute(
                        """INSERT INTO study_time_logs (user_id, date, subject_id, minutes_studied, tasks_completed)
                           VALUES (%s, %s, %s, %s, 0)""",
                        (current_user["id"], today, subj_id, mins)
                    )
        cursor.execute(
            """SELECT id, user_id, subject_id, goal, work_interval, short_break, long_break, 
               intervals_count, duration_minutes, status, scheduled_at, started_at, completed_at, 
               created_at, updated_at 
               FROM study_sessions WHERE id = %s""",
            (session_id,)
        )
        sess = cursor.fetchone()
        return _enrich_session(sess, cursor)

@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: int, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM study_sessions WHERE id = %s AND user_id = %s", (session_id, current_user["id"]))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Session not found")

