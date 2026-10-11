"""Тест всего API без MySQL. Запуск из папки backend: python tests/test_api.py"""
import os
import sys
from datetime import datetime, timedelta, timezone, date

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.environ.get("BACKEND_DIR", os.path.dirname(HERE))
sys.path.insert(0, BACKEND)
sys.path.insert(0, HERE)
os.environ["OPENAI_API_KEY"] = ""
os.environ["GEMINI_API_KEY"] = ""
os.chdir(HERE)  # чтобы не подхватился .env с ключами

import fake_mysql  # noqa: E402
fake_mysql.reset()

import database.connection as dbc  # noqa: E402
dbc.get_db_connection = lambda: fake_mysql.Connection()

from passlib.context import CryptContext  # noqa: E402
import auth  # noqa: E402
auth.pwd_context = CryptContext(schemes=["pbkdf2_sha256"])

from fastapi.testclient import TestClient  # noqa: E402
import main  # noqa: E402

client = TestClient(main.app)
fails = []


def check(cond, msg):
    print(("  ok  " if cond else "  FAIL") + " " + msg)
    if not cond:
        fails.append(msg)


def H(tok):
    return {"Authorization": f"Bearer {tok}"}


def register(email, role, name=None):
    r = client.post("/api/auth/register", json={"email": email, "password": "secret1", "name": name or email.split("@")[0], "role": role})
    return r


def login(email):
    r = client.post("/api/auth/login", data={"username": email, "password": "secret1"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"], r.json()["user"]


with client:  # тут срабатывает startup
    print("== auth")
    check(register("anya@example.com", "student", "Аня").status_code == 201, "register student")
    check(register("anya@example.com", "student").status_code == 400, "duplicate email rejected")
    check(register("hacker@example.com", "admin").status_code == 400, "self-register as admin rejected")
    check(register("short@example.com", "student").status_code == 201, "register second student")
    check(register("mom@example.com", "parent", "Мама").status_code == 201, "register parent")
    check(register("boss@example.com", "parent", "Админ").status_code == 201, "register future admin")
    c = fake_mysql.Connection(); cur = c.cursor(); cur.execute("UPDATE users SET role='admin' WHERE email='boss@example.com'"); c.commit(); c.close()
    st, stu = login("ANYA@example.com")
    check(stu["role"] == "student", "login case-insensitive email")
    pt, par = login("mom@example.com")
    at, adm = login("boss@example.com")
    check(client.get("/api/stats/dashboard").status_code == 401, "no token -> 401")

    print("== subjects & tasks")
    s1 = client.post("/api/subjects", json={"name": "Алгебра", "color": "#7012CE", "category": "main"}, headers=H(st)).json()
    s2 = client.post("/api/subjects", json={"name": "Физика", "color": "#4facfe"}, headers=H(st)).json()
    check(client.post("/api/subjects", json={"name": "  "}, headers=H(st)).status_code == 400, "empty subject name rejected")
    t1 = client.post("/api/tasks", json={"subject_id": s1["id"], "title": "Задачи 1-10", "priority": "high"}, headers=H(st)).json()
    t2 = client.post("/api/tasks", json={"subject_id": s1["id"], "title": "Конспект"}, headers=H(st)).json()
    check(client.post("/api/tasks", json={"subject_id": s1["id"], "title": "x", "priority": "urgent"}, headers=H(st)).status_code == 400, "bad priority rejected")
    r = client.put(f"/api/tasks/{t1['id']}", json={"is_completed": True}, headers=H(st))
    check(r.status_code == 200 and r.json()["is_completed"] is True, "toggle task")
    check(client.delete(f"/api/tasks/{t2['id']}", headers=H(st)).status_code == 204, "delete task")
    other_tok, _ = login("short@example.com")
    check(client.delete(f"/api/tasks/{t1['id']}", headers=H(other_tok)).status_code == 404, "cannot delete other's task")
    check(len(client.get(f"/api/tasks/subject/{s1['id']}", headers=H(st)).json()) == 1, "tasks list")

    print("== sessions")
    local_when = (datetime.now() + timedelta(days=1)).replace(hour=17, minute=30, second=0, microsecond=0)
    utc_when = local_when.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    sess = client.post("/api/sessions", json={"goal": "Производные", "subject_id": s1["id"], "work_interval": 25,
                                              "short_break": 5, "long_break": 15, "intervals_count": 2,
                                              "scheduled_at": utc_when}, headers=H(st)).json()
    check(sess["scheduled_at"].startswith(local_when.strftime("%Y-%m-%dT%H:%M")), f"scheduled_at stored as local time ({sess['scheduled_at']})")
    check(sess["subject_name"] == "Алгебра" and sess["duration_minutes"] == 50, "session enriched")
    check(client.post("/api/sessions", json={"goal": "x", "subject_id": 9999}, headers=H(st)).status_code == 404, "foreign subject rejected")
    plain = client.post("/api/sessions", json={"goal": "Без предмета"}, headers=H(st)).json()
    check(plain["subject_name"] == "Общее", "session without subject")
    check(len(client.get("/api/sessions?status_filter=planned", headers=H(st)).json()) == 2, "status_filter alias works")
    check(len(client.get("/api/sessions?status=completed", headers=H(st)).json()) == 0, "status alias works")

    done_at = datetime.now(timezone.utc).isoformat()
    r = client.put(f"/api/sessions/{sess['id']}", json={"status": "completed", "completed_at": done_at}, headers=H(st))
    check(r.status_code == 200 and r.json()["status"] == "completed", "complete session")
    client.put(f"/api/sessions/{sess['id']}", json={"status": "completed", "completed_at": done_at}, headers=H(st))
    dash = client.get("/api/stats/dashboard", headers=H(st)).json()
    check(dash["timeStudied"] == 50, f"minutes counted once on double completion ({dash['timeStudied']})")
    check(dash["sessionsCompleted"] == 1 and dash["streak"] == 1, f"sessions today & streak ({dash})")
    check(dash["tasksCompleted"] == 1, f"tasks completed today ({dash['tasksCompleted']})")
    check(client.put(f"/api/sessions/{plain['id']}", json={"status": "weird"}, headers=H(st)).status_code == 400, "bad status rejected")

    # история: 2 предыдущих дня подряд + день с разрывом
    c = fake_mysql.Connection(); cur = c.cursor()
    for days_ago, mins, hour in [(1, 40, 16), (2, 30, 16), (5, 25, 10)]:
        when = (datetime.now() - timedelta(days=days_ago)).replace(hour=hour, minute=30, second=0, microsecond=0)
        cur.execute("INSERT INTO study_sessions (user_id, subject_id, goal, duration_minutes, status, completed_at) VALUES (?,?,?,?,?,?)",
                    (stu["id"], s2["id"], "история", mins, "completed", when))
    c.commit(); c.close()
    dash = client.get("/api/stats/dashboard", headers=H(st)).json()
    check(dash["streak"] == 3, f"real consecutive streak = 3 ({dash['streak']})")
    week = client.get("/api/stats/weekly", headers=H(st)).json()
    check(len(week) == 7 and week[-1]["time"] == 50 and week[-2]["time"] == 40, f"weekly has 7 days ({[w['time'] for w in week]})")
    check(week[-1]["date"] == date.today().isoformat(), "weekly ends today")
    daily = client.get("/api/stats/daily?days=30", headers=H(st)).json()
    check(len(daily) == 4, f"daily series ({daily})")
    subj = client.get("/api/stats/subjects", headers=H(st)).json()
    by = {s["name"]: s["total_minutes"] for s in subj}
    check(by == {"Алгебра": 50, "Физика": 95}, f"subject minutes from sessions ({by})")
    subs = client.get("/api/subjects", headers=H(st)).json()
    check({s["name"]: s["time_studied_minutes"] for s in subs} == by, "subjects list time matches stats")
    zones = client.get("/api/activity-zones", headers=H(st)).json()
    check(len(zones) >= 1 and max(z["score"] for z in zones) == 100, f"zones from real sessions ({zones})")
    check(client.get("/api/stats/quote", headers=H(st)).status_code == 200, "quote")

    print("== encoding repair")
    c = fake_mysql.Connection(); cur = c.cursor()
    cur.execute("UPDATE achievements SET title=%s, description=%s WHERE code='first_session'",
                ("Первая сессия".encode().decode("cp866"), "Заверши".encode().decode("cp866")))
    cur.execute("UPDATE subjects SET name=%s WHERE id=%s", ("Алгебра".encode().decode("cp1251"), s1["id"]))
    c.commit(); c.close()
    from services.schema_service import ensure_schema
    ensure_schema()
    ach0 = {a["code"]: a for a in client.get("/api/achievements", headers=H(st)).json()}
    check(ach0["first_session"]["title"] == "Первая сессия", "mojibake achievement repaired")
    check(any(x["name"] == "Алгебра" for x in client.get("/api/subjects", headers=H(st)).json()), "mojibake subject repaired")
    print("== achievements")
    ach = client.get("/api/achievements", headers=H(st)).json()
    codes = {a["code"]: a for a in ach}
    check(len(ach) == 6, "default achievements seeded on startup")
    check(codes["first_session"]["unlocked"] and codes["first_session"]["progress"] == 100, "first_session unlocked")
    check(codes["week_streak_7"]["progress"] == 42 and not codes["week_streak_7"]["unlocked"], f"streak progress ({codes['week_streak_7']['progress']})")
    check(codes["erudite_10"]["progress"] == 20, "erudite progress = 2/10")

    print("== goals")
    g = client.post("/api/goals", json={"title": "5 сессий", "type": "weekly", "target_value": 2, "color": "#2fb58c"}, headers=H(st)).json()
    check(client.post("/api/goals", json={"title": "x", "type": "yearly", "target_value": 2}, headers=H(st)).status_code == 400, "bad goal type rejected")
    r = client.put(f"/api/goals/{g['id']}", json={"current_value": 5}, headers=H(st)).json()
    check(r["current_value"] == 2 and bool(r["is_completed"]), "goal clamps & auto-completes")
    c = fake_mysql.Connection(); cur = c.cursor()
    cur.execute("INSERT INTO goals (user_id,title,type,target_value,period_start,period_end) VALUES (?,?,?,?,?,?)",
                (stu["id"], "старая", "daily", 3, date.today() - timedelta(days=3), date.today() - timedelta(days=3)))
    c.commit(); c.close()
    gl = client.get("/api/goals", headers=H(st)).json()
    check(any(x["is_expired"] for x in gl) and not all(x["is_expired"] for x in gl), "expired flag")
    check(client.delete(f"/api/goals/{g['id']}", headers=H(st)).status_code == 204, "delete goal")

    print("== profile & parent")
    check(client.put("/api/profile", json={"theme": "pink"}, headers=H(st)).status_code == 400, "bad theme rejected")
    check(client.put("/api/profile", json={"name": "Аня С."}, headers=H(st)).json()["name"] == "Аня С.", "rename")
    code = client.get("/api/profile/invite-code", headers=H(st)).json()["code"]
    check(client.get("/api/profile/invite-code", headers=H(pt)).status_code == 400, "parent has no invite code")
    check(client.get(f"/api/parent/children/{stu['id']}/stats", headers=H(pt)).status_code == 403, "unlinked child -> 403")
    r = client.post("/api/parent/children/link", json={"code": code.lower()}, headers=H(pt))
    check(r.status_code == 200, "link child by code")
    check(client.post("/api/parent/children/link", json={"code": code}, headers=H(pt)).status_code == 400, "relink rejected")
    pstats = client.get(f"/api/parent/children/{stu['id']}/stats", headers=H(pt)).json()
    check(pstats == client.get("/api/stats/dashboard", headers=H(st)).json(), "parent sees exactly the student's dashboard numbers")
    pweek = client.get(f"/api/parent/children/{stu['id']}/weekly", headers=H(pt)).json()
    check(pweek == client.get("/api/stats/weekly", headers=H(st)).json(), "parent weekly == student weekly")
    ns = client.post(f"/api/parent/children/{stu['id']}/sessions", json={"goal": "От мамы", "subject_id": s2["id"], "work_interval": 25, "intervals_count": 2}, headers=H(pt))
    check(ns.status_code == 200 and ns.json()["subject_name"] == "Физика", "parent creates session for child")
    check(any(x["goal"] == "От мамы" for x in client.get("/api/sessions", headers=H(st)).json()), "child sees parent's session")
    check(len(client.get(f"/api/parent/children/{stu['id']}/sessions", headers=H(pt)).json()) >= 5, "parent sees sessions")
    print("== parent analytics")
    ov = client.get(f"/api/parent/children/{stu['id']}/overview?days=30", headers=H(pt))
    check(ov.status_code == 200, "overview 200")
    ov = ov.json()
    check(ov["today"] == client.get("/api/stats/dashboard", headers=H(st)).json(), "overview.today == student dashboard")
    check(len(ov["daily"]) == 30 and len(ov["heatmap"]) == 84, "overview series lengths")
    wk = client.get("/api/stats/weekly", headers=H(st)).json()
    check([d["time"] for d in ov["daily"][-7:]] == [d["time"] for d in wk], "overview daily matches weekly")
    check(ov["totals"]["minutes"] == sum(d["time"] for d in ov["daily"]), "overview total == sum of days")
    stud_subj = {x["name"]: x["total_minutes"] for x in client.get("/api/stats/subjects", headers=H(st)).json()}
    ov_subj = {x["name"]: x for x in ov["subjects"]}
    check(set(ov_subj) >= {"Алгебра", "Физика"}, "overview lists subjects")
    check(bool(stud_subj), "student subject stats present")
    if stud_subj:
        check(all(ov_subj[n]["total_minutes"] == m for n, m in stud_subj.items() if n in ov_subj), "subject totals match student stats")
    check(ov["achievements"]["total"] == 6 and isinstance(ov["insights"], list), "overview achievements & insights")
    check(ov["tasks"]["total"] >= 1 and "overdue" in ov["tasks"], "overview tasks")
    sd = client.get(f"/api/parent/children/{stu['id']}/subjects/{s1['id']}?days=30", headers=H(pt))
    check(sd.status_code == 200 and sd.json()["subject"]["name"] == "Алгебра", "subject detail")
    sd = sd.json()
    check(sd["subject"]["total_minutes"] == ov_subj["Алгебра"]["total_minutes"], "subject detail total == overview")
    check(sd["totals"]["minutes"] == ov_subj["Алгебра"]["period_minutes"], "subject period minutes consistent")
    check(len(sd["task_list"]) == ov_subj["Алгебра"]["tasks"]["total"], "subject task list consistent")
    check(client.get(f"/api/parent/children/{stu['id']}/subjects/999999", headers=H(pt)).status_code == 404, "foreign subject -> 404")
    check(client.get(f"/api/parent/children/{stu['id']}/overview", headers=H(st)).status_code == 403, "student cannot see overview")
    check(client.get("/api/parent/children", headers=H(st)).status_code == 403, "student cannot use parent API")
    check(client.delete(f"/api/parent/children/{stu['id']}", headers=H(pt)).status_code == 200, "unlink")

    print("== admin")
    a = client.get("/api/admin/stats", headers=H(at)).json()
    check(a["totalUsers"] == 4 and a["todayActiveUsers"] == 1 and len(a["weeklyActivity"]) == 7, f"admin stats ({a['totalUsers']}, {a['todayActiveUsers']})")
    users = client.get("/api/admin/users?role=student&search=anya", headers=H(at)).json()
    check(len(users) == 1, "admin combined filters")
    check(client.put(f"/api/admin/users/{adm['id']}", json={"role": "student"}, headers=H(at)).status_code == 400, "admin cannot demote self")
    check(client.get("/api/admin/stats", headers=H(st)).status_code == 403, "student blocked from admin")

    print("== AI (без ключей — план из реальных данных)")
    plan = client.post("/api/ai/generate-plan", json={}, headers=H(st)).json()
    check(plan["bestTime"] == "15:00-17:00" and plan["provider"] == "data", f"best time from sessions ({plan['bestTime']})")
    check(plan["bestDay"] is not None and plan["avgSessionLength"] is not None, "best day & avg")
    subj_names = {"Алгебра", "Физика"}
    sch = next(s for s in plan["suggestions"] if s["type"] == "schedule")
    check(all(i["subject"] in subj_names for i in sch["schedule"]) and sch["schedule"][0]["time"] == "15:00", f"schedule uses real subjects/time ({sch['schedule']})")
    t = client.post("/api/ai/generate-test", json={"goal": "Производные", "subject_name": "Алгебра"}, headers=H(st)).json()
    check(len(t["questions"]) >= 3 and t["questionsText"], "test questions")

    empty_tok, _ = login("short@example.com")
    plan2 = client.post("/api/ai/generate-plan", json={}, headers=H(empty_tok)).json()
    check(plan2["bestTime"] is None and plan2["focusScore"] is None and plan2["recommendations"], "new user: no fake metrics")
    check(client.get("/api/activity-zones", headers=H(empty_tok)).json() == [], "new user: no zones")

    print("== cleanup")
    check(client.delete(f"/api/subjects/{s1['id']}", headers=H(st)).status_code == 204, "delete subject")
    check(client.get("/api/health").json()["status"] == "healthy", "health")

print()
print("FAILED:", len(fails)) if fails else print("ALL PASSED")
sys.exit(1 if fails else 0)
