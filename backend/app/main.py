"""
ST8 Dark Intelligence — FastAPI Backend
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import engine, Base
from app.routers import auth, stores, products, orders, inventory, kitchen, analytics, ai, ws, push
from app.middleware.logging_middleware import LoggingMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 ST8 Dark Intelligence запускается...")
    yield
    # Shutdown
    print("👋 ST8 Dark Intelligence останавливается...")


limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="ST8 Dark Intelligence API",
    description="AI-операционная платформа для dark store сетей",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url=None,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["*"],
)

app.add_middleware(LoggingMiddleware)

# Роуты
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(stores.router, prefix="/stores", tags=["stores"])
app.include_router(products.router, prefix="/products", tags=["products"])
app.include_router(orders.router, prefix="/orders", tags=["orders"])
app.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
app.include_router(kitchen.router, prefix="/kitchen", tags=["kitchen"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])
app.include_router(ws.router, prefix="/ws", tags=["websocket"])
app.include_router(push.router, prefix="/push", tags=["push"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "st8-dark-intelligence", "version": "1.0.0"}
