from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from database.connection import get_db
from auth import get_current_user
from datetime import date, datetime

router = APIRouter(prefix="/api/goals", tags=["goals"])

class GoalCreate(BaseModel):
    title: str
    type: str  # daily, weekly, monthly
    target_value: int
    color: str = "#7012CE"

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    current_value: Optional[int] = None
    is_completed: Optional[bool] = None

@router.get("")
async def get_goals(current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, user_id, title, type, target_value, current_value, color, 
                   is_completed, period_start, period_end, created_at
            FROM goals WHERE user_id = %s 
            ORDER BY type, created_at DESC
        """, (current_user["id"],))
        rows = cursor.fetchall()
        for r in rows:
            if r.get("period_start"):
                r["period_start"] = r["period_start"].isoformat()
            if r.get("period_end"):
                r["period_end"] = r["period_end"].isoformat()
            if r.get("created_at"):
                r["created_at"] = r["created_at"].isoformat()
        return rows

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_goal(goal: GoalCreate, current_user: dict = Depends(get_current_user)):
    today = date.today()
    if goal.type == "daily":
        period_start = period_end = today
    elif goal.type == "weekly":
        wd = today.weekday()
        period_start = today
        from datetime import timedelta
        period_end = today + timedelta(days=6 - wd)
    else:
        period_start = today.replace(day=1)
        import calendar
        _, last = calendar.monthrange(today.year, today.month)
        period_end = today.replace(day=last)

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO goals (user_id, title, type, target_value, current_value, color, period_start, period_end)
            VALUES (%s, %s, %s, %s, 0, %s, %s, %s)
        """, (current_user["id"], goal.title, goal.type, goal.target_value, goal.color, period_start, period_end))
        goal_id = cursor.lastrowid
        cursor.execute("SELECT * FROM goals WHERE id = %s", (goal_id,))
        row = cursor.fetchone()
        for k in ["period_start", "period_end", "created_at", "updated_at"]:
            if row.get(k) and hasattr(row[k], 'isoformat'):
                row[k] = row[k].isoformat()
        return row

@router.put("/{goal_id}")
async def update_goal(goal_id: int, goal_update: GoalUpdate, current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM goals WHERE id = %s AND user_id = %s", (goal_id, current_user["id"]))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Goal not found")

        updates, vals = [], []
        if goal_update.title is not None:
            updates.append("title = %s")
            vals.append(goal_update.title)
        if goal_update.current_value is not None:
            updates.append("current_value = %s")
            vals.append(goal_update.current_value)
        if goal_update.is_completed is not None:
            updates.append("is_completed = %s")
            vals.append(goal_update.is_completed)
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        vals.append(goal_id)
        cursor.execute(f"UPDATE goals SET {', '.join(updates)} WHERE id = %s", vals)
        cursor.execute("SELECT * FROM goals WHERE id = %s", (goal_id,))
        row = cursor.fetchone()
        for k in ["period_start", "period_end", "created_at", "updated_at"]:
            if row.get(k) and hasattr(row[k], 'isoformat'):
                row[k] = row[k].isoformat()
        return row
