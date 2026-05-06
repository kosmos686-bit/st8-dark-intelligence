"""
Celery — фоновые задачи и расписание ST8 Dark.
"""
from celery import Celery
from celery.schedules import crontab
from app.config import settings

celery_app = Celery(
    "st8dark",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.forecast_tasks",
        "app.tasks.notification_tasks",
        "app.tasks.cleanup_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Moscow",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

# Расписание
celery_app.conf.beat_schedule = {
    # Прогноз спроса — каждый час
    "demand-forecast-hourly": {
        "task": "app.tasks.forecast_tasks.run_demand_forecast",
        "schedule": crontab(minute=0),
    },
    # Проверка скоропорта — каждые 30 минут
    "perishable-check": {
        "task": "app.tasks.forecast_tasks.check_perishables",
        "schedule": crontab(minute="*/30"),
    },
    # Планирование кухни — каждый час в начале
    "kitchen-planning": {
        "task": "app.tasks.forecast_tasks.plan_kitchen_tasks",
        "schedule": crontab(minute=5),
    },
    # Снапшоты остатков в ClickHouse — каждые 15 минут
    "inventory-snapshot": {
        "task": "app.tasks.forecast_tasks.snapshot_inventory",
        "schedule": crontab(minute="*/15"),
    },
    # Очистка истёкших токенов — раз в день
    "cleanup-tokens": {
        "task": "app.tasks.cleanup_tasks.cleanup_expired",
        "schedule": crontab(hour=3, minute=0),
    },
}
