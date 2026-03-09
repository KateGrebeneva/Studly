from fastapi import APIRouter, Depends
from typing import List
from database.connection import get_db
from auth import get_current_user
from datetime import date

router = APIRouter(prefix="/api/activity-zones", tags=["activity-zones"])

@router.get("")
async def get_activity_zones(current_user: dict = Depends(get_current_user)):
    """Зоны продуктивности по времени суток"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT time_slot, MAX(score) as score FROM activity_zones
            WHERE user_id = %s AND date = CURDATE()
            GROUP BY time_slot
            ORDER BY MIN(time_start)
        """, (current_user["id"],))
        rows = cursor.fetchall()

        labels = {
            95: "Пик продуктивности",
            78: "Высокая продуктивность",
            72: "Хорошая продуктивность",
            65: "Средняя продуктивность",
            60: "Средняя продуктивность",
            45: "Низкая продуктивность"
        }
        result = []
        for r in rows:
            result.append({
                "time": r["time_slot"],
                "score": r["score"],
                "label": labels.get(r["score"], "Средняя продуктивность")
            })
        return result
