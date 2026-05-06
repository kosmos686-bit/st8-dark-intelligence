-- ST8 Dark Intelligence — ClickHouse аналитическая схема

-- ─── СОБЫТИЯ ЗАКАЗОВ ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_events (
    event_time    DateTime,
    store_id      UUID,
    order_id      UUID,
    customer_id   UUID,
    event_type    Enum8(
        'created'    = 1,
        'confirmed'  = 2,
        'assembling' = 3,
        'assembled'  = 4,
        'delivering' = 5,
        'delivered'  = 6,
        'cancelled'  = 7
    ),
    product_id    UUID,
    product_name  String,
    category      String,
    quantity      UInt16,
    amount        Decimal(10, 2),
    hour_of_day   UInt8,
    day_of_week   UInt8,    -- 1=пн, 7=вс
    weather_temp  Float32   -- температура воздуха
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (store_id, event_time, product_id)
TTL event_time + INTERVAL 2 YEAR;

-- ─── СНАПШОТЫ ОСТАТКОВ ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_snapshots (
    snapshot_time     DateTime,
    store_id          UUID,
    product_id        UUID,
    product_name      String,
    category          String,
    quantity          Int32,
    reserved_quantity Int32,
    expiry_hours_left Float32   -- часов до истечения
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(snapshot_time)
ORDER BY (store_id, product_id, snapshot_time)
TTL snapshot_time + INTERVAL 90 DAY;

-- ─── ПРОГНОЗЫ СПРОСА ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS demand_forecasts (
    forecast_time  DateTime,
    store_id       UUID,
    product_id     UUID,
    horizon_hours  UInt8,       -- на сколько часов вперёд
    predicted_qty  Float32,
    confidence     Float32      -- 0.0–1.0
)
ENGINE = ReplacingMergeTree()
PARTITION BY toYYYYMM(forecast_time)
ORDER BY (store_id, product_id, forecast_time, horizon_hours)
TTL forecast_time + INTERVAL 7 DAY;

-- ─── СОБЫТИЯ ЗАМЕН ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS substitution_events (
    event_time             DateTime,
    store_id               UUID,
    order_id               UUID,
    original_product_id    UUID,
    substitute_product_id  UUID,
    ai_confidence          Float32,
    customer_approved      Nullable(UInt8)  -- 1=да, 0=нет, NULL=нет ответа
)
ENGINE = MergeTree()
ORDER BY (store_id, event_time)
TTL event_time + INTERVAL 1 YEAR;

-- ─── МЕТРИКИ ДАРКСТОРА ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_metrics (
    metric_time          DateTime,
    store_id             UUID,
    orders_count         UInt32,
    avg_assembly_minutes Float32,
    avg_delivery_minutes Float32,
    cancellation_rate    Float32,
    write_off_amount     Decimal(10, 2),  -- списания
    revenue              Decimal(10, 2)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(metric_time)
ORDER BY (store_id, metric_time)
TTL metric_time + INTERVAL 3 YEAR;

-- ─── МАТЕРИАЛИЗОВАННЫЕ ПРЕДСТАВЛЕНИЯ ──────────────────────────────

-- Продажи по часам для прогнозирования
CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_sales_mv
ENGINE = SummingMergeTree()
ORDER BY (store_id, product_id, hour_of_day, day_of_week)
AS SELECT
    store_id,
    product_id,
    hour_of_day,
    day_of_week,
    sum(quantity) AS total_qty,
    count() AS order_count
FROM order_events
WHERE event_type = 'delivered'
GROUP BY store_id, product_id, hour_of_day, day_of_week;
