from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.limiter import limiter
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine
from app.routers import timeseries, stream, kpi, auth, assets

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    yield
    # shutdown
    await engine.dispose()


app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

# slowapi wire-up: instance + exception handler + middleware
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS — sikilastirilmis
# Dikkat: allow_credentials=True iken allow_methods/allow_headers "*" olamaz;
# tarayici blokluyor. Kullandiklarimizi acikca listeliyoruz.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Correlation-Id"],
    expose_headers=["X-Correlation-Id"],
    max_age=600,  # preflight cache (saniye)
)

# Routers
app.include_router(timeseries.router)
app.include_router(stream.router)
app.include_router(kpi.router)
app.include_router(assets.router)
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
@limiter.exempt  # monitoring/load-balancer prob'lari rate limit'e takilmasin
async def health(request: Request):
    """Liveness + DB + TimescaleDB s\u00fcr\u00fcm kontrol\u00fc."""
    result = {"status": "ok", "app": settings.APP_NAME, "db": None, "timescaledb": None}
    try:
        async with engine.connect() as conn:
            db_version = await conn.scalar(text("SELECT version()"))
            result["db"] = db_version.split(",")[0] if db_version else None
            ts_version = await conn.scalar(
                text("SELECT extversion FROM pg_extension WHERE extname = 'timescaledb'")
            )
            result["timescaledb"] = ts_version
    except Exception as exc:
        result["status"] = "degraded"
        result["error"] = str(exc)
    return result