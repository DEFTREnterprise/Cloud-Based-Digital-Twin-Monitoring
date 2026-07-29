"""altinci migration: IU sozluk tashihi (birim + 0006 kod adi)

Taha Bey (OTOKAR) 28.07.2026 yazili teyidi sonrasi:
  0001 -> ivmenin KARESI, (m/s2)^2 rms. 'g' YANLIS idi.
          Eksen katkilarinin kareler toplami. Ham degeri m/s2 diye
          saklamak her kaydi karesi kadar yanlis yapardi.
  0002-4 -> hiz RMS, mm/s. 'm/s2' YANLIS idi.
  0006 -> AKUSTIK ses seviyesi, dB. 'bearing sicakligi degC' varsayimi
          tamamen YANLIS idi -> kod adi da degisiyor.

ONEMLI: Bu bir METADATA tashihidir, veri donusumu DEGILDIR.
  Bridge IU degerini ham gecirir (hicbir carpan yok), yani
  telemetry_measurements'taki sayilar zaten dogruydu; yanlis olan
  sadece signal_catalog'daki etiketti. Gecmis veriye DOKUNULMAZ.

signal_code yeniden adlandirma guvenligi:
  signal_id (PK) degismez -> telemetry_measurements FK'leri saglam kalir.
  Ancak tools/otokar_iu_bridge.py BASIC_SIGNAL_MAP ayni commit'te
  guncellenmeli, yoksa bridge cozemeyen kod yayinlar.

Revision ID: 0006_iu_unit_fix
Revises: 0005_iu_signals_monitor_mapping
"""
from alembic import op
import sqlalchemy as sa


revision = "0006_iu_unit_fix"
down_revision = "0005_iu_signals_monitor_mapping"
branch_labels = None
depends_on = None


# (signal_code, eski_unit, yeni_unit)
UNIT_FIXES: list[tuple[str, str, str]] = [
    ("accel_total", "g",    "(m/s2)^2"),   # 0001
    ("vibration_x", "m/s2", "mm/s"),       # 0002 - 1 dk hiz RMS
    ("vibration_y", "m/s2", "mm/s"),       # 0003
    ("vibration_z", "m/s2", "mm/s"),       # 0004
]

# 0006: hem kod adi hem birim
OLD_CODE_0006 = "temperature_bearing"
NEW_CODE_0006 = "acoustic_db"


def upgrade() -> None:
    # --- 1) Birim tashihleri ---
    for code, _old, new_unit in UNIT_FIXES:
        op.execute(sa.text("""
            UPDATE signal_catalog SET unit = :unit WHERE signal_code = :code
        """).bindparams(unit=new_unit, code=code))

    # --- 2) 0006: kod adi + birim ---
    # Hedef kod zaten varsa cakisma olur; once kontrol et.
    op.execute(sa.text("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM signal_catalog WHERE signal_code = :new_code) THEN
                RAISE EXCEPTION 'Hedef signal_code zaten var: %', :new_code;
            END IF;
        END $$;
    """).bindparams(new_code=NEW_CODE_0006))

    op.execute(sa.text("""
        UPDATE signal_catalog
        SET signal_code = :new_code, unit = 'dB'
        WHERE signal_code = :old_code
    """).bindparams(new_code=NEW_CODE_0006, old_code=OLD_CODE_0006))

    # --- 3) Dogrulama: 6 basic sinyalin hepsi dogru birimde mi? ---
    op.execute("""
        DO $$
        DECLARE
            bad_cnt bigint;
        BEGIN
            SELECT count(*) INTO bad_cnt
            FROM signal_catalog
            WHERE (signal_code = 'accel_total'        AND unit <> '(m/s2)^2')
               OR (signal_code IN ('vibration_x','vibration_y','vibration_z')
                                                       AND unit <> 'mm/s')
               OR (signal_code = 'temperature_sensor' AND unit <> 'degC')
               OR (signal_code = 'acoustic_db'        AND unit <> 'dB');

            IF bad_cnt > 0 THEN
                RAISE EXCEPTION 'IU birim tashihi eksik, hatali satir: %', bad_cnt;
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute(sa.text("""
        UPDATE signal_catalog
        SET signal_code = :old_code, unit = 'degC'
        WHERE signal_code = :new_code
    """).bindparams(old_code=OLD_CODE_0006, new_code=NEW_CODE_0006))

    for code, old_unit, _new in UNIT_FIXES:
        op.execute(sa.text("""
            UPDATE signal_catalog SET unit = :unit WHERE signal_code = :code
        """).bindparams(unit=old_unit, code=code))