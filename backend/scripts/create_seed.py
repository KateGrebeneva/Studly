"""
Скрипт для заполнения БД тестовыми данными.
Запуск: python scripts/create_seed.py
"""
import sys
import os
import calendar
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from passlib.context import CryptContext
from database.connection import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
password_hash = pwd_context.hash("test123")

with get_db() as conn:
    cursor = conn.cursor()
    
    # Тестовый пользователь
    cursor.execute("""
        INSERT INTO users (id, email, password_hash, name, role, theme)
        VALUES (1, 'test@studly.com', %s, 'Тестовый Пользователь', 'student', 'light')
        ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), name = VALUES(name)
    """, (password_hash,))
    
    # Предметы
    cursor.execute("""
        INSERT INTO subjects (id, user_id, name, color, category, time_studied_minutes)
        VALUES (1, 1, 'Математика', '#7012CE', 'main', 180),
               (2, 1, 'Физика', '#4ecdc4', 'additional', 120),
               (3, 1, 'История', '#ff6b6b', 'important', 90),
               (4, 1, 'Химия', '#f59e0b', 'main', 60)
        ON DUPLICATE KEY UPDATE time_studied_minutes = VALUES(time_studied_minutes)
    """)
    
    # Задачи
    cursor.execute("DELETE FROM tasks WHERE subject_id IN (1,2,3,4)")
    cursor.execute("""
        INSERT INTO tasks (subject_id, title, priority, is_completed)
        VALUES (1, 'Изучить производные', 'high', 0),
               (1, 'Решить задачи 1-10', 'medium', 1),
               (1, 'Подготовиться к контрольной', 'high', 0),
               (2, 'Решить задачи по механике', 'medium', 0),
               (2, 'Прочитать главу 5', 'low', 1),
               (3, 'Повторить Вторую мировую', 'medium', 0),
               (4, 'Изучить органическую химию', 'high', 0)
    """)
    
    # Сессии
    cursor.execute("DELETE FROM study_sessions WHERE user_id = 1")
    cursor.execute("""
        INSERT INTO study_sessions (user_id, subject_id, goal, work_interval, short_break, long_break, intervals_count, duration_minutes, status)
        VALUES (1, 1, 'Изучить производные', 25, 5, 15, 4, 100, 'completed'),
               (1, 2, 'Решить задачи по механике', 25, 5, 15, 2, 50, 'completed'),
               (1, 3, 'Повторить Вторую мировую', 25, 5, 15, 4, 100, 'planned')
    """)
    
    # Достижения пользователя
    for ach_id, prog in [(1, 100), (2, 100), (3, 65), (4, 80), (5, 30), (6, 23)]:
        cursor.execute("""
            INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at)
            VALUES (1, %s, %s, CASE WHEN %s = 100 THEN NOW() ELSE NULL END)
            ON DUPLICATE KEY UPDATE progress = VALUES(progress), unlocked_at = COALESCE(VALUES(unlocked_at), unlocked_at)
        """, (ach_id, prog, prog))
    
    # Цели (даты считаем в Python, чтобы не ломаться на DATE_FORMAT/типах)
    today = date.today()
    wd = today.weekday()  # Пн=0
    week_start = today - timedelta(days=wd)
    week_end = week_start + timedelta(days=6)
    month_start = today.replace(day=1)
    _, last_day = calendar.monthrange(today.year, today.month)
    month_end = today.replace(day=last_day)

    cursor.execute("DELETE FROM goals WHERE user_id = 1")
    cursor.execute("""
        INSERT INTO goals (user_id, title, type, target_value, current_value, color, is_completed, period_start, period_end)
        VALUES (1, 'Изучить 2 часа сегодня', 'daily', 120, 120, '#7012CE', 1, %s, %s),
               (1, 'Выполнить 5 задач на неделе', 'weekly', 5, 3, '#4ecdc4', 0, %s, %s),
               (1, 'Изучить 20 часов в месяц', 'monthly', 1200, 720, '#ff6b6b', 0, %s, %s)
    """, (today, today, week_start, week_end, month_start, month_end))
    
    # Логи учёбы
    subject_ids = [1, 2, 1, 3, 1, 2, 1]
    for i in range(7):
        cursor.execute("""
            INSERT INTO study_time_logs (user_id, subject_id, date, minutes_studied, tasks_completed)
            VALUES (1, %s, DATE_SUB(CURDATE(), INTERVAL %s DAY), %s, %s)
            ON DUPLICATE KEY UPDATE minutes_studied = VALUES(minutes_studied), tasks_completed = VALUES(tasks_completed)
        """, (subject_ids[i], 6 - i, 60 + (i * 15), 2 + i))
    
    # Зоны активности
    zones = [
        ('09:00-11:00', 65), ('11:00-13:00', 72), ('13:00-15:00', 45),
        ('15:00-17:00', 95), ('17:00-19:00', 78), ('19:00-21:00', 60)
    ]
    cursor.execute("DELETE FROM activity_zones WHERE user_id = 1")
    for slot, score in zones:
        start, end = slot.split('-')
        cursor.execute("""
            INSERT INTO activity_zones (user_id, time_slot, time_start, time_end, score, date)
            VALUES (1, %s, %s, %s, %s, CURDATE())
        """, (slot, start.strip(), end.strip(), score))

    # Тестовый родитель и админ (если таблицы существуют)
    try:
        cursor.execute("ALTER TABLE users MODIFY role ENUM('student', 'parent', 'teacher', 'admin') NOT NULL DEFAULT 'student'")
    except Exception:
        pass
    cursor.execute("""
        INSERT INTO users (email, password_hash, name, role, theme)
        VALUES ('parent@studly.com', %s, 'Тестовый Родитель', 'parent', 'light')
        ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), name = VALUES(name)
    """, (password_hash,))
    cursor.execute("""
        INSERT INTO users (email, password_hash, name, role, theme)
        VALUES ('admin@studly.com', %s, 'Администратор', 'admin', 'light')
        ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), name = VALUES(name)
    """, (password_hash,))

print("Seed data created successfully!")
print("Test users: test@studly.com / parent@studly.com / admin@studly.com — password: test123")
