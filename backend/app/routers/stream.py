"""
Gorev 1.6.1 — GET /api/v1/stream/telemetry  (Secenek A: DB-polling tabanli SSE)

Faz 2 (ADIM 23) — Tenant izolasyonu:
  - Bearer token zorunlu (SSE de auth'lu)
  - Non-admin -> yalniz kendi tenant satirlari yayimlanir
  - DEFTR_Admin -> tum tenant satirlari yayimlanir

NEDEN POLLING?
  In-memory event bus yalniz tek process icinde calisir; worker ayri process
  oldugu icin paylasilmaz. Bunun yerine SSE endpoint'i DB'den sonyazilan
  kayitlari periyodik (POLL_INTERVAL) okuyup yayinlar.

DISARIYA SUNULAN KONTRAT DEGISMEZ:
    event: telemetry
    data: {"asset_id","signal_id","ts","value","quality"}
"""
import asyncio
import json
import uuid
from collections.abc import AsyncGenerator
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import text
from sse_starlette.sse import EventSourceResponse

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.limiter import limiter
from app.core.security import AuthenticatedUser, get_current_user

router = APIRouter(prefix="/api/v1", tags=["stream"])

POLL_INTERVAL = 1.0  # saniye — yeni kayitlari ne siklikta kontrol edecegiz


def _build_query(has_asset: bool, has_tenant: bool) -> text:
    """Filtre bileşenlerine göre dinamik SELECT üret."""
    asset_clause  = "AND asset_id  = :asset_id"  if has_asset  else ""
    tenant_clause = "AND tenant_id = :tenant_id" if has_tenant else ""
    return text(f"""
        SELECT ts_utc, asset_id, signal_id, value_num, quality_flag::text AS quality,
               ingest_ts_utc
        FROM telemetry_measurements
        WHERE ingest_ts_utc > :after
          {asset_clause}
          {tenant_clause}
        ORDER BY ingest_ts_utc
        LIMIT 500
    """)


async def _event_generator(
    request: Request,
    asset_id: uuid.UUID | None,
    tenant_id: str | None,
) -> AsyncGenerator[dict, None]:
    """
    tenant_id None ise (DEFTR_Admin) — tum tenant yayimlanir.
    tenant_id dolu ise — yalniz o tenant'in satirlari yayimlanir.
    """
    after = datetime.now(tz=timezone.utc)
    sql = _build_query(has_asset=asset_id is not None, has_tenant=tenant_id is not None)

    while True:
        if await request.is_disconnected():
            break

        params: dict = {"after": after}
        if asset_id is not None:
            params["asset_id"] = str(asset_id)
        if tenant_id is not None:
            params["tenant_id"] = tenant_id

        async with AsyncSessionLocal() as db:
            rows = (await db.execute(sql, params)).fetchall()

        for r in rows:
            after = r.ingest_ts_utc
            yield {
                "event": "telemetry",
                "data": json.dumps({
                    "asset_id": str(r.asset_id),
                    "signal_id": str(r.signal_id),
                    "ts": r.ts_utc.isoformat(),
                    "value": r.value_num,
                    "quality": r.quality,
                }),
            }
        await asyncio.sleep(POLL_INTERVAL)


@router.get("/stream/telemetry")
@limiter.exempt  # SSE uzun-baglantili; global rate limit'e takilmasin
async def stream_telemetry(
    request: Request,
    asset_id: uuid.UUID | None = Query(default=None, description="Belirli bir varligi filtrele"),
    user: AuthenticatedUser = Depends(get_current_user),
):
    # --- Tenant kontrolu ---
    if not user.is_admin() and not user.tenant_id:
        raise HTTPException(
            status_code=403,
            detail="tenant_code claim'i eksik; yetkiliye bildirin",
        )

    # Admin ise tenant_id None (filtre yok); degilse kullanicinin tenant_id'si
    tenant_id = None if user.is_admin() else user.tenant_id

    return EventSourceResponse(
        _event_generator(request, asset_id, tenant_id),
        ping=settings.SSE_KEEPALIVE_SECONDS,
    )