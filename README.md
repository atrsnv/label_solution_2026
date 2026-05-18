# Label ERP

ERP для музыкального лейбла: артисты, релизы, сплиты, импорт финансовых отчетов, начисления, выплаты и аналитика.

## Архитектура

- `backend/` — Node.js + Express + Prisma + SQLite.
- `frontend/` — React + Vite + Ant Design.
- DataLens используется как общий BI-контур и источник аналитических данных.
- ERP-база хранит операционные сущности: пользователей, роли, треки, сплиты, балансы, выплаты и статусы.
- Frontend рисует основные dashboard-страницы из JSON API:
  - `GET /api/admin/analytics`;
  - `GET /api/artist/analytics`.

## Быстрый старт

```bash
cd backend
npm install
cp .env.example .env
npm run seed
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

Тестовые аккаунты:

- `admin@label.local / admin123`
- `vasya@label.local / artist123`
- `petya@label.local / artist123`
- `masha@label.local / artist123`
- `nikita@label.local / artist123`
- `anna@label.local / artist123`

## Проверки

```bash
cd backend
npm test
```

```bash
cd frontend
npm run build
```

## DataLens

Backend умеет генерировать private embed token для DataLens, но основные ERP dashboards сейчас рисуются нативно из JSON. Это оставляет DataLens как внешний BI-контур, а интерфейс ERP — быстрым, красивым и контролируемым.

Секреты хранятся только в `backend/.env` и `backend/secrets/`; эти пути игнорируются git.

## Демо-данные

Seed создает расширенный набор артистов, треков и начислений. Для DataLens подготовлены файлы:

- `backend/sample-data/label_financial_analytics_rich.xlsx`
- `backend/sample-data/label_financial_analytics_rich.csv`
