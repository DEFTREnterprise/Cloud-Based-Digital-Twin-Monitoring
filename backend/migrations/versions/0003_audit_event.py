"""ucuncu migration: AUDIT_EVENT tablosu

FR-API-008 + FR-IAM: her korumali endpoint cagrisinin izini birak.
- Bearer token ile gelen istek: kim, ne, sonuc, ne zaman
- 401/403 kararlarini ayrica isaretle (RBAC denetim izi)

Revision ID: 0003_audit_event
Revises: 0002_aggregates_retention
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# --- Alembic kimlik bilgileri ---
revision = "0003_audit_event"
down_revision = "0002_aggregates_retention"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # audit_action enum: sonuc kategorileri
    # AUTH_OK       : token gecerli + rol yetti + endpoint calisti
    # AUTH_FAIL_401 : token yok / gecersiz / expired
    # AUTH_FAIL_403 : token gecerli ama rol yetersiz
    # AUTH_ERROR    : beklenmeyen hata (JWKS erisimi vb.)
    op.execute("""
        CREATE TYPE audit_action AS ENUM (
            'AUTH_OK', 'AUTH_FAIL_401', 'AUTH_FAIL_403', 'AUTH_ERROR'
        )
    """)

    op.create_table(
        "audit_event",
        # PK: server-side UUID uretimi (parallel insert guvenli)
        sa.Column(
            "event_id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        # Olay zamani (UTC). Client-side degil, DB'de now() ile atayalim ki
        # farkli process saatleri arasinda tutarli olsun.
        sa.Column(
            "ts_utc",
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        # --- Kullanici kimligi (token'dan) ---
        # 401'lerde token yok -> nullable
        sa.Column("user_sub", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("username", sa.String(255), nullable=True),
        sa.Column("tenant_code", sa.String(64), nullable=True),
        # --- Istek konteksti ---
        sa.Column("method", sa.String(10), nullable=False),        # GET/POST/...
        sa.Column("path", sa.String(500), nullable=False),         # /api/v1/me
        sa.Column("status_code", sa.SmallInteger(), nullable=False),
        sa.Column("action", postgresql.ENUM(name="audit_action", create_type=False), nullable=False),
        sa.Column("client_ip", sa.String(64), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("correlation_id", sa.String(128), nullable=True),
        # --- Esnek ek alan: gerektiginde role_required, hata detayi vb. ---
        sa.Column(
            "details",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )

    # Indeksler: en sik sorgu paternleri
    # 1) Genel timeline: son N olayi listele
    op.create_index(
        "ix_audit_event_ts_utc_desc",
        "audit_event",
        [sa.text("ts_utc DESC")],
    )
    # 2) Kullanici bazli tarama: bu kullanici son 7 gunde neler yapti
    op.create_index(
        "ix_audit_event_user_ts",
        "audit_event",
        ["user_sub", sa.text("ts_utc DESC")],
    )
    # 3) Kategori bazli: son 24 saatte kac AUTH_FAIL_403
    op.create_index(
        "ix_audit_event_action_ts",
        "audit_event",
        ["action", sa.text("ts_utc DESC")],
    )
    # 4) Tenant analitigi: OTOKAR tenant'inin son N olayi
    op.create_index(
        "ix_audit_event_tenant_ts",
        "audit_event",
        ["tenant_code", sa.text("ts_utc DESC")],
    )


def downgrade() -> None:
    op.drop_index("ix_audit_event_tenant_ts", table_name="audit_event")
    op.drop_index("ix_audit_event_action_ts", table_name="audit_event")
    op.drop_index("ix_audit_event_user_ts", table_name="audit_event")
    op.drop_index("ix_audit_event_ts_utc_desc", table_name="audit_event")
    op.drop_table("audit_event")
    op.execute("DROP TYPE audit_action")