"""
Celery задачи AI: прогнозы, скоропорт, кухня, снапшоты.
"""
import asyncio
import logging
from datetime import datetime

from sqlalchemy import select

from app.tasks.celery_app import celery_app
from app.database import async_session_maker
from app.models import Store, Inventory, Product
from app.ai.demand_forecast import forecast_for_store
from app.ai.perishable_ai import assess_all_stores
from app.ai.kitchen_ai import plan_all_stores
from app.clickhouse import ch_insert

log = logging.getLogger(__name__)


def _run_async(coro):
    """Унифицированный запуск async из sync Celery worker."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            raise RuntimeError("closed")
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


async def _list_active_stores() -> list[str]:
    async with async_session_maker() as db:
        result = await db.execute(select(Store).where(Store.is_active == True))
        return [str(s.id) for s in result.scalars().all()]


@celery_app.task(name="app.tasks.forecast_tasks.run_demand_forecast")
def run_demand_forecast() -> dict:
    """Каждый час — пересчёт прогнозов спроса по всем дарксторам."""
    async def _impl():
        out: dict[str, int] = {}
        for store_id in await _list_active_stores():
            try:
                out[store_id] = await forecast_for_store(store_id)
            except Exception as e:
                log.error("Forecast failed for %s: %s", store_id, e)
                out[store_id] = -1
        return out
    return _run_async(_impl())


@celery_app.task(name="app.tasks.forecast_tasks.check_perishables")
def check_perishables() -> dict:
    """Каждые 30 минут — оценка риска списания."""
    async def _impl():
        async with async_session_maker() as db:
            result = await assess_all_stores(db)
            await db.commit()
            return result
    return _run_async(_impl())


@celery_app.task(name="app.tasks.forecast_tasks.plan_kitchen_tasks")
def plan_kitchen_tasks() -> dict:
    """Каждый час — автопланирование производства горячих блюд."""
    async def _impl():
        async with async_session_maker() as db:
            result = await plan_all_stores(db)
            await db.commit()
            return result
    return _run_async(_impl())


@celery_app.task(name="app.tasks.forecast_tasks.snapshot_inventory")
def snapshot_inventory() -> int:
    """Каждые 15 минут — снапшот остатков в ClickHouse."""
    async def _impl():
        rows = []
        snapshot_time = datetime.utcnow()
        async with async_session_maker() as db:
            result = await db.execute(
                select(Inventory, Product).join(Product, Inventory.product_id == Product.id)
            )
            for inv, product in result.all():
                hours_left = -1.0
                if inv.expiry_at:
                    hours_left = max(0.0, (inv.expiry_at - snapshot_time).total_seconds() / 3600)
                rows.append({
                    "snapshot_time": snapshot_time,
                    "store_id": str(inv.store_id),
                    "product_id": str(inv.product_id),
                    "product_name": product.name,
                    "category": product.category,
                    "quantity": int(inv.quantity),
                    "reserved_quantity": int(inv.reserved_quantity),
                    "expiry_hours_left": float(hours_left),
                })
        if rows:
            await ch_insert("inventory_snapshots", rows)
        return len(rows)
    return _run_async(_impl())
