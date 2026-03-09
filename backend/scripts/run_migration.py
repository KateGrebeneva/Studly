"""Run migration 001_parent_admin.sql"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import get_db

migration_sql = """
ALTER TABLE users MODIFY role ENUM('student', 'parent', 'teacher', 'admin') NOT NULL DEFAULT 'student';
"""

parent_child_table = """
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""

invite_codes_table = """
CREATE TABLE IF NOT EXISTS user_invite_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_code (code),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""

def run():
    with get_db() as conn:
        cursor = conn.cursor()
        for name, sql in [("role enum", migration_sql), ("parent_children", parent_child_table), ("user_invite_codes", invite_codes_table)]:
            try:
                for stmt in sql.strip().split(';'):
                    if stmt.strip():
                        cursor.execute(stmt)
                print(f"OK: {name}")
            except Exception as e:
                print(f"Skip {name}: {e}")
        conn.commit()

if __name__ == "__main__":
    run()
    print("Migration complete.")
