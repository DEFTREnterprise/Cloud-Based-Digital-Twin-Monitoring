"""dorduncu migration: tenant_id denormalize + aggregate rebuild + backfill

FR-IAM (tenant izolasyonu): telemetry_measurements'a tenant_id kolonunu
ekleyip tum sorgu yollarinin (RAW + 3 CAgg) tek WHERE ile tenant filtresi
uygulamasini saglariz. Zincir: asset -> dt -> tenant.

Islem sirasi (guvenli):
  1) telemetry_measurements'a tenant_id NULL olarak ekle
  2) Backfill: asset_registry JOIN dt_registry ile mevcut satirlari doldur
  3) NULL kalan var mi kontrol et (kalirsa migration patlar - guvenli)
  4) NOT NULL + FK constraint ekle
  5) (tenant_id, ts_utc DESC) composite index
  6) 3 continuous aggregate'i DROP -> CREATE (tenant_id GROUP BY dahil)
  7) Refresh + retention policy'lerini tekrar attach
  8) Gecmis veri icin refresh_continuous_aggregate calistir

Veri kaybi:
  - RAW telemetry_measurements DOKUNULMAZ (2232 satir korunur)
  - CAgg cache'i regenerate olur (refresh_continuous_aggregate ile)
  - Retention policy 90 gun aynen gelir

Revision ID: 0004_tenant_id_denormalize
Revises: 0003_audit_event
"""
from alembic import op


# --- Alembic kimlik bilgileri ---
revision = "0004_tenant_id_denormalize"
down_revision = "0003_audit_event"
branch_labels = None
depends_on = None


# 0002 ile birebir ayni tanim — tek fark: SELECT + GROUP BY'da tenant_id eklendi
ROLLUPS = [
    # gorunum         kova          refresh      start_offset
    ("telemetry_1m",  "1 minute",   "1 minute",  "6 hours"),
    ("telemetry_10m", "10 minutes", "10 minutes", "3 days"),
    ("telemetry_1h",  "1 hour",     "1 hour",    "30 days"),
]
RETENTION = "90 days"


def upgrade() -> None:
    # ---------- 1) Kolonu NULL olarak ekle ----------
    op.execute("""
        ALTER TABLE telemetry_measurements
        ADD COLUMN tenant_id UUID
    """)

    # ---------- 2) Backfill (asset -> dt -> tenant) ----------
    # Mevcut 2232 satiri single UPDATE ile doldur. Hypertable'da olsa bile
    # UPDATE calisir (TimescaleDB icin ozel bir kisit yok bu operasyonda).
    op.execute("""
        UPDATE telemetry_measurements AS tm
        SET tenant_id = dr.tenant_id
        FROM asset_registry AS ar
        JOIN dt_registry AS dr ON dr.dt_id = ar.dt_id
        WHERE tm.asset_id = ar.asset_id
    """)

    # ---------- 3) NULL kaldi mi kontrol et ----------
    # Herhangi bir satir NULL kalirsa migration burada patlar (ROLLBACK).
    # Bu bilinen ihlal: telemetri satiri asset_registry'de olmayan bir asset_id
    # icin yazilmis demek. Boyle bir sey olmamali (FK yok cunku hypertable'da
    # FK zorlanmiyor, ama semantik olarak butun asset'ler kayitli olmali).
    op.execute("""
        DO $$
        DECLARE
            null_cnt bigint;
        BEGIN
            SELECT count(*) INTO null_cnt FROM telemetry_measurements WHERE tenant_id IS NULL;
            IF null_cnt > 0 THEN
                RAISE EXCEPTION 'Backfill basarisiz: % satirda tenant_id NULL kaldi. asset_registry tutarliligini kontrol edin.', null_cnt;
            END IF;
        END $$;
    """)

    # ---------- 4) NOT NULL + FK constraint ----------
    op.execute("""
        ALTER TABLE telemetry_measurements
        ALTER COLUMN tenant_id SET NOT NULL
    """)
    op.execute("""
        ALTER TABLE telemetry_measurements
        ADD CONSTRAINT fk_telemetry_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id)
    """)

    # ---------- 5) Composite index (tenant + zaman) ----------
    # Tenant-filtreli timeseries sorgulari icin optimize.
    op.execute("""
        CREATE INDEX ix_telemetry_tenant_ts
        ON telemetry_measurements (tenant_id, ts_utc DESC)
    """)

    # ---------- 6a) Mevcut continuous aggregate'leri kaldir ----------
    # Once policy'leri dus (autocommit block ZORUNLU)
    with op.get_context().autocommit_block():
        op.execute("""
            SELECT remove_retention_policy('telemetry_measurements', if_exists => true)
        """)
        for view, _, _, _ in reversed(ROLLUPS):
            op.execute(f"""
                SELECT remove_continuous_aggregate_policy('{view}', if_exists => true)
            """)

    # Sonra view'lari dus (bunlar transaction icinde OK)
    for view, _, _, _ in reversed(ROLLUPS):
        op.execute(f"DROP MATERIALIZED VIEW IF EXISTS {view}")

    # ---------- 6b) Aggregate'leri tenant_id ile yeniden yarat ----------
    for view, bucket, _, _ in ROLLUPS:
        op.execute(f"""
            CREATE MATERIALIZED VIEW {view}
            WITH (timescaledb.continuous) AS
            SELECT
                time_bucket(INTERVAL '{bucket}', ts_utc) AS bucket,
                tenant_id,
                asset_id,
                signal_id,
                source,
                avg(value_num) AS avg_value,
                min(value_num) AS min_value,
                max(value_num) AS max_value,
                count(*)       AS sample_count
            FROM telemetry_measurements
            GROUP BY bucket, tenant_id, asset_id, signal_id, source
            WITH NO DATA
        """)

    # ---------- 7) Policy'leri tekrar attach + retention ----------
    with op.get_context().autocommit_block():
        for view, bucket, schedule, start_off in ROLLUPS:
            op.execute(f"""
                SELECT add_continuous_aggregate_policy('{view}',
                    start_offset      => INTERVAL '{start_off}',
                    end_offset        => INTERVAL '{bucket}',
                    schedule_interval => INTERVAL '{schedule}')
            """)
        op.execute(f"""
            SELECT add_retention_policy('telemetry_measurements', INTERVAL '{RETENTION}')
        """)

    # ---------- 8) Gecmis veriyi CAgg'lere materialize et ----------
    # NULL, NULL = tum aralik. Mevcut 2232 satir icin aggregate'ler dolar.
    # Bu autocommit gerektirir (refresh_continuous_aggregate transaction'da calismaz).
    with op.get_context().autocommit_block():
        for view, _, _, _ in ROLLUPS:
            op.execute(f"""
                CALL refresh_continuous_aggregate('{view}', NULL, NULL)
            """)


def downgrade() -> None:
    # Ters yol: aggregate'leri yeniden (0002 durumuna, tenant_id'siz) kur, policy'leri tekrar attach.
    with op.get_context().autocommit_block():
        op.execute("""
            SELECT remove_retention_policy('telemetry_measurements', if_exists => true)
        """)
        for view, _, _, _ in reversed(ROLLUPS):
            op.execute(f"""
                SELECT remove_continuous_aggregate_policy('{view}', if_exists => true)
            """)

    for view, _, _, _ in reversed(ROLLUPS):
        op.execute(f"DROP MATERIALIZED VIEW IF EXISTS {view}")

    # Index ve constraint'leri kaldir
    op.execute("DROP INDEX IF EXISTS ix_telemetry_tenant_ts")
    op.execute("ALTER TABLE telemetry_measurements DROP CONSTRAINT IF EXISTS fk_telemetry_tenant")
    op.execute("ALTER TABLE telemetry_measurements DROP COLUMN IF EXISTS tenant_id")

    # 0002 durumuna geri don: aggregate'leri tenant_id'siz yarat
    for view, bucket, _, _ in ROLLUPS:
        op.execute(f"""
            CREATE MATERIALIZED VIEW {view}
            WITH (timescaledb.continuous) AS
            SELECT
                time_bucket(INTERVAL '{bucket}', ts_utc) AS bucket,
                asset_id,
                signal_id,
                source,
                avg(value_num) AS avg_value,
                min(value_num) AS min_value,
                max(value_num) AS max_value,
                count(*)       AS sample_count
            FROM telemetry_measurements
            GROUP BY bucket, asset_id, signal_id, source
            WITH NO DATA
        """)

    with op.get_context().autocommit_block():
        for view, bucket, schedule, start_off in ROLLUPS:
            op.execute(f"""
                SELECT add_continuous_aggregate_policy('{view}',
                    start_offset      => INTERVAL '{start_off}',
                    end_offset        => INTERVAL '{bucket}',
                    schedule_interval => INTERVAL '{schedule}')
            """)
        op.execute(f"""
            SELECT add_retention_policy('telemetry_measurements', INTERVAL '{RETENTION}')
        """)
        for view, _, _, _ in ROLLUPS:
            op.execute(f"CALL refresh_continuous_aggregate('{view}', NULL, NULL)")