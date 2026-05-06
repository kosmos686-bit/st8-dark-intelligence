"""
Резервирование остатков, освобождение, списание.
"""
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models import Inventory


async def reserve_items(db: AsyncSession, store_id: uuid.UUID, items: list[dict]) -> list[str]:
    """
    Зарезервировать товары под заказ.
    items: [{product_id, qty, ...}]
    Возвращает список product_id, которых не хватило.
    """
    short = []
    for item in items:
        result = await db.execute(
            select(Inventory).where(
                and_(Inventory.store_id == store_id, Inventory.product_id == uuid.UUID(item["product_id"]))
            )
        )
        inv = result.scalar_one_or_none()
        qty = int(item["qty"])
        if not inv or inv.available_quantity < qty:
            short.append(item["product_id"])
            continue
        inv.reserved_quantity += qty
    return short


async def release_items(db: AsyncSession, store_id: uuid.UUID, items: list[dict]) -> None:
    """Освободить резерв (отмена заказа до сборки)."""
    for item in items:
        result = await db.execute(
            select(Inventory).where(
                and_(Inventory.store_id == store_id, Inventory.product_id == uuid.UUID(item["product_id"]))
            )
        )
        inv = result.scalar_one_or_none()
        if inv:
            inv.reserved_quantity = max(0, inv.reserved_quantity - int(item["qty"]))


async def deduct_items(db: AsyncSession, store_id: uuid.UUID, items: list[dict]) -> None:
    """Списать товары при сборке заказа (резерв → реальное списание)."""
    for item in items:
        result = await db.execute(
            select(Inventory).where(
                and_(Inventory.store_id == store_id, Inventory.product_id == uuid.UUID(item["product_id"]))
            )
        )
        inv = result.scalar_one_or_none()
        if inv:
            qty = int(item["qty"])
            inv.quantity = max(0, inv.quantity - qty)
            inv.reserved_quantity = max(0, inv.reserved_quantity - qty)
