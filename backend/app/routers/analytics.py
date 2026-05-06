import uuid
from fastapi import APIRouter, Depends, Query
from app.models import User
from app.routers.auth import get_current_user

router = APIRouter()


@router.get("/summary")
async def analytics_summary(
    store_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_user),
):
    """Заглушка — в Фазе 3 подключается ClickHouse."""
    return {
        "store_id": str(store_id),
        "orders_today": 0,
        "revenue_today": 0.0,
        "avg_assembly_time_min": 0,
        "message": "Analytics coming in Phase 3"
    }
