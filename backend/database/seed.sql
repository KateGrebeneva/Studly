-- Studly Seed Data - заполнение БД для демонстрации
-- Запускать ПОСЛЕ schema.sql: mysql -u root -p studly_db < database/seed.sql

USE studly_db;

-- Тестовый пользователь: СНАЧАЛА запусти: python scripts/create_seed.py
-- Он создаст user id=1 с паролем test123. Затем можно запустить этот seed для остальных данных.

-- Предметы для user_id=1
INSERT INTO subjects (id, user_id, name, color, category, time_studied_minutes) VALUES
(1, 1, 'Математика', '#7012CE', 'main', 180),
(2, 1, 'Физика', '#4ecdc4', 'additional', 120),
(3, 1, 'История', '#ff6b6b', 'important', 90),
(4, 1, 'Химия', '#f59e0b', 'main', 60)
ON DUPLICATE KEY UPDATE time_studied_minutes = VALUES(time_studied_minutes);

-- Задачи для предметов
INSERT INTO tasks (subject_id, title, description, priority, is_completed) VALUES
(1, 'Изучить производные', NULL, 'high', 0),
(1, 'Решить задачи 1-10', NULL, 'medium', 1),
(1, 'Подготовиться к контрольной', NULL, 'high', 0),
(2, 'Решить задачи по механике', NULL, 'medium', 0),
(2, 'Прочитать главу 5', NULL, 'low', 1),
(3, 'Повторить Вторую мировую', NULL, 'medium', 0),
(4, 'Изучить органическую химию', NULL, 'high', 0)
ON DUPLICATE KEY UPDATE title = VALUES(title);

-- Учебные сессии
INSERT INTO study_sessions (user_id, subject_id, goal, work_interval, short_break, long_break, intervals_count, duration_minutes, status, scheduled_at, started_at, completed_at) VALUES
(1, 1, 'Изучить производные', 25, 5, 15, 4, 100, 'completed', NULL, NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 2 DAY + INTERVAL 100 MINUTE),
(1, 2, 'Решить задачи по механике', 25, 5, 15, 2, 50, 'completed', NULL, NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY + INTERVAL 50 MINUTE),
(1, 3, 'Повторить Вторую мировую', 25, 5, 15, 4, 100, 'planned', NOW() + INTERVAL 1 DAY, NULL, NULL);

-- Достижения пользователя (разблокированные)
INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at) VALUES
(1, 1, 100, NOW() - INTERVAL 7 DAY),
(1, 2, 100, NOW() - INTERVAL 5 DAY)
ON DUPLICATE KEY UPDATE progress = VALUES(progress);

-- Прогресс по достижениям (ещё не разблокированные)
INSERT INTO user_achievements (user_id, achievement_id, progress) VALUES
(1, 3, 65),
(1, 4, 80),
(1, 5, 30),
(1, 6, 23)
ON DUPLICATE KEY UPDATE progress = VALUES(progress);

-- Цели
INSERT INTO goals (user_id, title, type, target_value, current_value, color, is_completed, period_start, period_end) VALUES
(1, 'Изучить 2 часа сегодня', 'daily', 120, 120, '#7012CE', 1, CURDATE(), CURDATE()),
(1, 'Выполнить 5 задач на неделе', 'weekly', 5, 3, '#4ecdc4', 0, DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 6 DAY)),
(1, 'Изучить 20 часов в месяц', 'monthly', 1200, 720, '#ff6b6b', 0, DATE_FORMAT(CURDATE(), '%Y-%m-01'), LAST_DAY(CURDATE()));

-- Логи времени учёбы (для статистики)
INSERT INTO study_time_logs (user_id, subject_id, date, minutes_studied, tasks_completed) VALUES
(1, 1, CURDATE() - INTERVAL 6 DAY, 60, 3),
(1, 2, CURDATE() - INTERVAL 5 DAY, 90, 5),
(1, 1, CURDATE() - INTERVAL 4 DAY, 45, 2),
(1, 3, CURDATE() - INTERVAL 3 DAY, 120, 6),
(1, 1, CURDATE() - INTERVAL 2 DAY, 75, 4),
(1, 2, CURDATE() - INTERVAL 1 DAY, 100, 5),
(1, 1, CURDATE(), 80, 4)
ON DUPLICATE KEY UPDATE minutes_studied = VALUES(minutes_studied), tasks_completed = VALUES(tasks_completed);

-- Зоны активности (для AI планировщика)
INSERT INTO activity_zones (user_id, time_slot, time_start, time_end, score, date) VALUES
(1, '09:00-11:00', '09:00:00', '11:00:00', 65, CURDATE()),
(1, '11:00-13:00', '11:00:00', '13:00:00', 72, CURDATE()),
(1, '13:00-15:00', '13:00:00', '15:00:00', 45, CURDATE()),
(1, '15:00-17:00', '15:00:00', '17:00:00', 95, CURDATE()),
(1, '17:00-19:00', '17:00:00', '19:00:00', 78, CURDATE()),
(1, '19:00-21:00', '19:00:00', '21:00:00', 60, CURDATE());
