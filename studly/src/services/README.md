# API Service

Этот файл содержит все функции для работы с бэкенд API.

## Использование

```javascript
import { authAPI, subjectsAPI, tasksAPI, sessionsAPI, profileAPI } from './services/api';

// Регистрация
const user = await authAPI.register({
  email: 'user@example.com',
  password: 'password123',
  name: 'Иван Иванов',
  role: 'student'
});

// Логин
const loginData = await authAPI.login('user@example.com', 'password123');
// Токен автоматически сохраняется в localStorage

// Получить текущего пользователя
const currentUser = authAPI.getCurrentUser();

// Работа с предметами
const subjects = await subjectsAPI.getAll();
const newSubject = await subjectsAPI.create({
  name: 'Математика',
  color: '#7012CE',
  category: 'main'
});

// Работа с задачами
const tasks = await tasksAPI.getBySubject(subjectId);
const newTask = await tasksAPI.create({
  subject_id: 1,
  title: 'Изучить производные',
  priority: 'high'
});

// Работа с сессиями
const sessions = await sessionsAPI.getAll();
const newSession = await sessionsAPI.create({
  goal: 'Изучить производные',
  subject_id: 1,
  work_interval: 25,
  intervals_count: 4
});

// Профиль
const profile = await profileAPI.get();
await profileAPI.update({ theme: 'dark' });
```

## Автоматическая авторизация

Все запросы (кроме `/api/auth/*`) автоматически включают JWT токен из localStorage.

## Обработка ошибок

```javascript
try {
  const data = await subjectsAPI.getAll();
} catch (error) {
  console.error('Ошибка:', error.message);
  // Если 401 - токен истёк, нужно перелогиниться
  if (error.message.includes('401')) {
    authAPI.logout();
    navigate('/register');
  }
}
```
