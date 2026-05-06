"""
Substitution AI — умные замены товаров при отсутствии.
При отсутствии товара → находит лучшую замену → объясняет покупателю через Claude API.
"""
import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models import Product, Inventory, Substitution, Order
from app.ai.claude_client import get_completion


async def find_best_substitute(
    store_id: str,
    original_product_id: str,
    db: AsyncSession,
) -> Optional[dict]:
    """
    Найти лучшую замену для отсутствующего товара.
    Возвращает {product, confidence, explanation} или None.
    """
    # Получить оригинальный товар
    orig_result = await db.execute(
        select(Product).where(Product.id == original_product_id)
    )
    original = orig_result.scalar_one_or_none()
    if not original:
        return None

    # Найти товары той же категории с наличием
    candidates_result = await db.execute(
        select(Product, Inventory)
        .join(Inventory, and_(
            Inventory.product_id == Product.id,
            Inventory.store_id == store_id,
        ))
        .where(
            and_(
                Product.category == original.category,
                Product.id != original_product_id,
                Product.is_active == True,
                Inventory.quantity > Inventory.reserved_quantity,
            )
        )
        .limit(10)
    )
    candidates = candidates_result.all()

    if not candidates:
        return None

    # Ранжирование: близость цены (40%) + схожесть названия (30%) + наличие (30%)
    scored = []
    for product, inventory in candidates:
        price_diff = abs(product.price - original.price) / max(original.price, 1)
        price_score = max(0, 1 - price_diff)  # 0.0–1.0

        # Простое сравнение слов в названии
        orig_words = set(original.name.lower().split())
        cand_words = set(product.name.lower().split())
        name_score = len(orig_words & cand_words) / max(len(orig_words), 1)

        available = inventory.quantity - inventory.reserved_quantity
        stock_score = min(1.0, available / 10)  # нормализовать до 10 штук

        total_score = price_score * 0.4 + name_score * 0.3 + stock_score * 0.3
        scored.append((product, total_score))

    # Лучший кандидат
    scored.sort(key=lambda x: x[1], reverse=True)
    best_product, confidence = scored[0]

    if confidence < 0.2:
        return None  # слишком плохая замена

    # Генерация объяснения через Claude
    explanation = await _generate_explanation(original, best_product)

    return {
        "product": best_product,
        "confidence": round(confidence, 2),
        "explanation": explanation,
    }


async def _generate_explanation(original: Product, substitute: Product) -> str:
    """Генерировать дружелюбное объяснение замены на русском."""
    system = (
        "Ты помощник сервиса доставки продуктов 'ST8 Dark'. "
        "Пишешь короткие, тёплые сообщения покупателям на русском языке. "
        "Стиль: уверенный, дружелюбный, без лишних извинений. "
        "Максимум 2 предложения."
    )
    user = (
        f"Покупатель заказал: {original.name} (цена: {original.price} ₽).\n"
        f"Этого товара нет в наличии. Мы предлагаем замену: {substitute.name} (цена: {substitute.price} ₽).\n"
        f"Напиши короткое объяснение почему эта замена хорошая."
    )

    try:
        return await get_completion(system=system, user=user, max_tokens=150)
    except Exception:
        # Fallback если Claude недоступен
        return (
            f"Предлагаем замену: {substitute.name} — похожий товар из той же категории. "
            f"Цена {'ниже' if substitute.price < original.price else 'сопоставима'}."
        )


async def process_substitution(
    order_id: str,
    original_product_id: str,
    store_id: str,
    db: AsyncSession,
) -> Optional[Substitution]:
    """
    Полный цикл замены:
    1. Найти лучшую замену
    2. Сохранить в DB
    3. Вернуть объект для отправки покупателю
    """
    result = await find_best_substitute(store_id, original_product_id, db)
    if not result:
        return None

    substitution = Substitution(
        id=uuid.uuid4(),
        order_id=order_id,
        original_product_id=original_product_id,
        substitute_product_id=result["product"].id,
        reason="out_of_stock",
        ai_explanation=result["explanation"],
        ai_confidence=result["confidence"],
    )
    db.add(substitution)
    await db.flush()

    return substitution
