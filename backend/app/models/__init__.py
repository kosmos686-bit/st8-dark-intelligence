import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Boolean, Integer, Numeric, Text, DateTime,
    ForeignKey, Enum as SAEnum, JSON, Float
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


# ─── ENUMS ────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    superadmin = "superadmin"
    network_manager = "network_manager"
    store_operator = "store_operator"
    courier = "courier"
    customer = "customer"


class OrderStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    assembling = "assembling"
    assembled = "assembled"
    picked_up = "picked_up"
    delivering = "delivering"
    delivered = "delivered"
    cancelled = "cancelled"


class KitchenTaskStatus(str, enum.Enum):
    planned = "planned"
    cooking = "cooking"
    ready = "ready"
    sold = "sold"
    cancelled = "cancelled"


class ClientPlan(str, enum.Enum):
    pilot = "pilot"
    scale = "scale"
    network = "network"


# ─── MODELS ───────────────────────────────────────────────────────

class Client(Base):
    """Организация-клиент SaaS (например, Азбука Вкуса)"""
    __tablename__ = "clients"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255))
    plan: Mapped[ClientPlan] = mapped_column(SAEnum(ClientPlan))
    stores_limit: Mapped[int] = mapped_column(Integer, default=1)
    api_key: Mapped[str] = mapped_column(String(64), unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    stores: Mapped[list["Store"]] = relationship(back_populates="client")
    users: Mapped[list["User"]] = relationship(back_populates="client")


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), unique=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole))
    name: Mapped[str] = mapped_column(String(255))
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    client_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)
    store_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    client: Mapped[Optional["Client"]] = relationship(back_populates="users")
    store: Mapped[Optional["Store"]] = relationship(foreign_keys=[store_id])
    push_subscriptions: Mapped[list["PushSubscription"]] = relationship(back_populates="user")


class Store(Base):
    """Даркстор"""
    __tablename__ = "stores"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"))
    name: Mapped[str] = mapped_column(String(255))
    address: Mapped[str] = mapped_column(Text)
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    timezone: Mapped[str] = mapped_column(String(50), default="Europe/Moscow")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    has_kitchen: Mapped[bool] = mapped_column(Boolean, default=False)
    area_sqm: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_orders_per_hour: Mapped[int] = mapped_column(Integer, default=30)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    client: Mapped["Client"] = relationship(back_populates="stores")
    inventory: Mapped[list["Inventory"]] = relationship(back_populates="store")
    orders: Mapped[list["Order"]] = relationship(back_populates="store")
    kitchen_tasks: Mapped[list["KitchenTask"]] = relationship(back_populates="store")


class Product(Base):
    """SKU товара"""
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"))
    sku: Mapped[str] = mapped_column(String(100))
    name: Mapped[str] = mapped_column(String(500))
    category: Mapped[str] = mapped_column(String(100))
    subcategory: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    price: Mapped[float] = mapped_column(Float)
    weight_g: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_perishable: Mapped[bool] = mapped_column(Boolean, default=False)
    shelf_life_hours: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    requires_cold: Mapped[bool] = mapped_column(Boolean, default=False)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    barcode: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_kitchen_item: Mapped[bool] = mapped_column(Boolean, default=False)
    cooking_time_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    tags: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)  # ['горячее', 'веганское']


class Inventory(Base):
    """Остатки на складе даркстора"""
    __tablename__ = "inventory"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"))
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"))
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    reserved_quantity: Mapped[int] = mapped_column(Integer, default=0)
    expiry_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    batch_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    store: Mapped["Store"] = relationship(back_populates="inventory")
    product: Mapped["Product"] = relationship()

    @property
    def available_quantity(self) -> int:
        return max(0, self.quantity - self.reserved_quantity)


class Order(Base):
    """Заказ"""
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"))
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    courier_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    picker_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    status: Mapped[OrderStatus] = mapped_column(SAEnum(OrderStatus), default=OrderStatus.pending)
    items: Mapped[list] = mapped_column(JSONB)  # [{product_id, qty, price, name, substituted_with}]
    total_amount: Mapped[float] = mapped_column(Float)
    delivery_address: Mapped[str] = mapped_column(Text)
    delivery_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    delivery_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    estimated_delivery_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    actual_delivery_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    assembly_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    assembly_finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    store: Mapped["Store"] = relationship(back_populates="orders")
    customer: Mapped["User"] = relationship(foreign_keys=[customer_id])
    courier: Mapped[Optional["User"]] = relationship(foreign_keys=[courier_id])
    picker: Mapped[Optional["User"]] = relationship(foreign_keys=[picker_id])
    substitutions: Mapped[list["Substitution"]] = relationship(back_populates="order")


class KitchenTask(Base):
    """Задача кухни (производство горячей еды)"""
    __tablename__ = "kitchen_tasks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"))
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"))
    quantity: Mapped[int] = mapped_column(Integer)
    scheduled_for: Mapped[datetime] = mapped_column(DateTime)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[KitchenTaskStatus] = mapped_column(SAEnum(KitchenTaskStatus), default=KitchenTaskStatus.planned)
    created_by: Mapped[str] = mapped_column(String(10), default="ai")  # 'ai' | 'manual'

    store: Mapped["Store"] = relationship(back_populates="kitchen_tasks")
    product: Mapped["Product"] = relationship()


class Substitution(Base):
    """История замен товаров в заказах"""
    __tablename__ = "substitutions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id"))
    original_product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"))
    substitute_product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"))
    reason: Mapped[str] = mapped_column(Text)
    ai_explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    customer_approved: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    customer_response_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    order: Mapped["Order"] = relationship(back_populates="substitutions")
    original_product: Mapped["Product"] = relationship(foreign_keys=[original_product_id])
    substitute_product: Mapped["Product"] = relationship(foreign_keys=[substitute_product_id])


class PushSubscription(Base):
    """Web Push подписки для PWA"""
    __tablename__ = "push_subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    endpoint: Mapped[str] = mapped_column(Text, unique=True)
    p256dh: Mapped[str] = mapped_column(Text)
    auth: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="push_subscriptions")
