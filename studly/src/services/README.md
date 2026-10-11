# api.js

Все запросы к бэкенду. Токен после входа лежит в `localStorage` (`studly_token`)
и сам подставляется в заголовок `Authorization`.

```js
import { authAPI, subjectsAPI, sessionsAPI, statsAPI } from './services/api';

await authAPI.login('test@studly.com', 'test123');
const subjects = await subjectsAPI.getAll();
await sessionsAPI.create({ goal: 'Производные', subject_id: 1, work_interval: 25, intervals_count: 4 });
const today = await statsAPI.getDashboard();
```

Что есть: `authAPI`, `subjectsAPI`, `tasksAPI`, `sessionsAPI`, `statsAPI`, `achievementsAPI`,
`goalsAPI`, `activityZonesAPI`, `aiAPI`, `profileAPI`, `parentAPI`, `adminAPI`.

Ошибки приходят как обычный `Error` с понятным текстом (его можно сразу показать пользователю).
Если сервер ответил 401, пользователя разлогинивает и отправляет на вход.
Если бэкенд не запущен, будет ошибка «Сервер Studly недоступен…».
