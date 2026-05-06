import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.models import Product, User, UserRole
from app.routers.auth import get_current_user

router = APIRouter()


class ProductCreate(BaseModel):
    client_id: uuid.UUID
    sku: str
    name: str
    category: str
    subcategory: Optional[str] = None
    price: float
    weight_g: Optional[int] = None
    is_perishable: bool = False
    shelf_life_hours: Optional[int] = None
    requires_cold: bool = False
    image_url: Optional[str] = None
    barcode: Optional[str] = None
    description: Optional[str] = None
    is_kitchen_item: bool = False
    cooking_time_minutes: Optional[int] = None


class ProductRead(BaseModel):
    id: uuid.UUID
    client_id: uuid.UUID
    sku: str
    name: str
    category: str
    subcategory: Optional[str]
    price: float
    weight_g: Optional[int]
    is_perishable: bool
    shelf_life_hours: Optional[int]
    requires_cold: bool
    image_url: Optional[str]
    barcode: Optional[str]
    is_active: bool
    is_kitchen_item: bool
    cooking_time_minutes: Optional[int]

    class Config:
        from_attributes = True


@router.get("/", response_model=list[ProductRead])
async def list_products(
    category: Optional[str] = Query(None),
    is_perishable: Optional[bool] = Query(None),
    is_kitchen_item: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Product).where(Product.is_active == True)
    if current_user.role != UserRole.superadmin and current_user.client_id:
        q = q.where(Product.client_id == current_user.client_id)
    if category:
        q = q.where(Product.category == category)
    if is_perishable is not None:
        q = q.where(Product.is_perishable == is_perishable)
    if is_kitchen_item is not None:
        q = q.where(Product.is_kitchen_item == is_kitchen_item)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{product_id}", response_model=ProductRead)
async def get_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Товар не найден")
    return p


@router.post("/", response_model=ProductRead, status_code=201)
async def create_product(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.superadmin, UserRole.network_manager):
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    product = Product(**data.model_dump())
    db.add(product)
    await db.flush()
    await db.refresh(product)
    return product


@router.put("/{product_id}", response_model=ProductRead)
async def update_product(
    product_id: uuid.UUID,
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.superadmin, UserRole.network_manager):
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    result = await db.execute(select(Product).where(Product.id == product_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Товар не найден")
    for k, v in data.model_dump().items():
        setattr(p, k, v)
    await db.flush()
    await db.refresh(p)
    return p
