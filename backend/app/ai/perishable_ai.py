"""
Perishable AI — прогноз риска списания скоропорта.

Для каждого SKU с истечением < 24h:
  1. Спрогнозировать продажи на оставшийся срок
  2. Вычислить risk_score = 1 - (forecast / current_stock)
  3. Если risk > 0.7 → попросить у Claude action recommendation
  4. Бродкастнуть алерт в WebSocket
"""
import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models import Inventory, Product, Store
from app.ai.claude_client import get_completion
from app.ai.demand_forecast import get_forecast
from app.routers.ws import manager as ws_manager

log = logging.getLogger(__name__)

RISK_ALERT_THRESHOLD = 0.7


async def assess_store(db: AsyncSession, store_id: str) -> list[dict]:
    """
    Оценить риск списания для всех скоропортящихся SKU даркстора.
    Возвращает список словарей с риском >= порога.
    """
    threshold = datetime.utcnow() + timedelta(hours=24)

    result = await db.execute(
        select(Inventory, Product).join(Product, Inventory.product_id == Product.id).where(
            and_(
                Inventory.store_id == store_id,
                Inventory.expiry_at.is_not(None),
                Inventory.expiry_at <= threshold,
                Inventory.quantity > 0,
                Product.is_perishable == True,
            )
        )
    )

    risks: list[dict] = []
    for inv, product in result.all():
        hours_left = max(1, int((inv.expiry_at - datetime.utcnow()).total_seconds() / 3600))
        try:
            predicted = await get_forecast(store_id, str(inv.product_id), hours_left)
        except Exception as e:
            log.warning("Forecast unavailable, fallback: %s", e)
            predicted = 0.0

        # risk = доля остатка, которая не успеет продаться
        risk = max(0.0, min(1.0, 1 - (predicted / max(inv.quantity, 1))))
        if risk < RISK_ALERT_THRESHOLD:
            continue

        recommendation = await _recommend_action(product.name, inv.quantity, hours_left, predicted)

        item = {
            "inventory_id": str(inv.id),
            "product_id": str(inv.product_id),
            "product_name": product.name,
            "quantity": inv.quantity,
            "expiry_in_hours": hours_left,
            "predicted_sales": round(predicted, 1),
            "risk_score": round(risk, 2),
            "recommendation": recommendation,
        }
        risks.append(item)

        await ws_manager.broadcast_to_store(store_id, {
            "type": "inventory_alert",
            "payload": {**item, "kind": "perishable_risk"},
            "timestamp": datetime.utcnow().isoformat(),
        })

    log.info("Perishable check store=%s risks=%d", store_id, len(risks))
    return risks


async def _recommend_action(name: str, qty: int, hours_left: int, predicted: float) -> str:
    """Краткая рекомендация: discount / promote / transfer / use_in_kitchen."""
    system = (
        "Ты помощник оператора даркстора. Кратко (1 предложение) рекомендуй "
        "одно действие: скидка / промо / перевод в другой магазин / использовать в кухне. "
        "Без воды."
    )
    user = (
        f"Товар: {name}, остаток {qty} шт, истекает через {hours_left}ч, "
        f"прогноз продаж {predicted:.1f} шт. Что делать?"
    )
    try:
        return (await get_completion(system=system, user=user, max_tokens=80)).strip()
    except Exception:
        if predicted > qty * 0.3:
            return "Скидка 20-30% — спрос есть"
        return "Перевести в кухню или акция 1+1"


async def assess_all_stores(db: AsyncSession) -> dict[str, int]:
    """Перебрать все активные дарксторы. Возвращает {store_id: alerts_count}."""
    result = await db.execute(select(Store).where(Store.is_active == True))
    stores = result.scalars().all()
    out: dict[str, int] = {}
    for s in stores:
        risks = await assess_store(db, str(s.id))
        out[str(s.id)] = len(risks)
    return out
