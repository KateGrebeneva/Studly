from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from database.connection import get_db
from models.subject import SubjectCreate, SubjectUpdate, SubjectResponse
from auth import get_current_user
from services import achievements_service

# время предмета = базовое + завершённые сессии (как в статистике)
SUBJECT_SELECT = """
    SELECT s.id, s.user_id, s.name, s.color, s.category,
           COALESCE(s.time_studied_minutes, 0) + COALESCE(
               (SELECT SUM(ss.duration_minutes) FROM study_sessions ss
                WHERE ss.subject_id = s.id AND ss.user_id = s.user_id AND ss.status = 'completed'), 0
           ) AS time_studied_minutes,
           s.created_at, s.updated_at
    FROM subjects s
"""

router = APIRouter(prefix="/api/subjects", tags=["subjects"])

@router.get("", response_model=List[SubjectResponse])
async def get_subjects(current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(SUBJECT_SELECT + " WHERE s.user_id = %s ORDER BY s.created_at DESC", (current_user["id"],))
        subjects = cursor.fetchall()
        for subject in subjects:
            if subject.get("created_at"):
                subject["created_at"] = subject["created_at"].isoformat()
            if subject.get("updated_at"):
                subject["updated_at"] = subject["updated_at"].isoformat()
        return subjects

@router.post("", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
async def create_subject(subject: SubjectCreate, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        if not subject.name.strip():
            raise HTTPException(status_code=400, detail="Название предмета не может быть пустым")
        cursor.execute(
            """INSERT INTO subjects (user_id, name, color, category) 
               VALUES (%s, %s, %s, %s)""",
            (current_user["id"], subject.name.strip(), subject.color, subject.category)
        )
        subject_id = cursor.lastrowid
        achievements_service.refresh(cursor, current_user["id"])
        cursor.execute(SUBJECT_SELECT + " WHERE s.id = %s", (subject_id,))
        return cursor.fetchone()

@router.get("/{subject_id}", response_model=SubjectResponse)
async def get_subject(subject_id: int, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(SUBJECT_SELECT + " WHERE s.id = %s AND s.user_id = %s", (subject_id, current_user["id"]))
        subject = cursor.fetchone()
        if not subject:
            raise HTTPException(status_code=404, detail="Предмет не найден")
        return subject

@router.put("/{subject_id}", response_model=SubjectResponse)
async def update_subject(subject_id: int, subject_update: SubjectUpdate, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM subjects WHERE id = %s AND user_id = %s", (subject_id, current_user["id"]))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Предмет не найден")
        
        updates = []
        values = []
        if subject_update.name is not None:
            updates.append("name = %s")
            values.append(subject_update.name)
        if subject_update.color is not None:
            updates.append("color = %s")
            values.append(subject_update.color)
        if subject_update.category is not None:
            updates.append("category = %s")
            values.append(subject_update.category)
        if subject_update.time_studied_minutes is not None:
            updates.append("time_studied_minutes = %s")
            values.append(subject_update.time_studied_minutes)
        
        if not updates:
            raise HTTPException(status_code=400, detail="Нет полей для обновления")
        
        values.append(subject_id)
        cursor.execute(
            f"UPDATE subjects SET {', '.join(updates)} WHERE id = %s",
            values
        )
        
        cursor.execute(SUBJECT_SELECT + " WHERE s.id = %s", (subject_id,))
        return cursor.fetchone()

@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(subject_id: int, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM subjects WHERE id = %s AND user_id = %s", (subject_id, current_user["id"]))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Предмет не найден")

