"""
Ingest sema modelleri — gelen MQTT JSON payload'inin yapisini tanimlar ve dogrular.

Publisher'in bastigi ornek mesaj:
{
  "schema_version": "1.0",
  "dt_id": "OTOKAR_CORE",
  "asset_code": "MOTOR_06",
  "source": "REAL",
  "ts_utc": "2026-06-15T09:17:26.938478Z",
  "readings": [
    {"signal_code": "temperature", "value": 67.346, "unit": "degC"},
    {"signal_code": "vibration",   "value": 1.205,  "unit": "g"},
    {"signal_code": "speed",       "value": 1385.5, "unit": "rpm"}
  ]
}

Bu modelle dogrulanan her mesaj guvenle islenebilir; dogrulanamayan mesaj
worker tarafindan atlanir (kotu veri DB'ye yazilmaz).
"""
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class Reading(BaseModel):
    """Tek bir sinyal okumasi (mesajdaki 'readings' listesinin bir elemani)."""
    signal_code: str = Field(..., min_length=1)
    value: float
    unit: str | None = None  # birim opsiyonel; DB'deki signal_catalog zaten birimi tutuyor


class TelemetryIn(BaseModel):
    """Bir motorun tek bir andaki tum okumalarini tasiyan mesaj."""
    schema_version: str = "1.0"
    dt_id: str = Field(..., min_length=1)          # ornek: "OTOKAR_CORE" (dt_type)
    asset_code: str = Field(..., min_length=1)     # ornek: "MOTOR_06"
    source: str = "REAL"                           # REAL | SIM | DERIVED
    ts_utc: datetime                               # ISO-8601; pydantic otomatik datetime'a cevirir
    readings: list[Reading] = Field(..., min_length=1)

    @field_validator("source")
    @classmethod
    def _normalize_source(cls, v: str) -> str:
        # Tabloda source enum benzeri kullaniliyor; buyuk harfe sabitleyelim.
        return v.upper()

    @field_validator("ts_utc")
    @classmethod
    def _ensure_tz(cls, v: datetime) -> datetime:
        # Zaman damgasi tz-naive gelirse UTC kabul et (publisher zaten ..Z gonderiyor).
        if v.tzinfo is None:
            from datetime import timezone
            return v.replace(tzinfo=timezone.utc)
        return v