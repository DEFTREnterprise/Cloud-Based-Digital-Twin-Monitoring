"""
OTOKAR Adaptoru (gorev 1.4) — gercek OTOKAR sensor API'sini sisteme baglar.

TASARIM:
  Adaptorun TEK gorevi: OTOKAR'in kendi veri formatini bizim standart
  TelemetryIn modelimize cevirip MQTT'ye basmak. Boylece veri, mevcut
  ingest worker'in (1.3) ayni hattindan akar — normalizasyon, kalite
  damgasi ve idempotent yazim TEK yerde (worker) yapilir.

  OTOKAR --(kendi formati)--> [BU ADAPTOR] --(TelemetryIn JSON)--> MQTT
                                                                    -> worker -> DB

UC MOD (.env: OTOKAR_MODE):
  mock : adaptor devre disi; mevcut mock_publisher kullanilir (varsayilan, bugun)
  pull : httpx ile REST endpoint'ten periyodik veri ceker (polling)
  push : OTOKAR kendi MQTT topic'ine basiyorsa, o topic'i koprula

KONTRAT GELINCE:
  1. .env'de OTOKAR_MODE'u pull/push yap
  2. OTOKAR_BASE_URL + OTOKAR_API_KEY doldur
  3. _otokar_to_telemetry() icindeki alan eslemesini OTOKAR'in gercek
     payload'ina gore guncelle (tek fonksiyon — tum cevirme orada)
"""
from __future__ import annotations

import asyncio
import json
import os
from datetime import datetime, timezone

import httpx
import paho.mqtt.client as mqtt
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential

from app.ingest.schemas import TelemetryIn

load_dotenv()

MODE = os.getenv("OTOKAR_MODE", "mock")
BASE_URL = os.getenv("OTOKAR_BASE_URL", "")
API_KEY = os.getenv("OTOKAR_API_KEY", "")
POLL_INTERVAL = float(os.getenv("OTOKAR_POLL_INTERVAL", "1.0"))
MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
PUBLISH_TOPIC_PREFIX = "factory/motor"  # worker bu deseni dinliyor (factory/+/+/telemetry)


# ---------------------------------------------------------------------------
# NORMALIZASYON — tum cevirme mantigi burada (1.4.2)
# Kontrat gelince SADECE bu fonksiyon guncellenecek.
# ---------------------------------------------------------------------------
def _otokar_to_telemetry(raw: dict) -> TelemetryIn:
    """OTOKAR'in ham payload'ini standart TelemetryIn modeline cevirir.

    ASAGISI BIR ORNEK/PLACEHOLDER. Gercek OTOKAR formati kontratla netlesince
    alan adlari buna gore eslenecek. Su an bizim mock formatimizla ayni varsayiliyor.
    """
    # ts_utc normalize: hangi formatta gelirse gelsin UTC'ye cevir.
    # (schemas.TelemetryIn zaten tz-naive gelirse UTC kabul ediyor; burada
    #  OTOKAR farkli bir alan adi/format kullanirsa once ona uyarlanir.)
    return TelemetryIn.model_validate({
        "schema_version": raw.get("schema_version", "1.0"),
        "dt_id": raw.get("dt_id", "OTOKAR_CORE"),
        "asset_code": raw["asset_code"],
        "source": raw.get("source", "REAL"),
        "ts_utc": raw["ts_utc"],
        "readings": raw["readings"],
    })


def _make_mqtt_client() -> mqtt.Client:
    try:
        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2,
                             client_id="cbmdtm-otokar-adapter")
    except AttributeError:
        client = mqtt.Client(client_id="cbmdtm-otokar-adapter")
    client.connect(MQTT_HOST, MQTT_PORT)
    client.loop_start()
    return client


def _publish(client: mqtt.Client, msg: TelemetryIn) -> None:
    """Normalize edilmis mesaji worker'in dinledigi topic'e basar."""
    # asset_code MOTOR_06 -> topic factory/motor/06/telemetry
    motor_num = msg.asset_code.split("_")[-1]
    topic = f"{PUBLISH_TOPIC_PREFIX}/{motor_num}/telemetry"
    payload = msg.model_dump(mode="json")
    client.publish(topic, json.dumps(payload), qos=1)


# ---------------------------------------------------------------------------
# PULL MODU — REST endpoint'ten periyodik cekme (1.4.1)
# ---------------------------------------------------------------------------
@retry(stop=stop_after_attempt(5),
       wait=wait_exponential(multiplier=1, min=1, max=30))
async def _fetch_once(http: httpx.AsyncClient) -> list[dict]:
    """OTOKAR REST endpoint'inden tek seferlik veri ceker. tenacity ile
    5 denemeye kadar exponential backoff (1,2,4,8,16... sn) uygular."""
    headers = {"Authorization": f"Bearer {API_KEY}"} if API_KEY else {}
    resp = await http.get(BASE_URL, headers=headers, timeout=10.0)
    resp.raise_for_status()
    data = resp.json()
    # OTOKAR tek mesaj mi liste mi donduruyor? Kontrata gore uyarlanir.
    return data if isinstance(data, list) else [data]


async def run_pull() -> None:
    if not BASE_URL:
        raise RuntimeError("OTOKAR_BASE_URL bos. .env'de doldurun (pull modu).")
    client = _make_mqtt_client()
    print(f"[OTOKAR-PULL] {BASE_URL} adresinden her {POLL_INTERVAL}s veri cekiliyor", flush=True)
    sent = 0
    async with httpx.AsyncClient() as http:
        while True:
            try:
                for raw in await _fetch_once(http):
                    msg = _otokar_to_telemetry(raw)
                    _publish(client, msg)
                    sent += 1
            except Exception as exc:
                print(f"[OTOKAR-PULL] cekme hatasi: {exc}", flush=True)
            await asyncio.sleep(POLL_INTERVAL)


# ---------------------------------------------------------------------------
# PUSH MODU — OTOKAR kendi MQTT topic'ine basiyorsa kopru (1.4.1)
# ---------------------------------------------------------------------------
def run_push() -> None:
    src_topic = os.getenv("OTOKAR_MQTT_TOPIC", "otokar/+/telemetry")
    out = _make_mqtt_client()

    def on_message(client, userdata, m):
        try:
            raw = json.loads(m.payload.decode("utf-8"))
            msg = _otokar_to_telemetry(raw)
            _publish(out, msg)
        except Exception as exc:
            print(f"[OTOKAR-PUSH] cevirme hatasi: {exc}", flush=True)

    try:
        src = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="cbmdtm-otokar-bridge")
    except AttributeError:
        src = mqtt.Client(client_id="cbmdtm-otokar-bridge")
    src.on_message = on_message
    src.connect(MQTT_HOST, MQTT_PORT)
    src.subscribe(src_topic, qos=1)
    print(f"[OTOKAR-PUSH] {src_topic} dinleniyor, worker topic'ine koprulaniyor", flush=True)
    src.loop_forever()


def main():
    if MODE == "pull":
        asyncio.run(run_pull())
    elif MODE == "push":
        run_push()
    else:
        print("[OTOKAR] MODE=mock — adaptor devre disi. "
              "Gercek veri icin .env'de OTOKAR_MODE=pull|push yapin.", flush=True)


if __name__ == "__main__":
    main()