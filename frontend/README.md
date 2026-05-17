# Label ERP — Frontend

Vite + React (JS) + Ant Design + Zustand + TanStack Query + Axios.

## Запуск

```bash
cd frontend
npm install
cp .env.example .env  # при необходимости поправить VITE_API_URL и DataLens URLs
npm run dev           # http://localhost:5173
```

Бэкенд должен крутиться на `http://localhost:4000`. Vite проксирует `/api` на него — никакого CORS-настроя не нужно.

## Структура

```
frontend/
└── src/
    ├── components/         # ProtectedRoute, NewTrackModal (с динамической сплит-формой)
    ├── context/            # authStore.js (Zustand) — token, user, login/logout
    ├── layouts/            # AdminLayout, ArtistLayout (AntD Sider + Header)
    ├── pages/
    │   ├── Login.jsx
    │   ├── Register.jsx
    │   ├── admin/          # Dashboard, Artists, Tracks, Finance
    │   └── artist/         # Dashboard, MyTracks, Invites, Wallet
    ├── services/           # api.js (axios) + auth/admin/artist/tracks
    ├── App.jsx             # роутинг + ProtectedRoute с ролями
    └── main.jsx            # ConfigProvider AntD + ReactQuery + Router
```

## Что внутри

### Общее
- `/login` — вход; после успеха редирект в нужный кабинет по роли.
- `/register?token=…` — регистрация по инвайту (админ присылает ссылку из админки).
- ProtectedRoute проверяет токен и роль (`ADMIN` / `ARTIST`).
- При 401 от API — автоматический logout и редирект на `/login`.

### Админ
- `/admin/dashboard` — KPI (артисты, треки, заработано, к выплате) + iframe Yandex DataLens (`VITE_DATALENS_ADMIN_URL`).
- `/admin/artists` — таблица артистов, инвайт-ссылка / прямое создание, drawer с настройкой `labelShare`.
- `/admin/tracks` — реестр треков с фильтрацией по статусу сплита (PENDING / APPROVED / ERROR) и видимыми участниками.
- `/admin/finance` — drag-and-drop CSV/XLSX, инлайн-отчёт об импорте, история выгрузок с деталями.

### Артист
- `/artist/dashboard` — баланс, заработок, треки, доля лейбла + iframe персонального DataLens.
- `/artist/tracks` — сетка карточек треков, кнопка "Создать новый релиз".
  - **Сплит-форма** (NewTrackModal): динамический список участников с email и %. В шапке показано, сколько уже забрал лейбл. Сумма долей валидируется онлайн.
- `/artist/invites` — карточки треков, куда позвали; кнопки "Принять" / "Оспорить".
- `/artist/wallet` — баланс, история начислений (по трекам и периодам), запросы на вывод.

## DataLens

Дашборды Yandex DataLens встраиваются через `<iframe>`:
- `VITE_DATALENS_ADMIN_URL` — общий дашборд лейбла.
- `VITE_DATALENS_ARTIST_URL` — персональный (фильтруйте параметром `userId` в URL — фронт его сейчас не подставляет, добавьте при необходимости).
