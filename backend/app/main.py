from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine
from app.routers import timeseries, stream, kpi, assets


@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    yield
    # shutdown
    await engine.dispose()


app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

app.include_router(timeseries.router)
app.include_router(stream.router)
app.include_router(kpi.router)
app.include_router(assets.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # frontend (Vite) origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    """Liveness + DB + TimescaleDB sürüm kontrolü."""
    result = {"status": "ok", "app": settings.APP_NAME, "db": None, "timescaledb": None}
    try:
        async with engine.connect() as conn:
            db_version = await conn.scalar(text("SELECT version()"))
            result["db"] = db_version.split(",")[0] if db_version else None
            ts_version = await conn.scalar(
                text("SELECT extversion FROM pg_extension WHERE extname = 'timescaledb'")
            )
            result["timescaledb"] = ts_version  # None ise eklenti henüz kurulmamış
    except Exception as exc:
        result["status"] = "degraded"
        result["error"] = str(exc)
    return result