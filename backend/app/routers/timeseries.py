"""
Gorev 1.5.1 — GET /api/v1/timeseries
Gorev 1.5.2 — GET /api/v1/signals (sinyal metadata)

Bucket mantigi (gercek continuous aggregate'lere gore):
  raw  -> telemetry_measurements (RAW tablo)
  1m   -> telemetry_1m
  10m  -> telemetry_10m
  1h   -> telemetry_1h
Hedef: 24 saatlik pencere < 500 ms (TRS 2.1.1)
"""
import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

router = APIRouter(prefix="/api/v1", tags=["timeseries"])

BucketType = Literal["raw", "1m", "10m", "1h"]

# RAW disindaki bucket'lar continuous aggregate gorunumlerinden okunur.
# Aggregate'ler avg_value/min_value/max_value'yi ONCEDEN hesaplamistir.
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


# ─── /timeseries (1.5.1) ───────────────────────────────────────────────────
@router.get("/timeseries", response_model=TimeseriesResponse)
async def get_timeseries(
    asset_id: uuid.UUID,
    signal_id: uuid.UUID,
    from_ts: datetime = Query(..., alias="from"),
    to_ts: datetime = Query(..., alias="to"),
    bucket: BucketType = Query("raw"),
    db: AsyncSession = Depends(get_db),
):
    if bucket == "raw":
        # RAW tablo: gercek deger value_num, kalite quality_flag
        sql = text("""
            SELECT ts_utc AS ts, value_num AS value, quality_flag::text AS quality
            FROM telemetry_measurements
            WHERE asset_id  = :asset_id
              AND signal_id = :signal_id
              AND ts_utc BETWEEN :from_ts AND :to_ts
            ORDER BY ts_utc
        """)
    else:
        # Continuous aggregate: avg_value onceden hesaplanmis, bucket kolonu hazir
        view = AGG_VIEW[bucket]
        sql = text(f"""
            SELECT bucket AS ts, avg_value AS value, NULL AS quality
            FROM {view}
            WHERE asset_id  = :asset_id
              AND signal_id = :signal_id
              AND bucket BETWEEN :from_ts AND :to_ts
            ORDER BY bucket
        """)

    rows = await db.execute(sql, {
        "asset_id": str(asset_id),
        "signal_id": str(signal_id),
        "from_ts": from_ts,
        "to_ts": to_ts,
    })
    points = [DataPoint(ts=r.ts, value=r.value, quality=r.quality) for r in rows]

    meta = await _fetch_signal_meta(db, signal_id)
    return TimeseriesResponse(
        asset_id=asset_id, signal_id=signal_id, bucket=bucket,
        from_ts=from_ts, to_ts=to_ts, points=points, meta=meta,
    )


# ─── /signals (1.5.2) ───────────────────────────────────────────────────────
@router.get("/signals", response_model=list[SignalMeta])
async def list_signals(db: AsyncSession = Depends(get_db)):
    """Tum sinyal katalogunu doner (frontend eksen + esik cizgileri icin).

    NOT: Senin semanda signal_catalog asset'e bagli DEGIL (bagimsiz katalog).
    Bu yuzden asset_id filtresi yok; tum sinyaller donulur.
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
async def get_signal(signal_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
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