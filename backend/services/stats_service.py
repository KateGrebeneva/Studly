"""
Вся статистика считается здесь, чтобы у ученика, родителя и в AI цифры совпадали.

Минуты за день = max(журнал study_time_logs, сумма завершённых сессий),
потому что при завершении сессии пишется и туда, и туда.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Dict, Iterable, List, Optional, Set

DAY_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
DAY_FULL = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"]


def to_local_naive(dt: Optional[datetime]) -> Optional[datetime]:
    """Браузер шлёт время в UTC, а в DATETIME храним локальное."""
    if dt is None:
        return None
    if dt.tzinfo is not None:
        dt = dt.astimezone().replace(tzinfo=None)
    return dt


def iso(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def serialize_row(row: Optional[dict]) -> Optional[dict]:
    if row is None:
        return None
    return {k: iso(v) for k, v in row.items()}


def _as_date(value) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return datetime.fromisoformat(str(value)[:19]).date()
    except ValueError:
        return None


def daily_minutes(cursor, user_id: int, start: date, end: date) -> Dict[date, int]:
    result: Dict[date, int] = {}
    cursor.execute(
        """SELECT date AS d, COALESCE(SUM(minutes_studied), 0) AS m
           FROM study_time_logs
           WHERE user_id = %s AND date BETWEEN %s AND %s
           GROUP BY date""",
        (user_id, start, end),
    )
    for r in cursor.fetchall():
        d = _as_date(r["d"])
        if d:
            result[d] = int(r["m"] or 0)

    cursor.execute(
        """SELECT DATE(completed_at) AS d, COALESCE(SUM(duration_minutes), 0) AS m
           FROM study_sessions
           WHERE user_id = %s AND status = 'completed' AND completed_at IS NOT NULL
             AND DATE(completed_at) BETWEEN %s AND %s
           GROUP BY DATE(completed_at)""",
        (user_id, start, end),
    )
    for r in cursor.fetchall():
        d = _as_date(r["d"])
        if d:
            result[d] = max(result.get(d, 0), int(r["m"] or 0))
    return result


def daily_tasks(cursor, user_id: int, start: date, end: date) -> Dict[date, int]:
    """Задачи считаем по дате последнего изменения."""
    result: Dict[date, int] = {}
    cursor.execute(
        """SELECT DATE(t.updated_at) AS d, COUNT(*) AS c
           FROM tasks t JOIN subjects s ON s.id = t.subject_id
           WHERE s.user_id = %s AND t.is_completed = 1
             AND DATE(t.updated_at) BETWEEN %s AND %s
           GROUP BY DATE(t.updated_at)""",
        (user_id, start, end),
    )
    for r in cursor.fetchall():
        d = _as_date(r["d"])
        if d:
            result[d] = int(r["c"] or 0)
    cursor.execute(
        """SELECT date AS d, COALESCE(SUM(tasks_completed), 0) AS c
           FROM study_time_logs WHERE user_id = %s AND date BETWEEN %s AND %s
           GROUP BY date""",
        (user_id, start, end),
    )
    for r in cursor.fetchall():
        d = _as_date(r["d"])
        if d:
            result[d] = max(result.get(d, 0), int(r["c"] or 0))
    return result


def active_dates(cursor, user_id: int, days_back: int = 400) -> Set[date]:
    today = date.today()
    mins = daily_minutes(cursor, user_id, today - timedelta(days=days_back), today)
    return {d for d, m in mins.items() if m > 0}


def current_streak(dates: Iterable[date], today: Optional[date] = None) -> int:
    """Серия дней подряд. Если сегодня ещё не занимался, считаем от вчера."""
    today = today or date.today()
    ds = set(dates)
    day = today if today in ds else today - timedelta(days=1)
    streak = 0
    while day in ds:
        streak += 1
        day -= timedelta(days=1)
    return streak


def longest_streak(dates: Iterable[date]) -> int:
    ds = sorted(set(dates))
    best = run = 0
    prev = None
    for d in ds:
        run = run + 1 if prev is not None and d - prev == timedelta(days=1) else 1
        best = max(best, run)
        prev = d
    return best


def dashboard_stats(cursor, user_id: int) -> dict:
    today = date.today()
    minutes = daily_minutes(cursor, user_id, today, today).get(today, 0)
    tasks = daily_tasks(cursor, user_id, today, today).get(today, 0)
    cursor.execute(
        """SELECT COUNT(*) AS cnt FROM study_sessions
           WHERE user_id = %s AND status = 'completed' AND DATE(completed_at) = %s""",
        (user_id, today),
    )
    sessions_today = int(cursor.fetchone()["cnt"] or 0)
    return {
        "timeStudied": int(minutes),
        "tasksCompleted": int(tasks),
        "sessionsCompleted": sessions_today,
        "streak": current_streak(active_dates(cursor, user_id)),
    }


def weekly_stats(cursor, user_id: int, days: int = 7) -> List[dict]:
    today = date.today()
    start = today - timedelta(days=days - 1)
    mins = daily_minutes(cursor, user_id, start, today)
    tasks = daily_tasks(cursor, user_id, start, today)
    out = []
    for i in range(days):
        d = start + timedelta(days=i)
        out.append({
            "date": d.isoformat(),
            "day": DAY_SHORT[d.weekday()],
            "time": int(mins.get(d, 0)),
            "tasks": int(tasks.get(d, 0)),
        })
    return out


def daily_series(cursor, user_id: int, days: int = 120) -> List[dict]:
    today = date.today()
    start = today - timedelta(days=days - 1)
    mins = daily_minutes(cursor, user_id, start, today)
    return [{"date": d.isoformat(), "time": m} for d, m in sorted(mins.items()) if m > 0]


def subject_minutes(cursor, user_id: int) -> List[dict]:
    cursor.execute(
        """SELECT s.id, s.name, s.color,
                  COALESCE(s.time_studied_minutes, 0) + COALESCE(SUM(ss.duration_minutes), 0) AS total_minutes,
                  MAX(ss.completed_at) AS last_studied_at
           FROM subjects s
           LEFT JOIN study_sessions ss
                  ON ss.subject_id = s.id AND ss.user_id = s.user_id AND ss.status = 'completed'
           WHERE s.user_id = %s
           GROUP BY s.id, s.name, s.color, s.time_studied_minutes
           ORDER BY total_minutes DESC, s.name""",
        (user_id,),
    )
    rows = cursor.fetchall()
    return [
        {
            "id": r["id"],
            "name": r["name"],
            "color": r["color"],
            "total_minutes": int(r["total_minutes"] or 0),
            "last_studied_at": iso(r["last_studied_at"]),
        }
        for r in rows
    ]


def total_minutes(cursor, user_id: int) -> int:
    today = date.today()
    by_day = daily_minutes(cursor, user_id, date(2000, 1, 1), today)
    cursor.execute("SELECT COALESCE(SUM(time_studied_minutes), 0) AS m FROM subjects WHERE user_id = %s", (user_id,))
    baseline = int(cursor.fetchone()["m"] or 0)
    return sum(by_day.values()) + baseline


ZONE_SLOTS = [(6, 9), (9, 11), (11, 13), (13, 15), (15, 17), (17, 19), (19, 21), (21, 24)]


def _zone_label(score: int) -> str:
    if score >= 90:
        return "Пик продуктивности"
    if score >= 70:
        return "Высокая продуктивность"
    if score >= 50:
        return "Средняя продуктивность"
    return "Низкая продуктивность"


def productivity_zones(cursor, user_id: int, days: int = 30) -> List[dict]:
    """Сколько минут фокуса приходится на каждый слот времени."""
    since = datetime.now() - timedelta(days=days)
    cursor.execute(
        """SELECT completed_at, started_at, duration_minutes FROM study_sessions
           WHERE user_id = %s AND status = 'completed' AND completed_at IS NOT NULL AND completed_at >= %s""",
        (user_id, since),
    )
    totals = {slot: 0 for slot in ZONE_SLOTS}
    for r in cursor.fetchall():
        end = r["completed_at"]
        if not isinstance(end, datetime):
            continue
        dur = int(r["duration_minutes"] or 0)
        start = r["started_at"] if isinstance(r.get("started_at"), datetime) else end - timedelta(minutes=dur)
        hour = start.hour
        for a, b in ZONE_SLOTS:
            if a <= hour < b:
                totals[(a, b)] += dur
                break
    peak = max(totals.values()) if totals else 0
    if peak <= 0:
        return []
    zones = []
    for (a, b), m in totals.items():
        if m <= 0:
            continue
        score = max(10, round(100 * m / peak))
        zones.append({
            "time": f"{a:02d}:00-{b % 24:02d}:00" if b < 24 else f"{a:02d}:00-00:00",
            "score": score,
            "label": _zone_label(score),
            "minutes": m,
        })
    return zones


def productivity_profile(cursor, user_id: int) -> dict:
    """Данные для AI-планировщика."""
    zones = productivity_zones(cursor, user_id, days=60)
    best_zone = max(zones, key=lambda z: z["minutes"]) if zones else None

    today = date.today()
    mins = daily_minutes(cursor, user_id, today - timedelta(days=59), today)
    by_weekday = [0] * 7
    for d, m in mins.items():
        by_weekday[d.weekday()] += m
    best_day = DAY_FULL[by_weekday.index(max(by_weekday))] if any(by_weekday) else None

    cursor.execute(
        """SELECT AVG(duration_minutes) AS avg_dur, COUNT(*) AS cnt FROM study_sessions
           WHERE user_id = %s AND status = 'completed'""",
        (user_id,),
    )
    row = cursor.fetchone()
    completed_total = int(row["cnt"] or 0)
    avg_dur = int(round(row["avg_dur"])) if row["avg_dur"] else None

    # фокус = сколько из прошедших за 30 дней сессий довели до конца
    since = datetime.now() - timedelta(days=30)
    cursor.execute(
        """SELECT
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS done,
              SUM(CASE WHEN status IN ('planned', 'in_progress') AND scheduled_at IS NOT NULL
                        AND scheduled_at < NOW() THEN 1 ELSE 0 END) AS missed
           FROM study_sessions
           WHERE user_id = %s AND COALESCE(completed_at, scheduled_at, created_at) >= %s""",
        (user_id, since),
    )
    r = cursor.fetchone()
    done, missed = int(r["done"] or 0), int(r["missed"] or 0)
    focus = round(100 * done / (done + missed)) if (done + missed) else None

    subjects = subject_minutes(cursor, user_id)
    cursor.execute(
        """SELECT s.name, COUNT(*) AS open_tasks,
                  SUM(CASE WHEN t.priority = 'high' THEN 1 ELSE 0 END) AS high_tasks
           FROM tasks t JOIN subjects s ON s.id = t.subject_id
           WHERE s.user_id = %s AND t.is_completed = 0
           GROUP BY s.name""",
        (user_id,),
    )
    open_tasks = {r["name"]: {"open": int(r["open_tasks"] or 0), "high": int(r["high_tasks"] or 0)} for r in cursor.fetchall()}

    week_total = sum(m for d, m in mins.items() if d > today - timedelta(days=7))
    return {
        "best_time": best_zone["time"] if best_zone else None,
        "best_start_hour": int(best_zone["time"][:2]) if best_zone else None,
        "best_day": best_day,
        "avg_session": avg_dur,
        "focus_score": focus,
        "completed_sessions": completed_total,
        "week_minutes": week_total,
        "streak": current_streak({d for d, m in mins.items() if m > 0}),
        "subjects": subjects,
        "open_tasks": open_tasks,
    }
