# Label ERP — Backend

REST API для системы управления лейблом: артисты, релизы, выплаты, сторонние сделки, аналитика через DataLens.

## Стек

- **Node.js + Express**
- **Prisma ORM + SQLite**
- **JWT** — авторизация (Bearer-токен)
- **DataLens Charts API** — аналитические витрины (embed + Charts API)

---

## Быстрый старт

```bash
npm install
cp .env.example .env          # заполни переменные
npx prisma db push --skip-generate
npm run dev                   # порт 4000
```

Тестовые аккаунты (после seed):

| Email | Пароль | Роль |
|---|---|---|
| `admin@label.local` | `admin123` | ADMIN |
| `sodaluv@label.local` | `artist123` | ARTIST |
| `instasamka@label.local` | `artist123` | ARTIST |
| `morgenshtern@label.local` | `artist123` | ARTIST |

---

## Переменные окружения (`.env`)

```env
# База
DATABASE_URL=file:./prisma/dev.db
JWT_SECRET=your_secret
JWT_EXPIRES_IN=7d
PORT=4000

# DataLens Charts API (embed-витрины)
DATALENS_ADMIN_EMBED_ID=      # Embed ID панели администратора
DATALENS_ARTIST_EMBED_ID=     # Embed ID панели артиста
DATALENS_PRIVATE_KEY_PATH=./secrets/private_key.pem   # PS256 ключ для embed-токенов
DATALENS_IAM_TOKEN=           # IAM-токен Yandex Cloud
DATALENS_ORG_ID=              # ID организации
DATALENS_BASE_URL=https://api.datalens.tech
DATALENS_EMBED_BASE_URL=https://datalens.ru
DATALENS_ARTIST_PARAM=artist_id

# DataLens export (CSV/JSON источник данных)
DATALENS_DATA_URL=            # URL CSV/JSON с данными
DATALENS_DATA_FILE_PATH=      # Локальный CSV (для демо)
DATALENS_ALLOW_LOCAL_FALLBACK=false

# DataLens entry IDs (для мета-запросов)
DATALENS_ADMIN_ENTRY_ID=
DATALENS_ARTIST_ENTRY_ID=
DATALENS_PUBLIC_URL=          # Публичный embed URL (без авторизации)
DATALENS_LABEL_ID=default-label
DATALENS_LABEL_PARAM=labelId
DATALENS_ENABLE_PARAMS=false
```

---

## Модели данных

### User
| Поле | Тип | Описание |
|---|---|---|
| `id` | String (cuid) | Первичный ключ |
| `email` | String (unique) | Email |
| `name` | String | Отображаемое имя |
| `role` | String | `ADMIN` \| `ARTIST` |
| `labelShare` | Float | Доля лейбла в % (по умолчанию 10) |
| `datalensArtistId` | String? | ID артиста в DataLens для привязки аналитики |
| `payoutDetails` | String? | JSON реквизитов для выплат |

### Release (локальные релизы)
| Поле | Тип | Описание |
|---|---|---|
| `id` | String | — |
| `userId` | String | Владелец (артист) |
| `title` | String | Название |
| `releaseDate` | String | Дата релиза |
| `status` | String | `PENDING` \| `APPROVED` \| `REJECTED` |
| `coverUrl` | String? | URL обложки |
| `collaborators` | String? | JSON: `[{name, email, role}]` |
| `comment` | String? | Комментарий администратора |

### Deal (сторонние сделки)
| Поле | Тип | Описание |
|---|---|---|
| `id` | String | — |
| `artistId` | String | ID артиста |
| `organization` | String | Название организации-заказчика |
| `totalAmount` | Float | Общая сумма сделки |
| `artistPercent` | Float | Процент артиста |
| `artistAmount` | Float | Сумма артиста = `totalAmount × artistPercent / 100` |
| `labelAmount` | Float | Доля лейбла = `totalAmount − artistAmount` |
| `comment` | String? | Произвольный комментарий |

### Payout (выплаты)
| Поле | Тип | Описание |
|---|---|---|
| `id` | String | — |
| `userId` | String | Артист |
| `amount` | Float | Запрошенная сумма |
| `status` | String | `REQUESTED` \| `APPROVED` \| `REJECTED` |
| `details` | String? | JSON-снапшот реквизитов на момент запроса |
| `comment` | String? | Комментарий при обработке |

### Invite (инвайты)
| Поле | Тип | Описание |
|---|---|---|
| `token` | String (unique) | Одноразовый токен |
| `email` | String? | Адрес, для которого создан (опционально) |
| `used` | Boolean | Был ли использован |
| `expiresAt` | DateTime | Срок действия (7 дней) |

---

## API

Базовый URL: `http://localhost:4000`

Защищённые маршруты требуют заголовка:
```
Authorization: Bearer <JWT>
```

---

### Проверка сервера

| Метод | Путь | Auth | Описание |
|---|---|---|---|
| GET | `/health` | — | Статус сервера |

```json
// Response 200
{ "status": "ok", "uptime": 123.4 }
```

---

### `/api/auth` — Авторизация

| Метод | Путь | Auth | Описание |
|---|---|---|---|
| POST | `/api/auth/login` | — | Вход по email + password |
| POST | `/api/auth/register` | — | Регистрация по инвайт-токену |
| GET | `/api/auth/me` | JWT | Данные текущего пользователя |

**POST `/api/auth/login`**
```json
// Body
{ "email": "artist@example.com", "password": "secret" }

// Response 200
{ "token": "eyJ...", "user": { "id": "...", "name": "Ivan", "role": "ARTIST" } }
```

**POST `/api/auth/register`**
```json
// Body
{ "token": "invite-token-here", "name": "Ivan", "email": "ivan@example.com", "password": "secret" }

// Response 201
{ "token": "eyJ...", "user": { "id": "...", "name": "Ivan", "role": "ARTIST" } }
```

**GET `/api/auth/me`**
```json
// Response 200
{ "user": { "id": "...", "email": "...", "name": "Ivan", "role": "ARTIST" } }
```

---

### `/api/public` — Публичные данные (без авторизации)

| Метод | Путь | Auth | Описание |
|---|---|---|---|
| GET | `/api/public/artists` | — | Все артисты с их одобренными релизами |
| GET | `/api/public/artists/:id` | — | Конкретный артист + релизы |
| GET | `/api/public/tracks` | — | Все одобренные релизы |
| GET | `/api/public/tracks/:id` | — | Конкретный одобренный релиз |

**GET `/api/public/artists`**
```json
{
  "artists": [
    {
      "id": "clxxx",
      "name": "Ivan",
      "createdAt": "2025-01-01T00:00:00Z",
      "tracksCount": 2,
      "tracks": [
        { "id": "...", "title": "Song", "releaseDate": "2025-06-01", "coverUrl": null, "createdAt": "..." }
      ]
    }
  ]
}
```

**GET `/api/public/tracks`**
```json
{
  "tracks": [
    {
      "id": "...",
      "title": "Song",
      "releaseDate": "2025-06-01",
      "coverUrl": null,
      "collaborators": [],
      "artist": { "id": "...", "name": "Ivan" }
    }
  ]
}
```

---

### `/api/tracks` — Управление своими релизами (JWT, любая роль)

| Метод | Путь | Auth | Описание |
|---|---|---|---|
| POST | `/api/tracks` | JWT | Создать релиз (статус PENDING) |
| GET | `/api/tracks/:id` | JWT | Получить свой релиз по ID |

**POST `/api/tracks`**
```json
// Body
{
  "title": "My Track",
  "releaseDate": "2025-07-01",
  "coverUrl": "https://example.com/cover.jpg",
  "collaborators": [{ "name": "Co-Author", "email": "co@example.com", "role": "Автор" }]
}

// Response 201
{
  "track": {
    "id": "...",
    "title": "My Track",
    "status": "PENDING",
    "releaseDate": "2025-07-01",
    "coverUrl": "https://...",
    "collaborators": [...],
    "splits": [],
    "source": "local"
  }
}
```

---

### `/api/artist` — Личный кабинет артиста (JWT + роль ARTIST)

| Метод | Путь | Auth | Описание |
|---|---|---|---|
| GET | `/api/artist/dashboard` | JWT+ARTIST | Сводка: баланс, треки, доход |
| GET | `/api/artist/analytics` | JWT+ARTIST | Полная аналитическая витрина |
| GET | `/api/artist/tracks` | JWT+ARTIST | Мои треки (локальные + DataLens) |
| GET | `/api/artist/wallet` | JWT+ARTIST | Кошелёк: баланс, начисления, история выплат |
| POST | `/api/artist/wallet/withdraw` | JWT+ARTIST | Запрос на вывод средств |
| GET | `/api/artist/wallet/payouts` | JWT+ARTIST | История моих выплат |
| GET | `/api/artist/profile` | JWT+ARTIST | Реквизиты для выплат |
| PATCH | `/api/artist/profile` | JWT+ARTIST | Обновить реквизиты |
| GET | `/api/artist/deals` | JWT+ARTIST | Мои сторонние сделки |

**GET `/api/artist/dashboard`**
```json
{
  "balance": 15000.00,
  "labelShare": 10,
  "tracksCount": 5,
  "approvedCount": 3,
  "totalEarned": 18000.00,
  "dealEarnings": 5000.00,
  "totalStreams": 120000,
  "datalensArtist": { "artistId": "ART-01", "artistName": "Ivan" },
  "source": { "mode": "datalens-charts-api", "apiStatus": "ok" },
  "lastEarnings": [{ "id": "...", "trackTitle": "Song", "amount": 1200, "source": "DataLens" }]
}
```

> **Баланс** = `DataLens.totalEarned + SUM(deals.artistAmount) − SUM(payouts[REQUESTED|APPROVED])`

**GET `/api/artist/wallet`**
```json
{
  "balance": 15000.00,
  "totalEarned": 18000.00,
  "deductedPayouts": 3000.00,
  "earnings": [...],
  "payouts": [{ "id": "...", "amount": 3000, "status": "APPROVED", "createdAt": "..." }],
  "source": { ... }
}
```

**POST `/api/artist/wallet/withdraw`**
```json
// Body
{ "amount": 5000 }

// Response 201
{ "payout": { "id": "...", "amount": 5000, "status": "REQUESTED", "createdAt": "..." } }
```

**GET `/api/artist/deals`**
```json
{
  "deals": [
    {
      "id": "...",
      "organization": "Яндекс Музыка",
      "totalAmount": 10000,
      "artistPercent": 70,
      "artistAmount": 7000,
      "labelAmount": 3000,
      "comment": "Лицензия для фильма",
      "createdAt": "2025-05-01T00:00:00Z"
    }
  ]
}
```

---

### `/api/admin` — Панель администратора (JWT + роль ADMIN)

#### Дашборд

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/admin/dashboard/summary` | Сводные KPI: артисты, треки, оборот, топ артистов |
| GET | `/api/admin/analytics` | Аналитика для фронтенд-компонента |
| GET | `/api/admin/datalens-dashboard` | Полная витрина DataLens |

**GET `/api/admin/dashboard/summary`**
```json
{
  "artistsCount": 12,
  "tracksCount": 47,
  "approvedTracks": 47,
  "pendingTracks": 3,
  "totalEarnings": 1200000.00,
  "pendingPayouts": 0,
  "topArtists": [
    { "id": "...", "name": "Ivan", "balance": 85000 }
  ],
  "source": { "mode": "datalens-charts-api", "apiStatus": "ok" }
}
```

#### Управление артистами

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/admin/artists` | Список всех артистов |
| POST | `/api/admin/artists` | Создать артиста напрямую (без инвайта) |
| POST | `/api/admin/artists/invite` | Создать инвайт-ссылку |
| GET | `/api/admin/artists/:id` | Получить артиста по ID |
| PATCH | `/api/admin/artists/:id` | Обновить данные артиста |
| DELETE | `/api/admin/artists/:id` | Удалить артиста и все его данные |

**POST `/api/admin/artists`**
```json
// Body
{ "email": "new@artist.com", "name": "New Artist", "password": "secret" }

// Response 201
{ "artist": { "id": "...", "email": "...", "name": "New Artist", "role": "ARTIST", "createdAt": "..." } }
```

**POST `/api/admin/artists/invite`**
```json
// Body (email опционален)
{ "email": "target@artist.com" }

// Response 201
{
  "invite": {
    "id": "...",
    "token": "abc123def456",
    "email": "target@artist.com",
    "expiresAt": "2025-05-28T00:00:00Z",
    "path": "/register?token=abc123def456"
  }
}
```

**PATCH `/api/admin/artists/:id`**
```json
// Body (все поля опциональны, кроме name)
{
  "name": "Updated Name",
  "datalensArtistId": "ART-01",
  "labelShare": 15
}

// Response 200
{ "artist": { "id": "...", "name": "Updated Name", "datalensArtistId": "ART-01", "labelShare": 15 } }
```

#### Треки и модерация релизов

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/admin/tracks` | Все треки (DataLens + локальные) |
| PATCH | `/api/admin/releases/:id` | Одобрить или отклонить локальный релиз |

**GET `/api/admin/tracks`**
```json
{
  "tracks": [
    {
      "id": "...",
      "title": "Song",
      "status": "PENDING",
      "source": "local",
      "owner": { "id": "...", "name": "Ivan", "email": "ivan@example.com" },
      "coverUrl": null,
      "collaborators": [],
      "labelShare": 10
    }
  ],
  "source": { "mode": "datalens-charts-api" }
}
```

**PATCH `/api/admin/releases/:id`**
```json
// Body
{ "status": "APPROVED", "comment": "Отличный трек!" }
// или
{ "status": "REJECTED", "comment": "Не соответствует требованиям" }

// Response 200
{
  "track": {
    "id": "...",
    "title": "Song",
    "status": "APPROVED",
    "comment": "Отличный трек!",
    "owner": { "id": "...", "name": "Ivan", "email": "..." }
  }
}
```

#### Сторонние сделки

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/admin/deals` | Список всех сделок (с данными артиста) |
| POST | `/api/admin/deals` | Провести прямую сделку |

**POST `/api/admin/deals`**
```json
// Body
{
  "artistId": "clxxx...",
  "organization": "Яндекс Музыка",
  "totalAmount": 10000,
  "artistPercent": 70,
  "comment": "Лицензия для фильма"
}

// Response 201
{
  "deal": {
    "id": "...",
    "artistId": "clxxx",
    "organization": "Яндекс Музыка",
    "totalAmount": 10000,
    "artistPercent": 70,
    "artistAmount": 7000,
    "labelAmount": 3000,
    "comment": "Лицензия для фильма",
    "createdAt": "2025-05-21T00:00:00Z"
  }
}
```

#### Финансовые отчёты (CSV-импорт)

| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/admin/finance/import` | Загрузить CSV-отчёт (`multipart/form-data`, поле `file`) |
| GET | `/api/admin/finance/reports` | Список загруженных отчётов |
| GET | `/api/admin/finance/reports/:id` | Данные конкретного отчёта |

Формат CSV: `transaction_id, date, track_id, track_title, artist_id, artist_name, role, income_type, source, revenue_gross, revenue_net, streams`

#### Выплаты

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/admin/payouts` | Все запросы на выплату |
| PATCH | `/api/admin/payouts/:id` | Одобрить или отклонить выплату |

**PATCH `/api/admin/payouts/:id`**
```json
// Body
{ "status": "APPROVED", "comment": "Переведено 21.05.2025" }
// или
{ "status": "REJECTED", "comment": "Неверные реквизиты" }
```

---

### `/api/datalens` — DataLens embed (JWT)

| Метод | Путь | Auth | Описание |
|---|---|---|---|
| GET | `/api/datalens/embed` | JWT | Embed URL с подписанным PS256 токеном |

**GET `/api/datalens/embed`**
```json
{
  "configured": true,
  "url": "https://datalens.ru/embeds/dash#dl_embed_token=eyJ...",
  "expiresAt": 1716900000,
  "embedId": "...",
  "privateKeyConfigured": true,
  "mode": "single-label-private-iframe"
}
```

---

## Логика баланса артиста

```
totalEarned      = DataLens.summary.totalEarned + SUM(Deal.artistAmount WHERE artistId = user.id)
deductedPayouts  = SUM(Payout.amount WHERE userId = user.id AND status IN ['REQUESTED', 'APPROVED'])
balance          = MAX(0, totalEarned - deductedPayouts)
```

---

## Коды ошибок

| Код | Значение |
|---|---|
| 400 | Невалидные данные (пропущено обязательное поле и т.п.) |
| 401 | Не авторизован |
| 403 | Недостаточно прав (роль) |
| 404 | Ресурс не найден |
| 409 | Конфликт (email уже зарегистрирован) |
| 500 | Внутренняя ошибка сервера |

Формат всех ошибок:
```json
{ "error": "Описание ошибки" }
```
