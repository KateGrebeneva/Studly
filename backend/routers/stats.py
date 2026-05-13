from fastapi import APIRouter, Depends
from database.connection import get_db
from auth import get_current_user
from datetime import date, timedelta

router = APIRouter(prefix="/api/stats", tags=["stats"])

@router.get("/dashboard")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Статистика для главной страницы — из study_time_logs + study_sessions"""
    with get_db() as conn:
        cursor = conn.cursor()
        today = date.today().isoformat()

        cursor.execute("""
            SELECT COALESCE(SUM(minutes_studied), 0) as time_studied,
                   COALESCE(SUM(tasks_completed), 0) as tasks_completed
            FROM study_time_logs WHERE user_id = %s AND date = %s
        """, (current_user["id"], today))
        today_row = cursor.fetchone()
        time_today = today_row["time_studied"] or 0
        tasks_today = today_row["tasks_completed"] or 0

        cursor.execute("""
            SELECT COUNT(*) as cnt FROM tasks t
            JOIN subjects s ON t.subject_id = s.id
            WHERE s.user_id = %s AND t.is_completed = 1 AND DATE(t.updated_at) = %s
        """, (current_user["id"], today))
        tasks_from_tasks = cursor.fetchone()["cnt"] or 0
        tasks_today = max(tasks_today, tasks_from_tasks)

        cursor.execute("""
            SELECT COALESCE(SUM(duration_minutes), 0) as sess_mins
            FROM study_sessions 
            WHERE user_id = %s AND status = 'completed' AND DATE(completed_at) = %s
        """, (current_user["id"], today))
        sess_mins = cursor.fetchone()["sess_mins"] or 0
        cursor.execute("""
            SELECT COUNT(*) as cnt FROM study_sessions 
            WHERE user_id = %s AND status = 'completed' AND DATE(completed_at) = %s
        """, (current_user["id"], today))
        sessions_today = cursor.fetchone()["cnt"]

        time_today = max(time_today, sess_mins)

        cursor.execute("""
            SELECT COUNT(DISTINCT date) as streak FROM (
                SELECT date FROM study_time_logs 
                WHERE user_id = %s AND minutes_studied > 0
                ORDER BY date DESC LIMIT 30
            ) t
        """, (current_user["id"],))
        streak = min(30, cursor.fetchone()["streak"] or 0)

        if streak == 0:
            cursor.execute("""
                SELECT COUNT(DISTINCT DATE(completed_at)) as cnt FROM study_sessions
                WHERE user_id = %s AND status = 'completed' AND completed_at IS NOT NULL
                AND completed_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            """, (current_user["id"],))
            streak = min(30, cursor.fetchone()["cnt"] or 0)

        return {
            "timeStudied": int(time_today),
            "tasksCompleted": int(tasks_today),
            "sessionsCompleted": sessions_today,
            "streak": streak
        }

@router.get("/weekly")
async def get_weekly_stats(current_user: dict = Depends(get_current_user)):
    """Еженедельная статистика — из study_time_logs + study_sessions"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT date, SUM(minutes_studied) as time, SUM(tasks_completed) as tasks
            FROM study_time_logs
            WHERE user_id = %s AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY date ORDER BY date
        """, (current_user["id"],))
        log_rows = {r["date"].isoformat(): r for r in cursor.fetchall()}

        cursor.execute("""
            SELECT DATE(completed_at) as d, SUM(duration_minutes) as sess_time
            FROM study_sessions
            WHERE user_id = %s AND status = 'completed' AND completed_at IS NOT NULL
            AND completed_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(completed_at)
        """, (current_user["id"],))
        sess_rows = cursor.fetchall()

        days = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
        merged = {}
        for r in log_rows.values():
            d = r["date"]
            merged[d.isoformat()] = {"date": d, "time": r["time"] or 0, "tasks": r["tasks"] or 0}
        for r in sess_rows:
            ds = r["d"].isoformat()
            st = r["sess_time"] or 0
            if ds not in merged:
                merged[ds] = {"date": r["d"], "time": 0, "tasks": 0}
            merged[ds]["time"] = max(merged[ds]["time"], st)

        result = []
        for ds, v in sorted(merged.items()):
            d = v["date"]
            wd = (d.weekday() + 1) % 7
            result.append({
                "day": days[wd],
                "time": v["time"],
                "tasks": v["tasks"],
                "date": ds
            })
        return result

@router.get("/quote")
async def get_motivational_quote(current_user: dict = Depends(get_current_user)):
    """Цитата на основе лучшего предмета студента"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT s.name, COALESCE(SUM(stl.minutes_studied), 0) + s.time_studied_minutes as total
            FROM subjects s
            LEFT JOIN study_time_logs stl ON stl.subject_id = s.id AND stl.user_id = s.user_id
            WHERE s.user_id = %s
            GROUP BY s.id, s.name, s.time_studied_minutes
            ORDER BY total DESC LIMIT 1
        """, (current_user["id"],))
        row = cursor.fetchone()
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
        else: pool = quotes_general + quotes_math + quotes_physics
    else:
        pool = quotes_general
    return {"quote": random.choice(pool), "bestSubject": best_subject}

@router.get("/subjects")
async def get_subject_stats(current_user: dict = Depends(get_current_user)):
    """Время по предметам"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT s.id, s.name, s.color, COALESCE(SUM(stl.minutes_studied), 0) + s.time_studied_minutes as total_minutes
            FROM subjects s
            LEFT JOIN study_time_logs stl ON stl.subject_id = s.id AND stl.user_id = s.user_id
            WHERE s.user_id = %s
            GROUP BY s.id, s.name, s.color, s.time_studied_minutes
            ORDER BY total_minutes DESC
        """, (current_user["id"],))
        return cursor.fetchall()
