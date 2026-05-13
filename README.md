<p align="center">
  <img src="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExN3BvMnkzaWNqdGZha3B6dWczMDcwcDVmajBnNHhybjJ4ZTBzbmR2OCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9dHM/6gkcGf7Vvy0F6qFtBn/giphy.gif" width="30%"/>
</p>

<h1 align="center">Studly</h1>

<p align="center">
  <strong>Всё, что нужно для эффективной учёбы в одном месте</strong><br/>
  Pomodoro + планировщик + статистика + ИИ-помощник + контроль родителей/репетиторов
</p>

<p align="center">
  <a href="https://github.com/KateGrebeneva/Studly/stargazers">
    <img src="https://img.shields.io/github/stars/KateGrebeneva/Studly?style=for-the-badge&color=7012CE" alt="Stars"/>
  </a>
  <a href="https://github.com/KateGrebeneva/Studly/forks">
    <img src="https://img.shields.io/github/forks/ваш-username/studly?style=for-the-badge&color=9C27B0" alt="Forks"/>
  </a>
  <a href="https://github.com/ваш-username/studly/issues">
    <img src="https://img.shields.io/github/issues/KateGrebeneva/Studly?style=for-the-badge&color=F44336" alt="Issues"/>
  </a>
  <img src="https://img.shields.io/badge/Stack-FastAPI%20%2B%20React%20%2B%20MySQL-7012CE?style=for-the-badge&logo=react&logoColor=white" alt="Tech Stack"/>
  <img src="https://img.shields.io/badge/Powered%20by-OpenAI%20%2F%20Gemini-0D47A1?style=for-the-badge" alt="AI"/>
</p>

<p align="center">
  <a href="#key-features">Ключевые возможности</a> •
  <a href="#screenshots">Скриншоты</a> •
  <a href="#tech-stack">Технологии</a> •
  <a href="#installation">Быстрый старт</a> •
  <a href="#documentation">Документация</a> •
  <a href="#contributing">Участие</a>
</p>

<br/>

## ✨ Почему Studly — это круто?

Studly — это не просто ещё один to-do лист.  
Это полноценный **умный компаньон для учёбы**, который:

- помогает **сосредоточиться** с помощью нативного Pomodoro-таймера  
- строит **персональные планы** с помощью ИИ  
- показывает **реальную статистику** продуктивности (включая зоны активности)  
- мотивирует **цитатами** и достижениями  
- позволяет **родителям** следить за прогрессом ребёнка  
- даёт **учителям** удобный инструмент для классов

<p align="center">
  <img src="https://github.com/KateGrebeneva/Studly/blob/main/public/main.jpg" alt="Dashboard" width="75%"/>
  <br/><em>Главный экран — всё важное на одном взгляде</em>
</p>

## 🔥 Ключевые возможности

| Функция                        | Описание                                                                 | Для кого              |
|-------------------------------|--------------------------------------------------------------------------|-----------------------|
| 🕒 Pomodoro-таймер            | Настраиваемые интервалы, автопауза, завершение с рефлексией             | Ученики              |
| 🤖 ИИ-планировщик & тесты     | Генерация плана учёбы и вопросов по теме (OpenAI / Gemini)              | Ученики              |
| 📊 Глубокая статистика        | Streak, зоны продуктивности, графики по предметам, рост за периоды      | Все                  |
| 👨‍👩‍👧 Кабинет родителя          | Привязка по коду, просмотр сессий и статистики ребёнка, создание заданий | Родители             |
| 👩‍🏫 Режим учителя               | Работа с классами, массовая аналитика (в разработке)                    | Учителя              |
| 🎯 Достижения и мотивация     | Бейджи, цели, мотивирующие цитаты на основе твоих сильных предметов     | Ученики              |
| 🎨 Красивый и адаптивный UI   | Тёмная/светлая тема, плавные анимации                 | Все                  |

## 🖼️ Скриншоты

<p align="center">
  <img src="https://github.com/KateGrebeneva/Studly/blob/main/public/profile.jpg"   width="32%"/>
  <img src="https://github.com/KateGrebeneva/Studly/blob/main/public/parent.jpg"   width="32%"/>
  <img src="https://github.com/KateGrebeneva/Studly/blob/main/public/session.jpg"     width="32%"/>
</p>
<p align="center">
  <img src="https://github.com/KateGrebeneva/Studly/blob/main/public/Statistics1.jpg" width="32%"/>
  <img src="https://github.com/KateGrebeneva/Studly/blob/main/public/subject_2.jpg" width="32%"/>
  <img src="https://github.com/KateGrebeneva/Studly/blob/main/public/ai_planning.jpg"      width="32%"/>
</p>

## 🛠️ Технологический стек

| Часть       | Технология              | За что любим                     |
|-------------|--------------------------|-----------------------------------|
| Frontend    | React • TypeScript       | Компоненты, хуки, контекст       |
| Backend     | FastAPI • Python         | Асинхронность, Pydantic, OpenAPI |
| База данных | MySQL                    | Надёжность, транзакции           |
| Аутентификация | JWT                   | Stateless, ролевая модель        |
| ИИ          | OpenAI + Google Gemini   | Качественные генерации           |
| Стили       | Tailwind CSS / CSS-in-JS | Быстро, удобно, адаптивно        |
| Иконки      | Lucide React             | Чистые SVG                       |

## 🚀 Быстрый старт

```bash
# 1. Клонируем репозиторий
git clone https://github.com/KateGrebeneva/Studly.git
cd studly

# 2. Backend
cd backend
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # заполните переменные!
python main.py               # или uvicorn main:app --reload

# 3. Frontend (в другой вкладке терминала)
cd ../studly
npm install
npm start
