import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models import Inventory, User, UserRole
from app.routers.auth import get_current_user

router = APIRouter()


class InventoryRead(BaseModel):
    id: uuid.UUID
    store_id: uuid.UUID
    product_id: uuid.UUID
    quantity: int
    reserved_quantity: int
    available_quantity: int
    expiry_at: Optional[datetime]
    batch_id: Optional[str]
    updated_at: datetime

    class Config:
        from_attributes = True


class InventoryUpdate(BaseModel):
    quantity: int
    expiry_at: Optional[datetime] = None
    batch_id: Optional[str] = None


@router.get("/", response_model=list[InventoryRead])
async def list_inventory(
    store_id: uuid.UUID = Query(...),
    low_stock: Optional[bool] = Query(None),
    expiring_soon: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Inventory).where(Inventory.store_id == store_id)
    if low_stock:
        q = q.where(Inventory.quantity <= 5)
    if expiring_soon:
        from datetime import timedelta
        threshold = datetime.utcnow() + timedelta(hours=24)
        q = q.where(Inventory.expiry_at != None, Inventory.expiry_at <= threshold)
    result = await db.execute(q)
    return result.scalars().all()


@router.put("/{inventory_id}", response_model=InventoryRead)
async def update_inventory(
    inventory_id: uuid.UUID,
    data: InventoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.superadmin, UserRole.network_manager, UserRole.store_operator):
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    result = await db.execute(select(Inventory).where(Inventory.id == inventory_id))
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Не найдено")
    inv.quantity = data.quantity
    if data.expiry_at:
        inv.expiry_at = data.expiry_at
    if data.batch_id:
        inv.batch_id = data.batch_id
    inv.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(inv)
    return inv
