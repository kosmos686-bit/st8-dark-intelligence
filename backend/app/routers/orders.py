import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models import Order, OrderStatus, User, UserRole
from app.routers.auth import get_current_user

router = APIRouter()


class OrderItem(BaseModel):
    product_id: str
    qty: int
    price: float
    name: str


class OrderCreate(BaseModel):
    store_id: uuid.UUID
    items: list[OrderItem]
    total_amount: float
    delivery_address: str
    delivery_lat: Optional[float] = None
    delivery_lng: Optional[float] = None
    notes: Optional[str] = None


class OrderRead(BaseModel):
    id: uuid.UUID
    store_id: uuid.UUID
    customer_id: uuid.UUID
    courier_id: Optional[uuid.UUID]
    status: OrderStatus
    items: list
    total_amount: float
    delivery_address: str
    notes: Optional[str]
    created_at: datetime
    estimated_delivery_at: Optional[datetime]
    actual_delivery_at: Optional[datetime]

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


@router.get("/", response_model=list[OrderRead])
async def list_orders(
    store_id: Optional[uuid.UUID] = Query(None),
    status: Optional[OrderStatus] = Query(None),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Order)
    if current_user.role == UserRole.customer:
        q = q.where(Order.customer_id == current_user.id)
    elif current_user.role == UserRole.courier:
        q = q.where(Order.courier_id == current_user.id)
    elif store_id:
        q = q.where(Order.store_id == store_id)
    if status:
        q = q.where(Order.status == status)
    q = q.order_by(Order.created_at.desc()).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{order_id}", response_model=OrderRead)
async def get_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    return order


@router.post("/", response_model=OrderRead, status_code=201)
async def create_order(
    data: OrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = Order(
        store_id=data.store_id,
        customer_id=current_user.id,
        items=[item.model_dump() for item in data.items],
        total_amount=data.total_amount,
        delivery_address=data.delivery_address,
        delivery_lat=data.delivery_lat,
        delivery_lng=data.delivery_lng,
        notes=data.notes,
        status=OrderStatus.pending,
    )
    db.add(order)
    await db.flush()
    await db.refresh(order)
    return order


@router.patch("/{order_id}/status", response_model=OrderRead)
async def update_order_status(
    order_id: uuid.UUID,
    data: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    order.status = data.status
    if data.status == OrderStatus.assembling:
        order.assembly_started_at = datetime.utcnow()
    elif data.status == OrderStatus.assembled:
        order.assembly_finished_at = datetime.utcnow()
        order.picker_id = current_user.id
    elif data.status == OrderStatus.delivered:
        order.actual_delivery_at = datetime.utcnow()
    await db.flush()
    await db.refresh(order)
    return order
