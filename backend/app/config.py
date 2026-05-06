from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    CLICKHOUSE_URL: str
    REDIS_URL: str
    CELERY_BROKER_URL: str

    # Security
    JWT_SECRET: str
    JWT_ACCESS_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_EXPIRE_DAYS: int = 30

    # AI
    ANTHROPIC_API_KEY: str

    # Push
    VAPID_PUBLIC_KEY: str = ""
    VAPID_PRIVATE_KEY: str = ""
    VAPID_EMAIL: str = "kosmos686@gmail.com"

    # App
    ENVIRONMENT: str = "production"
    ALLOWED_ORIGINS: List[str] = [
        "https://st8dark.ru",
        "https://app.st8dark.ru",
        "http://localhost:3000",
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
