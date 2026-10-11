from fastapi import APIRouter, Depends

from database.connection import get_db
from auth import get_current_user
from services import stats_service

router = APIRouter(prefix="/api/activity-zones", tags=["activity-zones"])

LABELS = [(90, "Пик продуктивности"), (70, "Высокая продуктивность"), (50, "Средняя продуктивность"), (0, "Низкая продуктивность")]


def _label(score: int) -> str:
    return next(text for threshold, text in LABELS if score >= threshold)


@router.get("")
async def get_activity_zones(current_user: dict = Depends(get_current_user)):
    """Зоны продуктивности за 30 дней. Пока сессий нет — берём из таблицы activity_zones."""
    with get_db() as conn:
        cursor = conn.cursor()
        zones = stats_service.productivity_zones(cursor, current_user["id"], days=30)
        if zones:
            return zones
        cursor.execute(
            """SELECT time_slot, MAX(score) AS score FROM activity_zones
               WHERE user_id = %s AND date = CURDATE()
               GROUP BY time_slot ORDER BY MIN(time_start)""",
            (current_user["id"],),
        )
        return [{"time": r["time_slot"], "score": int(r["score"] or 0), "label": _label(int(r["score"] or 0))} for r in cursor.fetchall()]
