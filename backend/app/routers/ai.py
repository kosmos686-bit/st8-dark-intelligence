import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import User, UserRole
from app.routers.auth import get_current_user
from app.ai.substitution_ai import find_best_substitute, process_substitution
from app.ai.perishable_ai import assess_store
from app.ai.kitchen_ai import plan_for_store
from app.ai.demand_forecast import forecast_for_store, get_forecast

router = APIRouter()


class SubstitutionRequest(BaseModel):
    store_id: uuid.UUID
    original_product_id: uuid.UUID
    order_id: Optional[uuid.UUID] = None


class SubstitutionResponse(BaseModel):
    substitute_product_id: Optional[str]
    explanation: str
    confidence: float


class ForecastQuery(BaseModel):
    store_id: uuid.UUID
    product_id: uuid.UUID
    hours_ahead: int = 24


def _require_staff(user: User):
    if user.role not in (UserRole.superadmin, UserRole.network_manager, UserRole.store_operator):
        raise HTTPException(status_code=403, detail="Недостаточно прав")


@router.post("/substitution", response_model=SubstitutionResponse)
async def suggest_substitution(
    data: SubstitutionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.order_id:
        sub = await process_substitution(
            order_id=str(data.order_id),
            original_product_id=str(data.original_product_id),
            store_id=str(data.store_id),
            db=db,
        )
        if not sub:
            return SubstitutionResponse(substitute_product_id=None, explanation="Подходящая замена не найдена.", confidence=0.0)
        return SubstitutionResponse(
            substitute_product_id=str(sub.substitute_product_id),
            explanation=sub.ai_explanation or "",
            confidence=float(sub.ai_confidence or 0.0),
        )

    result = await find_best_substitute(
        store_id=str(data.store_id),
        original_product_id=str(data.original_product_id),
        db=db,
    )
    if not result:
        return SubstitutionResponse(substitute_product_id=None, explanation="Подходящая замена не найдена.", confidence=0.0)
    return SubstitutionResponse(
        substitute_product_id=str(result["product"].id),
        explanation=result["explanation"],
        confidence=result["confidence"],
    )


@router.get("/perishable/{store_id}")
async def perishable_risks(
    store_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_staff(current_user)
    return {"store_id": str(store_id), "risks": await assess_store(db, str(store_id))}


@router.post("/kitchen-plan/{store_id}")
async def trigger_kitchen_plan(
    store_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_staff(current_user)
    tasks = await plan_for_store(db, str(store_id))
    return {"store_id": str(store_id), "tasks_created": len(tasks), "tasks": tasks}


@router.post("/forecast/{store_id}")
async def trigger_forecast(
    store_id: uuid.UUID,
    horizon_hours: int = 24,
    current_user: User = Depends(get_current_user),
):
    _require_staff(current_user)
    written = await forecast_for_store(str(store_id), horizon_hours=horizon_hours)
    return {"store_id": str(store_id), "rows_written": written}


@router.post("/forecast/lookup")
async def forecast_lookup(
    data: ForecastQuery,
    current_user: User = Depends(get_current_user),
):
    qty = await get_forecast(str(data.store_id), str(data.product_id), data.hours_ahead)
    return {"predicted_qty": round(qty, 2), "hours_ahead": data.hours_ahead}


@router.get("/health")
async def ai_health(current_user: User = Depends(get_current_user)):
    return {"status": "ok", "modules": ["substitution_ai", "demand_forecast", "perishable_ai", "kitchen_ai"]}
