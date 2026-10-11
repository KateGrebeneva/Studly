"""Подмена MySQL на sqlite, только для тестов."""
import os
import re
import sqlite3
from datetime import date, datetime

sqlite3.register_adapter(datetime, lambda d: d.replace(microsecond=0).isoformat(sep=" "))
sqlite3.register_adapter(date, lambda d: d.isoformat())
sqlite3.register_converter("DATETIME", lambda b: datetime.fromisoformat(b.decode()))
sqlite3.register_converter("TIMESTAMP", lambda b: datetime.fromisoformat(b.decode()))
sqlite3.register_converter("DATE", lambda b: date.fromisoformat(b.decode()[:10]))

import tempfile
DB_PATH = os.path.join(tempfile.gettempdir(), "studly_test.db")

SCHEMA = """
CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
  name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'student', avatar_url TEXT, theme TEXT DEFAULT 'light',
  created_at TIMESTAMP DEFAULT (datetime('now','localtime')), updated_at TIMESTAMP DEFAULT (datetime('now','localtime')));
CREATE TABLE subjects (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INT NOT NULL, name TEXT NOT NULL, color TEXT NOT NULL DEFAULT '#7012CE',
  category TEXT, time_studied_minutes INT DEFAULT 0, created_at TIMESTAMP DEFAULT (datetime('now','localtime')), updated_at TIMESTAMP DEFAULT (datetime('now','localtime')));
CREATE TABLE tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, subject_id INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE, title TEXT NOT NULL, description TEXT,
  priority TEXT DEFAULT 'medium', is_completed BOOLEAN DEFAULT 0, due_date DATETIME, created_at TIMESTAMP DEFAULT (datetime('now','localtime')), updated_at TIMESTAMP DEFAULT (datetime('now','localtime')));
CREATE TABLE study_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INT NOT NULL, subject_id INT, goal TEXT NOT NULL, work_interval INT NOT NULL DEFAULT 25,
  short_break INT NOT NULL DEFAULT 5, long_break INT NOT NULL DEFAULT 15, intervals_count INT NOT NULL DEFAULT 4, duration_minutes INT NOT NULL,
  status TEXT DEFAULT 'planned', scheduled_at DATETIME, started_at DATETIME, completed_at DATETIME,
  created_at TIMESTAMP DEFAULT (datetime('now','localtime')), updated_at TIMESTAMP DEFAULT (datetime('now','localtime')));
CREATE TABLE achievements (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, title TEXT NOT NULL, description TEXT, icon_name TEXT, color TEXT, created_at TIMESTAMP DEFAULT (datetime('now','localtime')));
CREATE TABLE user_achievements (user_id INT NOT NULL, achievement_id INT NOT NULL, progress INT DEFAULT 0, unlocked_at DATETIME, created_at TIMESTAMP DEFAULT (datetime('now','localtime')), PRIMARY KEY (user_id, achievement_id));
CREATE TABLE goals (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INT NOT NULL, title TEXT NOT NULL, type TEXT NOT NULL, target_value INT NOT NULL, current_value INT DEFAULT 0,
  color TEXT DEFAULT '#7012CE', is_completed BOOLEAN DEFAULT 0, period_start DATE NOT NULL, period_end DATE NOT NULL, created_at TIMESTAMP DEFAULT (datetime('now','localtime')), updated_at TIMESTAMP DEFAULT (datetime('now','localtime')));
CREATE TABLE study_time_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INT NOT NULL, subject_id INT, session_id INT, date DATE NOT NULL, minutes_studied INT NOT NULL DEFAULT 0,
  tasks_completed INT DEFAULT 0, created_at TIMESTAMP DEFAULT (datetime('now','localtime')), UNIQUE (user_id, date));
CREATE TABLE activity_zones (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INT NOT NULL, time_slot TEXT NOT NULL, time_start TEXT NOT NULL, time_end TEXT NOT NULL, score INT NOT NULL DEFAULT 0, date DATE NOT NULL);
CREATE TABLE parent_children (id INTEGER PRIMARY KEY AUTOINCREMENT, parent_id INT NOT NULL, child_id INT NOT NULL, created_at TIMESTAMP DEFAULT (datetime('now','localtime')), UNIQUE (parent_id, child_id));
CREATE TABLE user_invite_codes (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INT NOT NULL, code TEXT UNIQUE NOT NULL, created_at TIMESTAMP DEFAULT (datetime('now','localtime')), expires_at DATETIME);
"""


def reset():
    import os
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    c = sqlite3.connect(DB_PATH)
    c.executescript(SCHEMA)
    c.commit()
    c.close()


def translate(sql: str) -> str:
    s = sql
    if "information_schema" in s:
        return "SELECT \"enum('student','parent','teacher','admin')\" AS COLUMN_TYPE"
    if s.strip().upper().startswith(("CREATE TABLE IF NOT EXISTS", "ALTER TABLE")):
        return "SELECT 1"
    s = re.sub(r"DATE_SUB\(CURDATE\(\), INTERVAL (\d+) DAY\)", r"date('now','localtime','-\1 days')", s)
    s = s.replace("CURDATE()", "date('now','localtime')").replace("NOW()", "datetime('now','localtime')")
    s = s.replace("INSERT IGNORE", "INSERT OR IGNORE")
    m = re.match(r"\s*DELETE t FROM tasks t\s+JOIN subjects s ON t.subject_id = s.id\s+WHERE t.id = %s AND s.user_id = %s", s)
    if m:
        s = "DELETE FROM tasks WHERE id = %s AND subject_id IN (SELECT id FROM subjects WHERE user_id = %s)"
    if re.match(r"\s*UPDATE tasks SET", s):
        s = s.replace(" WHERE id = %s", ", updated_at = datetime('now','localtime') WHERE id = %s")
    s = s.replace("%s", "?")
    return s


class Cursor:
    def __init__(self, conn):
        self._c = conn.cursor()
        self.lastrowid = None
        self.rowcount = -1

    def execute(self, sql, params=()):
        if params and not isinstance(params, (list, tuple)):
            params = (params,)
        self._c.execute(translate(sql), tuple(params or ()))
        self.lastrowid = self._c.lastrowid
        self.rowcount = self._c.rowcount

    def _row(self, r):
        if r is None:
            return None
        return {d[0]: v for d, v in zip(self._c.description, r)}

    def fetchone(self):
        return self._row(self._c.fetchone())

    def fetchall(self):
        return [self._row(r) for r in self._c.fetchall()]


class Connection:
    def __init__(self):
        self._conn = sqlite3.connect(DB_PATH, detect_types=sqlite3.PARSE_DECLTYPES)
        self._conn.execute("PRAGMA foreign_keys = ON")

    def cursor(self):
        return Cursor(self._conn)

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()
