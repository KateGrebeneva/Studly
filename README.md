# Studly

Веб-приложение для учёбы в своём ритме: предметы и задачи, Pomodoro-сессии, статистика,
цели и награды, AI-планировщик и кабинет для родителя или учителя. Рядом всё время
маскот — далматинец Спот.

![Главная ученика](public/web/04-dashboard.jpg)

## Что умеет

- **Предметы и задачи** — цветные категории, приоритеты, сроки.
- **Сессии и таймер Pomodoro** — цель на сессию, свои интервалы, звук в конце, планирование на дату.
- **Статистика** — неделя, календарь, время по предметам, серия дней подряд.
- **Цели и награды** — цели на день/неделю/месяц и достижения, которые считаются по реальным занятиям.
- **AI-планировщик** — советы и план на завтра (работает и без ключей OpenAI/Gemini — по твоим данным).
- **Кабинет родителя / учителя** — подключение ученика по коду, аналитика за 7/30/90 дней,
  подробная страница каждого предмета, подсказки, назначение сессий.
- **Панель администратора** — пользователи, роли, активность.
- Светлая и тёмная тема, адаптивная вёрстка, свайпы на телефоне.

## Скриншоты

### Компьютер

| | |
|---|---|
| ![Лендинг](public/web/01-landing.jpg) | ![Вход](public/web/02-login.jpg) |
| Лендинг | Вход |
| ![Регистрация](public/web/03-register.jpg) | ![Главная](public/web/04-dashboard.jpg) |
| Регистрация | Главная ученика |
| ![Предметы](public/web/05-subjects.jpg) | ![Новый предмет](public/web/06-new-subject-modal.jpg) |
| Предметы и задачи | Добавление предмета |
| ![Сессии](public/web/07-sessions.jpg) | ![Таймер](public/web/08-pomodoro.jpg) |
| Сессии | Таймер Pomodoro |
| ![Статистика](public/web/09-statistics.jpg) | ![Цели и награды](public/web/10-goals-achievements.jpg) |
| Статистика | Цели и награды |
| ![AI-планировщик](public/web/11-ai-planner.jpg) | ![Профиль](public/web/12-profile.jpg) |
| AI-планировщик | Профиль |
| ![Кабинет родителя](public/web/13-parent-overview.jpg) | ![Предметы ученика](public/web/14-parent-subjects.jpg) |
| Кабинет родителя: обзор | Кабинет родителя: предметы |
| ![Страница предмета](public/web/15-parent-subject-detail.jpg) | ![Админка](public/web/16-admin.jpg) |
| Кабинет родителя: один предмет | Панель администратора |
| ![Тёмная тема](public/web/17-dashboard-dark.jpg) | ![404](public/web/18-not-found.jpg) |
| Тёмная тема | Страница 404 |

### Телефон

| | | | | |
|---|---|---|---|---|
| ![](public/mobile/01-landing.jpg) | ![](public/mobile/02-login.jpg) | ![](public/mobile/03-dashboard.jpg) | ![](public/mobile/04-subjects.jpg) | ![](public/mobile/05-new-subject-sheet.jpg) |
| Лендинг | Вход | Главная | Предметы | Новый предмет |
| ![](public/mobile/06-pomodoro.jpg) | ![](public/mobile/07-statistics.jpg) | ![](public/mobile/08-goals-achievements.jpg) | ![](public/mobile/09-parent.jpg) | ![](public/mobile/10-dashboard-dark.jpg) |
| Таймер | Статистика | Цели | Кабинет родителя | Тёмная тема |

## Технологии

- **Фронтенд:** React 19, React Router 7, lucide-react, свои стили без UI-библиотек
- **Бэкенд:** Python, FastAPI, PyMySQL, JWT
- **База:** MySQL 8
- **AI (по желанию):** OpenAI или Google Gemini

## Запуск

Коротко:

```bash
# база
cd backend
mysql -u root -p --default-character-set=utf8mb4 < database/schema.sql

# бэкенд
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env      # вписать пароль от MySQL и JWT_SECRET
python main.py              # http://127.0.0.1:8000

# фронтенд (в другом окне)
cd studly
npm install
npm start                   # http://localhost:3000
```

Демо-данные: `python scripts/create_seed.py` в папке `backend`, вход `test@studly.com` / `test123`.

Подробно по шагам и с частыми ошибками — в [ЗАПУСК.md](ЗАПУСК.md).

## Документация

- [ЗАПУСК.md](ЗАПУСК.md) — как запустить проект
- [readme.txt](readme.txt) — полное руководство: структура, библиотеки, запуск, тестовые аккаунты
- [DOCUMENTATION.md](DOCUMENTATION.md) — требования, архитектура, экраны
- [backend/README.md](backend/README.md) — все запросы API
- [studly/README.md](studly/README.md) — как устроен фронтенд

## Структура

```
studly/      фронтенд (React)
backend/     бэкенд (FastAPI)
docs/        диаграмма архитектуры
public/      скриншоты для этого README
```
