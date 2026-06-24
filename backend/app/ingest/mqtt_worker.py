"""
MQTT Worker (gorev 1.3) — CB-MDTM telemetri ingest worker'i.

AKIS:
  Mosquitto (factory/+/+/telemetry)
    -> [1] parse + dogrula (schemas.TelemetryIn)
    -> [2] coz (resolver: dt_type/asset_code/signal_code -> UUID)
    -> [3] kalite (quality: ingest_lag + QUALITY_FLAG)
    -> [4] idempotent yaz (INSERT ... ON CONFLICT DO NOTHING)

TASARIM:
  - Her mesaj BIR motorun N okumasini tasir; worker bunu N satira acar.
  - Yazim ANINDA yapilir (idempotent PK sayesinde guvenli). Batch Faz 4'e ertelendi.
  - paho-mqtt arka plan thread'inde calisir; DB yazimi icin her mesajda
    asyncio event loop'a guvenli kopru kurulur (run_coroutine_threadsafe).
"""
from __future__ import annotations

import asyncio
import json
import os
import signal as os_signal
from datetime import datetime, timezone
from uuid import uuid4

import paho.mqtt.client as mqtt
from dotenv import load_dotenv
from sqlalchemy import text

from app.core.database import AsyncSessionLocal
from app.ingest.resolver import Resolver
from app.ingest.quality import compute_lag_seconds, classify
from app.ingest.schemas import TelemetryIn


load_dotenv()

MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "factory/+/+/telemetry")

# Idempotent insert: PK (ts_utc, asset_id, signal_id, source) cakisirsa atla.
INSERT_SQL = text("""
    INSERT INTO telemetry_measurements
        (ts_utc, dt_id, asset_id, signal_id, source,
         value_num, quality_flag, ingest_ts_utc, correlation_id)
    VALUES
        (:ts_utc, :dt_id, :asset_id, :signal_id, :source,
         :value_num, :quality_flag, :ingest_ts_utc, :correlation_id)
    ON CONFLICT (ts_utc, asset_id, signal_id, source) DO NOTHING
""")


class IngestWorker:
    def __init__(self) -> None:
        self.resolver = Resolver()
        self.loop: asyncio.AbstractEventLoop | None = None
        self.client: mqtt.Client | None = None
        self._written = 0
        self._skipped = 0

    # --- MQTT callback'leri (paho thread'inde calisir) ---------------------

    def on_connect(self, client, userdata, flags, rc, *_):
        print(f"[WORKER] MQTT baglandi (rc={rc}), abone: {MQTT_TOPIC}", flush=True)
        client.subscribe(MQTT_TOPIC, qos=1)

    def on_message(self, client, userdata, msg):
        # paho thread'indeyiz; async DB islemini event loop'a guvenle gonder.
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
        except Exception as exc:
            self._skipped += 1
            print(f"[WORKER] JSON parse hatasi, atlandi: {exc}", flush=True)
            return
        if self.loop is not None:
            asyncio.run_coroutine_threadsafe(self._handle(payload), self.loop)

    # --- Asil isleme (event loop'ta calisir) -------------------------------

    async def _handle(self, raw: dict) -> None:
        # [1] PARSE + DOGRULA
        try:
            msg = TelemetryIn.model_validate(raw)
        except Exception as exc:
            self._skipped += 1
            print(f"[WORKER] dogrulama hatasi, atlandi: {exc}", flush=True)
            return

        # [2] COZ: dt_type -> dt_id, (dt_id, asset_code) -> asset_id
        dt_id = self.resolver.dt_id(msg.dt_id)
        if dt_id is None:
            self._skipped += 1
            print(f"[WORKER] bilinmeyen dt_type={msg.dt_id}, atlandi", flush=True)
            return
        asset_id = self.resolver.asset_id(dt_id, msg.asset_code)
        if asset_id is None:
            self._skipped += 1
            print(f"[WORKER] bilinmeyen asset={msg.asset_code}, atlandi", flush=True)
            return

        ingest_ts = datetime.now(timezone.utc)
        lag = compute_lag_seconds(msg.ts_utc, ingest_ts)
        corr_id = uuid4()  # lineage (FR-DATA-013): bu mesajin tum satirlari ayni id

        # [3]+[4] Her okuma icin satir hazirla ve yaz
        rows = []
        for r in msg.readings:
            sig = self.resolver.signal(r.signal_code)
            if sig is None:
                # Resolver sinyali tanimiyor -> UNKNOWN olarak da yazilabilir;
                # MVP'de atlayip logluyoruz (signal_id zorunlu, FK var).
                print(f"[WORKER] bilinmeyen signal={r.signal_code}, okuma atlandi", flush=True)
                continue
            flag = classify(r.value, lag, sig["range_min"], sig["range_max"])
            rows.append({
                "ts_utc": msg.ts_utc,
                "dt_id": dt_id,
                "asset_id": asset_id,
                "signal_id": sig["signal_id"],
                "source": msg.source,
                "value_num": r.value,
                "quality_flag": flag,
                "ingest_ts_utc": ingest_ts,
                "correlation_id": corr_id,
            })

        if not rows:
            return

        try:
            async with AsyncSessionLocal() as db:
                await db.execute(INSERT_SQL, rows)
                await db.commit()
            self._written += len(rows)
            
            if self._written % 60 == 0:  # ~her 60 satirda bir durum
                print(f"[WORKER] yazilan={self._written} atlanan={self._skipped}", flush=True)
        except Exception as exc:
            self._skipped += len(rows)
            print(f"[WORKER] DB yazim hatasi: {exc}", flush=True)

    # --- Yasam dongusu -----------------------------------------------------

    async def run(self) -> None:
        self.loop = asyncio.get_running_loop()

        # Resolver cache'ini bir kez yukle
        async with AsyncSessionLocal() as db:
            await self.resolver.load(db)

        # MQTT client kur
        try:
            self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2,
                                      client_id="cbmdtm-ingest-worker")
        except AttributeError:
            self.client = mqtt.Client(client_id="cbmdtm-ingest-worker")
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.connect(MQTT_HOST, MQTT_PORT)
        self.client.loop_start()

        print(f"[WORKER] calisiyor. Durdurmak icin Ctrl+C.", flush=True)

        # Sonsuza kadar calis (Ctrl+C ile durana dek)
        stop = asyncio.Event()

        def _stop(*_):
            stop.set()
        try:
            self.loop.add_signal_handler(os_signal.SIGINT, _stop)
        except NotImplementedError:
            pass  # Windows'ta add_signal_handler sinirli; KeyboardInterrupt yakalar

        try:
            await stop.wait()
        finally:
            self.client.loop_stop()
            self.client.disconnect()
            print(f"[WORKER] durdu. toplam yazilan={self._written} atlanan={self._skipped}",
                  flush=True)


def main():
    worker = IngestWorker()
    try:
        asyncio.run(worker.run())
    except KeyboardInterrupt:
        print("\n[WORKER] Ctrl+C alindi.", flush=True)


if __name__ == "__main__":
    main()