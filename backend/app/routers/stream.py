"""
Gorev 1.6.1 — GET /api/v1/stream/telemetry  (Secenek A: DB-polling tabanli SSE)

NEDEN POLLING?
  In-memory event bus yalniz tek process icinde calisir; worker ayri process
  oldugu icin paylasilmaz. Bunun yerine SSE endpoint'i DB'den son yazilan
  kayitlari periyodik (POLL_INTERVAL) okuyup yayinlar. Tek process (uvicorn)
  yeterli; worker'dan bagimsizdir.

  DISARIYA SUNULAN KONTRAT DEGISMEZ:
    event: telemetry
    data: {"asset_id","signal_id","ts","value","quality"}
  Ileride Redis pub/sub'a gecilse bile bu kontrat ayni kalir; frontend dokunulmaz.
"""
import asyncio
import json
import uuid
from collections.abc import AsyncGenerator
from datetime import datetime, timezone

from fastapi import APIRouter, Query, Request
from sqlalchemy import text
from sse_starlette.sse import EventSourceResponse

from app.core.config import settings
from app.core.database import AsyncSessionLocal

router = APIRouter(prefix="/api/v1", tags=["stream"])

POLL_INTERVAL = 1.0  # saniye — yeni kayitlari ne siklikta kontrol edecegiz

# ingest_ts_utc'den sonra yazilani ceken sorgu (yeni veriyi yakalamak icin
# olcum zamani ts_utc degil, DB'ye yazim zamani ingest_ts_utc kullanilir;
# boylece gec gelen veri de kacirilmadan yayinlanir).
# Filtre YOK: tum varliklar
NEW_ROWS_SQL = text("""
    SELECT ts_utc, asset_id, signal_id, value_num, quality_flag::text AS quality,
           ingest_ts_utc
    FROM telemetry_measurements
    WHERE ingest_ts_utc > :after
    ORDER BY ingest_ts_utc
    LIMIT 500
""")

# Filtre VAR: tek varlik
NEW_ROWS_SQL_FILTERED = text("""
    SELECT ts_utc, asset_id, signal_id, value_num, quality_flag::text AS quality,
           ingest_ts_utc
    FROM telemetry_measurements
    WHERE ingest_ts_utc > :after
      AND asset_id = :asset_id
    ORDER BY ingest_ts_utc
    LIMIT 500
""")


async def _event_generator(
    request: Request, asset_id: uuid.UUID | None
) -> AsyncGenerator[dict, None]:
    # Baslangic noktasi: su an. Sadece bundan SONRA yazilan veriyi yayinla.
    after = datetime.now(tz=timezone.utc)

    while True:
        # Istemci baglantiyi kapattiysa donguyu bitir (kaynak sizintisi yok)
        if await request.is_disconnected():
            break

        async with AsyncSessionLocal() as db:
            if asset_id:
                rows = (await db.execute(NEW_ROWS_SQL_FILTERED, {
                    "after": after,
                    "asset_id": str(asset_id),
                })).fetchall()
            else:
                rows = (await db.execute(NEW_ROWS_SQL, {
                    "after": after,
                })).fetchall()

        for r in rows:
            after = r.ingest_ts_utc  # imleci ilerlet
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
async def stream_telemetry(
    request: Request,
    asset_id: uuid.UUID | None = Query(default=None, description="Belirli bir varligi filtrele"),
):
    return EventSourceResponse(
        _event_generator(request, asset_id),
        ping=settings.SSE_KEEPALIVE_SECONDS,
    )