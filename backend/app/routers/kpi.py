"""
Gorev 1.6.2 — GET /api/v1/kpi/live

Faz 2 (ADIM 23) — Tenant izolasyonu:
  - Bearer token zorunlu
  - Non-admin -> WHERE tenant_id = :user_tenant_id (tum KPI sorgulari)
  - DEFTR_Admin -> filtresiz (tum tenant'lar birlikte)

TRS 2.1.1 KPI listesi:
  - ingest_lag_p95_ms   : son penceredeki p95 gecikme (ingest_ts_utc - ts_utc)
  - gap_rate_pct        : eksik olcum orani %
  - threshold_violations: warn/critical esik ihlali sayisi
  - event_count         : toplam olcum sayisi
  - quality_ok_pct      : quality_flag = OK yuzdesi
"""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import AuthenticatedUser, get_current_user

router = APIRouter(prefix="/api/v1", tags=["kpi"])


class KPILive(BaseModel):
    computed_at: datetime
    window_hours: int
    asset_id: uuid.UUID | None
    ingest_lag_p95_ms: float | None
    gap_rate_pct: float | None
    threshold_violations: int
    event_count: int
    quality_ok_pct: float | None


@router.get("/kpi/live", response_model=KPILive)
async def kpi_live(
    asset_id: uuid.UUID | None = Query(default=None),
    window_hours: int | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    # --- Tenant kontrolu ---
    if not user.is_admin() and not user.tenant_id:
        raise HTTPException(
            status_code=403,
            detail="tenant_code claim'i eksik; yetkiliye bildirin",
        )

    wh = window_hours or settings.KPI_WINDOW_HOURS
    since = datetime.now(tz=timezone.utc) - timedelta(hours=wh)

    # Filtre bilesenleri — asset + tenant
    asset_filter = "AND asset_id = :asset_id" if asset_id else ""
    tenant_filter = "" if user.is_admin() else "AND tenant_id = :tenant_id"

    params: dict = {"since": since}
    if asset_id:
        params["asset_id"] = str(asset_id)
    if not user.is_admin():
        params["tenant_id"] = user.tenant_id

    # ingest_lag p95: ingest_ts_utc - ts_utc farki (ms cinsinden)
    lag_sql = text(f"""
        SELECT percentile_cont(0.95) WITHIN GROUP (
                   ORDER BY EXTRACT(EPOCH FROM (ingest_ts_utc - ts_utc)) * 1000
               ) AS p95
        FROM telemetry_measurements
        WHERE ts_utc >= :since
          {asset_filter}
          {tenant_filter}
    """)
    lag_row = (await db.execute(lag_sql, params)).fetchone()
    ingest_lag_p95 = round(float(lag_row.p95), 1) if lag_row and lag_row.p95 is not None else None

    # asset_filter'da da tm.asset_id kullanmak zorunlu (JOIN var, "asset_id" ambiguous)
    asset_filter_aliased  = "AND tm.asset_id = :asset_id"  if asset_id  else ""
    tenant_filter_aliased = "AND tm.tenant_id = :tenant_id" if not user.is_admin() else ""

    # event count + quality + threshold ihlali (warn/critical tek yonlu esik)
    count_sql = text(f"""
        SELECT
            count(*)                                          AS total,
            count(*) FILTER (WHERE tm.quality_flag = 'OK')    AS ok_count,
            count(*) FILTER (
                WHERE (sc.critical_threshold IS NOT NULL AND tm.value_num > sc.critical_threshold)
                   OR (sc.warn_threshold     IS NOT NULL AND tm.value_num > sc.warn_threshold)
            )                                                  AS violations
        FROM telemetry_measurements tm
        LEFT JOIN signal_catalog sc USING (signal_id)
        WHERE tm.ts_utc >= :since
          {asset_filter_aliased}
          {tenant_filter_aliased}
    """)
    cr = (await db.execute(count_sql, params)).fetchone()
    total = int(cr.total) if cr else 0
    ok_count = int(cr.ok_count) if cr else 0
    violations = int(cr.violations) if cr else 0
    quality_ok_pct = round(ok_count / total * 100, 1) if total else None

    # gap rate: beklenen (combo x window_seconds x ~1Hz) vs gercek
    gap_sql = text(f"""
        WITH combos AS (
            SELECT DISTINCT asset_id, signal_id
            FROM telemetry_measurements
            WHERE ts_utc >= :since {asset_filter} {tenant_filter}
        )
        SELECT
            (SELECT count(*) FROM combos) * :window_seconds AS expected,
            (SELECT count(*) FROM telemetry_measurements
             WHERE ts_utc >= :since {asset_filter} {tenant_filter})         AS actual_cnt
    """)
    gr = (await db.execute(gap_sql, {**params, "window_seconds": wh * 3600})).fetchone()
    gap_rate_pct = None
    if gr and gr.expected and gr.expected > 0:
        missing = max(0, gr.expected - gr.actual_cnt)
        gap_rate_pct = round(missing / gr.expected * 100, 2)

    return KPILive(
        computed_at=datetime.now(tz=timezone.utc),
        window_hours=wh,
        asset_id=asset_id,
        ingest_lag_p95_ms=ingest_lag_p95,
        gap_rate_pct=gap_rate_pct,
        threshold_violations=violations,
        event_count=total,
        quality_ok_pct=quality_ok_pct,
    )