"""
Gorev 1.5.1 — GET /api/v1/timeseries
Gorev 1.5.2 — GET /api/v1/signals (sinyal metadata)

Faz 2 (ADIM 23) — Tenant izolasyonu:
  - Bearer token zorunlu (get_current_user)
  - Non-admin -> WHERE tenant_id = :user_tenant_id (cross-tenant sızıntı yok)
  - DEFTR_Admin -> tenant filtresi UYGULANMAZ (tum tenant'lari gorur)
  - Cross-tenant asset istegi -> 404 (varlik sizintisi engellenir)

Bucket mantigi (gercek continuous aggregate'lere gore):
  raw  -> telemetry_measurements (RAW tablo)
  1m   -> telemetry_1m
  10m  -> telemetry_10m
  1h   -> telemetry_1h
"""
import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import AuthenticatedUser, get_current_user

router = APIRouter(prefix="/api/v1", tags=["timeseries"])

BucketType = Literal["raw", "1m", "10m", "1h"]

AGG_VIEW: dict[str, str] = {
    "1m": "telemetry_1m",
    "10m": "telemetry_10m",
    "1h": "telemetry_1h",
}


class DataPoint(BaseModel):
    ts: datetime
    value: float
    quality: str | None = None


class SignalMeta(BaseModel):
    signal_id: uuid.UUID
    signal_code: str
    unit: str
    range_min: float | None = None
    range_max: float | None = None
    warn_threshold: float | None = None
    critical_threshold: float | None = None


class TimeseriesResponse(BaseModel):
    asset_id: uuid.UUID
    signal_id: uuid.UUID
    bucket: BucketType
    from_ts: datetime
    to_ts: datetime
    points: list[DataPoint]
    meta: SignalMeta | None = None


# ─── /timeseries (1.5.1) ────────────────────────────────────────────────
@router.get("/timeseries", response_model=TimeseriesResponse)
async def get_timeseries(
    asset_id: uuid.UUID,
    signal_id: uuid.UUID,
    from_ts: datetime = Query(..., alias="from"),
    to_ts: datetime = Query(..., alias="to"),
    bucket: BucketType = Query("raw"),
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    # --- Tenant kontrolu ---
    # Non-admin ise tenant_id claim'i zorunlu; admin degilse ve tenant_id yoksa
    # bu bir konfigurasyon hatasi (Keycloak'ta attribute set edilmemis) -> 403.
    if not user.is_admin() and not user.tenant_id:
        raise HTTPException(
            status_code=403,
            detail="tenant_code claim'i eksik; yetkiliye bildirin",
        )

    # Sorgu tablosu ve tenant filtresi
    if bucket == "raw":
        table = "telemetry_measurements"
        select_cols = "ts_utc AS ts, value_num AS value, quality_flag::text AS quality"
        time_col = "ts_utc"
    else:
        table = AGG_VIEW[bucket]
        select_cols = "bucket AS ts, avg_value AS value, NULL AS quality"
        time_col = "bucket"

    # Admin ise tenant filtresi YOK; degilse tenant_id ile filtrele.
    tenant_where = "" if user.is_admin() else "AND tenant_id = :tenant_id"

    sql = text(f"""
        SELECT {select_cols}
        FROM {table}
        WHERE asset_id  = :asset_id
          AND signal_id = :signal_id
          AND {time_col} BETWEEN :from_ts AND :to_ts
          {tenant_where}
        ORDER BY {time_col}
    """)

    params = {
        "asset_id": str(asset_id),
        "signal_id": str(signal_id),
        "from_ts": from_ts,
        "to_ts": to_ts,
    }
    if not user.is_admin():
        params["tenant_id"] = user.tenant_id

    rows = await db.execute(sql, params)
    points = [DataPoint(ts=r.ts, value=r.value, quality=r.quality) for r in rows]

    # NOT: Bos points liste "asset yok" mu "veri yok" mu ayirmiyoruz -
    # ikisini de 200 + bos donuyoruz. Frontend "asset yok" tespiti icin
    # /signals veya asset registry ucundan kontrol etmeli.
    # Bu tenant sizintisini onler: cross-tenant asset icin de bos liste gelir.

    meta = await _fetch_signal_meta(db, signal_id)
    return TimeseriesResponse(
        asset_id=asset_id, signal_id=signal_id, bucket=bucket,
        from_ts=from_ts, to_ts=to_ts, points=points, meta=meta,
    )


# ─── /signals (1.5.2) ───────────────────────────────────────────────────
# signal_catalog tenant-agnostic: sinyal tanimlari tum tenant'lar arasinda
# paylasilir (temperature/vibration/speed). Bu yuzden auth zorunlu ama
# tenant filtresi yok.
@router.get("/signals", response_model=list[SignalMeta])
async def list_signals(
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Tum sinyal katalogunu doner (frontend eksen + esik cizgileri icin).

    NOT: signal_catalog tenant-agnostic; auth yeter, tenant filtresi yok.
    """
    sql = text("""
        SELECT signal_id, signal_code, unit,
               range_min, range_max, warn_threshold, critical_threshold
        FROM signal_catalog
        ORDER BY signal_code
    """)
    rows = await db.execute(sql)
    return [SignalMeta(**dict(r._mapping)) for r in rows]


@router.get("/signals/{signal_id}", response_model=SignalMeta)
async def get_signal(
    signal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    meta = await _fetch_signal_meta(db, signal_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Signal not found")
    return meta


async def _fetch_signal_meta(db: AsyncSession, signal_id: uuid.UUID) -> SignalMeta | None:
    sql = text("""
        SELECT signal_id, signal_code, unit,
               range_min, range_max, warn_threshold, critical_threshold
        FROM signal_catalog
        WHERE signal_id = :signal_id
    """)
    row = (await db.execute(sql, {"signal_id": str(signal_id)})).fetchone()
    return SignalMeta(**dict(row._mapping)) if row else None