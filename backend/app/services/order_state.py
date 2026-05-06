"""
Конечный автомат статусов заказа.

Поток:
  pending → confirmed → assembling → assembled → picked_up → delivering → delivered
                    ↓                      ↓
                cancelled              cancelled
"""
from app.models import OrderStatus, UserRole


# Допустимые переходы: from → set(to)
TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.pending: {OrderStatus.confirmed, OrderStatus.cancelled},
    OrderStatus.confirmed: {OrderStatus.assembling, OrderStatus.cancelled},
    OrderStatus.assembling: {OrderStatus.assembled, OrderStatus.cancelled},
    OrderStatus.assembled: {OrderStatus.picked_up, OrderStatus.cancelled},
    OrderStatus.picked_up: {OrderStatus.delivering},
    OrderStatus.delivering: {OrderStatus.delivered},
    OrderStatus.delivered: set(),
    OrderStatus.cancelled: set(),
}


# Кто может выполнять переход
ROLE_TRANSITIONS: dict[OrderStatus, set[UserRole]] = {
    OrderStatus.confirmed: {UserRole.store_operator, UserRole.superadmin, UserRole.network_manager},
    OrderStatus.assembling: {UserRole.store_operator, UserRole.superadmin},
    OrderStatus.assembled: {UserRole.store_operator, UserRole.superadmin},
    OrderStatus.picked_up: {UserRole.courier, UserRole.superadmin},
    OrderStatus.delivering: {UserRole.courier, UserRole.superadmin},
    OrderStatus.delivered: {UserRole.courier, UserRole.superadmin},
    OrderStatus.cancelled: {UserRole.store_operator, UserRole.customer, UserRole.superadmin, UserRole.network_manager},
}


def can_transition(current: OrderStatus, new: OrderStatus) -> bool:
    return new in TRANSITIONS.get(current, set())


def can_role_transition(role: UserRole, new: OrderStatus) -> bool:
    return role in ROLE_TRANSITIONS.get(new, set())
