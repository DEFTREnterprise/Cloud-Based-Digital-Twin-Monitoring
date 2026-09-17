#!/usr/bin/env bash
#
# CB-MDTM — gunluk yedekleme
# ==========================
# Kurulum:
#   sudo cp /opt/matisse/deploy/scripts/backup.sh /usr/local/bin/matisse-backup
#   sudo chmod +x /usr/local/bin/matisse-backup
#   sudo crontab -e   ->   0 3 * * *  /usr/local/bin/matisse-backup
#
# Elle calistirma:  sudo /usr/local/bin/matisse-backup
#
# NE YEDEKLENIR
#   1) cbmdtm DB      — telemetri + kayit defterleri
#   2) keycloak DB    — realm, roller, KULLANICILAR (realm JSON'da kullanici yok!)
#   3) backend/.env   — tum prod sifreleri; repoda YOK, tek kopya sunucuda
#   4) /etc/nginx/ssl — TLS sertifika + anahtar
#   5) nginx site conf
#
# Arsiv root'a ait ve 0600; icinde duz metin sifre var.

set -euo pipefail

MATISSE_DIR="/opt/matisse"
BACKUP_DIR="/opt/matisse/backups"
COMPOSE="${MATISSE_DIR}/deploy/docker-compose.yml"
KEEP_DAYS=30
STAMP="$(date +%Y%m%d_%H%M%S)"
WORK="$(mktemp -d)"
LOG="${BACKUP_DIR}/backup.log"

trap 'rm -rf "$WORK"' EXIT

mkdir -p "$BACKUP_DIR"
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG"; }

log "=== yedekleme basladi: $STAMP ==="

# --- 1/2) Veritabanlari -------------------------------------------------
for DB in cbmdtm keycloak; do
    if docker compose -f "$COMPOSE" exec -T postgres \
         pg_dump -U postgres -d "$DB" -F c > "${WORK}/${DB}.dump" 2>>"$LOG"; then
        SZ=$(du -h "${WORK}/${DB}.dump" | cut -f1)
        log "  [OK] ${DB}.dump (${SZ})"
    else
        log "  [HATA] ${DB} dump alinamadi — yedekleme durduruldu"
        exit 1
    fi
done

# --- 3) .env ------------------------------------------------------------
if [ -f "${MATISSE_DIR}/backend/.env" ]; then
    cp "${MATISSE_DIR}/backend/.env" "${WORK}/backend.env"
    log "  [OK] backend/.env"
else
    log "  [UYARI] backend/.env bulunamadi"
fi

# --- 4) TLS sertifikalari ----------------------------------------------
if [ -d /etc/nginx/ssl ]; then
    mkdir -p "${WORK}/nginx-ssl"
    cp -a /etc/nginx/ssl/. "${WORK}/nginx-ssl/" 2>/dev/null || true
    log "  [OK] /etc/nginx/ssl"
fi
if [ -d /etc/letsencrypt/live ]; then
    mkdir -p "${WORK}/letsencrypt"
    cp -aL /etc/letsencrypt/live/. "${WORK}/letsencrypt/" 2>/dev/null || true
    log "  [OK] /etc/letsencrypt/live"
fi

# --- 5) nginx site conf -------------------------------------------------
[ -f /etc/nginx/sites-available/matisse ] && \
    cp /etc/nginx/sites-available/matisse "${WORK}/nginx-matisse.conf" && \
    log "  [OK] nginx site conf"

# --- Manifest -----------------------------------------------------------
{
    echo "CB-MDTM yedek"
    echo "tarih   : $(date -Is)"
    echo "host    : $(hostname)"
    echo "git     : $(git -C "$MATISSE_DIR" rev-parse --short HEAD 2>/dev/null || echo '-')"
    echo "alembic : $(cd "$MATISSE_DIR/backend" && .venv/bin/alembic current 2>/dev/null | tail -1 || echo '-')"
    echo "---"
    docker compose -f "$COMPOSE" exec -T postgres psql -U postgres -d cbmdtm -t -c \
      "SELECT 'telemetry satir: ' || count(*) FROM telemetry_measurements;" 2>/dev/null || true
} > "${WORK}/MANIFEST.txt"

# --- Arsivle ------------------------------------------------------------
ARCHIVE="${BACKUP_DIR}/matisse_${STAMP}.tar.gz"
tar -czf "$ARCHIVE" -C "$WORK" .
chmod 600 "$ARCHIVE"
chown root:root "$ARCHIVE" 2>/dev/null || true
log "  [OK] arsiv: $(basename "$ARCHIVE") ($(du -h "$ARCHIVE" | cut -f1))"

# --- Eski yedekleri temizle --------------------------------------------
DELETED=$(find "$BACKUP_DIR" -name 'matisse_*.tar.gz' -mtime +${KEEP_DAYS} -print -delete | wc -l)
[ "$DELETED" -gt 0 ] && log "  [OK] ${DELETED} eski yedek silindi (>${KEEP_DAYS} gun)"

# --- Ozet ---------------------------------------------------------------
COUNT=$(find "$BACKUP_DIR" -name 'matisse_*.tar.gz' | wc -l)
TOTAL=$(du -sh "$BACKUP_DIR" | cut -f1)
log "=== tamamlandi: ${COUNT} yedek, toplam ${TOTAL} ==="
