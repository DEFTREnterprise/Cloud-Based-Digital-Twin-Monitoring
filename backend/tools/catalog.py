#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
catalog.py — TEK KAYNAK (single source of truth)
================================================

Tum referans veri (kurum, dijital ikiz, sinyaller, motorlar) BURADA tanimlanir.
Hem seed.py (veritabanini doldurur) hem de mock_publisher.py (sahte veri uretir)
bu dosyadan beslenir. Boylece bir seyi degistirmek istediginde TEK yere dokunursun
ve iki taraf asla birbirinden sapmaz.

Degistirmek istediginde nereye bakacaksin:
  - Sinyal ekle/cikar/degistir   -> SIGNALS listesi
  - Motor sayisini degistir       -> MOTOR_COUNT
  - Kurum/DT bilgisi degistir      -> TENANT / DT sozlukleri
"""

from dataclasses import dataclass


# ---------------------------------------------------------------------------
# SABIT KIMLIKLER
# tenant ve dt'ye SABIT UUID veriyoruz. Sebebi: seed'i tekrar tekrar
# calistirsan bile ayni satirlar guncellenir, yenisi olusmaz (idempotent).
# Bu UUID'leri degistirmen gerekmez; oldugu gibi birak.
# ---------------------------------------------------------------------------
TENANT_ID = "00000000-0000-0000-0000-0000000000aa"
DT_ID     = "00000000-0000-0000-0000-0000000000bb"


# ---------------------------------------------------------------------------
# KURUM (tenant)
# ---------------------------------------------------------------------------
TENANT = {
    "tenant_id":   TENANT_ID,
    "tenant_code": "OTOKAR",        # kisa kod
    "tenant_name": "Otokar",        # gorunen isim
    "status":      "ACTIVE",        # ACTIVE | PASSIVE
}


# ---------------------------------------------------------------------------
# DIJITAL IKIZ (dt_registry)
# ---------------------------------------------------------------------------
DT = {
    "dt_id":     DT_ID,
    "tenant_id": TENANT_ID,
    "dt_type":   "OTOKAR_CORE",                 # OTOKAR_CORE | PDM | TPT | ESOGU
    "dt_name":   "Otokar sasi kontrol hatti",
    "is_active": True,
}


# ---------------------------------------------------------------------------
# SINYAL TANIMI
# Bir alanda hem veritabani (range/warn/critical) hem de mock publisher
# (random-walk: sim_*) icin gereken her sey bir arada.
# ---------------------------------------------------------------------------
@dataclass
class SignalDef:
    code: str                       # sinyal kodu (signal_catalog.signal_code)
    unit: str                       # birim
    data_type: str = "numeric"      # numeric | boolean | string | json
    expected_rate_hz: float = 1.0   # beklenen frekans (gap/lag tespiti)
    range_min: float = None         # fiziksel/gecerli alt sinir
    range_max: float = None         # fiziksel/gecerli ust sinir
    warn: float = None              # uyari esigi (panel sari cizgi)
    critical: float = None          # kritik esik (panel kirmizi cizgi)
    # --- Sadece mock publisher icin (DB'ye gitmez): ---
    sim_mean: float = 0.0           # normal calismadaki ortalama
    sim_sigma: float = 1.0          # dalgalanma buyuklugu
    sim_reversion: float = 0.05     # ortalamaya geri cekme gucu


# ---------------------------------------------------------------------------
# SINYAL KATALOGU  --  ekle/cikar/degistir BURADA
# ---------------------------------------------------------------------------
SIGNALS = [
    SignalDef("temperature", "degC", range_min=40, range_max=95, warn=80, critical=90,
              sim_mean=65,   sim_sigma=0.8,  sim_reversion=0.05),
    SignalDef("vibration",   "g",    range_min=0,  range_max=8,  warn=3.5, critical=5,
              sim_mean=1.2,  sim_sigma=0.05, sim_reversion=0.08),
    SignalDef("speed",       "rpm",  range_min=0,  range_max=3000, warn=2500, critical=2800,
              sim_mean=1450, sim_sigma=8,    sim_reversion=0.05),
    # --- Yeni sinyal ornegi (robot kolu konumu). Acmak istersen yorumu kaldir: ---
    # SignalDef("position",  "mm",   range_min=-500, range_max=500, warn=450, critical=490,
    #           sim_mean=0,  sim_sigma=2,    sim_reversion=0.02),
]


# ---------------------------------------------------------------------------
# VARLIKLAR (motorlar)  --  asset_registry
# Motor sayisini degistirmek icin sadece MOTOR_COUNT'u degistir.
# ---------------------------------------------------------------------------
MOTOR_COUNT = 12


def make_assets(n: int = MOTOR_COUNT) -> list[dict]:
    """MOTOR_01 ... MOTOR_<n> varlik kayitlarini uretir."""
    return [
        {
            "dt_id":      DT_ID,
            "asset_code": f"MOTOR_{i:02d}",
            "subsystem":  "robot_arm",
            "tags":       {"group": "chassis_inspection"},
        }
        for i in range(1, n + 1)
    ]


ASSETS = make_assets()
