"""
Quality — her okuma icin ingest_lag hesaplar ve QUALITY_FLAG atar.

QUALITY_FLAG mantigi (telemetry_measurements.quality_flag enum'una birebir):
  INVALID : deger sayisal degil / NaN / sonsuz  -> kullanilamaz
  OUTLIER : deger sinyalin fiziksel araligi (range_min/max) disinda
  DELAYED : olcum zamani ile ingest zamani farki esikten buyuk (gec geldi)
  OK      : yukaridakilerin hicbiri yoksa
  (GAP ve UNKNOWN bu asamada uretilmez:
     GAP    -> ardisik veri eksikligi; ileride zaman-serisi analizinde tespit edilir
     UNKNOWN-> resolver sinyali tanimazsa worker ayrica isaretler)

Esikler TRS 2.1.1 KPI tanimlariyla uyumludur; tek yerden ayarlanabilir.
"""
from __future__ import annotations

import math
from datetime import datetime, timezone

# --- Ayarlanabilir esikler -------------------------------------------------
DELAYED_THRESHOLD_SEC = 2.0   # olcum->ingest farki bu degeri asarsa DELAYED (NFR-PERF-003)


def compute_lag_seconds(ts_utc: datetime, ingest_ts: datetime) -> float:
    """Olcum zamani ile DB'ye yazim zamani arasindaki gecikme (saniye)."""
    return (ingest_ts - ts_utc).total_seconds()


def classify(
    value: float,
    lag_sec: float,
    range_min: float | None,
    range_max: float | None,
) -> str:
    """Bir okumanin quality_flag degerini dondurur (enum string)."""
    # 1) INVALID: sayisal olarak gecersiz mi?
    if value is None or math.isnan(value) or math.isinf(value):
        return "INVALID"

    # 2) OUTLIER: fiziksel araligin disinda mi? (range tanimliysa)
    if range_min is not None and value < range_min:
        return "OUTLIER"
    if range_max is not None and value > range_max:
        return "OUTLIER"

    # 3) DELAYED: cok mu gec geldi?
    if lag_sec > DELAYED_THRESHOLD_SEC:
        return "DELAYED"

    # 4) OK
    return "OK"