"""Прогресс достижений считаем по данным пользователя."""
from __future__ import annotations

from datetime import date, datetime
from typing import Callable, Dict

from services import stats_service


def _metrics(cursor, user_id: int) -> Dict[str, int]:
    cursor.execute(
        "SELECT COUNT(*) AS c FROM study_sessions WHERE user_id = %s AND status = 'completed'",
        (user_id,),
    )
    sessions = int(cursor.fetchone()["c"] or 0)
    cursor.execute(
        """SELECT COUNT(*) AS c FROM tasks t JOIN subjects s ON s.id = t.subject_id
           WHERE s.user_id = %s AND t.is_completed = 1""",
        (user_id,),
    )
    tasks = int(cursor.fetchone()["c"] or 0)
    cursor.execute("SELECT COUNT(*) AS c FROM subjects WHERE user_id = %s", (user_id,))
    subjects = int(cursor.fetchone()["c"] or 0)
    dates = stats_service.active_dates(cursor, user_id)
    return {
        "sessions": sessions,
        "tasks": tasks,
        "subjects": subjects,
        "minutes": stats_service.total_minutes(cursor, user_id),
        "longest_streak": stats_service.longest_streak(dates),
    }


def _pct(value: int, target: int) -> int:
    return max(0, min(100, int(value * 100 / target))) if target else 0


# код достижения -> прогресс 0..100
RULES: Dict[str, Callable[[Dict[str, int]], int]] = {
    "first_session": lambda m: _pct(m["sessions"], 1),
    "week_streak_7": lambda m: _pct(m["longest_streak"], 7),
    "master_time_100": lambda m: _pct(m["minutes"], 100 * 60),
    "task_master_50": lambda m: _pct(m["tasks"], 50),
    "erudite_10": lambda m: _pct(m["subjects"], 10),
    "legend_30": lambda m: _pct(m["longest_streak"], 30),
}


def refresh(cursor, user_id: int) -> None:
    cursor.execute("SELECT id, code FROM achievements")
    achievements = cursor.fetchall()
    if not achievements:
        return
    metrics = _metrics(cursor, user_id)
    cursor.execute(
        "SELECT achievement_id, progress, unlocked_at FROM user_achievements WHERE user_id = %s",
        (user_id,),
    )
    existing = {r["achievement_id"]: r for r in cursor.fetchall()}
    now = datetime.now()
    for a in achievements:
        rule = RULES.get(a["code"])
        if rule is None:
            continue  # остальные коды не трогаем
        progress = rule(metrics)
        prev = existing.get(a["id"])
        unlocked_at = prev["unlocked_at"] if prev and prev.get("unlocked_at") else None
        if progress >= 100 and unlocked_at is None:
            unlocked_at = now
        if prev is None:
            cursor.execute(
                "INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at) VALUES (%s, %s, %s, %s)",
                (user_id, a["id"], progress, unlocked_at),
            )
        elif int(prev.get("progress") or 0) != progress or prev.get("unlocked_at") != unlocked_at:
            # полученное достижение не забираем
            cursor.execute(
                "UPDATE user_achievements SET progress = %s, unlocked_at = %s WHERE user_id = %s AND achievement_id = %s",
                (max(progress, 100) if unlocked_at else progress, unlocked_at, user_id, a["id"]),
            )


def list_for_user(cursor, user_id: int):
    refresh(cursor, user_id)
    cursor.execute(
        """SELECT a.id, a.code, a.title, a.description, a.icon_name, a.color,
                  COALESCE(ua.progress, 0) AS progress, ua.unlocked_at
           FROM achievements a
           LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = %s
           ORDER BY a.id""",
        (user_id,),
    )
    out = []
    for r in cursor.fetchall():
        unlocked = r["unlocked_at"] is not None
        out.append({
            "id": r["id"],
            "code": r["code"],
            "title": r["title"],
            "description": r["description"],
            "icon_name": r["icon_name"],
            "color": r["color"],
            "progress": 100 if unlocked else int(r["progress"] or 0),
            "unlocked": unlocked,
            "unlocked_at": r["unlocked_at"].isoformat() if isinstance(r["unlocked_at"], (datetime, date)) else r["unlocked_at"],
        })
    return out
