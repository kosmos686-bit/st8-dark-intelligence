import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import User
from app.routers.auth import get_current_user
from app.ai.substitution_ai import find_best_substitute

router = APIRouter()


class SubstitutionRequest(BaseModel):
    store_id: uuid.UUID
    original_product_id: uuid.UUID
    order_id: Optional[uuid.UUID] = None


class SubstitutionResponse(BaseModel):
    substitute_product_id: Optional[str]
    explanation: str
    confidence: float


@router.post("/substitution", response_model=SubstitutionResponse)
async def suggest_substitution(
    data: SubstitutionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await find_best_substitute(
        store_id=str(data.store_id),
        original_product_id=str(data.original_product_id),
        db=db,
    )
    if not result:
        return SubstitutionResponse(
            substitute_product_id=None,
            explanation="Подходящая замена не найдена.",
            confidence=0.0,
        )
    return SubstitutionResponse(
        substitute_product_id=str(result["product"].id),
        explanation=result["explanation"],
        confidence=result["confidence"],
    )


@router.get("/health")
async def ai_health(current_user: User = Depends(get_current_user)):
    return {"status": "ok", "modules": ["substitution_ai", "demand_forecast", "perishable_ai", "kitchen_ai"]}
