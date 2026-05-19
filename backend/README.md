# Label ERP — Backend

Node.js + Express + Prisma + SQLite. JS (CommonJS), JWT-auth, роли `ADMIN` и `ARTIST`.

## Быстрый старт

```bash
# 1. Установить зависимости
npm install

# 2. Скопировать .env и при необходимости поправить DATABASE_URL
cp .env.example .env
# по умолчанию используется SQLite: file:./dev.db

# 3. Сгенерировать клиент и применить миграции
npx prisma migrate dev --name init

# 4. (опционально) засеять тестовых пользователей
npm run seed

# 5. Запустить dev-сервер
npm run dev
# http://localhost:4000/health
```

## Проверки

```bash
npm test
```

Тестовые аккаунты после seed:
- admin@label.local / admin123 (ADMIN)
- vasya@label.local / artist123 (ARTIST)
- petya@label.local / artist123 (ARTIST)
- masha@label.local / artist123 (ARTIST)
- nikita@label.local / artist123 (ARTIST)
- anna@label.local / artist123 (ARTIST)

## Структура

```
backend/
├── prisma/
│   ├── schema.prisma        # User, Track, Split, Earning, Report, Payout, Invite
│   └── seed.js
├── src/
│   ├── config/              # dotenv, prisma client
│   ├── middlewares/         # isAuth, isAdmin, isArtist, multer upload
│   ├── controllers/         # auth, admin, artist, track, finance
│   ├── routes/              # auth, admin, artist, tracks
│   └── server.js
└── uploads/                 # сюда multer кладёт отчёты дистрибьютора
```

## API кратко

### Auth (`/api/auth`)
- `POST /login` — `{ email, password }` → `{ token, user }`
- `POST /register` — `{ token, email?, name, password }` — регистрация артиста по инвайту
- `GET /me` — текущий пользователь (Bearer)

### Admin (`/api/admin`, требует ADMIN)
- `GET /dashboard/summary`
- `GET /analytics` — JSON-аналитика для frontend dashboard
- `GET /artists`, `POST /artists`, `POST /artists/invite`, `GET /artists/:id`, `PATCH /artists/:id`
- `GET /tracks` — реестр всех треков лейбла
- `POST /finance/import` — multipart `file` (CSV/XLSX), считает выплаты
- `GET /finance/reports`, `GET /finance/reports/:id`

### Artist (`/api/artist`, требует ARTIST)
- `GET /dashboard` — личная сводка
- `GET /analytics` — персональная JSON-витрина артиста
- `GET /tracks` — мои треки
- `GET /invites` — куда меня позвали на фит
- `GET /wallet`, `POST /wallet/withdraw`

### Tracks (`/api/tracks`, любой авторизованный)
- `POST /` — создать релиз со сплитом
- `GET /:id` — карточка трека
- `POST /:id/splits/respond` — `{ action: 'accept'|'dispute' }`

### DataLens (`/api/datalens`, любой авторизованный)
- `GET /embed` — URL iframe для общего DataLens-дашборда текущего лейбла

## DataLens

Yandex DataLens настраивается на backend, чтобы не хранить IAM-токен во frontend-бандле:

```
DATALENS_IAM_TOKEN=
DATALENS_ORG_ID=
DATALENS_ENTRY_ID=
DATALENS_EMBED_ID=
DATALENS_ADMIN_ENTRY_ID=
DATALENS_ADMIN_EMBED_ID=
DATALENS_ARTIST_ENTRY_ID=
DATALENS_ARTIST_EMBED_ID=
DATALENS_PUBLIC_URL=
DATALENS_PRIVATE_KEY_PATH=./secrets/private_key.pem
DATALENS_TOKEN_TTL_SECONDS=360
DATALENS_ENABLE_PARAMS=false
DATALENS_ARTIST_PARAM=artist_id
DATALENS_ARTIST_ID_MAP=vasya@label.local:ART-01,petya@label.local:ART-02
DATALENS_EMBED_BASE_URL=https://datalens.ru
DATALENS_LABEL_ID=default-label
DATALENS_LABEL_PARAM=labelId
DATALENS_BASE_URL=https://api.datalens.tech
DATALENS_DATA_URL=
DATALENS_DATA_FILE_PATH=sample-data/label_financial_analytics_rich.csv
```

`DATALENS_ARTIST_ENTRY_ID` должен указывать на дашборд **“ERP: Новые данные. Панель артиста”**. Backend использует этот DataLens-контур для `/api/artist/dashboard`, `/api/artist/analytics` и `/api/artist/tracks`.

Если задан `DATALENS_DATA_URL`, backend забирает строки из CSV/JSON export endpoint и фронт рисует личную аналитику без iframe. Если export URL недоступен, используется `DATALENS_DATA_FILE_PATH` как локальный fallback для демо.

## Формат отчёта дистрибьютора

CSV или XLSX, первая строка — заголовки. Поддерживаются два варианта:

**Вариант 1 (предпочтительный):**
```
trackId,amount,period
ckxyz...,1234.56,2025-04
```

**Вариант 2 (по названию + email артиста):**
```
trackTitle,artistEmail,amount,period
Summer Vibes,vasya@label.local,800.00,2025-04
```

Логика распределения:
1. От суммы `amount` берётся `labelShare%` трека → остаётся у лейбла.
2. Остаток делится по `Split.share` (только `ACCEPTED` сплиты).
3. Создаются записи `Earning` и увеличивается `User.balance`.
4. Если сплиты не подтверждены или сумма != 100% — строка пропускается с ошибкой.

## Логика сплита

- У артиста-владельца есть `labelShare` (выставляется админом, default 30%).
- При создании трека `labelShare` фиксируется в треке (снимок).
- Артисты распределяют между собой **оставшиеся** (100 − labelShare)% — в `Split.share` хранится их доля от этой части и в сумме должно быть 100.
- Владелец автоматически `ACCEPTED`, остальные участники получают сплит `PENDING` и должны явно `accept`/`dispute`.
- Когда все `ACCEPTED` — трек `APPROVED`. Если кто-то `DISPUTED` — статус `ERROR`.
