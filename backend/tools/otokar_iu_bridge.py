#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
otokar_iu_bridge.py - Infinite Uptime -> CB-MDTM MQTT bridge (Faz 2)
====================================================================

NE YAPAR?
  Otokar'in kullandigi Infinite Uptime (IDAP + PlantOS DT) API'sinden
  periyodik olarak sensor verisi ceker; bunu mevcut mock_publisher.py
  ile AYNI MQTT payload sozlesmesine cevirip Mosquitto'ya publish eder.
  Boylece downstream (mqtt_worker.py + DB + SSE) dokunulmaz.

AKISTAKI YERI:
  IU cloud API -->  [BU KOD]  --MQTT publish-->  Mosquitto  -->  ingest worker
                                                                  -->  TimescaleDB
                                                                  -->  SSE / KPI

TOPIC + PAYLOAD SOZLESMESI (mock_publisher ile birebir ayni):
  Topic: factory/motor/{01..12}/telemetry
  Payload:
    {
      "schema_version": "1.0",
      "dt_id": "OTOKAR_CORE",
      "asset_code": "MOTOR_01".."MOTOR_12",
      "source": "REAL",
      "ts_utc": "2026-07-29T12:34:56Z",
      "readings": [{"signal_code": "vibration_x", "value": 0.023, "unit": "mm/s"}, ...]
    }

POLLING RITMI:
  basic-features    -> her 60 sn (env: OTOKAR_IU_BASIC_POLL_SEC)
  computed-features -> her 1800 sn = 30 dk (env: OTOKAR_IU_COMPUTED_POLL_SEC)
  Ana dongu 60 sn'de bir tik atar; computed icin sayaci takip eder.

ORNEKLEME (29.07.2026 duzeltmesi):
  Her turda monitorun cektigi TUM YENI satirlar yayinlanir (eskiden sadece
  rows[-1] aliniyordu). Son islenen zaman damgasi monitor bazinda tutulur.

TOKEN YONETIMI:
  IU access token 12 saatlik; exp - 60 sn kalinca proaktif olarak yeniden login.

HATA TOLERANSI:
  IU 5xx / network hatasi -> o monitor atlanir, tur devam eder
  IU 401 (kimlik hatasi)  -> TUM TUR IPTAL + exponential backoff
                             (login dongusu koruması, asagida aciklamasi var)
  Bos monitor / null deger -> log ve atla, publish etme
  MQTT baglanti koparsa    -> paho auto-reconnect

CALISTIRMA:
  python tools/otokar_iu_bridge.py
  (env variable'lar .env'den okunur)

Durdurmak: Ctrl+C
"""
from __future__ import annotations

import base64
import json
import logging
import os
import signal
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

import paho.mqtt.client as mqtt
import requests
from dotenv import load_dotenv


# .env dosyasini yukle (backend/.env)
load_dotenv(Path(__file__).parent.parent / ".env")

# -----------------------------------------------------------------------------
# Loglama
# -----------------------------------------------------------------------------
# NOT: datefmt sonunda 'Z' var; bu yuzden zaman damgasi GERCEKTEN UTC olmali.
# converter = time.gmtime olmadan yerel saat basilip sonuna 'Z' ekleniyordu
# (15:49 yerel -> "15:49Z" ama gercek UTC 12:49). Veri her zaman dogruydu,
# yaniltan sadece log etiketiydi.
logging.Formatter.converter = time.gmtime
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
    level=logging.INFO,
    stream=sys.stdout,
)
log = logging.getLogger("iu_bridge")


# -----------------------------------------------------------------------------
# IU API sabitleri
# -----------------------------------------------------------------------------
IDAP_BASE = "https://api.infinite-uptime.com/api/3.0/idap-api"
PLANTOS_BASE = "https://plantos-dt-api.infinite-uptime.com"


# -----------------------------------------------------------------------------
# Ozel istisna: kimlik dogrulama hatasi
# -----------------------------------------------------------------------------
class IUAuthError(Exception):
    """
    IU login basarisiz (401 / gecersiz kimlik).

    NEDEN AYRI BIR ISTISNA?
      Bu hata requests.RequestException'dan TUREMEZ. Boylece monitor
      dongusundeki `except requests.RequestException` bunu YAKALAMAZ ve
      hata tum turu iptal edecek sekilde ana donguye kadar cikar.

      Eski davranis: login 401 aliyordu, monitor dongusu bunu ag hatasi
      sanip sonraki monitore geciyordu, o da yeniden login deniyordu ->
      dakikada 12 basarisiz login. systemd altinda 7/24 calisirken saatte
      720 deneme = IU hesabinin kilitlenme riski. (28.07.2026'da yasandi:
      .env'deki sifre eskiydi, bridge 7 gun boyunca bu donguyu kosturdu.)
    """


# -----------------------------------------------------------------------------
# Config (env'den)
# -----------------------------------------------------------------------------
@dataclass(frozen=True)
class Config:
    iu_username: str
    iu_password: str
    plant_id: int
    basic_poll_sec: int
    computed_poll_sec: int
    lookback_min: int
    mqtt_broker: str
    mqtt_port: int
    mqtt_username: str | None
    mqtt_password: str | None
    topic_prefix: str
    qos: int

    @classmethod
    def from_env(cls) -> "Config":
        u = os.getenv("OTOKAR_IU_USERNAME")
        p = os.getenv("OTOKAR_IU_PASSWORD")
        if not u or not p:
            sys.exit("HATA: OTOKAR_IU_USERNAME / OTOKAR_IU_PASSWORD env yok (.env kontrol)")
        return cls(
            iu_username=u,
            iu_password=p,
            plant_id=int(os.getenv("OTOKAR_IU_PLANT_ID", "1716")),
            basic_poll_sec=int(os.getenv("OTOKAR_IU_BASIC_POLL_SEC", "60")),
            computed_poll_sec=int(os.getenv("OTOKAR_IU_COMPUTED_POLL_SEC", "1800")),
            lookback_min=int(os.getenv("OTOKAR_IU_LOOKBACK_MIN", "5")),
            mqtt_broker=os.getenv("MQTT_BROKER", "localhost"),
            mqtt_port=int(os.getenv("MQTT_PORT", "1883")),
            mqtt_username=os.getenv("MQTT_USERNAME"),
            mqtt_password=os.getenv("MQTT_PASSWORD"),
            topic_prefix=os.getenv("MQTT_TOPIC_PREFIX", "factory/motor"),
            qos=int(os.getenv("MQTT_QOS", "1")),
        )


# -----------------------------------------------------------------------------
# IU signal code -> CB-MDTM signal_code + unit eslemeleri
# -----------------------------------------------------------------------------
# basic-features jsonAvg icindeki "0001".."0006" kodlarinin karsiligi
# TAHA BEY YAZILI TEYIDI 28.07.2026 - varsayim yok, teyitli.
#   0001 = ivmenin KARESI, eksen katkilarinin kareler toplami -> (m/s2)^2 rms
#   0002-4 = eksen bazli hiz RMS -> mm/s  (1 dk periyot;
#            computed taraftaki vrms_* ayni buyuklugun 30 dk periyodu)
#   0005 = sensor sicakligi -> degC
#   0006 = AKUSTIK ses seviyesi -> dB  (eski "bearing sicakligi" varsayimi YANLISTI)
BASIC_SIGNAL_MAP: dict[str, tuple[str, str]] = {
    "0001": ("accel_total",        "(m/s2)^2"),
    "0002": ("vibration_x",        "mm/s"),
    "0003": ("vibration_y",        "mm/s"),
    "0004": ("vibration_z",        "mm/s"),
    "0005": ("temperature_sensor", "degC"),
    "0006": ("acoustic_db",        "dB"),
}

# computed-features alan adlari -> CB-MDTM signal_code + unit
COMPUTED_SIGNAL_MAP: dict[str, tuple[str, str]] = {
    "VRMSX":      ("vrms_x",       "mm/s"),
    "VRMSY":      ("vrms_y",       "mm/s"),
    "VRMSZ":      ("vrms_z",       "mm/s"),
    "GRMSACCLX":  ("grms_accel_x", "g"),
    "GRMSACCLY":  ("grms_accel_y", "g"),
    "GRMSACCLZ":  ("grms_accel_z", "g"),
    "PPACCLX":    ("pp_accel_x",   "g"),
    "PPACCLY":    ("pp_accel_y",   "g"),
    "PPACCLZ":    ("pp_accel_z",   "g"),
    "CRESTACCLX": ("crest_x",      "-"),
    "CRESTACCLY": ("crest_y",      "-"),
    "CRESTACCLZ": ("crest_z",      "-"),
    "KURTACCLX":  ("kurtosis_x",   "-"),
    "KURTACCLY":  ("kurtosis_y",   "-"),
    "KURTACCLZ":  ("kurtosis_z",   "-"),
    "RPM":        ("rpm",          "rpm"),
    "IDLE":       ("idle",         "-"),
    "LOAD":       ("load",         "-"),
    "TA":         ("ta",           "-"),
}

# MOTOR_XX asset_code <-> IU monitor_id eslemesi
# (migration 0005 ile DB'de de var; burada da tutuyoruz cunku bridge DB'ye
#  bakmasin, tek dosyada okunabilir olsun. DB'deki tabloyla EL ILE senkron
#  tutmak gerekir - degisirse migration + burasi birlikte guncellenir.)
ASSET_MONITOR_MAP: list[tuple[str, int]] = [
    ("MOTOR_01", 198275),
    ("MOTOR_02", 198276),
    ("MOTOR_03", 198278),
    ("MOTOR_04", 198279),
    ("MOTOR_05", 198280),
    ("MOTOR_06", 198281),
    ("MOTOR_07", 198282),   # NOT: 29.07.2026 itibariyla veri uretmiyor (Ali Kemal Bey'e soruldu)
    ("MOTOR_08", 198283),
    ("MOTOR_09", 198284),
    ("MOTOR_10", 198285),
    ("MOTOR_11", 198286),
    ("MOTOR_12", 198287),
]


# -----------------------------------------------------------------------------
# IU token yoneticisi
# -----------------------------------------------------------------------------
@dataclass
class IUToken:
    access_token: str
    exp_epoch: int  # JWT exp claim (saniye)

    @property
    def expires_in(self) -> int:
        return self.exp_epoch - int(time.time())

    @property
    def needs_refresh(self) -> bool:
        # 60 sn kalinca yenile (guvenlik payi)
        return self.expires_in <= 60


class IUClient:
    """IU'ya login + veri fetch. Token'i cache'ler ve otomatik yeniler."""

    def __init__(self, username: str, password: str):
        self._username = username
        self._password = password
        self._token: IUToken | None = None
        self._session = requests.Session()

    def _login(self) -> IUToken:
        log.info("IU'ya login yapiliyor: %s", self._username)
        try:
            r = self._session.post(
                f"{IDAP_BASE}/login",
                json={"username": self._username, "password": self._password},
                headers={"Accept": "application/json"},
                timeout=30,
            )
            r.raise_for_status()
        except requests.HTTPError as e:
            status = e.response.status_code if e.response is not None else None
            if status in (401, 403):
                # Kimlik hatasi: tekrar denemek bosuna, hesap kilitlenebilir.
                # IUAuthError RequestException'dan turemez -> monitor dongusu
                # yakalamaz -> tum tur iptal olur (bkz. IUAuthError docstring).
                raise IUAuthError(
                    f"IU login reddedildi (HTTP {status}). "
                    f".env'deki OTOKAR_IU_PASSWORD guncel mi? "
                    f"Sifre rotate edildiyse .env de guncellenmelidir."
                ) from e
            raise  # 5xx / diger HTTP hatalari normal backoff'a gitsin

        data = r.json()
        # response: { "status": true, "data": { "accessToken": "...", "refreshToken": "..." } }
        access = data.get("accessToken") or data.get("access_token")
        if not access:
            access = (data.get("data") or {}).get("accessToken")
        if not access:
            raise IUAuthError(f"accessToken bulunamadi: {json.dumps(data)[:300]}")

        # JWT'nin exp claim'ini decode et (imza dogrulamiyoruz, sadece exp okuma)
        exp = self._decode_jwt_exp(access)
        log.info("IU token alindi (exp'e %d sn)", exp - int(time.time()))
        return IUToken(access_token=access, exp_epoch=exp)

    @staticmethod
    def _decode_jwt_exp(jwt: str) -> int:
        parts = jwt.split(".")
        if len(parts) != 3:
            raise IUAuthError("gecersiz JWT")
        payload_b64 = parts[1]
        # base64url padding
        padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        decoded = base64.urlsafe_b64decode(padded)
        payload = json.loads(decoded)
        exp = payload.get("exp")
        if not isinstance(exp, int):
            raise IUAuthError("exp claim yok/gecersiz")
        return exp

    def _ensure_token(self) -> str:
        if self._token is None or self._token.needs_refresh:
            self._token = self._login()
        return self._token.access_token

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self._ensure_token()}",
            "Accept": "application/json",
        }

    def get_basic_features(self, monitor_id: int, lookback_min: int) -> list[dict]:
        now = datetime.now(timezone.utc)
        params = {
            "measurementLocationId": monitor_id,
            "from": (now - timedelta(minutes=lookback_min)).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "to": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "interval": 1,
            "intervalUnit": "minute",
        }
        r = self._session.get(
            f"{PLANTOS_BASE}/trend/basic-features",
            params=params,
            headers=self._headers(),
            timeout=30,
        )
        r.raise_for_status()
        body = r.json()
        return body if isinstance(body, list) else body.get("data", [])

    def get_computed_features(self, monitor_id: int, lookback_hours: int = 1) -> list[dict]:
        now = datetime.now(timezone.utc)
        params = {
            "monitorId": monitor_id,
            "from": (now - timedelta(hours=lookback_hours)).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "to": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        }
        r = self._session.get(
            f"{IDAP_BASE}/trend/computed-features",
            params=params,
            headers=self._headers(),
            timeout=30,
        )
        r.raise_for_status()
        body = r.json()
        return body.get("data", []) if isinstance(body, dict) else body


# -----------------------------------------------------------------------------
# Payload donusumleri (IU -> CB-MDTM)
# -----------------------------------------------------------------------------
def basic_row_to_readings(row: dict) -> list[dict]:
    """
    basic-features tek satirini (jsonAvg baz alarak) CB-MDTM 'readings' listesine cevir.
    Bilinmeyen kod (BASIC_SIGNAL_MAP'te olmayan) atlanir.
    """
    raw = row.get("jsonAvg")
    if not raw or raw in ("null", "nan", ""):
        return []
    try:
        parsed = json.loads(raw) if isinstance(raw, str) else raw
    except (json.JSONDecodeError, TypeError):
        log.warning("basic jsonAvg parse edilemedi: %r", raw)
        return []

    readings: list[dict] = []
    for code, value in parsed.items():
        if value is None:
            continue
        mapping = BASIC_SIGNAL_MAP.get(code)
        if mapping is None:
            continue  # bilinmeyen IU kodu, atla
        signal_code, unit = mapping
        readings.append({
            "signal_code": signal_code,
            "value": round(float(value), 4),
            "unit": unit,
        })
    return readings


def computed_row_to_readings(row: dict) -> list[dict]:
    """
    computed-features tek satirini 'readings' listesine cevir.
    null degerler ve haritalanmamis alanlar atlanir.
    """
    readings: list[dict] = []
    for key, value in row.items():
        if key == "timestamp" or value is None:
            continue
        mapping = COMPUTED_SIGNAL_MAP.get(key)
        if mapping is None:
            continue
        signal_code, unit = mapping
        readings.append({
            "signal_code": signal_code,
            "value": round(float(value), 4),
            "unit": unit,
        })
    return readings


def parse_iu_timestamp(row: dict, key: str) -> datetime | None:
    """
    basic: row['time'] = '2026-07-29T12:02:00Z' (ISO)
    computed: row['timestamp'] = '1783937867000' (str, epoch ms)
    """
    val = row.get(key)
    if not val:
        return None
    if key == "time":
        # ISO 8601
        try:
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
        except ValueError:
            log.warning("iso timestamp parse edilemedi: %r", val)
            return None
    else:
        # epoch ms (str veya int)
        try:
            ms = int(val)
            return datetime.fromtimestamp(ms / 1000, tz=timezone.utc)
        except (ValueError, TypeError):
            log.warning("epoch timestamp parse edilemedi: %r", val)
            return None


def build_payload(asset_code: str, ts_utc: datetime, readings: list[dict]) -> dict:
    """
    mock_publisher.build_payload ile BIREBIR AYNI schema.
    """
    return {
        "schema_version": "1.0",
        "dt_id": "OTOKAR_CORE",
        "asset_code": asset_code,
        "source": "REAL",
        "ts_utc": ts_utc.isoformat().replace("+00:00", "Z"),
        "readings": readings,
    }


# -----------------------------------------------------------------------------
# MQTT baglantisi (mock_publisher ile ayni desen)
# -----------------------------------------------------------------------------
def make_mqtt(cfg: Config) -> mqtt.Client:
    try:
        client = mqtt.Client(
            mqtt.CallbackAPIVersion.VERSION2,
            client_id="cbmdtm-iu-bridge",
        )
    except AttributeError:
        client = mqtt.Client(client_id="cbmdtm-iu-bridge")

    if cfg.mqtt_username:
        client.username_pw_set(cfg.mqtt_username, cfg.mqtt_password)

    def on_connect(client, userdata, flags, rc, *_):
        log.info("MQTT baglandi (rc=%s)", rc)

    def on_disconnect(client, userdata, *_):
        log.warning("MQTT baglantisi koptu")

    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    return client


# -----------------------------------------------------------------------------
# Ana bridge dongusu
# -----------------------------------------------------------------------------
class Bridge:
    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.iu = IUClient(cfg.iu_username, cfg.iu_password)
        self.mqtt_client = make_mqtt(cfg)
        self._stopped = False
        # Her (feature_type, monitor_id) icin son islenen zaman damgasi.
        # Ayni satir iki kez publish edilmesin diye tutulur.
        self._last_ts: dict[str, datetime] = {}

    def stop(self, *_args) -> None:
        log.info("Kapatma sinyali alindi")
        self._stopped = True

    # ---- Backoff yardimcisi ----
    @staticmethod
    def _backoff(attempt: int) -> float:
        return min(60.0, 1.0 * (2 ** attempt))

    # ---- Ortak yayin yardimcisi ----
    def _publish_new_rows(
        self,
        asset_code: str,
        monitor_id: int,
        rows: list[dict],
        ts_key: str,
        to_readings,
        kind: str,
    ) -> tuple[int, int]:
        """
        Bir monitorun cektigi TUM yeni satirlari yayinlar.

        NEDEN rows[-1] DEGIL?
          Eski davranis her turda yalnizca son satiri aliyordu. IU o dakika
          yeni kova kapatmadiysa satir atlanip bir daha geri donulmuyordu;
          KPI'da ~%12-16 gap olarak gorunuyordu. Artik son islenen zaman
          damgasindan SONRAKI her satir yayinlanir -> kayipsizlik.

        Cift yayin riski yok: worker INSERT ... ON CONFLICT DO NOTHING
        kullaniyor, PK (ts_utc, asset_id, signal_id, source) idempotent.

        Donus: (yayimlanan, atlanan)
        """
        published = 0
        skipped = 0
        key = f"{kind}:{monitor_id}"
        last_seen = self._last_ts.get(key)

        # Zaman damgasi cozulebilen satirlari sirala (IU sirali dondurmeyebilir)
        dated: list[tuple[datetime, dict]] = []
        for row in rows:
            ts = parse_iu_timestamp(row, ts_key)
            if ts is None:
                skipped += 1
                continue
            dated.append((ts, row))
        dated.sort(key=lambda p: p[0])

        newest = last_seen
        for ts, row in dated:
            if last_seen is not None and ts <= last_seen:
                continue  # zaten islenmis
            readings = to_readings(row)
            if not readings:
                skipped += 1
                continue
            payload = build_payload(asset_code, ts, readings)
            topic = f"{self.cfg.topic_prefix}/{asset_code.split('_')[1]}/telemetry"
            self.mqtt_client.publish(topic, json.dumps(payload), qos=self.cfg.qos)
            published += 1
            if newest is None or ts > newest:
                newest = ts

        if newest is not None:
            self._last_ts[key] = newest

        return published, skipped

    # ---- Basic tur ----
    def _run_basic(self) -> tuple[int, int]:
        """
        12 monitor icin basic-features cek, yeni satirlari MQTT'ye publish et.
        Donus: (yayimlanan, atlanan)

        NOT: IUAuthError burada YAKALANMAZ; ana donguye cikar ve tum tur
        iptal olur. Bkz. IUAuthError docstring (login dongusu korumasi).
        """
        published = 0
        skipped = 0
        for asset_code, monitor_id in ASSET_MONITOR_MAP:
            try:
                rows = self.iu.get_basic_features(monitor_id, self.cfg.lookback_min)
            except requests.RequestException as e:
                log.warning("basic fetch failed monitor=%s: %s", monitor_id, e)
                skipped += 1
                continue

            if not rows:
                skipped += 1
                continue

            p, s = self._publish_new_rows(
                asset_code, monitor_id, rows, "time", basic_row_to_readings, "basic"
            )
            published += p
            skipped += s

        return published, skipped

    # ---- Computed tur ----
    def _run_computed(self) -> tuple[int, int]:
        published = 0
        skipped = 0
        for asset_code, monitor_id in ASSET_MONITOR_MAP:
            try:
                rows = self.iu.get_computed_features(monitor_id, lookback_hours=1)
            except requests.RequestException as e:
                log.warning("computed fetch failed monitor=%s: %s", monitor_id, e)
                skipped += 1
                continue

            if not rows:
                skipped += 1
                continue

            p, s = self._publish_new_rows(
                asset_code, monitor_id, rows, "timestamp", computed_row_to_readings, "computed"
            )
            published += p
            skipped += s

        return published, skipped

    # ---- Ana dongu ----
    def run(self) -> None:
        # Sinyal yakalayicilari
        signal.signal(signal.SIGINT, self.stop)
        signal.signal(signal.SIGTERM, self.stop)

        # MQTT baglan
        log.info(
            "MQTT'ye baglaniyor: %s:%s (topic '%s/<id>/telemetry', QoS-%s)",
            self.cfg.mqtt_broker, self.cfg.mqtt_port,
            self.cfg.topic_prefix, self.cfg.qos,
        )
        self.mqtt_client.connect(self.cfg.mqtt_broker, self.cfg.mqtt_port)
        self.mqtt_client.loop_start()

        log.info(
            "Bridge baslatildi. basic_poll=%ds, computed_poll=%ds, lookback=%dmin",
            self.cfg.basic_poll_sec, self.cfg.computed_poll_sec, self.cfg.lookback_min,
        )

        # Ana dongu: basic_poll_sec ritminde tik at, computed_poll_sec sayacini takip et
        last_computed = 0.0  # monotonic()
        tick_count = 0
        backoff_attempt = 0
        auth_attempt = 0
        total_published = 0
        total_skipped = 0
        report_at = time.monotonic() + 30.0  # her 30 sn ozet

        while not self._stopped:
            tick_start = time.monotonic()
            tick_count += 1

            try:
                p_basic, s_basic = self._run_basic()
                total_published += p_basic
                total_skipped += s_basic

                # Computed sayaci doldu mu?
                if tick_start - last_computed >= self.cfg.computed_poll_sec:
                    p_comp, s_comp = self._run_computed()
                    total_published += p_comp
                    total_skipped += s_comp
                    last_computed = tick_start
                    log.info("computed tur: yayimlanan=%d atlanan=%d", p_comp, s_comp)

                # Basari => sayaclari sifirla
                backoff_attempt = 0
                auth_attempt = 0

            except IUAuthError as e:
                # Kimlik hatasi: tur derhal iptal, UZUN backoff.
                # Amac IU hesabini kilitlememek. Normal backoff (max 60 sn)
                # yerine 5 dk'dan baslayip 1 saate kadar cikiyoruz.
                auth_attempt += 1
                wait = min(3600.0, 300.0 * auth_attempt)
                log.error(
                    "IU KIMLIK HATASI (deneme %d): %s "
                    "Tur iptal edildi, %.0f dk bekleniyor.",
                    auth_attempt, e, wait / 60.0,
                )
                if self._sleep_until_stopped(wait):
                    break
                continue

            except Exception as e:  # noqa: BLE001 - genel dayaniklilik
                backoff_attempt += 1
                wait = self._backoff(backoff_attempt)
                log.error(
                    "tur PATLADI (deneme %d): %s. %.1f sn bekleyip devam.",
                    backoff_attempt, e, wait,
                )
                if self._sleep_until_stopped(wait):
                    break
                continue

            # Periyodik ozet
            if time.monotonic() >= report_at:
                log.info(
                    "OZET: tik=%d yayimlanan=%d atlanan=%d",
                    tick_count, total_published, total_skipped,
                )
                report_at = time.monotonic() + 30.0

            # Sonraki tik'e kadar uyu
            elapsed = time.monotonic() - tick_start
            sleep_for = max(0.0, self.cfg.basic_poll_sec - elapsed)
            if self._sleep_until_stopped(sleep_for):
                break

        # Kapanis
        log.info(
            "Kapaniyor. Toplam: yayimlanan=%d atlanan=%d",
            total_published, total_skipped,
        )
        self.mqtt_client.loop_stop()
        self.mqtt_client.disconnect()

    def _sleep_until_stopped(self, seconds: float) -> bool:
        """
        Kesilebilir uyku: her 0.5 sn'de bir stopped kontrol eder.
        True donerse dongu bitmeli.
        """
        end = time.monotonic() + seconds
        while time.monotonic() < end:
            if self._stopped:
                return True
            time.sleep(min(0.5, end - time.monotonic()))
        return False


def main() -> None:
    cfg = Config.from_env()
    Bridge(cfg).run()


if __name__ == "__main__":
    main()