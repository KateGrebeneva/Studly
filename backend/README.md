# Studly — бэкенд

API на FastAPI + MySQL. Как запустить весь проект целиком — в `ЗАПУСК.md` в корне.

## Быстрый старт

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows; на macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
copy .env.example .env          # и вписать пароль от MySQL и JWT_SECRET
mysql -u root -p --default-character-set=utf8mb4 < database/schema.sql
python main.py
```

Проверка: http://127.0.0.1:8000/api/health → `{"status":"healthy"}`.
Swagger со всеми запросами: http://127.0.0.1:8000/docs

При старте сервер сам проверяет базу: если она создана по старой схеме, он добавит роль
`admin`, таблицы `parent_children` и `user_invite_codes`, стандартные достижения и починит
текст, если он когда-то импортировался в неправильной кодировке.

Демо-данные: `python scripts/create_seed.py` (пользователи из таблицы ниже, пароль у всех `test123`).

| Роль | Email |
|---|---|
| Ученик | test@studly.com |
| Ученик | ilya@studly.com |
| Родитель | parent@studly.com |
| Админ | admin@studly.com |

## Структура

```
backend/
├── main.py              точка входа, подключение роутеров
├── config.py            настройки из .env
├── auth.py, auth_deps.py  JWT, пароли, проверка ролей
├── routers/             эндпоинты
├── services/            расчёты: статистика, достижения, аналитика для родителя, проверка схемы БД
├── ai/                  OpenAI / Gemini и запасной план без нейросети
├── models/              pydantic-схемы
├── database/            подключение и schema.sql
├── scripts/create_seed.py
└── tests/               тест API на sqlite (MySQL не нужен)
```

Вся статистика считается в `services/stats_service.py`, поэтому на главной ученика,
в статистике, у родителя и в AI-планировщике цифры одинаковые.
Минуты за день = максимум из журнала `study_time_logs` и суммы завершённых сессий.

## API

Все запросы, кроме `/api/auth/*`, требуют заголовок `Authorization: Bearer <токен>`.

**Авторизация**
- `POST /api/auth/register` — регистрация (роль `student`, `parent` или `teacher`)
- `POST /api/auth/login` — вход, возвращает токен и пользователя

**Предметы и задачи**
- `GET/POST /api/subjects`, `GET/PUT/DELETE /api/subjects/{id}`
- `GET /api/tasks/subject/{subject_id}`, `POST /api/tasks`, `PUT/DELETE /api/tasks/{id}`

**Сессии**
- `GET /api/sessions` (можно `?status=planned`), `GET /api/sessions/{id}`
- `POST /api/sessions`, `PUT /api/sessions/{id}`, `DELETE /api/sessions/{id}`
  — при переходе в `completed` время один раз записывается в статистику

**Статистика**
- `GET /api/stats/dashboard` — сегодня: минуты, задачи, сессии, серия дней
- `GET /api/stats/weekly` — последние 7 дней
- `GET /api/stats/daily?days=120` — минуты по дням для календаря
- `GET /api/stats/subjects` — время по предметам
- `GET /api/stats/quote` — мотивирующая цитата
- `GET /api/activity-zones` — зоны продуктивности по времени суток

**Цели и достижения**
- `GET/POST /api/goals`, `PUT/DELETE /api/goals/{id}`
- `GET /api/achievements` — прогресс пересчитывается по реальным данным

**AI**
- `POST /api/ai/generate-plan` — план и советы (без ключей строится по данным пользователя)
- `POST /api/ai/generate-test` — вопросы для закрепления темы

**Профиль**
- `GET/PUT /api/profile`
- `GET /api/profile/invite-code`, `POST /api/profile/invite-code` — код для родителя (только ученик)

**Родитель / учитель**
- `GET /api/parent/children`, `POST /api/parent/children/link`, `DELETE /api/parent/children/{id}`
- `GET /api/parent/children/{id}/overview?days=30` — вся аналитика за период: динамика,
  предметы, задачи, цели, награды, подсказки
- `GET /api/parent/children/{id}/subjects/{subject_id}?days=30` — один предмет подробно
- `GET /api/parent/children/{id}/stats`, `/weekly`, `/sessions`, `/subjects`
- `POST /api/parent/children/{id}/sessions` — назначить сессию ученику

**Админ**
- `GET /api/admin/users?role=&search=`, `PUT /api/admin/users/{id}`, `GET /api/admin/stats`

## Тесты

```bash
python tests/test_api.py
```

Тест прогоняет все эндпоинты на sqlite-подмене и проверяет, что цифры у ученика и родителя совпадают.
