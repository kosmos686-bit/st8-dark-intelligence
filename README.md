# ST8 Dark Intelligence

AI-операционная платформа полного цикла для управления dark store сетями.

## Стек

| Слой | Технология |
|------|-----------|
| Backend | FastAPI 0.115 + Python 3.12 |
| Database | PostgreSQL 16 |
| Analytics | ClickHouse 24 |
| Cache / Queue | Redis 7 + Celery |
| Frontend | Next.js 15 + TypeScript + Tailwind CSS |
| AI | Anthropic Claude (claude-sonnet-4-20250514) |
| Infra | Docker Compose → Docker Swarm |
| Auth | JWT (access 15 min + refresh 30 days, httpOnly cookie) |
| Push | Web Push API (VAPID) |
| Real-time | WebSocket (FastAPI) |

## AI модули

- **Perishable AI** — прогноз риска списания скоропорта, -25% потерь
- **Demand Forecast** — прогноз спроса по SKU на 24 ч (ClickHouse + Celery)
- **Substitution AI** — умные замены с объяснением покупателю через Claude
- **Kitchen AI** — автопланирование производства горячей еды

## Быстрый старт

```bash
# 1. Скопируй .env и заполни переменные
make setup

# 2. Собери контейнеры
make build

# 3. Запусти стек
make up

# 4. Применить миграции
make migrate

# 5. Загрузить тестовые данные
make seed
```

Сервисы после запуска:
- **API + Swagger:** http://localhost:8000/docs
- **Frontend:** http://localhost:3000
- **ClickHouse HTTP:** http://localhost:8123

## Структура

```
st8-dark/
├── backend/          # FastAPI + SQLAlchemy + Alembic
│   ├── app/
│   │   ├── models/   # PostgreSQL модели (все роли, заказы, кухня)
│   │   ├── routers/  # REST API: auth, stores, products, orders, ...
│   │   ├── ai/       # Claude-powered модули
│   │   └── tasks/    # Celery задачи (прогнозы, уведомления)
│   └── alembic/      # Миграции БД
├── frontend/         # Next.js 15 App Router
│   └── src/app/
│       ├── (auth)/   # login / register
│       ├── (operator)/ # панель оператора даркстора
│       └── (manager)/  # панель менеджера сети
├── infra/
│   ├── nginx/        # Reverse proxy
│   ├── postgres/     # init.sql
│   └── clickhouse/   # init.sql (аналитика, ML-фичи)
└── docker-compose.yml
```

## Роли

| Роль | Описание |
|------|----------|
| `superadmin` | ST8-AI — полный доступ |
| `network_manager` | Менеджер сети клиента |
| `store_operator` | Оператор конкретного даркстора |
| `courier` | Курьер (PWA) |
| `customer` | Покупатель |

## Переменные окружения

Заполни `.env` (создаётся из `.env.example` командой `make setup`):

```env
POSTGRES_PASSWORD=...
CLICKHOUSE_PASSWORD=...
REDIS_PASSWORD=...
JWT_SECRET=...           # openssl rand -hex 32
ANTHROPIC_API_KEY=sk-ant-...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

## Разработка

```bash
make dev            # hot reload backend + frontend
make logs-backend   # логи FastAPI
make db-shell       # psql
make migration msg="add orders"   # создать миграцию
make test-ai        # проверить AI модули
```

## Метрики успеха

| Метрика | Цель |
|---------|------|
| Списания скоропорта | -25% за 60 дней |
| Одобрение замен | >95% |
| Время сборки заказа | <4 мин |
| Uptime | 99.9% |

---

ST8-AI · kosmos686@gmail.com · [st8-ai.ru](https://st8-ai.ru)
