"""ikinci migration: continuous aggregate (rollup) + retention

1.2.1: uc seviye rollup gorunumu + otomatik refresh politikasi
1.2.2: RAW telemetri icin 90 gunluk retention (FR-DATA-012)

TimescaleDB policy cagrilari transaction bloğu icinde calismaz; bu yuzden
autocommit_block() ile sariyoruz.

Revision ID: 0002_aggregates_retention
Revises: 0001_initial
"""
from alembic import op

revision = "0002_aggregates_retention"
down_revision = "0001_initial"
branch_labels = None
depends_on = None

ROLLUPS = [
    # gorunum         kova          refresh        start_offset
    ("telemetry_1m",  "1 minute",   "1 minute",   "6 hours"),
    ("telemetry_10m", "10 minutes", "10 minutes", "3 days"),
    ("telemetry_1h",  "1 hour",     "1 hour",     "30 days"),
]

RETENTION = "90 days"


def upgrade() -> None:
    # Continuous aggregate gorunumlerini olustur (bunlar transaction icinde calisabilir)
    for view, bucket, schedule, start_off in ROLLUPS:
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

    # Policy cagrilari transaction DISINDA calismali -> autocommit_block
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


def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("""
            SELECT remove_retention_policy('telemetry_measurements', if_exists => true)
        """)
        for view, _, _, _ in reversed(ROLLUPS):
            op.execute(f"SELECT remove_continuous_aggregate_policy('{view}', if_exists => true)")

    for view, _, _, _ in reversed(ROLLUPS):
        op.execute(f"DROP MATERIALIZED VIEW IF EXISTS {view}")