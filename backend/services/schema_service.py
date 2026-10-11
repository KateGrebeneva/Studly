"""При старте проверяем, что в базе есть всё нужное (можно запускать сколько угодно раз)."""
from __future__ import annotations

import logging

from database.connection import get_db

logger = logging.getLogger("studly.schema")

PARENT_CHILDREN = """
CREATE TABLE IF NOT EXISTS parent_children (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parent_id INT NOT NULL,
    child_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_parent_child (parent_id, child_id),
    FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (child_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_parent (parent_id),
    INDEX idx_child (child_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
"""

INVITE_CODES = """
CREATE TABLE IF NOT EXISTS user_invite_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_code (code),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
"""

DEFAULT_ACHIEVEMENTS = [
    ("first_session", "Первая сессия", "Заверши свою первую учебную сессию", "Zap", "#7d4ff0"),
    ("week_streak_7", "Неделя упорства", "Учись 7 дней подряд", "Flame", "#f2a93b"),
    ("master_time_100", "Мастер времени", "Набери 100 часов учёбы", "Clock", "#5b82c9"),
    ("task_master_50", "Задачник", "Выполни 50 задач", "CheckCircle2", "#2fb58c"),
    ("erudite_10", "Эрудит", "Добавь 10 предметов", "BookMarked", "#4ecdc4"),
    ("legend_30", "Легенда", "Учись 30 дней подряд", "Trophy", "#e8a317"),
]


# поля, где после импорта sql в кривой кодировке бывают кракозябры
TEXT_COLUMNS = {
    "achievements": ("title", "description"),
    "subjects": ("name", "category"),
    "tasks": ("title", "description"),
    "study_sessions": ("goal",),
    "goals": ("title",),
    "users": ("name",),
}

_BOX = set("╨╤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧")


def _has_cyrillic(text: str) -> bool:
    return any("а" <= ch.lower() <= "я" or ch in "ёЁ" for ch in text)


def fix_mojibake(text):
    """Чиним строку вида «╨Я╨╡╤А...» (utf-8, прочитанный как cp866/cp1251). None — если чинить нечего."""
    if not isinstance(text, str) or not text:
        return None
    candidates = []
    if any(ch in _BOX for ch in text):
        candidates.append("cp866")
    if ("Р" in text or "С" in text) and not any(ch in _BOX for ch in text):
        candidates.append("cp1251")
    for enc in candidates:
        try:
            fixed = text.encode(enc).decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            continue
        if fixed != text and _has_cyrillic(fixed):
            return fixed
    return None


def repair_text(cur) -> int:
    fixed_count = 0
    for table, columns in TEXT_COLUMNS.items():
        for column in columns:
            try:
                cur.execute(f"SELECT id, {column} AS v FROM {table} WHERE {column} IS NOT NULL")
                rows = cur.fetchall()
            except Exception:  # в старой базе таблицы может не быть
                continue
            for row in rows:
                fixed = fix_mojibake(row["v"])
                if fixed is not None:
                    cur.execute(f"UPDATE {table} SET {column} = %s WHERE id = %s", (fixed, row["id"]))
                    fixed_count += 1
    return fixed_count


def ensure_schema() -> None:
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                """SELECT COLUMN_TYPE FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'"""
            )
            row = cur.fetchone()
            if row and "admin" not in str(row["COLUMN_TYPE"]):
                cur.execute(
                    "ALTER TABLE users MODIFY role ENUM('student', 'parent', 'teacher', 'admin') NOT NULL DEFAULT 'student'"
                )
                logger.info("Добавлена роль admin в users.role")
            cur.execute(PARENT_CHILDREN)
            cur.execute(INVITE_CODES)
            for code, title, desc, icon, color in DEFAULT_ACHIEVEMENTS:
                cur.execute(
                    """INSERT IGNORE INTO achievements (code, title, description, icon_name, color)
                       VALUES (%s, %s, %s, %s, %s)""",
                    (code, title, desc, icon, color),
                )
                # названия достижений всегда берём отсюда
                cur.execute(
                    """UPDATE achievements SET title = %s, description = %s
                       WHERE code = %s AND (title <> %s OR description IS NULL OR description <> %s)""",
                    (title, desc, code, title, desc),
                )
            repaired = repair_text(cur)
            if repaired:
                logger.info("Исправлена кодировка в %s полях", repaired)
        logger.info("Проверка схемы БД завершена")
    except Exception as exc:  # без базы сервер всё равно должен подняться
        logger.warning("Не удалось проверить схему БД: %s", exc)
