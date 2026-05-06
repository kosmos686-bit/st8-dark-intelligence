import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models import Store, Client, User, UserRole
from app.routers.auth import get_current_user

router = APIRouter()


class StoreCreate(BaseModel):
    client_id: uuid.UUID
    name: str
    address: str
    lat: float
    lng: float
    timezone: str = "Europe/Moscow"
    has_kitchen: bool = False
    area_sqm: Optional[int] = None
    max_orders_per_hour: int = 30


class StoreRead(BaseModel):
    id: uuid.UUID
    client_id: uuid.UUID
    name: str
    address: str
    lat: float
    lng: float
    timezone: str
    is_active: bool
    has_kitchen: bool
    area_sqm: Optional[int]
    max_orders_per_hour: int
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=list[StoreRead])
async def list_stores(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.superadmin:
        result = await db.execute(select(Store).where(Store.is_active == True))
    elif current_user.role == UserRole.network_manager:
        result = await db.execute(
            select(Store).where(Store.client_id == current_user.client_id, Store.is_active == True)
        )
    elif current_user.store_id:
        result = await db.execute(select(Store).where(Store.id == current_user.store_id))
    else:
        return []
    return result.scalars().all()


@router.get("/{store_id}", response_model=StoreRead)
async def get_store(
    store_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Store).where(Store.id == store_id))
    store = result.scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=404, detail="Даркстор не найден")
    return store


@router.post("/", response_model=StoreRead, status_code=201)
async def create_store(
    data: StoreCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.superadmin, UserRole.network_manager):
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    store = Store(**data.model_dump())
    db.add(store)
    await db.flush()
    await db.refresh(store)
    return store


@router.put("/{store_id}", response_model=StoreRead)
async def update_store(
    store_id: uuid.UUID,
    data: StoreCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.superadmin, UserRole.network_manager):
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    result = await db.execute(select(Store).where(Store.id == store_id))
    store = result.scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=404, detail="Даркстор не найден")
    for k, v in data.model_dump().items():
        setattr(store, k, v)
    await db.flush()
    await db.refresh(store)
    return store


@router.delete("/{store_id}", status_code=204)
async def deactivate_store(
    store_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.superadmin:
        raise HTTPException(status_code=403, detail="Только superadmin")
    result = await db.execute(select(Store).where(Store.id == store_id))
    store = result.scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=404, detail="Не найден")
    store.is_active = False
