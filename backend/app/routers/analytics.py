"""
Analytics — агрегаты из ClickHouse для дашбордов оператора и менеджера.
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, UserRole, Store, Order, OrderStatus
from app.routers.auth import get_current_user
from app.clickhouse import ch_execute

router = APIRouter()


def _require_staff(user: User):
    if user.role not in (UserRole.superadmin, UserRole.network_manager, UserRole.store_operator):
        raise HTTPException(status_code=403, detail="Недостаточно прав")


@router.get("/summary")
async def analytics_summary(
    store_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Сводка по даркстору на сегодня — orders / revenue / avg assembly."""
    _require_staff(current_user)
    sid = str(store_id)
    try:
        rows = await ch_execute(
            """
            SELECT
                count(DISTINCT order_id) AS orders_today,
                sum(if(event_type = 'delivered', amount, 0)) AS revenue_today,
                count(DISTINCT if(event_type = 'cancelled', order_id, NULL)) AS cancelled
            FROM order_events
            WHERE store_id = {store_id:UUID}
              AND toDate(event_time) = today()
            """,
            params={"store_id": sid},
        )
        s = rows[0] if rows else {}
        orders_today = int(s.get("orders_today") or 0)
        revenue_today = float(s.get("revenue_today") or 0.0)
        cancelled = int(s.get("cancelled") or 0)
    except Exception:
        # Fallback к Postgres если ClickHouse недоступен
        from sqlalchemy import func, and_, cast, Date
        result = await db.execute(
            select(
                func.count(Order.id),
                func.coalesce(func.sum(Order.total_amount), 0.0),
            ).where(
                and_(
                    Order.store_id == store_id,
                    func.date(Order.created_at) == datetime.utcnow().date(),
                    Order.status == OrderStatus.delivered,
                )
            )
        )
        oc, rev = result.one()
        orders_today, revenue_today, cancelled = int(oc), float(rev), 0

    return {
        "store_id": sid,
        "orders_today": orders_today,
        "revenue_today": round(revenue_today, 2),
        "cancelled_today": cancelled,
    }


@router.get("/network")
async def analytics_network(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Сводка по всей сети клиента (для network_manager)."""
    if current_user.role not in (UserRole.superadmin, UserRole.network_manager):
        raise HTTPException(status_code=403, detail="Только для менеджера сети")

    q = select(Store).where(Store.is_active == True)
    if current_user.client_id:
        q = q.where(Store.client_id == current_user.client_id)
    stores = (await db.execute(q)).scalars().all()

    out = []
    for s in stores:
        try:
            rows = await ch_execute(
                """
                SELECT
                    count(DISTINCT order_id) AS orders,
                    sum(if(event_type='delivered', amount, 0)) AS revenue
                FROM order_events
                WHERE store_id = {sid:UUID} AND toDate(event_time) = today()
                """,
                params={"sid": str(s.id)},
            )
            r = rows[0] if rows else {}
        except Exception:
            r = {}
        out.append({
            "store_id": str(s.id),
            "name": s.name,
            "address": s.address,
            "lat": s.lat,
            "lng": s.lng,
            "is_active": s.is_active,
            "orders_today": int(r.get("orders") or 0),
            "revenue_today": round(float(r.get("revenue") or 0.0), 2),
        })
    return {"stores": out}


@router.get("/top-products")
async def top_products(
    store_id: uuid.UUID = Query(...),
    days: int = Query(7, ge=1, le=90),
    limit: int = Query(20, le=100),
    current_user: User = Depends(get_current_user),
):
    _require_staff(current_user)
    try:
        rows = await ch_execute(
            """
            SELECT product_id, any(product_name) AS name, sum(quantity) AS qty, sum(amount) AS revenue
            FROM order_events
            WHERE store_id = {sid:UUID}
              AND event_type = 'delivered'
              AND event_time >= now() - INTERVAL {days:UInt16} DAY
            GROUP BY product_id
            ORDER BY qty DESC
            LIMIT {limit:UInt16}
            """,
            params={"sid": str(store_id), "days": days, "limit": limit},
        )
    except Exception:
        rows = []
    return {"products": [{"product_id": str(r["product_id"]), "name": r.get("name", ""), "qty": int(r.get("qty") or 0), "revenue": round(float(r.get("revenue") or 0.0), 2)} for r in rows]}


@router.get("/forecast")
async def forecast_overview(
    store_id: uuid.UUID = Query(...),
    hours_ahead: int = Query(12, ge=1, le=72),
    current_user: User = Depends(get_current_user),
):
    """Прогноз по всем SKU в ближайшие N часов — для дашборда менеджера."""
    _require_staff(current_user)
    try:
        rows = await ch_execute(
            """
            SELECT product_id, sum(predicted_qty) AS qty, avg(confidence) AS conf
            FROM demand_forecasts FINAL
            WHERE store_id = {sid:UUID}
              AND forecast_time BETWEEN now() AND now() + INTERVAL {hours:UInt16} HOUR
            GROUP BY product_id
            ORDER BY qty DESC
            LIMIT 50
            """,
            params={"sid": str(store_id), "hours": hours_ahead},
        )
    except Exception:
        rows = []
    return {
        "store_id": str(store_id),
        "hours_ahead": hours_ahead,
        "items": [
            {"product_id": str(r["product_id"]), "predicted_qty": round(float(r.get("qty") or 0), 2), "confidence": round(float(r.get("conf") or 0), 2)}
            for r in rows
        ],
    }


@router.get("/hourly")
async def hourly_orders(
    store_id: uuid.UUID = Query(...),
    days: int = Query(1, ge=1, le=7),
    current_user: User = Depends(get_current_user),
):
    """Заказы по часам (для графика)."""
    _require_staff(current_user)
    try:
        rows = await ch_execute(
            """
            SELECT toStartOfHour(event_time) AS hour, count(DISTINCT order_id) AS orders, sum(amount) AS revenue
            FROM order_events
            WHERE store_id = {sid:UUID}
              AND event_type = 'delivered'
              AND event_time >= now() - INTERVAL {days:UInt16} DAY
            GROUP BY hour
            ORDER BY hour ASC
            """,
            params={"sid": str(store_id), "days": days},
        )
    except Exception:
        rows = []
    return {"buckets": [{"hour": r["hour"].isoformat() if hasattr(r["hour"], "isoformat") else str(r["hour"]), "orders": int(r.get("orders") or 0), "revenue": round(float(r.get("revenue") or 0), 2)} for r in rows]}
