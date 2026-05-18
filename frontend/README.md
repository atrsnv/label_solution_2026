# Label ERP — Frontend

Vite + React (JS) + Ant Design + Zustand + TanStack Query + Axios.

## Запуск

```bash
cd frontend
npm install
cp .env.example .env  # при необходимости поправить VITE_API_URL
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
- Dashboard-страницы рисуют основную аналитику из JSON API, без зависимости от iframe.

### Админ
- `/admin/dashboard` — KPI, доход по артистам, трекам и периодам из `/api/admin/analytics`.
- `/admin/artists` — таблица артистов, инвайт-ссылка / прямое создание, drawer с настройкой `labelShare`.
- `/admin/tracks` — реестр треков с фильтрацией по статусу сплита (PENDING / APPROVED / ERROR) и видимыми участниками.
- `/admin/finance` — drag-and-drop CSV/XLSX, инлайн-отчёт об импорте, история выгрузок с деталями.

### Артист
- `/artist/dashboard` — баланс, заработок, треки, доля лейбла и персональные графики из `/api/artist/analytics`.
- `/artist/tracks` — сетка карточек треков, кнопка "Создать новый релиз".
  - **Сплит-форма** (NewTrackModal): динамический список участников с email и %. В шапке показано, сколько уже забрал лейбл. Сумма долей валидируется онлайн.
- `/artist/invites` — карточки треков, куда позвали; кнопки "Принять" / "Оспорить".
- `/artist/wallet` — баланс, история начислений (по трекам и периодам), запросы на вывод.

## DataLens

DataLens поддержан на backend как внешний BI-контур и источник private embed token. Основные dashboard-экраны frontend сейчас рисуются нативно из JSON API, чтобы интерфейс ERP был стабильным, красивым и персонализированным.

Backend-переменные:
- `DATALENS_IAM_TOKEN` — IAM-токен Yandex Cloud.
- `DATALENS_ORG_ID` — ID организации.
- `DATALENS_ENTRY_ID` — ID дашборда/объекта DataLens.
- `DATALENS_EMBED_ID` — ID приватного встраивания из Embedding settings.
- `DATALENS_ADMIN_EMBED_ID` / `DATALENS_ARTIST_EMBED_ID` — отдельные встраивания для админского и артистского DataLens dashboards.
- `DATALENS_PUBLIC_URL` — готовый `src` из кода для вставки DataLens; приоритетнее `DATALENS_ENTRY_ID`.
- `DATALENS_PRIVATE_KEY_PATH` — путь до приватного ключа для генерации `dl_embed_token`.
- `DATALENS_TOKEN_TTL_SECONDS` — срок жизни генерируемого embed-токена.
- `DATALENS_ARTIST_PARAM` — имя параметра DataLens для фильтрации артиста, например `artist_id`.
- `DATALENS_ARTIST_ID_MAP` — соответствие email артиста в ERP и `artist_id` в DataLens.
- `DATALENS_LABEL_ID` — ID текущего лейбла для MVP с одним лейблом.
- `DATALENS_LABEL_PARAM` — имя параметра фильтра в DataLens, по умолчанию `labelId`.
- `DATALENS_BASE_URL` — базовый URL DataLens, по умолчанию `https://datalens.yandex`.
