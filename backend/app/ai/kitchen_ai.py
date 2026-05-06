"""
Kitchen AI — автопланирование производства горячих блюд.

Логика:
  1. Раз в час читает прогноз спроса на kitchen items на 3 часа вперёд
  2. Вычитает текущий готовый остаток
  3. С учётом cooking_time_minutes формирует kitchen_tasks с временем подачи
  4. Бродкастит уведомление операторам кухни
"""
import logging
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models import Product, Inventory, KitchenTask, KitchenTaskStatus, Store
from app.ai.demand_forecast import get_forecast
from app.routers.ws import manager as ws_manager

log = logging.getLogger(__name__)

PLANNING_HORIZON_HOURS = 3


async def plan_for_store(db: AsyncSession, store_id: str) -> list[dict]:
    """Сформировать kitchen_tasks для одного даркстора с кухней."""
    store_q = await db.execute(select(Store).where(Store.id == store_id))
    store = store_q.scalar_one_or_none()
    if not store or not store.has_kitchen:
        return []

    products_q = await db.execute(
        select(Product).where(
            and_(Product.client_id == store.client_id, Product.is_kitchen_item == True, Product.is_active == True)
        )
    )
    kitchen_products = products_q.scalars().all()

    created: list[dict] = []

    for product in kitchen_products:
        try:
            predicted = await get_forecast(store_id, str(product.id), PLANNING_HORIZON_HOURS)
        except Exception:
            predicted = 0.0
        if predicted < 1:
            continue

        inv_q = await db.execute(
            select(Inventory).where(and_(Inventory.store_id == store_id, Inventory.product_id == product.id))
        )
        inv = inv_q.scalar_one_or_none()
        ready_stock = inv.quantity if inv else 0

        # Уже в плане на ближайший час
        existing_q = await db.execute(
            select(KitchenTask).where(
                and_(
                    KitchenTask.store_id == store_id,
                    KitchenTask.product_id == product.id,
                    KitchenTask.status.in_([KitchenTaskStatus.planned, KitchenTaskStatus.cooking]),
                )
            )
        )
        already_planned = sum(t.quantity for t in existing_q.scalars().all())

        deficit = int(round(predicted)) - ready_stock - already_planned
        if deficit <= 0:
            continue

        cooking_minutes = product.cooking_time_minutes or 30
        scheduled_for = datetime.utcnow() + timedelta(minutes=cooking_minutes + 10)

        task = KitchenTask(
            store_id=store_id,
            product_id=product.id,
            quantity=deficit,
            scheduled_for=scheduled_for,
            status=KitchenTaskStatus.planned,
            created_by="ai",
        )
        db.add(task)
        await db.flush()

        item = {
            "task_id": str(task.id),
            "product_id": str(product.id),
            "product_name": product.name,
            "quantity": deficit,
            "scheduled_for": scheduled_for.isoformat(),
        }
        created.append(item)

        await ws_manager.broadcast_to_store(store_id, {
            "type": "kitchen_task",
            "payload": item,
            "timestamp": datetime.utcnow().isoformat(),
        })

    log.info("Kitchen plan store=%s tasks=%d", store_id, len(created))
    return created


async def plan_all_stores(db: AsyncSession) -> dict[str, int]:
    """Перебрать все дарксторы с кухней."""
    result = await db.execute(select(Store).where(and_(Store.is_active == True, Store.has_kitchen == True)))
    stores = result.scalars().all()
    out: dict[str, int] = {}
    for s in stores:
        tasks = await plan_for_store(db, str(s.id))
        out[str(s.id)] = len(tasks)
    return out
