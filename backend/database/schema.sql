-- Studly Database Schema
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS studly_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE studly_db;

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('student', 'parent', 'teacher') NOT NULL DEFAULT 'student',
    avatar_url VARCHAR(500) NULL,
    theme VARCHAR(20) DEFAULT 'light',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Subjects table
CREATE TABLE subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#7012CE',
    category VARCHAR(50) NULL,
    time_studied_minutes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tasks table
CREATE TABLE tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NULL,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    is_completed BOOLEAN DEFAULT FALSE,
    due_date DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    INDEX idx_subject_id (subject_id),
    INDEX idx_is_completed (is_completed),
    INDEX idx_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Study sessions table
CREATE TABLE study_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subject_id INT NULL,
    goal VARCHAR(500) NOT NULL,
    work_interval INT NOT NULL DEFAULT 25,
    short_break INT NOT NULL DEFAULT 5,
    long_break INT NOT NULL DEFAULT 15,
    intervals_count INT NOT NULL DEFAULT 4,
    duration_minutes INT NOT NULL,
    status ENUM('planned', 'in_progress', 'completed', 'cancelled') DEFAULT 'planned',
    scheduled_at DATETIME NULL,
    started_at DATETIME NULL,
    completed_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_subject_id (subject_id),
    INDEX idx_status (status),
    INDEX idx_scheduled_at (scheduled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pomodoro intervals table (actual execution tracking)
CREATE TABLE pomodoro_intervals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    index_in_session INT NOT NULL,
    type ENUM('work', 'short_break', 'long_break') NOT NULL,
    planned_minutes INT NOT NULL,
    actual_minutes INT NULL,
    started_at DATETIME NULL,
    finished_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES study_sessions(id) ON DELETE CASCADE,
    INDEX idx_session_id (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Achievements table (master list)
CREATE TABLE achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    icon_name VARCHAR(100) NULL,
    color VARCHAR(7) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User achievements table (junction)
CREATE TABLE user_achievements (
    user_id INT NOT NULL,
    achievement_id INT NOT NULL,
    progress INT DEFAULT 0,
    unlocked_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, achievement_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    INDEX idx_unlocked_at (unlocked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Goals table
CREATE TABLE goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(500) NOT NULL,
    type ENUM('daily', 'weekly', 'monthly') NOT NULL,
    target_value INT NOT NULL,
    current_value INT DEFAULT 0,
    color VARCHAR(7) DEFAULT '#7012CE',
    is_completed BOOLEAN DEFAULT FALSE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_period (period_start, period_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invitations table
CREATE TABLE invitations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    type ENUM('parent', 'student') NOT NULL,
    email VARCHAR(255) NULL,
    created_by_user_id INT NOT NULL,
    target_user_id INT NULL,
    status ENUM('pending', 'accepted', 'expired') DEFAULT 'pending',
    expires_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at DATETIME NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_code (code),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Statistics/Study time tracking (optional, для быстрых запросов)
CREATE TABLE study_time_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subject_id INT NULL,
    session_id INT NULL,
    date DATE NOT NULL,
    minutes_studied INT NOT NULL DEFAULT 0,
    tasks_completed INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
    FOREIGN KEY (session_id) REFERENCES study_sessions(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_date (user_id, date),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Activity zones table (для AI планировщика - зоны продуктивности по времени)
CREATE TABLE activity_zones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    time_slot VARCHAR(20) NOT NULL,
    time_start TIME NOT NULL,
    time_end TIME NOT NULL,
    score INT NOT NULL DEFAULT 0,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, date),
    INDEX idx_time_slot (time_slot)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default achievements
INSERT INTO achievements (code, title, description, icon_name, color) VALUES
('first_session', 'Первая сессия', 'Заверши свою первую учебную сессию', 'Zap', '#7012CE'),
('week_streak_7', 'Неделя упорства', 'Учись 7 дней подряд', 'Flame', '#f97316'),
('master_time_100', 'Мастер времени', 'Изучи 100 часов', 'Clock', '#3b82f6'),
('task_master_50', 'Задачник', 'Выполни 50 задач', 'CheckCircle2', '#22c55e'),
('erudite_10', 'Эрудит', 'Изучи 10 предметов', 'BookMarked', '#4ecdc4'),
('legend_30', 'Легенда', 'Учись 30 дней подряд', 'Trophy', '#ffd700');
