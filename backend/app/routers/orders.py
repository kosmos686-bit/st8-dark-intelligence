import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime, timedelta

from app.database import get_db
from app.models import Order, OrderStatus, User, UserRole
from app.routers.auth import get_current_user
from app.routers.ws import manager as ws_manager
from app.services.order_state import can_transition, can_role_transition
from app.services import inventory_service
from app.clickhouse import ch_insert
import logging

_log = logging.getLogger(__name__)


async def _emit_order_events(order: Order, event_type: str) -> None:
    """Записать событие заказа в ClickHouse (по строке на каждый item)."""
    try:
        now = datetime.utcnow()
        rows = []
        for item in order.items:
            rows.append({
                "event_time": now,
                "store_id": str(order.store_id),
                "order_id": str(order.id),
                "customer_id": str(order.customer_id),
                "event_type": event_type,
                "product_id": str(item.get("product_id")),
                "product_name": str(item.get("name", "")),
                "category": str(item.get("category", "")),
                "quantity": int(item.get("qty", 1)),
                "amount": float(item.get("price", 0)) * int(item.get("qty", 1)),
                "hour_of_day": now.hour,
                "day_of_week": now.isoweekday(),
                "weather_temp": 0.0,
            })
        if rows:
            await ch_insert("order_events", rows)
    except Exception as e:
        _log.warning("ClickHouse emit failed (%s): %s", event_type, e)

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
    picker_id: Optional[uuid.UUID]
    status: OrderStatus
    items: list
    total_amount: float
    delivery_address: str
    delivery_lat: Optional[float] = None
    delivery_lng: Optional[float] = None
    notes: Optional[str]
    created_at: datetime
    estimated_delivery_at: Optional[datetime]
    actual_delivery_at: Optional[datetime]
    assembly_started_at: Optional[datetime]
    assembly_finished_at: Optional[datetime]

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class OrderAssign(BaseModel):
    courier_id: uuid.UUID


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
    elif current_user.role == UserRole.store_operator and current_user.store_id:
        q = q.where(Order.store_id == current_user.store_id)
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
    items_dict = [item.model_dump() for item in data.items]
    short = await inventory_service.reserve_items(db, data.store_id, items_dict)
    if short:
        raise HTTPException(
            status_code=409,
            detail={"error": "Недостаточно остатков", "missing": short},
        )

    order = Order(
        store_id=data.store_id,
        customer_id=current_user.id,
        items=items_dict,
        total_amount=data.total_amount,
        delivery_address=data.delivery_address,
        delivery_lat=data.delivery_lat,
        delivery_lng=data.delivery_lng,
        notes=data.notes,
        status=OrderStatus.pending,
        estimated_delivery_at=datetime.utcnow() + timedelta(minutes=30),
    )
    db.add(order)
    await db.flush()
    await db.refresh(order)

    await _emit_order_events(order, "created")

    await ws_manager.broadcast_to_store(str(order.store_id), {
        "type": "new_order",
        "payload": {"order_id": str(order.id), "total": order.total_amount, "items_count": len(order.items)},
        "timestamp": datetime.utcnow().isoformat(),
    })
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

    if not can_transition(order.status, data.status):
        raise HTTPException(
            status_code=400,
            detail=f"Недопустимый переход {order.status.value} → {data.status.value}",
        )
    if not can_role_transition(current_user.role, data.status):
        raise HTTPException(status_code=403, detail="Недостаточно прав для перехода")

    prev_status = order.status
    order.status = data.status

    if data.status == OrderStatus.assembling:
        order.assembly_started_at = datetime.utcnow()
        order.picker_id = current_user.id
    elif data.status == OrderStatus.assembled:
        order.assembly_finished_at = datetime.utcnow()
        await inventory_service.deduct_items(db, order.store_id, order.items)
    elif data.status == OrderStatus.delivered:
        order.actual_delivery_at = datetime.utcnow()
    elif data.status == OrderStatus.cancelled and prev_status in (OrderStatus.pending, OrderStatus.confirmed):
        await inventory_service.release_items(db, order.store_id, order.items)

    await db.flush()
    await db.refresh(order)

    await _emit_order_events(order, order.status.value)

    payload = {
        "type": "order_update",
        "payload": {"order_id": str(order.id), "status": order.status.value, "previous": prev_status.value},
        "timestamp": datetime.utcnow().isoformat(),
    }
    await ws_manager.broadcast_to_store(str(order.store_id), payload)
    await ws_manager.broadcast_to_customer(str(order.customer_id), payload)
    if order.courier_id:
        await ws_manager.broadcast_to_courier(str(order.courier_id), payload)

    return order


@router.patch("/{order_id}/assign-courier", response_model=OrderRead)
async def assign_courier(
    order_id: uuid.UUID,
    data: OrderAssign,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.store_operator, UserRole.superadmin, UserRole.network_manager):
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    if order.status not in (OrderStatus.assembled, OrderStatus.confirmed, OrderStatus.assembling):
        raise HTTPException(status_code=400, detail="Курьер назначается только до выдачи")

    courier_q = await db.execute(select(User).where(User.id == data.courier_id, User.role == UserRole.courier))
    courier = courier_q.scalar_one_or_none()
    if not courier:
        raise HTTPException(status_code=404, detail="Курьер не найден")

    order.courier_id = data.courier_id
    await db.flush()
    await db.refresh(order)

    await ws_manager.broadcast_to_courier(str(data.courier_id), {
        "type": "new_order",
        "payload": {
            "order_id": str(order.id),
            "delivery_address": order.delivery_address,
            "lat": order.delivery_lat,
            "lng": order.delivery_lng,
            "total": order.total_amount,
        },
        "timestamp": datetime.utcnow().isoformat(),
    })
    return order


@router.get("/courier/queue", response_model=list[OrderRead])
async def courier_queue(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.courier:
        raise HTTPException(status_code=403, detail="Только для курьеров")
    q = select(Order).where(
        Order.courier_id == current_user.id,
        Order.status.in_([OrderStatus.assembled, OrderStatus.picked_up, OrderStatus.delivering]),
    ).order_by(Order.created_at.asc())
    result = await db.execute(q)
    return result.scalars().all()
