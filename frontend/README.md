# Label ERP Frontend

React + TypeScript + Vite frontend для ERP музыкального лейбла.

## Что есть

- публичная главная страница лейбла;
- вход и регистрация артиста по инвайту;
- админский кабинет: сводка, артисты и релизы из DataLens;
- артистский кабинет: баланс, аналитика и треки из DataLens;
- нативная аналитика из JSON API без iframe: `/api/admin/analytics` и `/api/artist/analytics`.

## Запуск

```bash
npm install
npm run dev
```

По умолчанию Vite поднимается на `http://localhost:5173`.

## Проверки

```bash
npm run lint
npm run build
```

## API

Frontend ожидает backend на `/api`. Для другого адреса можно задать:

```env
VITE_API_URL=http://localhost:4000/api
```

DataLens является единственным источником бизнес-данных. Локальная БД хранит только auth/onboarding, а frontend получает артистов, релизы, доходы и баланс через backend JSON-витрины DataLens.
