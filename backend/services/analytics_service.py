"""
Статистика ученика для кабинета родителя/учителя.
Минуты считаются так же, как у самого ученика (stats_service).
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Dict, List, Optional

from services import stats_service as st
from services import achievements_service

HEATMAP_DAYS = 84  # 12 недель
DAY_ACCUSATIVE = {
    "Понедельник": "по понедельникам", "Вторник": "по вторникам", "Среда": "по средам",
    "Четверг": "по четвергам", "Пятница": "по пятницам", "Суббота": "по субботам",
    "Воскресенье": "по воскресеньям",
}


def _days_word(n: int) -> str:
    n = abs(n) % 100
    if 11 <= n <= 14:
        return "дней"
    return {1: "день", 2: "дня", 3: "дня", 4: "дня"}.get(n % 10, "дней")


def _pct_change(cur: int, prev: int) -> Optional[int]:
    if prev <= 0:
        return None if cur <= 0 else 100
    return round(100 * (cur - prev) / prev)


def _session_rows(cursor, user_id: int, since: datetime, subject_id: Optional[int] = None) -> List[dict]:
    sql = """SELECT id, subject_id, status, duration_minutes, scheduled_at, started_at, completed_at, created_at
             FROM study_sessions
             WHERE user_id = %s AND COALESCE(completed_at, scheduled_at, created_at) >= %s"""
    params: list = [user_id, since]
    if subject_id is not None:
        sql += " AND subject_id = %s"
        params.append(subject_id)
    cursor.execute(sql, tuple(params))
    return list(cursor.fetchall())


def _is_missed(row: dict, now: datetime) -> bool:
    sched = row.get("scheduled_at")
    return (
        row.get("status") in ("planned", "in_progress")
        and isinstance(sched, datetime)
        and sched < now - timedelta(hours=1)
    )


def _hour_slots(rows: List[dict]) -> List[dict]:
    totals = {slot: 0 for slot in st.ZONE_SLOTS}
    for r in rows:
        end = r.get("completed_at")
        if r.get("status") != "completed" or not isinstance(end, datetime):
            continue
        dur = int(r.get("duration_minutes") or 0)
        start = r["started_at"] if isinstance(r.get("started_at"), datetime) else end - timedelta(minutes=dur)
        for a, b in st.ZONE_SLOTS:
            if a <= start.hour < b:
                totals[(a, b)] += dur
                break
    return [
        {"time": f"{a:02d}–{b % 24:02d}", "from": a, "to": b, "minutes": m}
        for (a, b), m in totals.items()
    ]


def _weekday_minutes(by_day: Dict[date, int]) -> List[dict]:
    totals = [0] * 7
    counts = [0] * 7
    for d, m in by_day.items():
        totals[d.weekday()] += m
        if m > 0:
            counts[d.weekday()] += 1
    return [
        {"day": st.DAY_SHORT[i], "full": st.DAY_FULL[i], "minutes": totals[i], "active_days": counts[i]}
        for i in range(7)
    ]


def _subject_session_minutes(cursor, user_id: int, start: date, end: date) -> Dict[Optional[int], int]:
    cursor.execute(
        """SELECT subject_id, COALESCE(SUM(duration_minutes), 0) AS m
           FROM study_sessions
           WHERE user_id = %s AND status = 'completed' AND completed_at IS NOT NULL
             AND DATE(completed_at) BETWEEN %s AND %s
           GROUP BY subject_id""",
        (user_id, start, end),
    )
    return {r["subject_id"]: int(r["m"] or 0) for r in cursor.fetchall()}


def _task_rows(cursor, user_id: int, subject_id: Optional[int] = None) -> List[dict]:
    sql = """SELECT t.id, t.subject_id, t.title, t.priority, t.is_completed, t.due_date, t.created_at, t.updated_at
             FROM tasks t JOIN subjects s ON s.id = t.subject_id
             WHERE s.user_id = %s"""
    params: list = [user_id]
    if subject_id is not None:
        sql += " AND t.subject_id = %s"
        params.append(subject_id)
    cursor.execute(sql + " ORDER BY t.is_completed, t.due_date IS NULL, t.due_date, t.id DESC", tuple(params))
    return list(cursor.fetchall())


def _task_counts(tasks: List[dict], since: date, now: datetime) -> dict:
    done = [t for t in tasks if t.get("is_completed")]
    open_ = [t for t in tasks if not t.get("is_completed")]
    overdue = [t for t in open_ if isinstance(t.get("due_date"), datetime) and t["due_date"] < now]
    done_period = [
        t for t in done
        if isinstance(t.get("updated_at"), datetime) and t["updated_at"].date() >= since
    ]
    return {
        "total": len(tasks),
        "done": len(done),
        "open": len(open_),
        "overdue": len(overdue),
        "high_open": sum(1 for t in open_ if t.get("priority") == "high"),
        "done_period": len(done_period),
        "completion": round(100 * len(done) / len(tasks)) if tasks else None,
    }


def _task_public(t: dict, now: datetime) -> dict:
    due = t.get("due_date")
    return {
        "id": t["id"],
        "subject_id": t.get("subject_id"),
        "title": t["title"],
        "priority": t.get("priority") or "medium",
        "is_completed": bool(t.get("is_completed")),
        "due_date": st.iso(due),
        "is_overdue": bool(not t.get("is_completed") and isinstance(due, datetime) and due < now),
        "updated_at": st.iso(t.get("updated_at")),
    }


def _sessions_summary(rows: List[dict], now: datetime) -> dict:
    completed = [r for r in rows if r.get("status") == "completed"]
    missed = [r for r in rows if _is_missed(r, now)]
    upcoming = [
        r for r in rows
        if r.get("status") == "planned" and isinstance(r.get("scheduled_at"), datetime) and r["scheduled_at"] >= now - timedelta(hours=1)
    ]
    durations = [int(r.get("duration_minutes") or 0) for r in completed]
    finished_or_missed = len(completed) + len(missed)
    return {
        "completed": len(completed),
        "missed": len(missed),
        "upcoming": len(upcoming),
        "cancelled": sum(1 for r in rows if r.get("status") == "cancelled"),
        "avg_minutes": round(sum(durations) / len(durations)) if durations else None,
        "completion_rate": round(100 * len(completed) / finished_or_missed) if finished_or_missed else None,
    }


def _days_since(value) -> Optional[int]:
    if not value:
        return None
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value[:19])
        except ValueError:
            return None
    d = value.date() if isinstance(value, datetime) else value
    return (date.today() - d).days



def child_overview(cursor, child: dict, days: int = 30) -> dict:
    user_id = child["id"]
    days = max(7, min(int(days or 30), 120))
    today = date.today()
    now = datetime.now()
    start = today - timedelta(days=days - 1)
    prev_start = start - timedelta(days=days)
    prev_end = start - timedelta(days=1)

    mins = st.daily_minutes(cursor, user_id, prev_start, today)
    tasks_by_day = st.daily_tasks(cursor, user_id, start, today)
    cur_mins = {d: m for d, m in mins.items() if d >= start}
    prev_total = sum(m for d, m in mins.items() if prev_start <= d <= prev_end)
    cur_total = sum(cur_mins.values())

    rows = _session_rows(cursor, user_id, datetime.combine(start, datetime.min.time()))
    sessions_by_day: Dict[date, int] = {}
    for r in rows:
        if r.get("status") == "completed" and isinstance(r.get("completed_at"), datetime):
            d = r["completed_at"].date()
            sessions_by_day[d] = sessions_by_day.get(d, 0) + 1

    daily = []
    for i in range(days):
        d = start + timedelta(days=i)
        daily.append({
            "date": d.isoformat(),
            "day": st.DAY_SHORT[d.weekday()],
            "time": int(cur_mins.get(d, 0)),
            "tasks": int(tasks_by_day.get(d, 0)),
            "sessions": int(sessions_by_day.get(d, 0)),
        })

    heat_start = today - timedelta(days=HEATMAP_DAYS - 1)
    heat_mins = st.daily_minutes(cursor, user_id, heat_start, today)
    heatmap = [
        {"date": (heat_start + timedelta(days=i)).isoformat(),
         "time": int(heat_mins.get(heat_start + timedelta(days=i), 0))}
        for i in range(HEATMAP_DAYS)
    ]

    all_active = st.active_dates(cursor, user_id)
    active_days = sum(1 for m in cur_mins.values() if m > 0)
    weekdays = _weekday_minutes(cur_mins)
    best_wd = max(weekdays, key=lambda w: w["minutes"]) if any(w["minutes"] for w in weekdays) else None
    hours = _hour_slots(rows)
    best_hour = max(hours, key=lambda h: h["minutes"]) if any(h["minutes"] for h in hours) else None
    sess = _sessions_summary(rows, now)

    # предметы
    all_subjects = st.subject_minutes(cursor, user_id)
    per_cur = _subject_session_minutes(cursor, user_id, start, today)
    per_prev = _subject_session_minutes(cursor, user_id, prev_start, prev_end)
    tasks = _task_rows(cursor, user_id)
    spark: Dict[Optional[int], Dict[date, int]] = {}
    for r in rows:
        if r.get("status") == "completed" and isinstance(r.get("completed_at"), datetime):
            d = r["completed_at"].date()
            bucket = spark.setdefault(r.get("subject_id"), {})
            bucket[d] = bucket.get(d, 0) + int(r.get("duration_minutes") or 0)
    subjects = []
    for s in all_subjects:
        s_tasks = [t for t in tasks if t["subject_id"] == s["id"]]
        s_rows = [r for r in rows if r.get("subject_id") == s["id"]]
        period = per_cur.get(s["id"], 0)
        subjects.append({
            **s,
            "period_minutes": period,
            "prev_minutes": per_prev.get(s["id"], 0),
            "change": _pct_change(period, per_prev.get(s["id"], 0)),
            "share": round(100 * period / max(1, sum(per_cur.values()))) if period else 0,
            "days_since": _days_since(s.get("last_studied_at")),
            "tasks": _task_counts(s_tasks, start, now),
            "sessions": _sessions_summary(s_rows, now),
            "spark": [spark.get(s["id"], {}).get(start + timedelta(days=i), 0) for i in range(days)],
        })
    general = per_cur.get(None, 0)

    tc = _task_counts(tasks, start, now)

    # цели, достижения, ближайшие сессии
    cursor.execute(
        """SELECT id, title, type, target_value, current_value, color, is_completed, period_start, period_end
           FROM goals WHERE user_id = %s ORDER BY is_completed, period_end""",
        (user_id,),
    )
    goals = []
    for g in cursor.fetchall():
        end_d = g["period_end"] if isinstance(g["period_end"], date) else None
        if isinstance(end_d, datetime):
            end_d = end_d.date()
        expired = bool(not g["is_completed"] and end_d and end_d < today)
        if expired and end_d and (today - end_d).days > days:
            continue
        goals.append({
            "id": g["id"], "title": g["title"], "type": g["type"],
            "target": int(g["target_value"] or 0), "current": int(g["current_value"] or 0),
            "color": g["color"], "is_completed": bool(g["is_completed"]), "is_expired": expired,
            "period_end": st.iso(g["period_end"]),
        })

    achievements = achievements_service.list_for_user(cursor, user_id)

    cursor.execute(
        """SELECT ss.id, ss.goal, ss.duration_minutes, ss.scheduled_at, s.name AS subject_name, s.color AS subject_color
           FROM study_sessions ss LEFT JOIN subjects s ON s.id = ss.subject_id
           WHERE ss.user_id = %s AND ss.status = 'planned' AND ss.scheduled_at IS NOT NULL AND ss.scheduled_at >= %s
           ORDER BY ss.scheduled_at LIMIT 5""",
        (user_id, now - timedelta(hours=1)),
    )
    upcoming = [
        {**st.serialize_row(r), "subject_name": r["subject_name"] or "Общее", "subject_color": r["subject_color"] or "#7012CE"}
        for r in cursor.fetchall()
    ]

    overview = {
        "child": {"id": child["id"], "name": child["name"], "email": child.get("email")},
        "period_days": days,
        "today": st.dashboard_stats(cursor, user_id),
        "totals": {
            "minutes": cur_total,
            "prev_minutes": prev_total,
            "change": _pct_change(cur_total, prev_total),
            "all_time_minutes": st.total_minutes(cursor, user_id),
            "active_days": active_days,
            "avg_active_day": round(cur_total / active_days) if active_days else 0,
            "streak": st.current_streak(all_active),
            "longest_streak": st.longest_streak(all_active),
            "general_minutes": general,
        },
        "sessions": sess,
        "tasks": tc,
        "daily": daily,
        "heatmap": heatmap,
        "weekdays": weekdays,
        "hours": hours,
        "best_day": best_wd["full"] if best_wd else None,
        "best_time": best_hour["time"] if best_hour else None,
        "subjects": subjects,
        "goals": goals,
        "achievements": {
            "unlocked": sum(1 for a in achievements if a["unlocked"]),
            "total": len(achievements),
            "items": achievements,
        },
        "upcoming": upcoming,
    }
    overview["insights"] = _insights(overview)
    return overview


def _insights(o: dict) -> List[dict]:
    """Короткие подсказки для родителя."""
    out: List[dict] = []
    t = o["totals"]
    name = o["child"]["name"].split()[0] if o["child"].get("name") else "Ребёнок"
    if t["minutes"] == 0:
        out.append({"tone": "warn", "icon": "moon", "text": f"За {o['period_days']} дней занятий не было. Можно вместе запланировать первую короткую сессию."})
        return out
    if t["change"] is not None and t["prev_minutes"] > 0:
        if t["change"] >= 10:
            out.append({"tone": "good", "icon": "trend-up", "text": f"{name} занимается на {t['change']}% больше, чем в прошлый период."})
        elif t["change"] <= -10:
            out.append({"tone": "warn", "icon": "trend-down", "text": f"Времени учёбы на {abs(t['change'])}% меньше, чем в прошлый период."})
    if t["streak"] >= 3:
        out.append({"tone": "good", "icon": "flame", "text": f"Серия {t['streak']} {_days_word(t['streak'])} подряд — стоит похвалить."})
    stale = [s for s in o["subjects"] if s["days_since"] is not None and s["days_since"] >= 7]
    never = [s for s in o["subjects"] if s["last_studied_at"] is None and s["tasks"]["open"] > 0]
    for s in sorted(stale, key=lambda s: -s["days_since"])[:2]:
        out.append({"tone": "warn", "icon": "clock", "text": f"По предмету «{s['name']}» не было занятий {s['days_since']} {_days_word(s['days_since'])}.", "subject_id": s["id"]})
    for s in never[:1]:
        out.append({"tone": "info", "icon": "book", "text": f"По предмету «{s['name']}» есть задачи, но ещё не было ни одной сессии.", "subject_id": s["id"]})
    if o["tasks"]["overdue"]:
        out.append({"tone": "warn", "icon": "alert", "text": f"Просрочено задач: {o['tasks']['overdue']}."})
    rate = o["sessions"]["completion_rate"]
    if rate is not None and o["sessions"]["missed"] >= 2 and rate < 70:
        out.append({"tone": "warn", "icon": "target", "text": f"Доведено до конца {rate}% запланированных сессий — возможно, план слишком плотный."})
    if o["best_time"] and o["best_day"]:
        when = DAY_ACCUSATIVE.get(o["best_day"], o["best_day"].lower())
        out.append({"tone": "info", "icon": "sun", "text": f"Чаще всего занимается {when}, лучшее время — {o['best_time']} ч."})
    top = max(o["subjects"], key=lambda s: s["period_minutes"], default=None)
    if top and top["period_minutes"] and top["share"] >= 50 and len(o["subjects"]) > 1:
        out.append({"tone": "info", "icon": "pie", "text": f"«{top['name']}» забирает {top['share']}% учебного времени — проверьте, хватает ли его на остальные предметы."})
    return out[:6]



def subject_detail(cursor, child_id: int, subject_id: int, days: int = 30) -> Optional[dict]:
    cursor.execute("SELECT id, name, color, category, time_studied_minutes FROM subjects WHERE id = %s AND user_id = %s",
                   (subject_id, child_id))
    subj = cursor.fetchone()
    if not subj:
        return None
    days = max(7, min(int(days or 30), 120))
    today = date.today()
    now = datetime.now()
    start = today - timedelta(days=days - 1)
    prev_start = start - timedelta(days=days)

    cursor.execute(
        """SELECT id, goal, status, duration_minutes, scheduled_at, started_at, completed_at, created_at
           FROM study_sessions WHERE user_id = %s AND subject_id = %s
           ORDER BY COALESCE(completed_at, scheduled_at, created_at) DESC""",
        (child_id, subject_id),
    )
    all_rows = list(cursor.fetchall())
    since = datetime.combine(start, datetime.min.time())
    prev_since = datetime.combine(prev_start, datetime.min.time())

    def when(r):
        return r.get("completed_at") or r.get("scheduled_at") or r.get("created_at")

    rows = [r for r in all_rows if isinstance(when(r), datetime) and when(r) >= since]
    by_day: Dict[date, int] = {}
    prev_total = 0
    for r in all_rows:
        if r.get("status") != "completed" or not isinstance(r.get("completed_at"), datetime):
            continue
        d = r["completed_at"].date()
        m = int(r.get("duration_minutes") or 0)
        if d >= start:
            by_day[d] = by_day.get(d, 0) + m
        elif r["completed_at"] >= prev_since:
            prev_total += m

    daily = [
        {"date": (start + timedelta(days=i)).isoformat(),
         "day": st.DAY_SHORT[(start + timedelta(days=i)).weekday()],
         "time": by_day.get(start + timedelta(days=i), 0)}
        for i in range(days)
    ]
    cur_total = sum(by_day.values())
    completed_all = [r for r in all_rows if r.get("status") == "completed"]
    last = max((r["completed_at"] for r in completed_all if isinstance(r.get("completed_at"), datetime)), default=None)
    hours = _hour_slots(rows)
    best_hour = max(hours, key=lambda h: h["minutes"]) if any(h["minutes"] for h in hours) else None
    weekdays = _weekday_minutes(by_day)
    best_wd = max(weekdays, key=lambda w: w["minutes"]) if any(w["minutes"] for w in weekdays) else None

    tasks = _task_rows(cursor, child_id, subject_id)
    sessions_list = []
    for r in all_rows[:20]:
        item = st.serialize_row(r)
        item["is_missed"] = _is_missed(r, now)
        sessions_list.append(item)

    return {
        "subject": {
            "id": subj["id"], "name": subj["name"], "color": subj["color"], "category": subj.get("category"),
            "total_minutes": int(subj.get("time_studied_minutes") or 0) + sum(int(r.get("duration_minutes") or 0) for r in completed_all),
            "last_studied_at": st.iso(last),
            "days_since": _days_since(last),
        },
        "period_days": days,
        "totals": {
            "minutes": cur_total,
            "prev_minutes": prev_total,
            "change": _pct_change(cur_total, prev_total),
            "active_days": sum(1 for m in by_day.values() if m > 0),
        },
        "sessions": _sessions_summary(rows, now),
        "tasks": _task_counts(tasks, start, now),
        "daily": daily,
        "weekdays": weekdays,
        "hours": hours,
        "best_day": best_wd["full"] if best_wd else None,
        "best_time": best_hour["time"] if best_hour else None,
        "task_list": [_task_public(t, now) for t in tasks],
        "session_list": sessions_list,
    }
