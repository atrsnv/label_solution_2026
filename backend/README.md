# Label ERP — Backend

Node.js + Express + Prisma + PostgreSQL. JS (CommonJS), JWT-auth, роли `ADMIN` и `ARTIST`.

## Быстрый старт

```bash
# 1. Установить зависимости
npm install

# 2. Поднять PostgreSQL и положить строку подключения в .env
cp .env.example .env
# отредактировать DATABASE_URL

# 3. Сгенерировать клиент и применить миграции
npx prisma migrate dev --name init

# 4. (опционально) засеять тестовых пользователей
npm run seed

# 5. Запустить dev-сервер
npm run dev
# http://localhost:4000/health
```

Тестовые аккаунты после seed:
- admin@label.local / admin123 (ADMIN)
- vasya@label.local / artist123 (ARTIST)
- petya@label.local / artist123 (ARTIST)

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
- `GET /artists`, `POST /artists`, `POST /artists/invite`, `GET /artists/:id`, `PATCH /artists/:id`
- `GET /tracks` — реестр всех треков лейбла
- `POST /finance/import` — multipart `file` (CSV/XLSX), считает выплаты
- `GET /finance/reports`, `GET /finance/reports/:id`

### Artist (`/api/artist`, требует ARTIST)
- `GET /dashboard` — личная сводка
- `GET /tracks` — мои треки
- `GET /invites` — куда меня позвали на фит
- `GET /wallet`, `POST /wallet/withdraw`

### Tracks (`/api/tracks`, любой авторизованный)
- `POST /` — создать релиз со сплитом
- `GET /:id` — карточка трека
- `POST /:id/splits/respond` — `{ action: 'accept'|'dispute' }`

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
