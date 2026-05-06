"""
Web Push: подписка / отписка / тест.
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.config import settings
from app.models import PushSubscription, User
from app.routers.auth import get_current_user
from app.services.push_service import send_push_to_user

router = APIRouter()


class PushKeys(BaseModel):
    p256dh: str
    auth: str


class SubscribeRequest(BaseModel):
    endpoint: str
    keys: PushKeys


class TestPushRequest(BaseModel):
    title: str = "ST8 Dark"
    body: str = "Тестовое уведомление"


@router.get("/vapid-public-key")
async def vapid_public_key():
    if not settings.VAPID_PUBLIC_KEY:
        raise HTTPException(status_code=503, detail="Push отключён")
    return {"key": settings.VAPID_PUBLIC_KEY}


@router.post("/subscribe", status_code=201)
async def subscribe(
    data: SubscribeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await db.execute(select(PushSubscription).where(PushSubscription.endpoint == data.endpoint))
    sub = existing.scalar_one_or_none()
    if sub:
        sub.user_id = current_user.id
        sub.p256dh = data.keys.p256dh
        sub.auth = data.keys.auth
    else:
        sub = PushSubscription(
            user_id=current_user.id,
            endpoint=data.endpoint,
            p256dh=data.keys.p256dh,
            auth=data.keys.auth,
        )
        db.add(sub)
    await db.flush()
    return {"status": "ok", "subscription_id": str(sub.id)}


@router.delete("/unsubscribe")
async def unsubscribe(
    endpoint: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PushSubscription).where(
            PushSubscription.endpoint == endpoint,
            PushSubscription.user_id == current_user.id,
        )
    )
    sub = result.scalar_one_or_none()
    if sub:
        await db.delete(sub)
    return {"status": "ok"}


@router.post("/test")
async def test_push(
    data: TestPushRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    delivered = await send_push_to_user(db, str(current_user.id), data.title, data.body)
    return {"delivered": delivered}
