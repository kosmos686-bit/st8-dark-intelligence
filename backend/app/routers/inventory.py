import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime, timedelta

from app.database import get_db
from app.models import Inventory, Product, User, UserRole
from app.routers.auth import get_current_user
from app.routers.ws import manager as ws_manager

router = APIRouter()

LOW_STOCK_THRESHOLD = 5
EXPIRY_ALERT_HOURS = 24


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
    product_name: Optional[str] = None

    class Config:
        from_attributes = True


class InventoryUpdate(BaseModel):
    quantity: int
    expiry_at: Optional[datetime] = None
    batch_id: Optional[str] = None


class InventoryCreate(BaseModel):
    store_id: uuid.UUID
    product_id: uuid.UUID
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
    q = select(Inventory, Product).join(Product, Inventory.product_id == Product.id).where(Inventory.store_id == store_id)
    if low_stock:
        q = q.where(Inventory.quantity <= LOW_STOCK_THRESHOLD)
    if expiring_soon:
        threshold = datetime.utcnow() + timedelta(hours=EXPIRY_ALERT_HOURS)
        q = q.where(Inventory.expiry_at.is_not(None), Inventory.expiry_at <= threshold)
    result = await db.execute(q)
    out = []
    for inv, product in result.all():
        item = InventoryRead.model_validate(inv)
        item.product_name = product.name
        out.append(item)
    return out


@router.post("/", response_model=InventoryRead, status_code=201)
async def create_inventory(
    data: InventoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.superadmin, UserRole.network_manager, UserRole.store_operator):
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    inv = Inventory(
        store_id=data.store_id,
        product_id=data.product_id,
        quantity=data.quantity,
        expiry_at=data.expiry_at,
        batch_id=data.batch_id,
    )
    db.add(inv)
    await db.flush()
    await db.refresh(inv)
    return inv


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

    prev_qty = inv.quantity
    inv.quantity = data.quantity
    if data.expiry_at:
        inv.expiry_at = data.expiry_at
    if data.batch_id:
        inv.batch_id = data.batch_id
    inv.updated_at = datetime.utcnow()
    await db.flush()
    await db.refresh(inv)

    if prev_qty > LOW_STOCK_THRESHOLD and inv.quantity <= LOW_STOCK_THRESHOLD:
        await ws_manager.broadcast_to_store(str(inv.store_id), {
            "type": "inventory_alert",
            "payload": {
                "inventory_id": str(inv.id),
                "product_id": str(inv.product_id),
                "quantity": inv.quantity,
                "kind": "low_stock",
            },
            "timestamp": datetime.utcnow().isoformat(),
        })

    return inv


@router.get("/alerts/{store_id}")
async def inventory_alerts(
    store_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Сводный отчёт по алертам остатков для даркстора."""
    threshold = datetime.utcnow() + timedelta(hours=EXPIRY_ALERT_HOURS)

    low_q = await db.execute(
        select(Inventory, Product).join(Product, Inventory.product_id == Product.id).where(
            Inventory.store_id == store_id, Inventory.quantity <= LOW_STOCK_THRESHOLD
        )
    )
    expiring_q = await db.execute(
        select(Inventory, Product).join(Product, Inventory.product_id == Product.id).where(
            Inventory.store_id == store_id,
            Inventory.expiry_at.is_not(None),
            Inventory.expiry_at <= threshold,
        )
    )

    return {
        "low_stock": [
            {"inventory_id": str(i.id), "product_id": str(i.product_id), "name": p.name, "quantity": i.quantity}
            for i, p in low_q.all()
        ],
        "expiring_soon": [
            {
                "inventory_id": str(i.id),
                "product_id": str(i.product_id),
                "name": p.name,
                "expiry_at": i.expiry_at.isoformat() if i.expiry_at else None,
                "quantity": i.quantity,
            }
            for i, p in expiring_q.all()
        ],
    }
