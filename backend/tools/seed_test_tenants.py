"""
seed_test_tenants.py — ESOGU + DEFTR test tenant'lari

Amac: 23.4 tenant izolasyonu testleri icin coklu tenant DB'si hazirla.

Idempotent: sabit UUID'ler + ON CONFLICT DO NOTHING. Kac kez calistirsan
ayni sonuc.

Prod'a KOsulmayacak — sadece dev/test.

Kullanim (backend klasorunden, venv aktif):
    $env:DATABASE_URL=(Get-Content ..\.env | Select-String '^DATABASE_URL=' | %{$_.ToString().Split('=',2)[1]}); python tools\seed_test_tenants.py
"""
from __future__ import annotations

import os
import sys
from uuid import UUID

import psycopg2

# --- Sabit UUID'ler (idempotency icin) ---
# Kolayca ayirt edilebilir: ...cc = ESOGU, ...dd = DEFTR
ESOGU_TENANT_ID = UUID("00000000-0000-0000-0000-0000000000cc")
ESOGU_DT_ID     = UUID("00000000-0000-0000-0000-0000000000ce")
ESOGU_ASSET_ID  = UUID("00000000-0000-0000-0000-0000000000cf")

DEFTR_TENANT_ID = UUID("00000000-0000-0000-0000-0000000000dd")


def main() -> None:
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("HATA: DATABASE_URL ortam degiskeni tanimli degil.", file=sys.stderr)
        print("Ornek: $env:DATABASE_URL='postgresql://postgres:PASS@localhost:5432/cbmdtm'", file=sys.stderr)
        sys.exit(1)

    # asyncpg URL formati verildiyse duzelt (psycopg2 icin)
    if db_url.startswith("postgresql+asyncpg://"):
        db_url = db_url.replace("postgresql+asyncpg://", "postgresql://", 1)

    with psycopg2.connect(db_url) as conn:
        conn.autocommit = False
        with conn.cursor() as cur:
            # --- 1) Tenant'lar ---
            cur.execute("""
                INSERT INTO tenant (tenant_id, tenant_code, tenant_name, status)
                VALUES (%s, 'ESOGU', 'Eskisehir Osmangazi Universitesi', 'ACTIVE')
                ON CONFLICT (tenant_id) DO NOTHING
            """, (str(ESOGU_TENANT_ID),))
            print(f"tenant ESOGU: eklendi/mevcut ({cur.rowcount} satir etkilendi)")

            cur.execute("""
                INSERT INTO tenant (tenant_id, tenant_code, tenant_name, status)
                VALUES (%s, 'DEFTR', 'DEFTR (yonetim tenant)', 'ACTIVE')
                ON CONFLICT (tenant_id) DO NOTHING
            """, (str(DEFTR_TENANT_ID),))
            print(f"tenant DEFTR: eklendi/mevcut ({cur.rowcount} satir etkilendi)")

            # --- 2) ESOGU DT'si (DEFTR'in DT'si yok - yonetim tenant) ---
            cur.execute("""
                INSERT INTO dt_registry (dt_id, tenant_id, dt_type, dt_name, is_active)
                VALUES (%s, %s, 'ESOGU', 'ESOGU Digital Twin Testbed', true)
                ON CONFLICT (dt_id) DO NOTHING
            """, (str(ESOGU_DT_ID), str(ESOGU_TENANT_ID)))
            print(f"dt ESOGU: eklendi/mevcut ({cur.rowcount} satir etkilendi)")

            # --- 3) ESOGU asset ---
            cur.execute("""
                INSERT INTO asset_registry (asset_id, dt_id, asset_code, subsystem, tags)
                VALUES (%s, %s, 'TESTBED_01', 'university_lab', '{"location":"ESOGU_Lab"}'::jsonb)
                ON CONFLICT (asset_id) DO NOTHING
            """, (str(ESOGU_ASSET_ID), str(ESOGU_DT_ID)))
            print(f"asset ESOGU/TESTBED_01: eklendi/mevcut ({cur.rowcount} satir etkilendi)")

        conn.commit()
        print("\nCOMMIT basarili.")

    # --- 4) Ozet ---
    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT t.tenant_code,
                       count(DISTINCT dr.dt_id)  AS dt_count,
                       count(DISTINCT ar.asset_id) AS asset_count
                FROM tenant t
                LEFT JOIN dt_registry   dr ON dr.tenant_id = t.tenant_id
                LEFT JOIN asset_registry ar ON ar.dt_id     = dr.dt_id
                GROUP BY t.tenant_code
                ORDER BY t.tenant_code
            """)
            print("\n=== Tenant ozet ===")
            print(f"{'tenant':<10} {'dts':>5} {'assets':>8}")
            for code, dts, assets in cur.fetchall():
                print(f"{code:<10} {dts:>5} {assets:>8}")


if __name__ == "__main__":
    main()