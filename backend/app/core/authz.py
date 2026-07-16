"""
authz.py — Modul-rol matrisi (Faz 2, ADIM 24 + P0.10 hizalama)

Frontend'in 6 modulu var. Her birinin hangi role'lere acik oldugu burada
tanimlanir. Backend'in tek dogruluk kaynagi bu dosyadir; frontend menu
karari '/api/v1/me' -> allowed_modules alanindan gelir, hard-code degil.

MODUL ID HIZALAMASI (P0.10, 17 Tem):
  Frontend Sidebar.jsx `item.id` degerleri REFERANS'tir. Backend bu id'leri
  aynen kullanir. Boylece /me.allowed_modules dogrudan Sidebar'in filtreleme
  anahtari olarak kullanilabilir (P0.9).

  live      -> Live Monitoring   (SSE + telemetri)
  platform  -> Platform Management (admin-only)
  tpt       -> TPT Module         (DEFTR trajectory planning)
  esogu     -> ESOGU DT Tool
  pdm       -> Otokar PdM Module
  settings  -> System Options / Configuration

ROL MODELI (Faz 2 karari): backend 3 realm rolu
  OTOKAR_Viewer, ESOGU_Operator, DEFTR_Admin
Frontend'in eski 7-rol mock modeli P0.8'de bu 3 role indirilecek.

Yeni modul veya rol eklerken: sadece MODULE_ROLES sozlugu guncellenir.
Endpoint mantigi (require_roles) ayrica kendi kararini verir; bu matris
yalnizca UI gorunurlugu icin.
"""
from __future__ import annotations

MODULE_ROLES: dict[str, list[str]] = {
    # Canli izleme — tum girisli kullanicilar gorur (her tenant kendi verisini)
    "live":     ["OTOKAR_Viewer", "ESOGU_Operator", "DEFTR_Admin"],
    # Platform yonetimi — SADECE admin (cross-tenant supervizyon)
    "platform": ["DEFTR_Admin"],
    # Trajectory Planning Tool — DEFTR'in kendi DT'si
    "tpt":      ["DEFTR_Admin"],
    # ESOGU Digital Twin Tool (HIL/SIL, verification)
    "esogu":    ["ESOGU_Operator", "DEFTR_Admin"],
    # Otokar Predictive Maintenance
    "pdm":      ["OTOKAR_Viewer", "DEFTR_Admin"],
    # Sistem konfigurasyonu — tum girisli kullanicilar (salt gorunum;
    # write yetkileri endpoint icinde require_roles ile ayrica kisitlanir)
    "settings": ["OTOKAR_Viewer", "ESOGU_Operator", "DEFTR_Admin"],
}


def modules_for_roles(user_roles: list[str]) -> list[str]:
    """Kullanicinin rollerine gore gorunur modul listesini doner.

    OR mantigi: kullanicinin herhangi bir rolu modul icin gerekli listede
    varsa modul dahil edilir. Modul sirasi MODULE_ROLES tanim sirasidir
    (frontend menu sirasi icin stabil).
    """
    user_set = set(user_roles)
    return [
        module
        for module, allowed in MODULE_ROLES.items()
        if user_set.intersection(allowed)
    ]


def all_modules() -> list[str]:
    """Sistemdeki tum modul id'leri (tanim sirasinda).

    Debug/introspect icin; frontend'de test scenarios uretmek icin
    kullanilabilir.
    """
    return list(MODULE_ROLES.keys())