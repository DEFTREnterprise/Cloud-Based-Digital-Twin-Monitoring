#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
seed.py — catalog.py'deki referans veriyi veritabanina yukler (Faz 1, gorev 1.1.3)
==================================================================================

Ne yapar:
  catalog.py'deki kurum, dijital ikiz, sinyaller ve motorlari veritabanindaki
  ilgili tablolara (tenant, dt_registry, signal_catalog, asset_registry) yazar.

Onemli: bu betik IDEMPOTENT'tir = kac kez calistirirsan calistir sonuc aynidir.
  Var olan satirlar GUNCELLENIR, yenisi olusmaz (INSERT ... ON CONFLICT ... DO UPDATE).
  Yani catalog.py'de bir esik degistirip seed'i tekrar calistirabilirsin.

Calistirma:
  python seed.py --database-url postgresql://KULLANICI:SIFRE@localhost:5432/cbmdtm
  (ya da DATABASE_URL ortam degiskenini ayarla, parametresiz calistir.)
"""

import argparse
import os
import sys

import psycopg2
from psycopg2.extras import Json   # dict -> JSONB icin

import catalog as cat


# ---------------------------------------------------------------------------
# SQL'ler  --  hepsi "varsa guncelle, yoksa ekle" (upsert) mantiginda
# ---------------------------------------------------------------------------
SQL_TENANT = """
INSERT INTO tenant (tenant_id, tenant_code, tenant_name, status)
VALUES (%(tenant_id)s, %(tenant_code)s, %(tenant_name)s, %(status)s)
ON CONFLICT (tenant_id) DO UPDATE SET
    tenant_code = EXCLUDED.tenant_code,
    tenant_name = EXCLUDED.tenant_name,
    status      = EXCLUDED.status;
"""

SQL_DT = """
INSERT INTO dt_registry (dt_id, tenant_id, dt_type, dt_name, is_active)
VALUES (%(dt_id)s, %(tenant_id)s, %(dt_type)s, %(dt_name)s, %(is_active)s)
ON CONFLICT (dt_id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    dt_type   = EXCLUDED.dt_type,
    dt_name   = EXCLUDED.dt_name,
    is_active = EXCLUDED.is_active;
"""

# signal_code benzersiz oldugu icin catismayi onun uzerinden cozuyoruz.
# Boylece sinyalin UUID'si (signal_id) sabit kalir; worker onu koddan bulur.
SQL_SIGNAL = """
INSERT INTO signal_catalog
    (signal_code, unit, data_type, expected_rate_hz,
     range_min, range_max, warn_threshold, critical_threshold)
VALUES
    (%(signal_code)s, %(unit)s, %(data_type)s, %(expected_rate_hz)s,
     %(range_min)s, %(range_max)s, %(warn_threshold)s, %(critical_threshold)s)
ON CONFLICT (signal_code) DO UPDATE SET
    unit               = EXCLUDED.unit,
    data_type          = EXCLUDED.data_type,
    expected_rate_hz   = EXCLUDED.expected_rate_hz,
    range_min          = EXCLUDED.range_min,
    range_max          = EXCLUDED.range_max,
    warn_threshold     = EXCLUDED.warn_threshold,
    critical_threshold = EXCLUDED.critical_threshold;
"""

# (dt_id, asset_code) cifti benzersiz -> catismayi onun uzerinden cozuyoruz.
SQL_ASSET = """
INSERT INTO asset_registry (dt_id, asset_code, subsystem, tags)
VALUES (%(dt_id)s, %(asset_code)s, %(subsystem)s, %(tags)s)
ON CONFLICT (dt_id, asset_code) DO UPDATE SET
    subsystem = EXCLUDED.subsystem,
    tags      = EXCLUDED.tags;
"""


# ---------------------------------------------------------------------------
def parse_args():
    p = argparse.ArgumentParser(description="CB-MDTM referans veri seed betigi")
    p.add_argument("--database-url", default=None,
                   help="postgresql://kullanici:sifre@host:port/veritabani "
                        "(verilmezse DATABASE_URL ortam degiskeni kullanilir)")
    return p.parse_args()


def get_url(args) -> str:
    url = args.database_url or os.environ.get("DATABASE_URL")
    if not url:
        # Son care varsayilan; kendi bilgilerinle degistir veya parametre ver.
        url = "postgresql://postgres@localhost:5432/cbmdtm"
    return url


def main():
    args = parse_args()
    url = get_url(args)

    # Tek bir transaction icinde calisiriz: ya hepsi yazilir ya hicbiri (guvenli).
    conn = psycopg2.connect(url)
    try:
        with conn, conn.cursor() as cur:
            # 1) Kurum
            cur.execute(SQL_TENANT, cat.TENANT)

            # 2) Dijital ikiz (kuruma bagli)
            cur.execute(SQL_DT, cat.DT)

            # 3) Sinyaller (catalog.py -> DB kolon adlarina esle)
            for s in cat.SIGNALS:
                cur.execute(SQL_SIGNAL, {
                    "signal_code":        s.code,
                    "unit":               s.unit,
                    "data_type":          s.data_type,
                    "expected_rate_hz":   s.expected_rate_hz,
                    "range_min":          s.range_min,
                    "range_max":          s.range_max,
                    "warn_threshold":     s.warn,
                    "critical_threshold": s.critical,
                })

            # 4) Motorlar (dt'ye bagli)
            for a in cat.ASSETS:
                cur.execute(SQL_ASSET, {
                    "dt_id":      a["dt_id"],
                    "asset_code": a["asset_code"],
                    "subsystem":  a["subsystem"],
                    "tags":       Json(a["tags"]) if a["tags"] is not None else None,
                })
        # 'with conn' bloktan hatasiz cikinca otomatik COMMIT eder.
        print(f"[OK] seed tamam: 1 tenant, 1 dt, "
              f"{len(cat.SIGNALS)} sinyal, {len(cat.ASSETS)} motor yuklendi/guncellendi.",
              flush=True)
    except Exception as e:
        conn.rollback()
        print(f"[HATA] seed basarisiz: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
