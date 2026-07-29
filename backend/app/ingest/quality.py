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
DELAYED_THRESHOLD_SEC = 2.0   # taban esik; 1 Hz sinyaller icin (NFR-PERF-003)
LAG_PERIOD_FACTOR = 4.0       # yavas sinyallerde: beklenen periyodun bu kati tolere edilir


def compute_lag_seconds(ts_utc: datetime, ingest_ts: datetime) -> float:
    """Olcum zamani ile DB'ye yazim zamani arasindaki gecikme (saniye)."""
    return (ingest_ts - ts_utc).total_seconds()


def delayed_threshold_for(expected_rate_hz: float | None) -> float:
    """
    Bir sinyal icin DELAYED esigini dondurur.

    NEDEN SABIT DEGIL?
      ts_utc = OLCUM ani, ingest_ts = DB'ye yazim ani. Aradaki fark yalnizca
      bizim boru hattimiz degil, KAYNAGIN ritmini de icerir:
        - IU basic  : 1 dk kova + 60 sn polling -> dogal ~140 sn gecikme
        - IU computed: 30 dk periyot            -> dogal ~1180 sn gecikme
      Sabit 2 sn esik bunlarin hepsini DELAYED isaretler; bu bir performans
      sorunu degil, dis sistemin dogasi. Bu yuzden esigi sinyalin BEKLENEN
      PERIYODUNA oranliyoruz: periyodun 4 katindan gec gelen veri gercekten
      gecikmistir (4 tur ust uste kacirilmis demektir).

    Taban korunur: hizli sinyallerde (mock 1 Hz) esik yine 2 sn kalir,
    yani NFR-PERF-003 gevsetilmis olmaz.
    """
    if not expected_rate_hz or expected_rate_hz <= 0:
        return DELAYED_THRESHOLD_SEC
    period_sec = 1.0 / expected_rate_hz
    return max(DELAYED_THRESHOLD_SEC, LAG_PERIOD_FACTOR * period_sec)


def classify(
    value: float,
    lag_sec: float,
    range_min: float | None,
    range_max: float | None,
    expected_rate_hz: float | None = None,
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

    # 3) DELAYED: sinyalin kendi ritmine gore cok mu gec geldi?
    if lag_sec > delayed_threshold_for(expected_rate_hz):
        return "DELAYED"

    # 4) OK
    return "OK"