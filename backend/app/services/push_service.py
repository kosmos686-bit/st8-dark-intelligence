"""
Web Push отправка через VAPID.
"""
import json
import logging
from typing import Optional

from pywebpush import webpush, WebPushException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.models import PushSubscription

log = logging.getLogger(__name__)


async def send_push_to_user(db: AsyncSession, user_id: str, title: str, body: str, url: Optional[str] = None) -> int:
    """Отправить push всем активным подпискам пользователя. Возвращает количество успешных доставок."""
    if not settings.VAPID_PRIVATE_KEY:
        log.warning("VAPID_PRIVATE_KEY не задан, push пропускается")
        return 0

    result = await db.execute(select(PushSubscription).where(PushSubscription.user_id == user_id))
    subs = result.scalars().all()

    payload = json.dumps({"title": title, "body": body, "url": url or "/"})
    delivered = 0
    expired_endpoints = []

    for sub in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": f"mailto:{settings.VAPID_EMAIL}"},
            )
            delivered += 1
        except WebPushException as e:
            if e.response and e.response.status_code in (404, 410):
                expired_endpoints.append(sub.endpoint)
            log.error("Push failed: %s", e)

    if expired_endpoints:
        for sub in subs:
            if sub.endpoint in expired_endpoints:
                await db.delete(sub)

    return delivered
