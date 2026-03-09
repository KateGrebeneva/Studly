from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from database.connection import get_db
from models.task import TaskCreate, TaskUpdate, TaskResponse
from auth import get_current_user
import pymysql

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

@router.get("/subject/{subject_id}", response_model=List[TaskResponse])
async def get_tasks_by_subject(subject_id: int, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        # Verify subject ownership
        cursor.execute("SELECT id FROM subjects WHERE id = %s AND user_id = %s", (subject_id, current_user["id"]))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Subject not found")
        
        cursor.execute(
            """SELECT id, subject_id, title, description, priority, is_completed, due_date, created_at, updated_at 
               FROM tasks WHERE subject_id = %s ORDER BY created_at DESC""",
            (subject_id,)
        )
        tasks = cursor.fetchall()
        # Convert datetime objects to strings
        for task in tasks:
            if task.get("created_at"):
                task["created_at"] = task["created_at"].isoformat()
            if task.get("updated_at"):
                task["updated_at"] = task["updated_at"].isoformat()
            if task.get("due_date"):
                task["due_date"] = task["due_date"].isoformat()
        return tasks

@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(task: TaskCreate, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        # Verify subject ownership
        cursor.execute("SELECT id FROM subjects WHERE id = %s AND user_id = %s", (task.subject_id, current_user["id"]))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Subject not found")
        
        cursor.execute(
            """INSERT INTO tasks (subject_id, title, description, priority, due_date) 
               VALUES (%s, %s, %s, %s, %s)""",
            (task.subject_id, task.title, task.description, task.priority, task.due_date)
        )
        task_id = cursor.lastrowid
        cursor.execute(
            "SELECT id, subject_id, title, description, priority, is_completed, due_date, created_at, updated_at FROM tasks WHERE id = %s",
            (task_id,)
        )
        return cursor.fetchone()

@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: int, task_update: TaskUpdate, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Check ownership via subject
        cursor.execute(
            """SELECT t.id FROM tasks t 
               JOIN subjects s ON t.subject_id = s.id 
               WHERE t.id = %s AND s.user_id = %s""",
            (task_id, current_user["id"])
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Build update query
        updates = []
        values = []
        if task_update.title is not None:
            updates.append("title = %s")
            values.append(task_update.title)
        if task_update.description is not None:
            updates.append("description = %s")
            values.append(task_update.description)
        if task_update.priority is not None:
            updates.append("priority = %s")
            values.append(task_update.priority)
        if task_update.is_completed is not None:
            updates.append("is_completed = %s")
            values.append(task_update.is_completed)
        if task_update.due_date is not None:
            updates.append("due_date = %s")
            values.append(task_update.due_date)
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        values.append(task_id)
        cursor.execute(
            f"UPDATE tasks SET {', '.join(updates)} WHERE id = %s",
            values
        )
        
        cursor.execute(
            "SELECT id, subject_id, title, description, priority, is_completed, due_date, created_at, updated_at FROM tasks WHERE id = %s",
            (task_id,)
        )
        return cursor.fetchone()

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: int, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """DELETE t FROM tasks t 
               JOIN subjects s ON t.subject_id = s.id 
               WHERE t.id = %s AND s.user_id = %s""",
            (task_id, current_user["id"])
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Task not found")

