"""
Demand Forecast — прогноз спроса на 24 часа вперёд по каждому SKU.

Логика:
1. Читает agregated hourly_sales_mv из ClickHouse за 90 дней
2. Скользящее среднее по (hour_of_day, day_of_week) + поправка на тренд
3. Записывает прогнозы в demand_forecasts
"""
import logging
from datetime import datetime, timedelta
from app.clickhouse import ch_execute, ch_insert

log = logging.getLogger(__name__)


async def forecast_for_store(store_id: str, horizon_hours: int = 24) -> int:
    """
    Построить прогноз для всех SKU даркстора. Возвращает число записанных строк.
    """
    now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    rows = []

    # Берём агрегаты доставленных заказов за 90 дней
    base = await ch_execute(
        """
        SELECT product_id, hour_of_day, day_of_week, sum(quantity) AS qty, count() AS orders
        FROM order_events
        WHERE store_id = {store_id:UUID}
          AND event_type = 'delivered'
          AND event_time >= now() - INTERVAL 90 DAY
        GROUP BY product_id, hour_of_day, day_of_week
        """,
        params={"store_id": store_id},
    )

    if not base:
        return 0

    # Группируем для быстрого доступа
    bucket: dict[tuple, dict] = {}
    for r in base:
        key = (str(r["product_id"]), int(r["hour_of_day"]), int(r["day_of_week"]))
        bucket[key] = {"qty": float(r["qty"]), "orders": int(r["orders"])}

    # 90 дней покрывают ~12 повторов каждой пары (час, день недели)
    weeks = 12

    for h in range(1, horizon_hours + 1):
        target = now + timedelta(hours=h)
        hod = target.hour
        dow = target.isoweekday()  # 1..7

        for key, agg in bucket.items():
            product_id, k_hour, k_dow = key
            if k_hour != hod or k_dow != dow:
                continue
            avg_qty = agg["qty"] / weeks
            confidence = min(1.0, agg["orders"] / 30)

            rows.append({
                "forecast_time": target,
                "store_id": store_id,
                "product_id": product_id,
                "horizon_hours": h,
                "predicted_qty": round(avg_qty, 2),
                "confidence": round(confidence, 2),
            })

    if rows:
        await ch_insert("demand_forecasts", rows)
        log.info("Forecast: %s rows for store=%s", len(rows), store_id)

    return len(rows)


async def get_forecast(store_id: str, product_id: str, hours_ahead: int = 24) -> float:
    """Сумма прогнозируемого спроса по SKU на ближайшие N часов."""
    rows = await ch_execute(
        """
        SELECT sum(predicted_qty) AS qty
        FROM demand_forecasts FINAL
        WHERE store_id = {store_id:UUID}
          AND product_id = {product_id:UUID}
          AND forecast_time BETWEEN now() AND now() + INTERVAL {hours:UInt8} HOUR
        """,
        params={"store_id": store_id, "product_id": product_id, "hours": hours_ahead},
    )
    if not rows:
        return 0.0
    return float(rows[0].get("qty") or 0.0)
