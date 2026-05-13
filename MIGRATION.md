# Миграция БД для родителя и админа

Перед использованием новых возможностей (кабинет родителя, панель админа) выполните миграцию:

```bash
cd backend
python scripts/run_migration.py
```

Или вручную через MySQL:

```sql
ALTER TABLE users MODIFY role ENUM('student', 'parent', 'teacher', 'admin') NOT NULL DEFAULT 'student';

CREATE TABLE IF NOT EXISTS parent_children (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parent_id INT NOT NULL,
    child_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_parent_child (parent_id, child_id),
    FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (child_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_invite_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

После миграции обновите seed-данные:

```bash
python scripts/create_seed.py
```

Тестовые пользователи:
- **Студент:** test@studly.com / test123
- **Родитель:** parent@studly.com / test123
- **Админ:** admin@studly.com / test123
