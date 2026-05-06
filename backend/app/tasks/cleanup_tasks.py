"""
Celery задачи периодической очистки.
"""
import asyncio
import logging
from datetime import datetime, timedelta

from sqlalchemy import delete

from app.tasks.celery_app import celery_app
from app.database import async_session_maker
from app.models import PushSubscription

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


@celery_app.task(name="app.tasks.cleanup_tasks.cleanup_expired")
def cleanup_expired() -> dict:
    """Удалить старые push-подписки (>180 дней без активности) и т.п."""
    async def _impl():
        async with async_session_maker() as db:
            cutoff = datetime.utcnow() - timedelta(days=180)
            result = await db.execute(
                delete(PushSubscription).where(PushSubscription.created_at < cutoff)
            )
            await db.commit()
            return {"push_subscriptions_removed": result.rowcount}
    try:
        return _run_async(_impl())
    except Exception as e:
        log.error("cleanup_expired failed: %s", e)
        return {"error": str(e)}
