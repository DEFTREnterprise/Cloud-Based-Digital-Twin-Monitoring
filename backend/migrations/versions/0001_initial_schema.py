"""ilk migration: cekirdek tablolar + telemetri hypertable

TRS Bolum 5.4.1 - 5.4.6 tanimlarina gore tum cekirdek tablolari olusturur.

Bu dosya bir ALEMBIC MIGRATION'idir. Calistirmak icin pgAdmin'e degil,
terminale 'alembic upgrade head' yazarsin. Geri almak icin 'alembic downgrade base'.

Revision ID: 0001_initial
Revises: (yok - bu ilk migration)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# --- Alembic'in bu migration'i tanimasi icin gereken kimlik bilgileri ---
revision = "0001_initial"     # bu migration'in kimligi
down_revision = None          # oncesinde migration yok (bu ilki)
branch_labels = None
depends_on = None


# ============================================================================
# YUKARI (upgrade): veritabanini bu surume getirir = tablolari OLUSTURUR
# ============================================================================
def upgrade() -> None:

    # --- 0) TimescaleDB extension acik olsun (hypertable icin gerekli) -------
    op.execute("CREATE EXTENSION IF NOT EXISTS timescaledb")  # TIMESCALE

    # --- 1) ENUM tipleri -----------------------------------------------------
    # TRS'de "enum" denen alanlar icin PostgreSQL enum tipleri. Bunlar DB'ye
    # ozel oldugu icin dogrudan SQL ile olusturuluyor; tablolar ise asagida
    # Python (op.create_table) ile kuruluyor.
    op.execute("CREATE TYPE tenant_status    AS ENUM ('ACTIVE','PASSIVE')")
    op.execute("CREATE TYPE dt_type          AS ENUM ('OTOKAR_CORE','PDM','TPT','ESOGU')")
    op.execute("CREATE TYPE signal_data_type AS ENUM ('numeric','boolean','string','json')")
    op.execute("CREATE TYPE telemetry_source AS ENUM ('REAL','SIM','DERIVED')")
    op.execute("CREATE TYPE quality_flag     AS ENUM ('OK','GAP','DELAYED','OUTLIER','INVALID','UNKNOWN')")

    # Sutunlarda kullanmak icin enum referanslari. create_type=False ->
    # "bu tipi tekrar OLUSTURMA, sadece ismiyle kullan" demek (yukarida olusturduk).
    tenant_status_t = postgresql.ENUM(name="tenant_status", create_type=False)
    dt_type_t       = postgresql.ENUM(name="dt_type", create_type=False)
    data_type_t     = postgresql.ENUM(name="signal_data_type", create_type=False)
    source_t        = postgresql.ENUM(name="telemetry_source", create_type=False)
    quality_t       = postgresql.ENUM(name="quality_flag", create_type=False)

    uuid_pk = lambda: sa.Column(  # her tabloda tekrar eden UUID birincil anahtar kalibi
        "_", postgresql.UUID(as_uuid=True),
        server_default=sa.text("gen_random_uuid()"), nullable=False,
    )

    # --- 2) TENANT (TRS 5.4.1): kurumsal ayrim (OTOKAR/DEFTR/ESOGU) ----------
    op.create_table(
        "tenant",
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("tenant_code", sa.String(64), nullable=False),   # OTOKAR / DEFTR / ESOGU
        sa.Column("tenant_name", sa.String(255), nullable=False),  # gorunen isim
        sa.Column("status", tenant_status_t, nullable=False,
                  server_default=sa.text("'ACTIVE'")),
        sa.PrimaryKeyConstraint("tenant_id"),
        sa.UniqueConstraint("tenant_code", name="uq_tenant_code"),
    )

    # --- 3) DT_REGISTRY (TRS 5.4.2): dijital ikiz kayitlari ------------------
    # default_signal_set_id, signal_set'e baglidir (dongusel iliski). O yuzden
    # sutunu simdi koyuyoruz ama FK'sini signal_set olustuktan SONRA ekliyoruz.
    op.create_table(
        "dt_registry",
        sa.Column("dt_id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("dt_type", dt_type_t, nullable=False),            # OTOKAR_CORE | PDM | TPT | ESOGU
        sa.Column("dt_name", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("default_signal_set_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.PrimaryKeyConstraint("dt_id"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenant.tenant_id"], name="fk_dt_tenant"),
    )

    # --- 4) SIGNAL_CATALOG (TRS 5.4.4): sinyallerin sozlugu -----------------
    # NOT: warn_threshold/critical_threshold, panelin esik cizgisi (1.5.2) ve
    # seed (1.1.3) icin eklendi. mock_publisher.py'deki CATALOG ile AYNI olmali.
    op.create_table(
        "signal_catalog",
        sa.Column("signal_id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("signal_code", sa.String(128), nullable=False),  # "temperature", "vibration"...
        sa.Column("unit", sa.String(32), nullable=False),          # "degC", "g", "rpm"
        sa.Column("data_type", data_type_t, nullable=False, server_default=sa.text("'numeric'")),
        sa.Column("expected_rate_hz", sa.Numeric(), nullable=True),  # gap/lag tespiti icin
        sa.Column("range_min", sa.Numeric(), nullable=True),         # outlier alt sinir
        sa.Column("range_max", sa.Numeric(), nullable=True),         # outlier ust sinir
        sa.Column("warn_threshold", sa.Numeric(), nullable=True),    # panel sari cizgi
        sa.Column("critical_threshold", sa.Numeric(), nullable=True),# panel kirmizi cizgi
        sa.PrimaryKeyConstraint("signal_id"),
        sa.UniqueConstraint("signal_code", name="uq_signal_code"),
        sa.CheckConstraint("expected_rate_hz IS NULL OR expected_rate_hz >= 0",
                           name="ck_signal_rate_nonneg"),
    )

    # --- 5) SIGNAL_SET & SIGNAL_SET_ITEM (TRS 5.4.5): sinyal gruplari -------
    op.create_table(
        "signal_set",
        sa.Column("signal_set_id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("dt_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("signal_set_id"),
        sa.ForeignKeyConstraint(["dt_id"], ["dt_registry.dt_id"], name="fk_sigset_dt"),
    )
    op.create_table(
        "signal_set_item",
        sa.Column("signal_set_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("signal_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.PrimaryKeyConstraint("signal_set_id", "signal_id"),   # ayni sinyal sette tekrar edemez
        sa.ForeignKeyConstraint(["signal_set_id"], ["signal_set.signal_set_id"], name="fk_item_set"),
        sa.ForeignKeyConstraint(["signal_id"], ["signal_catalog.signal_id"], name="fk_item_signal"),
        sa.CheckConstraint("display_order >= 0", name="ck_item_order_nonneg"),
    )

    # --- 6) ASSET_REGISTRY (TRS 5.4.3): varlik/motor kayitlari --------------
    # asset_code = publisher'in gonderdigi "MOTOR_01"; (dt_id, asset_code) cifti
    # benzersiz ki worker kodu UUID'ye tek anlamli cevirebilsin.
    op.create_table(
        "asset_registry",
        sa.Column("asset_id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("dt_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("asset_code", sa.String(128), nullable=False),  # "MOTOR_01" ...
        sa.Column("subsystem", sa.String(128), nullable=True),    # motor/batarya/aktarma vb.
        sa.Column("tags", postgresql.JSONB(), nullable=True),     # gruplama/filtre etiketleri
        sa.PrimaryKeyConstraint("asset_id"),
        sa.ForeignKeyConstraint(["dt_id"], ["dt_registry.dt_id"], name="fk_asset_dt"),
        sa.UniqueConstraint("dt_id", "asset_code", name="uq_asset_dt_code"),
    )

    # --- 7) Dongusel FK'yi simdi ekle: dt_registry.default_signal_set_id ----
    op.create_foreign_key(
        "fk_dt_default_signal_set", "dt_registry", "signal_set",
        ["default_signal_set_id"], ["signal_set_id"],
    )

    # --- 8) TELEMETRY_MEASUREMENTS (TRS 5.4.6): asil olcum tablosu ----------
    # Bilesik PK (ts_utc, asset_id, signal_id, source) = IDEMPOTENT anahtar:
    # ayni olcum iki kez gelse bile (QoS-1 tekrari) cift kayit olusmaz.
    # Performans icin bu tabloda FK YOK (TRS de zorunlu kilmiyor).
    op.create_table(
        "telemetry_measurements",
        sa.Column("ts_utc", sa.TIMESTAMP(timezone=True), nullable=False),     # olcum zamani (UTC)
        sa.Column("dt_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("signal_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source", source_t, nullable=False),                        # REAL | SIM | DERIVED
        sa.Column("value_num", sa.Float(), nullable=True),                    # sayisal deger
        sa.Column("value_bool", sa.Boolean(), nullable=True),                 # boolean sinyaller
        sa.Column("value_str", sa.Text(), nullable=True),                     # metin sinyaller
        sa.Column("value_json", postgresql.JSONB(), nullable=True),           # yapisal sinyaller
        sa.Column("quality_flag", quality_t, nullable=False, server_default=sa.text("'OK'")),
        sa.Column("ingest_ts_utc", sa.TIMESTAMP(timezone=True),
                  nullable=False, server_default=sa.text("now()")),           # platforma gelis (lag)
        sa.Column("correlation_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.PrimaryKeyConstraint("ts_utc", "asset_id", "signal_id", "source"),  # IDEMPOTENT anahtar
    )

    # Tabloyu hypertable'a cevir (zaman kolonu: ts_utc).
    op.execute(
        "SELECT create_hypertable('telemetry_measurements','ts_utc', if_not_exists => TRUE)"
    )  # TIMESCALE

    # Sorgu performansi icin indeksler (TRS 5.4.6 oneri):
    op.create_index("idx_tm_asset_signal_ts", "telemetry_measurements",
                    ["asset_id", "signal_id", sa.text("ts_utc DESC")])
    op.create_index("idx_tm_dt_ts", "telemetry_measurements",
                    ["dt_id", sa.text("ts_utc DESC")])


# ============================================================================
# ASAGI (downgrade): bu migration'i GERI ALIR = tablolari/tipleri SILER
# Olusturma sirasinin TERSINE gidilir (once cocuk tablolar, sonra ebeveynler).
# ============================================================================
def downgrade() -> None:
    op.drop_index("idx_tm_dt_ts", table_name="telemetry_measurements")
    op.drop_index("idx_tm_asset_signal_ts", table_name="telemetry_measurements")
    op.drop_table("telemetry_measurements")

    op.drop_table("signal_set_item")
    op.drop_table("asset_registry")
    # Dongusel FK'yi kaldir ki signal_set ve dt_registry silinebilsin:
    op.drop_constraint("fk_dt_default_signal_set", "dt_registry", type_="foreignkey")
    op.drop_table("signal_set")
    op.drop_table("signal_catalog")
    op.drop_table("dt_registry")
    op.drop_table("tenant")

    # Enum tiplerini sil:
    for type_name in ("quality_flag", "telemetry_source", "signal_data_type",
                      "dt_type", "tenant_status"):
        op.execute(f"DROP TYPE IF EXISTS {type_name}")
