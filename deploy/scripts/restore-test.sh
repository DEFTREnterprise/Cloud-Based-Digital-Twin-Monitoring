#!/usr/bin/env bash
#
# CB-MDTM — geri donus provasi
# ============================
# Bir yedegi GECICI bir veritabanina restore eder ve satir sayilarini
# karsilastirir. Calisan sisteme DOKUNMAZ.
#
# Kullanim:
#   sudo /opt/matisse/deploy/scripts/restore-test.sh                # en son yedek
#   sudo /opt/matisse/deploy/scripts/restore-test.sh <arsiv.tar.gz> # belirli yedek
#
# Bir yedek, geri yuklenebildigi dogrulanana kadar yedek sayilmaz.

set -euo pipefail

BACKUP_DIR="/opt/matisse/backups"
COMPOSE="/opt/matisse/deploy/docker-compose.yml"
TEST_DB="cbmdtm_restoretest"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"; docker compose -f "$COMPOSE" exec -T postgres \
      psql -U postgres -c "DROP DATABASE IF EXISTS ${TEST_DB};" >/dev/null 2>&1 || true' EXIT

ARCHIVE="${1:-$(ls -t ${BACKUP_DIR}/matisse_*.tar.gz 2>/dev/null | head -1)}"
[ -z "$ARCHIVE" ] && { echo "Yedek bulunamadi: ${BACKUP_DIR}"; exit 1; }

echo "=== geri donus provasi ==="
echo "arsiv: $(basename "$ARCHIVE")"
tar -xzf "$ARCHIVE" -C "$WORK"

echo "--- manifest ---"
cat "${WORK}/MANIFEST.txt" 2>/dev/null || echo "(manifest yok)"

echo "--- arsiv icerigi ---"
ls -la "$WORK" | tail -n +4 | awk '{printf "  %-22s %s\n", $9, $5}'

# Gecici DB olustur ve restore et
docker compose -f "$COMPOSE" exec -T postgres \
  psql -U postgres -c "DROP DATABASE IF EXISTS ${TEST_DB};" >/dev/null
docker compose -f "$COMPOSE" exec -T postgres \
  psql -U postgres -c "CREATE DATABASE ${TEST_DB} TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C';" >/dev/null

echo "--- restore ediliyor (${TEST_DB}) ---"
docker compose -f "$COMPOSE" exec -T postgres \
  pg_restore -U postgres -d "${TEST_DB}" --no-owner < "${WORK}/cbmdtm.dump" 2>&1 \
  | grep -iv "warning\|circular\|already exists" || true

echo "--- karsilastirma (canli / restore) ---"
for T in tenant dt_registry asset_registry signal_catalog telemetry_measurements; do
  LIVE=$(docker compose -f "$COMPOSE" exec -T postgres psql -U postgres -d cbmdtm -t -A -c \
         "SELECT count(*) FROM ${T};" 2>/dev/null || echo "?")
  REST=$(docker compose -f "$COMPOSE" exec -T postgres psql -U postgres -d "${TEST_DB}" -t -A -c \
         "SELECT count(*) FROM ${T};" 2>/dev/null || echo "?")
  MARK="OK"
  [ "$LIVE" != "$REST" ] && MARK="FARKLI"
  printf "  %-26s canli:%-8s restore:%-8s %s\n" "$T" "$LIVE" "$REST" "$MARK"
done

echo "--- hypertable / extension ---"
docker compose -f "$COMPOSE" exec -T postgres psql -U postgres -d "${TEST_DB}" -t -A -c \
  "SELECT 'timescaledb ' || extversion FROM pg_extension WHERE extname='timescaledb';" || true

echo "=== prova tamamlandi (gecici DB siliniyor) ==="
