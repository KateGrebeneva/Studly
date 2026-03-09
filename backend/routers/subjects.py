from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from database.connection import get_db
from models.subject import SubjectCreate, SubjectUpdate, SubjectResponse
from auth import get_current_user
import pymysql

router = APIRouter(prefix="/api/subjects", tags=["subjects"])

@router.get("", response_model=List[SubjectResponse])
async def get_subjects(current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, user_id, name, color, category, time_studied_minutes, created_at, updated_at FROM subjects WHERE user_id = %s ORDER BY created_at DESC",
            (current_user["id"],)
        )
        subjects = cursor.fetchall()
        # Convert datetime objects to strings
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
        cursor.execute(
            """INSERT INTO subjects (user_id, name, color, category) 
               VALUES (%s, %s, %s, %s)""",
            (current_user["id"], subject.name, subject.color, subject.category)
        )
        subject_id = cursor.lastrowid
        cursor.execute(
            "SELECT id, user_id, name, color, category, time_studied_minutes, created_at, updated_at FROM subjects WHERE id = %s",
            (subject_id,)
        )
        return cursor.fetchone()

@router.get("/{subject_id}", response_model=SubjectResponse)
async def get_subject(subject_id: int, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, user_id, name, color, category, time_studied_minutes, created_at, updated_at FROM subjects WHERE id = %s AND user_id = %s",
            (subject_id, current_user["id"])
        )
        subject = cursor.fetchone()
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")
        return subject

@router.put("/{subject_id}", response_model=SubjectResponse)
async def update_subject(subject_id: int, subject_update: SubjectUpdate, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Check ownership
        cursor.execute("SELECT id FROM subjects WHERE id = %s AND user_id = %s", (subject_id, current_user["id"]))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Subject not found")
        
        # Build update query
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
            raise HTTPException(status_code=400, detail="No fields to update")
        
        values.append(subject_id)
        cursor.execute(
            f"UPDATE subjects SET {', '.join(updates)} WHERE id = %s",
            values
        )
        
        cursor.execute(
            "SELECT id, user_id, name, color, category, time_studied_minutes, created_at, updated_at FROM subjects WHERE id = %s",
            (subject_id,)
        )
        return cursor.fetchone()

@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(subject_id: int, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM subjects WHERE id = %s AND user_id = %s", (subject_id, current_user["id"]))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Subject not found")

