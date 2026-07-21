"""besinci migration: IU sinyalleri + monitor mapping

FR-INGEST (OTOKAR Infinite Uptime entegrasyonu):
  1) asset_registry'ye iu_monitor_id ekle (OTOKAR MOTOR_01..12 icin)
     - Nullable (ESOGU asset'lerinde NULL kalir)
     - UNIQUE (bir monitor iki asset'e baglanmasin)
  2) signal_catalog'a 24 IU sinyali ekle:
     - 6 basic-features (0001..0006 kodlarina karsilik)
     - 18 computed-features (VRMS, GRMS, PP, CREST, KURT × 3 eksen + RPM + IDLE + LOAD + TA)
     - Esik degerleri hepsinde NULL (Ankara sonrasi tune edilecek, Faz 3)
  3) 12 OTOKAR MOTOR_01..12 asset'ini IU monitor id'leriyle backfill:
     MOTOR_01 -> 198275 (R1 K1AX1), ..., MOTOR_12 -> 198287 (R2 K2AX5)

Backfill guvenligi:
  - Mevcut 3 sinyal (temperature, vibration, speed) DURACAK — mock uyumu
  - OTOKAR tenant'inda tam 12 asset var mi kontrol edilir (kesin sayi)
  - NULL kalan varsa migration patlar

Revision ID: 0005_iu_signals_monitor_mapping
Revises: 0004_tenant_id_denormalize
"""
from alembic import op
import sqlalchemy as sa


# --- Alembic kimlik bilgileri ---
revision = "0005_iu_signals_monitor_mapping"
down_revision = "0004_tenant_id_denormalize"
branch_labels = None
depends_on = None


# ---------------------------------------------------------------------------
# Sabitler
# ---------------------------------------------------------------------------

# 12 OTOKAR asset -> IU monitor id eslemesi
# Otokar Sakarya plant (1716), machine group "Matisse", 12 monitor
ASSET_MONITOR_MAP: list[tuple[str, int, str]] = [
    # (asset_code, iu_monitor_id, iu_machine_name)
    ("MOTOR_01", 198275, "R1 K1AX1"),
    ("MOTOR_02", 198276, "R1 K1AX2"),
    ("MOTOR_03", 198278, "R1 K1AX3A"),
    ("MOTOR_04", 198279, "R1 K1AX3B"),
    ("MOTOR_05", 198280, "R1 K1AX4"),
    ("MOTOR_06", 198281, "K1 AX5"),
    ("MOTOR_07", 198282, "R2 K2AX1"),
    ("MOTOR_08", 198283, "R2 K2AX2"),
    ("MOTOR_09", 198284, "R2 K2AX3A"),
    ("MOTOR_10", 198285, "R2 K2AX3B"),
    ("MOTOR_11", 198286, "R2 K2AX4"),
    ("MOTOR_12", 198287, "R2 K2AX5"),
]

# IU sinyalleri — signal_catalog'a eklenecek
# Format: (signal_code, unit, expected_rate_hz, kategori)
IU_SIGNALS: list[tuple[str, str, float | None, str]] = [
    # --- basic-features (0001..0006), dakikada 1 = ~0.0167 Hz ---
    ("accel_total",        "g",     0.0167, "basic"),  # 0001
    ("vibration_x",        "m/s2",  0.0167, "basic"),  # 0002
    ("vibration_y",        "m/s2",  0.0167, "basic"),  # 0003
    ("vibration_z",        "m/s2",  0.0167, "basic"),  # 0004
    ("temperature_sensor", "degC",  0.0167, "basic"),  # 0005
    ("temperature_bearing","degC",  0.0167, "basic"),  # 0006 (birim Taha teyit edecek)

    # --- computed-features, 30 dakikada 1 = ~0.000556 Hz ---
    # Hiz RMS (mm/s) — PdM icin en kritik metrik
    ("vrms_x",             "mm/s",  0.000556, "computed"),
    ("vrms_y",             "mm/s",  0.000556, "computed"),
    ("vrms_z",             "mm/s",  0.000556, "computed"),
    # Ivme RMS (g)
    ("grms_accel_x",       "g",     0.000556, "computed"),
    ("grms_accel_y",       "g",     0.000556, "computed"),
    ("grms_accel_z",       "g",     0.000556, "computed"),
    # Tepe-tepe ivme (g)
    ("pp_accel_x",         "g",     0.000556, "computed"),
    ("pp_accel_y",         "g",     0.000556, "computed"),
    ("pp_accel_z",         "g",     0.000556, "computed"),
    # Crest faktor (birimsiz, "-")
    ("crest_x",            "-",     0.000556, "computed"),
    ("crest_y",            "-",     0.000556, "computed"),
    ("crest_z",            "-",     0.000556, "computed"),
    # Kurtosis (birimsiz)
    ("kurtosis_x",         "-",     0.000556, "computed"),
    ("kurtosis_y",         "-",     0.000556, "computed"),
    ("kurtosis_z",         "-",     0.000556, "computed"),
    # Durum bilgileri
    ("rpm",                "rpm",   0.000556, "computed"),
    ("idle",               "-",     0.000556, "computed"),  # 0/1
    ("load",               "-",     0.000556, "computed"),  # yuk faktoru
    ("ta",                 "-",     0.000556, "computed"),  # calisma zaman analizi
]


def upgrade() -> None:
    # -----------------------------------------------------------------------
    # 1) asset_registry'ye iu_monitor_id kolonu ekle (NULLABLE + UNIQUE)
    # -----------------------------------------------------------------------
    op.add_column(
        "asset_registry",
        sa.Column("iu_monitor_id", sa.Integer(), nullable=True),
    )
    op.create_unique_constraint(
        "uq_asset_iu_monitor",
        "asset_registry",
        ["iu_monitor_id"],
    )

    # -----------------------------------------------------------------------
    # 2) signal_catalog'a 24 IU sinyalini ekle
    # -----------------------------------------------------------------------
    # Not: expected_rate_hz Numeric alan, INSERT'te float bind guvenli.
    # NULL kalan alanlar: range_min, range_max, warn_threshold, critical_threshold
    # (Ankara sonrasi OTOKAR gercek verisiyle tune edilecek — karar 13.07.2026)
    for signal_code, unit, rate_hz, _kategori in IU_SIGNALS:
        op.execute(sa.text("""
            INSERT INTO signal_catalog
                (signal_code, unit, data_type, expected_rate_hz)
            VALUES
                (:code, :unit, 'numeric', :rate)
            ON CONFLICT (signal_code) DO NOTHING
        """).bindparams(code=signal_code, unit=unit, rate=rate_hz))

    # -----------------------------------------------------------------------
    # 3) 12 OTOKAR asset'ini IU monitor id ile backfill
    # -----------------------------------------------------------------------
    # Once OTOKAR tenant'inda ilgili asset'ler var mi kontrol
    op.execute("""
        DO $$
        DECLARE
            asset_cnt bigint;
        BEGIN
            SELECT count(*) INTO asset_cnt
            FROM asset_registry ar
            JOIN dt_registry dr ON dr.dt_id = ar.dt_id
            JOIN tenant t ON t.tenant_id = dr.tenant_id
            WHERE t.tenant_code = 'OTOKAR'
              AND ar.asset_code LIKE 'MOTOR_%';

            IF asset_cnt < 12 THEN
                RAISE EXCEPTION 'OTOKAR MOTOR_XX asset sayisi 12 olmali, bulunan: %', asset_cnt;
            END IF;
        END $$;
    """)

    # Her esleme icin UPDATE
    for asset_code, monitor_id, _machine in ASSET_MONITOR_MAP:
        op.execute(sa.text("""
            UPDATE asset_registry ar
            SET iu_monitor_id = :monitor_id
            FROM dt_registry dr
            JOIN tenant t ON t.tenant_id = dr.tenant_id
            WHERE ar.dt_id = dr.dt_id
              AND t.tenant_code = 'OTOKAR'
              AND ar.asset_code = :asset_code
        """).bindparams(monitor_id=monitor_id, asset_code=asset_code))

    # Backfill dogrulama — 12 OTOKAR asset'inde iu_monitor_id dolu olmali
    op.execute("""
        DO $$
        DECLARE
            filled_cnt bigint;
        BEGIN
            SELECT count(*) INTO filled_cnt
            FROM asset_registry ar
            JOIN dt_registry dr ON dr.dt_id = ar.dt_id
            JOIN tenant t ON t.tenant_id = dr.tenant_id
            WHERE t.tenant_code = 'OTOKAR'
              AND ar.asset_code LIKE 'MOTOR_%'
              AND ar.iu_monitor_id IS NOT NULL;

            IF filled_cnt <> 12 THEN
                RAISE EXCEPTION 'Backfill basarisiz: OTOKAR MOTOR_XX iu_monitor_id dolu asset: %', filled_cnt;
            END IF;
        END $$;
    """)


def downgrade() -> None:
    # 24 IU sinyalini sil (mevcut 3 sinyal — temperature/vibration/speed — DURACAK)
    signal_codes = [s[0] for s in IU_SIGNALS]
    op.execute(sa.text("""
        DELETE FROM signal_catalog WHERE signal_code = ANY(:codes)
    """).bindparams(codes=signal_codes))

    # asset_registry'den iu_monitor_id kolonu (unique constraint dahil)
    op.drop_constraint("uq_asset_iu_monitor", "asset_registry", type_="unique")
    op.drop_column("asset_registry", "iu_monitor_id")