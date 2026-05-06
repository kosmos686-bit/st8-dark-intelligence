# ST8 Dark Intelligence — CLAUDE.md
# AI-операционная платформа для dark store сетей
# Версия: 1.0.0 | Компания: ST8-AI (st8-ai.ru)

## 🎯 МИССИЯ ПРОЕКТА

**ST8 Dark Intelligence** — SaaS-платформа полного цикла для управления dark store сетями.
Лучше Яндекс Лавки, Самоката и любого существующего решения.

**Ключевые преимущества перед конкурентами:**
- AI-прогноз спроса по каждому SKU (ClickHouse + ML)
- Smart Substitution — замены с объяснением покупателю
- Kitchen AI — управление горячей кухней в дарксторе
- Real-time операционный дашборд для сети 1–100+ точек
- Perishable AI — управление скоропортом, -25% списаний
- Полный self-hosted, данные остаются у клиента

---

## 🏗️ АРХИТЕКТУРА

### Стек
```
Backend:    FastAPI 0.115+ (Python 3.12)
Database:   PostgreSQL 16 (основные данные)
Analytics:  ClickHouse 24 (события, аналитика, ML-фичи)
Cache:      Redis 7 (сессии, очереди, pub/sub)
Queue:      Celery + Redis (фоновые задачи)
Frontend:   Next.js 15 (App Router) + TypeScript 5
Styling:    Tailwind CSS 3.4 + shadcn/ui
Mobile:     PWA (фаза 1) → Flutter (фаза 2)
AI:         Anthropic Claude API (claude-sonnet-4-20250514)
Infra:      Docker Compose (dev) → docker swarm (prod)
Migrations: Alembic
Auth:       JWT + refresh tokens (httpOnly cookies)
WebSocket:  FastAPI WebSocket (real-time уведомления)
Push:       Web Push API (PWA уведомления)
```

### Структура репозитория
```
st8-dark/
├── CLAUDE.md                    # этот файл
├── docker-compose.yml           # полный стек
├── docker-compose.dev.yml       # dev override
├── Makefile                     # команды
├── .env.example
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic/
│   │   ├── alembic.ini
│   │   └── versions/
│   ├── app/
│   │   ├── main.py              # точка входа FastAPI
│   │   ├── config.py            # настройки (pydantic-settings)
│   │   ├── database.py          # SQLAlchemy async engine
│   │   ├── clickhouse.py        # ClickHouse async client
│   │   ├── redis_client.py      # Redis client
│   │   │
│   │   ├── models/              # SQLAlchemy модели
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── store.py
│   │   │   ├── product.py
│   │   │   ├── order.py
│   │   │   ├── inventory.py
│   │   │   └── kitchen.py
│   │   │
│   │   ├── schemas/             # Pydantic схемы
│   │   │   ├── user.py
│   │   │   ├── store.py
│   │   │   ├── product.py
│   │   │   ├── order.py
│   │   │   ├── inventory.py
│   │   │   └── ai.py
│   │   │
│   │   ├── routers/             # API роуты
│   │   │   ├── auth.py
│   │   │   ├── stores.py
│   │   │   ├── products.py
│   │   │   ├── orders.py
│   │   │   ├── inventory.py
│   │   │   ├── kitchen.py
│   │   │   ├── analytics.py
│   │   │   ├── ai.py
│   │   │   └── ws.py            # WebSocket
│   │   │
│   │   ├── services/            # бизнес-логика
│   │   │   ├── auth_service.py
│   │   │   ├── order_service.py
│   │   │   ├── inventory_service.py
│   │   │   ├── substitution_service.py
│   │   │   ├── kitchen_service.py
│   │   │   ├── forecast_service.py
│   │   │   └── notification_service.py
│   │   │
│   │   ├── ai/                  # AI модули
│   │   │   ├── perishable_ai.py     # прогноз списаний
│   │   │   ├── demand_forecast.py   # прогноз спроса
│   │   │   ├── substitution_ai.py   # умные замены
│   │   │   ├── kitchen_ai.py        # управление кухней
│   │   │   └── claude_client.py     # Anthropic API клиент
│   │   │
│   │   ├── tasks/               # Celery задачи
│   │   │   ├── celery_app.py
│   │   │   ├── forecast_tasks.py
│   │   │   ├── notification_tasks.py
│   │   │   └── cleanup_tasks.py
│   │   │
│   │   └── middleware/
│   │       ├── auth_middleware.py
│   │       └── logging_middleware.py
│   │
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── public/
│   │   ├── manifest.json        # PWA манифест
│   │   └── sw.js                # Service Worker
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx          # лендинг / редирект
│       │   ├── (auth)/
│       │   │   ├── login/
│       │   │   └── register/
│       │   ├── (operator)/       # роль: оператор даркстора
│       │   │   ├── layout.tsx
│       │   │   ├── dashboard/    # главный дашборд смены
│       │   │   ├── orders/       # очередь заказов
│       │   │   ├── picking/      # сборка заказа (мобильно)
│       │   │   ├── inventory/    # остатки + алерты
│       │   │   └── kitchen/      # управление кухней
│       │   ├── (manager)/        # роль: менеджер сети
│       │   │   ├── layout.tsx
│       │   │   ├── network/      # карта всех точек
│       │   │   ├── analytics/    # ClickHouse дашборды
│       │   │   ├── forecast/     # прогноз спроса
│       │   │   └── reports/
│       │   ├── (courier)/        # роль: курьер (PWA)
│       │   │   ├── layout.tsx
│       │   │   ├── route/        # маршрут доставки
│       │   │   └── delivery/     # активная доставка
│       │   └── (customer)/       # роль: покупатель
│       │       ├── layout.tsx
│       │       ├── catalog/
│       │       ├── cart/
│       │       ├── checkout/
│       │       └── tracking/     # real-time трекинг
│       │
│       ├── components/
│       │   ├── ui/               # shadcn/ui компоненты
│       │   ├── charts/           # ClickHouse чарты
│       │   ├── map/              # карта курьеров
│       │   ├── notifications/    # push + WebSocket
│       │   └── ai/               # AI-виджеты
│       │
│       ├── hooks/
│       │   ├── useWebSocket.ts
│       │   ├── useNotifications.ts
│       │   └── useRealtime.ts
│       │
│       ├── lib/
│       │   ├── api.ts            # API клиент (fetch wrapper)
│       │   ├── auth.ts
│       │   └── push.ts           # Web Push helper
│       │
│       └── types/
│           └── index.ts
│
└── infra/
    ├── nginx/
    │   └── nginx.conf
    ├── clickhouse/
    │   └── init.sql
    └── postgres/
        └── init.sql
```

---

## 👥 РОЛИ И ДОСТУПЫ

| Роль | Описание | Интерфейс |
|------|----------|-----------|
| `superadmin` | ST8-AI — полный доступ | все |
| `network_manager` | менеджер сети клиента | manager panel |
| `store_operator` | оператор конкретного даркстора | operator panel |
| `courier` | курьер | PWA mobile |
| `customer` | покупатель | customer app |

---

## 🗄️ МОДЕЛИ ДАННЫХ (PostgreSQL)

### users
```sql
id UUID PK
email VARCHAR UNIQUE
phone VARCHAR UNIQUE
password_hash VARCHAR
role ENUM(superadmin, network_manager, store_operator, courier, customer)
store_id UUID FK → stores (nullable, для операторов)
name VARCHAR
avatar_url VARCHAR
is_active BOOLEAN DEFAULT true
created_at TIMESTAMP
updated_at TIMESTAMP
```

### stores (дарксторы)
```sql
id UUID PK
name VARCHAR
address TEXT
lat DECIMAL(10,8)
lng DECIMAL(11,8)
timezone VARCHAR DEFAULT 'Europe/Moscow'
is_active BOOLEAN
has_kitchen BOOLEAN DEFAULT false
area_sqm INTEGER
max_orders_per_hour INTEGER
client_id UUID FK → clients
created_at TIMESTAMP
```

### clients (организации-клиенты SaaS)
```sql
id UUID PK
name VARCHAR          -- 'Азбука Вкуса'
plan ENUM(pilot, scale, network)
stores_limit INTEGER
api_key VARCHAR UNIQUE
created_at TIMESTAMP
```

### products (SKU)
```sql
id UUID PK
client_id UUID FK
sku VARCHAR
name VARCHAR
category VARCHAR
subcategory VARCHAR
price DECIMAL(10,2)
weight_g INTEGER
is_perishable BOOLEAN
shelf_life_hours INTEGER    -- срок хранения в часах
requires_cold BOOLEAN
image_url VARCHAR
barcode VARCHAR
is_active BOOLEAN
```

### inventory (остатки)
```sql
id UUID PK
store_id UUID FK
product_id UUID FK
quantity INTEGER
reserved_quantity INTEGER   -- зарезервировано в заказах
expiry_at TIMESTAMP         -- когда истекает текущая партия
batch_id VARCHAR
updated_at TIMESTAMP
```

### orders
```sql
id UUID PK
store_id UUID FK
customer_id UUID FK
courier_id UUID FK (nullable)
status ENUM(pending, confirmed, assembling, assembled, picked_up, delivering, delivered, cancelled)
items JSONB                 -- [{product_id, qty, price, substituted_with}]
total_amount DECIMAL(10,2)
delivery_address TEXT
delivery_lat DECIMAL
delivery_lng DECIMAL
estimated_delivery_at TIMESTAMP
actual_delivery_at TIMESTAMP
picker_id UUID FK           -- кто собирал
assembly_started_at TIMESTAMP
assembly_finished_at TIMESTAMP
notes TEXT
created_at TIMESTAMP
```

### kitchen_tasks
```sql
id UUID PK
store_id UUID FK
product_id UUID FK          -- блюдо
quantity INTEGER
scheduled_for TIMESTAMP     -- когда должно быть готово
started_at TIMESTAMP
finished_at TIMESTAMP
status ENUM(planned, cooking, ready, sold, cancelled)
created_by ENUM(ai, manual)
```

### substitutions (история замен)
```sql
id UUID PK
order_id UUID FK
original_product_id UUID FK
substitute_product_id UUID FK
reason TEXT
ai_confidence DECIMAL(3,2)
customer_approved BOOLEAN
customer_response_at TIMESTAMP
created_at TIMESTAMP
```

---

## 📊 CLICKHOUSE СХЕМА (аналитика)

### order_events
```sql
event_time DateTime,
store_id UUID,
order_id UUID,
event_type Enum('created','confirmed','assembling','delivered','cancelled'),
product_id UUID,
quantity UInt16,
amount Decimal(10,2),
hour_of_day UInt8,
day_of_week UInt8,
weather_temp Float32
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (store_id, event_time)
```

### inventory_snapshots (каждые 15 мин)
```sql
snapshot_time DateTime,
store_id UUID,
product_id UUID,
quantity Int32,
expiry_hours_left Float32,
ENGINE = MergeTree()
ORDER BY (store_id, product_id, snapshot_time)
```

### demand_forecasts (результаты ML)
```sql
forecast_time DateTime,
store_id UUID,
product_id UUID,
horizon_hours UInt8,
predicted_qty Float32,
confidence Float32,
ENGINE = ReplacingMergeTree()
ORDER BY (store_id, product_id, forecast_time, horizon_hours)
```

---

## 🤖 AI МОДУЛИ

### 1. Perishable AI (`ai/perishable_ai.py`)
**Задача:** предсказать риск списания для каждого SKU в ближайшие N часов.

**Входные данные:**
- текущие остатки + дата истечения
- исторические продажи (ClickHouse, 90 дней)
- прогноз спроса на ближайшие часы
- день недели, время суток, погода

**Выходные данные:**
- `risk_score` 0.0–1.0 для каждого продукта
- рекомендация: `promote` / `discount` / `transfer` / `use_in_kitchen`
- алерт в WebSocket если risk > 0.7

**Логика:**
```python
# Каждые 30 минут Celery запускает forecast_tasks.check_perishables()
# Для каждого store → для каждого SKU с expiry < 24h:
#   1. Получить прогноз продаж из demand_forecast (ClickHouse)
#   2. Сравнить с текущим остатком
#   3. Если остаток > прогноз * 1.2 → risk high
#   4. Вызвать claude_client.get_action_recommendation()
#   5. Сохранить в Redis, push через WebSocket
```

### 2. Demand Forecast (`ai/demand_forecast.py`)
**Логика:** скользящее среднее по дням недели + час суток + тренд.
- Читает `order_events` из ClickHouse за 90 дней
- Строит прогноз на 24 часа вперёд по каждому SKU
- Обновляет `demand_forecasts` в ClickHouse каждый час
- Используется Perishable AI и Kitchen AI

### 3. Substitution AI (`ai/substitution_ai.py`)
**Задача:** при отсутствии товара найти лучшую замену.

**Алгоритм:**
1. Найти товары той же категории с наличием > 0
2. Ранжировать по: близость цены (40%), схожесть названия (30%), рейтинг замены у этого клиента (30%)
3. Вызвать Claude API для генерации объяснения замены на русском
4. Отправить push покупателю с кнопками "Принять" / "Отменить"
5. Сохранить результат в `substitutions` для обучения

**Промпт Claude:**
```
Ты помощник сервиса доставки продуктов. Покупатель заказал {original_product}, 
но его нет в наличии. Мы предлагаем замену: {substitute_product}.
Напиши короткое (2 предложения), дружелюбное объяснение почему эта замена хорошая.
Стиль: тёплый, уверенный, без извинений.
```

### 4. Kitchen AI (`ai/kitchen_ai.py`)
**Задача:** автоматически планировать производство горячей еды.

**Логика:**
1. Каждый час читает прогноз спроса на горячие блюда (следующие 3 часа)
2. Вычитает текущий готовый остаток
3. Формирует `kitchen_tasks` на производство
4. Учитывает время приготовления каждого блюда
5. Алерты операторам кухни через WebSocket

### 5. Claude Client (`ai/claude_client.py`)
```python
import anthropic

client = anthropic.AsyncAnthropic()

async def get_completion(system: str, user: str, max_tokens: int = 500) -> str:
    message = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}]
    )
    return message.content[0].text
```

---

## 🔔 УВЕДОМЛЕНИЯ (Real-time)

### WebSocket (`routers/ws.py`)
```
ws://api/ws/{role}/{user_id}?token=...
```

**Каналы:**
- `operator:{store_id}` — новый заказ, алерт остатков, задача кухни
- `courier:{courier_id}` — новый заказ на доставку, изменение маршрута
- `customer:{customer_id}` — статус заказа, запрос замены, доставлен
- `manager:{client_id}` — аномалии, сводка по сети

**Типы сообщений:**
```typescript
type WSMessage = {
  type: 'new_order' | 'order_update' | 'inventory_alert' | 
        'substitution_request' | 'kitchen_task' | 'anomaly'
  payload: object
  timestamp: string
}
```

### Web Push (PWA)
- VAPID ключи генерируются при деплое
- Подписка хранится в PostgreSQL (`push_subscriptions`)
- Используется для курьеров и покупателей (фоновые уведомления)
- Celery таска `notification_tasks.send_push()`

---

## 🔐 БЕЗОПАСНОСТЬ

**Обязательно:**
- [ ] JWT access token 15 мин + refresh token 30 дней (httpOnly cookie)
- [ ] Rate limiting: 100 req/min per IP (slowapi)
- [ ] CORS: только доверенные домены
- [ ] Все пароли bcrypt rounds=12
- [ ] SQL через SQLAlchemy ORM (без raw SQL)
- [ ] Валидация всех входящих данных через Pydantic
- [ ] Логирование всех AI-запросов (стоимость, latency)
- [ ] HTTPS only (nginx termination)
- [ ] Secrets только через env variables, никогда в коде
- [ ] Security review на каждый новый роутер

**Переменные окружения (никогда не коммитить):**
```
ANTHROPIC_API_KEY=
DATABASE_URL=postgresql+asyncpg://...
CLICKHOUSE_URL=
REDIS_URL=
JWT_SECRET=
VAPID_PRIVATE_KEY=
VAPID_PUBLIC_KEY=
```

---

## 🐳 DOCKER COMPOSE

### Сервисы:
- `postgres` — основная БД, порт 5432
- `clickhouse` — аналитика, порт 8123/9000
- `redis` — кэш + очередь, порт 6379
- `backend` — FastAPI, порт 8000
- `celery_worker` — фоновые задачи
- `celery_beat` — расписание (прогнозы каждый час)
- `frontend` — Next.js, порт 3000
- `nginx` — reverse proxy, порты 80/443

---

## ⚡ ПРОИЗВОДИТЕЛЬНОСТЬ

- Все DB операции async (asyncpg, aiochclient)
- ClickHouse запросы: timeout 10s, кэш в Redis 5 мин
- Forecast расчёты: Celery workers (не блокируют API)
- Frontend: ISR для каталога, SSE для real-time данных
- Images: next/image с CDN

---

## 📱 PWA (мобильный интерфейс)

**manifest.json:**
```json
{
  "name": "ST8 Dark",
  "short_name": "ST8",
  "theme_color": "#0A0F1A",
  "background_color": "#0A0F1A",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "icons": [...]
}
```

**Service Worker (`sw.js`):**
- Кэширование каталога и статики
- Background sync для офлайн-заказов курьера
- Push уведомления

---

## 🚀 КОМАНДЫ РАЗРАБОТКИ

```bash
# Первый запуск
make setup          # копирует .env.example → .env
make build          # docker compose build
make up             # запускает все сервисы
make migrate        # alembic upgrade head
make seed           # загружает тестовые данные

# Разработка
make dev            # hot reload backend + frontend
make logs           # все логи
make logs-backend   # только backend
make shell-backend  # bash внутри контейнера

# База данных
make db-shell       # psql
make ch-shell       # clickhouse-client
make migration msg="add kitchen_tasks"  # создать миграцию

# AI
make test-ai        # тест всех AI модулей
make forecast       # запустить прогноз вручную

# Деплой
make prod-build     # сборка для production
make prod-up        # запуск в production режиме
```

---

## 📋 ПОРЯДОК РЕАЛИЗАЦИИ

### Фаза 1 — Ядро (недели 1–2)
1. Docker Compose + все сервисы подняты
2. PostgreSQL схема + Alembic миграции
3. ClickHouse схема + init.sql
4. FastAPI: auth (JWT), users, stores, products
5. Next.js: auth страницы, layout по ролям
6. Базовый WebSocket (ping/pong)

### Фаза 2 — Операции (недели 3–4)
1. Orders API + статусная машина
2. Inventory API + алерты
3. Operator Panel: очередь заказов, сборка (picking UI)
4. Customer App: каталог, корзина, оформление, трекинг
5. Courier PWA: маршрут, подтверждение доставки
6. Web Push уведомления

### Фаза 3 — AI (недели 5–6)
1. Demand Forecast (ClickHouse + Celery)
2. Perishable AI + алерты операторам
3. Substitution AI + push покупателю
4. Kitchen AI + планирование кухни
5. Manager Dashboard: карта сети, аналитика

### Фаза 4 — Полировка (неделя 7–8)
1. Security review
2. Performance оптимизация
3. Seed данные для демо Азбуке Вкуса
4. Документация API (FastAPI autodocs)
5. Нагрузочное тестирование

---

## 🎯 МЕТРИКИ УСПЕХА (обещаем Азбуке Вкуса)

| Метрика | Цель |
|---------|------|
| Списания скоропорта | -25% за 60 дней |
| Средний чек (сеты) | +18% |
| Одобрение замен покупателями | >95% |
| Время сборки заказа | <4 мин |
| Доставка | 15–30 мин |
| Uptime платформы | 99.9% |

---

## 🔗 КОНТАКТЫ ST8-AI

- Алексей Гагарин: @Zzima686 / kosmos686@gmail.com
- Юлия Попова: @P2024_1
- GitHub: kosmos686-bit
- Workspace: C:\st8-workspace
