from fastapi import APIRouter, Depends, Query
from database.connection import get_db
from auth import get_current_user
from services import stats_service

router = APIRouter(prefix="/api/stats", tags=["stats"])

@router.get("/dashboard")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        return stats_service.dashboard_stats(conn.cursor(), current_user["id"])


@router.get("/weekly")
async def get_weekly_stats(current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        return stats_service.weekly_stats(conn.cursor(), current_user["id"])


@router.get("/daily")
async def get_daily_stats(days: int = Query(120, ge=7, le=400), current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        return stats_service.daily_series(conn.cursor(), current_user["id"], days)

@router.get("/quote")
async def get_motivational_quote(current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        subjects = stats_service.subject_minutes(conn.cursor(), current_user["id"])
    row = {"name": subjects[0]["name"], "total": subjects[0]["total_minutes"]} if subjects else None
    best_subject = row["name"] if row and row.get("total", 0) > 0 else None
    quotes_math = [
        "Математика — царица наук. Каждая решённая задача приближает тебя к победе!",
        "Числа не лгут. Твой прогресс в математике говорит сам за себя.",
    ]
    quotes_physics = [
        "Физика открывает законы мира. Ты — на пути к их пониманию!",
        "Каждый эксперимент — шаг к новому знанию.",
    ]
    quotes_general = [
        "Учёба — это инвестиция в себя. Каждая минута важна!",
        "Небольшие шаги каждый день приводят к большим результатам.",
        "Ты делаешь отлично! Продолжай в том же духе.",
    ]
    import random
    if best_subject:
        s = best_subject.lower()
        if "матем" in s or "math" in s: pool = quotes_math
        elif "физик" in s or "phys" in s: pool = quotes_physics
        else: pool = quotes_general
    else:
        pool = quotes_general
    return {"quote": random.choice(pool), "bestSubject": best_subject}

@router.get("/subjects")
async def get_subject_stats(current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        return stats_service.subject_minutes(conn.cursor(), current_user["id"])
