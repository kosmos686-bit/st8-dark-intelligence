import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models import KitchenTask, KitchenTaskStatus, User, UserRole
from app.routers.auth import get_current_user

router = APIRouter()


class KitchenTaskCreate(BaseModel):
    store_id: uuid.UUID
    product_id: uuid.UUID
    quantity: int
    scheduled_for: datetime
    created_by: str = "manual"


class KitchenTaskRead(BaseModel):
    id: uuid.UUID
    store_id: uuid.UUID
    product_id: uuid.UUID
    quantity: int
    scheduled_for: datetime
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    status: KitchenTaskStatus
    created_by: str

    class Config:
        from_attributes = True


class KitchenTaskStatusUpdate(BaseModel):
    status: KitchenTaskStatus


@router.get("/", response_model=list[KitchenTaskRead])
async def list_tasks(
    store_id: uuid.UUID = Query(...),
    status: Optional[KitchenTaskStatus] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(KitchenTask).where(KitchenTask.store_id == store_id)
    if status:
        q = q.where(KitchenTask.status == status)
    q = q.order_by(KitchenTask.scheduled_for)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/", response_model=KitchenTaskRead, status_code=201)
async def create_task(
    data: KitchenTaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = KitchenTask(**data.model_dump())
    db.add(task)
    await db.flush()
    await db.refresh(task)
    return task


@router.patch("/{task_id}/status", response_model=KitchenTaskRead)
async def update_task_status(
    task_id: uuid.UUID,
    data: KitchenTaskStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(KitchenTask).where(KitchenTask.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    task.status = data.status
    if data.status == KitchenTaskStatus.cooking:
        task.started_at = datetime.utcnow()
    elif data.status in (KitchenTaskStatus.ready, KitchenTaskStatus.cancelled):
        task.finished_at = datetime.utcnow()
    await db.flush()
    await db.refresh(task)
    return task
