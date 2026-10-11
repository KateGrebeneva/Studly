# Studly — фронтенд

React 19 (Create React App), React Router 7, иконки lucide-react. Отдельных UI-библиотек нет,
все стили свои: общие переменные и компоненты в `src/index.css`, у каждой страницы свой `.css`.

## Запуск

```bash
cd studly
npm install
npm start          # http://localhost:3000
```

Бэкенд по умолчанию ждём на `http://127.0.0.1:8000`. Если он на другом адресе, создай
`studly/.env` со строкой `REACT_APP_API_URL=http://адрес:порт` и перезапусти `npm start`.

Другие команды: `npm test` — тесты, `npm run build` — сборка в папку `build`.

## Что где лежит

```
src/
├── App.js                   маршруты и проверка ролей
├── index.css                цвета, шрифты, кнопки, поля, модалки, анимации
├── LoginPage, RegisterPage, StudentInvitationPage, ParentInvitationPage
├── components/
│   ├── LandingPage          главная для гостей
│   ├── AppLayout            боковое меню, нижние вкладки на телефоне, свайпы, тема
│   ├── AuthLayout           общий вид экранов входа и регистрации
│   ├── Dashboard, SubjectsPage, SessionPlanningPage, PomodoroTimer, SessionCompletePage
│   ├── StatisticsPage, AchievementsPage, AIPlannerPage, ProfilePage
│   ├── ParentCabinetPage    кабинет родителя/учителя
│   ├── parent/ParentCharts  графики для кабинета (столбики, тепловая карта, пончик…)
│   ├── AdminPanelPage, NotFound404, ConfirmModal
│   └── ui/                  Modal, уведомления, Spots, маскот Спот, следы лапок
├── services/api.js          все запросы к бэкенду
└── utils/chime.js           звук в конце интервала
public/mascot/               картинки Спота (12 поз + аватар)
src/assets/cursors/          курсор-лапка
```

## Мелочи

- Тема светлая/тёмная, переключается в меню и запоминается.
- Все анимации отключаются, если в системе включено «уменьшить движение».
- Шрифты Unbounded и Nunito подключаются с Google Fonts в `public/index.html`.
