# Label ERP — Backend

Node.js + Express + Prisma + SQLite. Локальная БД используется только для auth/onboarding: пользователи, пароли, роли и инвайты.

## Источник данных

Факты по артистам, релизам, стримам, доходам и выплатам не хранятся локально. Эти данные приходят из DataLens:

- админская витрина: `ERP: Новые данные. Панель администратора`;
- артистская витрина: `ERP: Новые данные. Панель артиста`;
- JSON для frontend строится backend-слоем из DataLens export/adapter.

Локальные endpoints для создания релизов, сплитов, импорта отчётов и выплат оставлены как совместимые маршруты, но возвращают `410`, чтобы не появлялся второй источник правды.

## Быстрый старт

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run seed
npm run dev
```

Тестовые аккаунты после seed:

- `admin@label.local / admin123`
- `sodaluv@label.local / artist123`
- `instasamka@label.local / artist123`
- `morgenshtern@label.local / artist123`
- `masha@label.local / artist123`
- `nikita@label.local / artist123`
- `anna@label.local / artist123`

## Проверки

```bash
npm test
```

## Prisma

Актуальная схема содержит только:

- `User` — email, password, name, role;
- `Invite` — инвайт на регистрацию артиста.

Удалённые локальные сущности: `Track`, `Split`, `Report`, `Earning`, `Payout`, `User.balance`, `User.labelShare`.

## API

### Auth (`/api/auth`)

<<<<<<< HEAD
### Admin (`/api/admin`, требует ADMIN)
- `GET /dashboard/summary`
<<<<<<< HEAD
=======
- `GET /analytics` — JSON-аналитика для frontend dashboard
>>>>>>> origin/dima
- `GET /artists`, `POST /artists`, `POST /artists/invite`, `GET /artists/:id`, `PATCH /artists/:id`
- `GET /tracks` — реестр всех треков лейбла
- `POST /finance/import` — multipart `file` (CSV/XLSX), считает выплаты
- `GET /finance/reports`, `GET /finance/reports/:id`
=======
- `POST /login`
- `POST /register`
- `GET /me`
>>>>>>> origin/dima

### Admin (`/api/admin`)

- `GET /dashboard/summary` — сводка из DataLens
- `GET /analytics` — JSON-витрина из DataLens
- `GET /datalens-dashboard` — расширенная DataLens-витрина админа
- `GET /artists` — артисты из DataLens + отметка, есть ли auth-аккаунт
- `POST /artists` — создать только auth-аккаунт
- `POST /artists/invite` — создать инвайт
- `PATCH /artists/:id` — обновить имя auth-аккаунта
- `GET /tracks` — релизы из DataLens

### Artist (`/api/artist`)

- `GET /dashboard` — личная сводка из DataLens
- `GET /analytics` — персональная JSON-витрина из DataLens
- `GET /tracks` — релизы артиста из DataLens
- `GET /wallet` — кошелёк из DataLens, без локальных выплат
- `POST /wallet/withdraw` — `410`, локальные выплаты отключены

### Disabled Local Flows

- `POST /api/tracks`
- `GET /api/tracks/:id`
- `POST /api/tracks/:id/splits/respond`
- `POST /api/admin/finance/import`
- `GET /api/admin/finance/reports`
- `GET /api/admin/finance/reports/:id`

## DataLens

Yandex DataLens настраивается на backend, чтобы не хранить IAM-токен во frontend-бандле:

```env
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
DATALENS_ARTIST_ID_MAP=instasamka@label.local:ART-01,sodaluv@label.local:ART-02,morgenshtern@label.local:ART-03
DATALENS_EMBED_BASE_URL=https://datalens.ru
DATALENS_LABEL_ID=default-label
DATALENS_LABEL_PARAM=labelId
DATALENS_BASE_URL=https://api.datalens.tech
DATALENS_DATA_URL=
DATALENS_DATA_FILE_PATH=sample-data/label_financial_analytics_rich.csv
```

Если задан `DATALENS_DATA_URL`, backend забирает строки из CSV/JSON export endpoint. Если URL недоступен, используется `DATALENS_DATA_FILE_PATH` как fallback для демо.
