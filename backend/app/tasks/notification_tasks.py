"""
Celery задачи отправки уведомлений (push, email — заглушка).
"""
import asyncio
import logging
from typing import Optional

from app.tasks.celery_app import celery_app
from app.database import async_session_maker
from app.services.push_service import send_push_to_user

log = logging.getLogger(__name__)


def _run_async(coro):
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            raise RuntimeError("closed")
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


@celery_app.task(name="app.tasks.notification_tasks.send_push")
def send_push(user_id: str, title: str, body: str, url: Optional[str] = None) -> int:
    """Отправить push-уведомление пользователю по всем активным подпискам."""
    async def _impl():
        async with async_session_maker() as db:
            delivered = await send_push_to_user(db, user_id, title, body, url)
            await db.commit()
            return delivered
    try:
        return _run_async(_impl())
    except Exception as e:
        log.error("send_push failed: %s", e)
        return 0
