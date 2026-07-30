# CB-MDTM â€” Ankara Deploy RUNBOOK

> **AmaÃ§:** Ankara sunucusuna sÄ±fÄ±rdan kurulum + gÃ¼nlÃ¼k iÅŸletim + arÄ±za mÃ¼dahalesi.
> **Hedef okuyucu:** SK (kurulum), DK/ZG (SK yokken mÃ¼dahale â€” Ã¶zellikle 7-15 AÄŸustos izin dÃ¶nemi).
> **Sunucu:** Dell Pro Max T2, Ubuntu 22.04, kullanÄ±cÄ± `matisse`, kurulum dizini `/opt/matisse`

---

## 0. Ã–N KOÅULLAR

| Åart | Durum | Not |
|---|---|---|
| Ubuntu 22.04 | âœ… ZG kurdu | `git 2.34.1` ile teyit |
| Docker + Compose plugin | âœ… | `docker compose version` |
| Python 3.11 + venv (deadsnakes) | âœ… | `python3.11 --version` |
| nginx | âœ… | |
| git | âœ… | |
| UFW: 22, 80, 443, 8883 | âœ… | |
| Disk 100GB+ | âœ… | |
| **SSH eriÅŸimi** | â¬œ **Ä°lk adÄ±m** | openssh-server + authorized_keys |
| **Sabit LAN IP** | â¬œ | DHCP rezervasyonu veya netplan statik |
| DEFTR IT: DNS + 443 yÃ¶nlendirme | â¬œ | TLS iÃ§in; gelmezse HTTP ile devam |

---

## 1. SSH ERÄ°ÅÄ°MÄ° (20 dk)

Sunucuda **fiziksel olarak** ya da ZG Ã¼zerinden:

```bash
sudo apt update
sudo apt install -y openssh-server
sudo systemctl enable --now ssh

mkdir -p ~/.ssh && chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys        # SK, DK, ZG public key'lerini yapÄ±ÅŸtÄ±r
chmod 600 ~/.ssh/authorized_keys
```

Dev makinede public key Ã¼retimi (yoksa):

```powershell
ssh-keygen -t ed25519 -C "sk@deftr"
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
```

BaÄŸlantÄ± testi:

```powershell
ssh deftr_matisse@192.168.1.73
```

**SertleÅŸtirme (baÄŸlantÄ± doÄŸrulandÄ±ktan SONRA):**

```bash
sudo nano /etc/ssh/sshd_config
# PasswordAuthentication no
# PermitRootLogin no
sudo systemctl restart ssh
```

> âš ï¸ Key ile giriÅŸ Ã§alÄ±ÅŸtÄ±ÄŸÄ±nÄ± **doÄŸrulamadan** `PasswordAuthentication no` yapma â€” kendini kilitlersin.

---

## 2. SABÄ°T IP

DHCP'de IP deÄŸiÅŸirse DEFTR IT'nin firewall yÃ¶nlendirmesi ve SSH kÄ±rÄ±lÄ±r.

**SeÃ§enek A (tercih):** Router'da MAC adresine DHCP rezervasyonu.

```bash
ip -brief link show          # MAC adresi
ip -brief addr show          # mevcut IP
```

**SeÃ§enek B:** netplan ile statik IP.

```bash
sudo nano /etc/netplan/01-netcfg.yaml
sudo netplan try              # 120 sn iÃ§inde onaylanmazsa geri alÄ±r â€” gÃ¼venli
sudo netplan apply
```

---

## 3. REPO + PYTHON ORTAMI (30 dk)

```bash
sudo mkdir -p /opt/matisse
sudo chown -R deftr_matisse:deftr_matisse /opt/matisse

cd /opt
git clone https://github.com/DEFTREnterprise/Cloud-Based-Digital-Twin-Monitoring.git matisse
cd /opt/matisse

python3.11 -m venv backend/.venv
source backend/.venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt     # yoksa: pip install -r backend/requirements.in
```

### `.env` oluÅŸtur

```bash
cp backend/.env.example backend/.env
nano backend/.env
chmod 600 backend/.env
```

**Doldurulacaklar** (`deploy/.env.prod.example` referans):

| DeÄŸiÅŸken | Prod deÄŸeri |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:<YENI_SIFRE>@localhost:5432/cbmdtm` |
| `POSTGRES_PASSWORD` | Yeni gÃ¼Ã§lÃ¼ ÅŸifre (Compose de bunu okur) |
| `KC_ADMIN_USER` / `KC_ADMIN_PASSWORD` | GeÃ§ici bootstrap admin |
| `KC_HOSTNAME` | `matisse.deftr.com` (DNS yoksa `192.168.1.73`) |
| `KEYCLOAK_ISSUER` | `http://192.168.1.73/auth/realms/cbmdtm` â†’ TLS sonrasÄ± `https://matisse.deftr.com/auth/realms/cbmdtm` |
| `OTOKAR_IU_USERNAME` / `OTOKAR_IU_PASSWORD` | IU kimlik bilgileri |
| `OTOKAR_IU_LOOKBACK_MIN` | `60` |
| `MQTT_BROKER` | `localhost` |

> **ğŸ”‘ KURAL (28 Tem dersi):** Her ÅŸifre deÄŸiÅŸikliÄŸi **iki adÄ±mlÄ±dÄ±r** â€” kaynaÄŸÄ± deÄŸiÅŸtir + tÃ¼ketici config'ini gÃ¼ncelle + **tek istekle doÄŸrula**. IU ÅŸifresi 21 Tem'de rotate edildi, `.env` gÃ¼ncellenmedi, bridge 7 gÃ¼n boyunca sessizce 401 aldÄ±.

---

## 4. DOCKER SERVÄ°SLERÄ° (30 dk)

```bash
cd /opt/matisse/deploy

# Compose, .env'i backend'den okumaz; sembolik link ya da kopya gerekir
ln -sf /opt/matisse/backend/.env .env

docker compose up -d
docker compose ps
```

**Beklenen:** `matisse-postgres` (healthy), `matisse-keycloak` (running), `matisse-mosquitto` (running).

```bash
docker compose logs -f keycloak      # "Listening on ..." gÃ¶rÃ¼nmeli, Ctrl+C
docker compose exec postgres psql -U postgres -c "\l"   # cbmdtm + keycloak DB'leri
```

---

## 5. MIGRATION + SEED (30 dk)

```bash
cd /opt/matisse/backend
source .venv/bin/activate

alembic upgrade head
alembic current
```

**Beklenen:** `0006_iu_unit_fix (head)` â€” **0006 dahil olmalÄ±**, IU sÃ¶zlÃ¼k tashihi bu revizyonda.

```bash
cd tools
export DATABASE_URL=$(grep '^DATABASE_URL=' ../.env | cut -d'=' -f2-)
python seed.py
python seed_test_tenants.py
cd ..
```

DoÄŸrulama:

```bash
docker compose -f /opt/matisse/deploy/docker-compose.yml exec postgres \
  psql -U postgres -d cbmdtm -c \
  "SELECT signal_code, unit FROM signal_catalog WHERE expected_rate_hz = 0.0167 ORDER BY signal_code;"
```

**Beklenen 6 satÄ±r:** `accel_total|(m/s2)^2`, `acoustic_db|dB`, `temperature_sensor|degC`, `vibration_x|mm/s`, `vibration_y|mm/s`, `vibration_z|mm/s`

---

## 6. KEYCLOAK REALM IMPORT (1 sa)

```bash
docker compose -f /opt/matisse/deploy/docker-compose.yml exec keycloak \
  /opt/keycloak/bin/kc.sh import --file /opt/keycloak/data/import/cbmdtm-realm.json
docker compose -f /opt/matisse/deploy/docker-compose.yml restart keycloak
```

> Import 409 (Ã§akÄ±ÅŸma) verirse: realm JSON'undaki nested `"id"` UUID'leri temizlenmeli. ProsedÃ¼r `deploy/keycloak/README.md` iÃ§inde.

**KullanÄ±cÄ±lar realm export'unda YOK** â€” admin konsolundan elle oluÅŸturulacak (`http://192.168.1.73/auth/admin`, nginx sonrasÄ±):

| KullanÄ±cÄ± | Rol | tenant_code attribute |
|---|---|---|
| `otokar_user` | OTOKAR_Viewer | OTOKAR |
| `esogu_op` | ESOGU_Operator | ESOGU |
| `deftr_admin` | DEFTR_Admin | DEFTR |

> **Åifreler dev'dekilerden FARKLI olmalÄ±.** DEFTR IT ile gÃ¼venli kanaldan paylaÅŸ.
> Keycloak 24+ iÃ§in: Realm settings â†’ **Unmanaged Attributes = Enabled** (yoksa Attributes sekmesi gÃ¶rÃ¼nmez).

---

## 7. FRONTEND BUILD (30 dk)

Node yoksa:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

```bash
cd /opt/matisse/frontend
nano .env
```

```
VITE_API_BASE_URL=
VITE_KEYCLOAK_URL=/auth
VITE_KEYCLOAK_REALM=cbmdtm
VITE_KEYCLOAK_CLIENT_ID=cbmdtm-frontend
```

> `VITE_API_BASE_URL` **boÅŸ** â€” frontend ve API aynÄ± origin'de (nginx path routing). CORS Ã¶nemsizleÅŸir.

```bash
npm ci
npm run build

# GÃ¼venlik hijyeni: dev-only expose prod bundle'a sÄ±zmamalÄ±
grep -r "__store" dist/assets/*.js || echo "TEMIZ"

sudo mkdir -p /var/www/matisse
sudo cp -r dist/* /var/www/matisse/
sudo chown -R www-data:www-data /var/www/matisse
```

---

## 8. NGINX (1 sa)

```bash
sudo cp /opt/matisse/deploy/nginx/matisse.conf /etc/nginx/sites-available/matisse
sudo ln -sf /etc/nginx/sites-available/matisse /etc/nginx/sites-enabled/matisse
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

```bash
curl -s http://localhost/health
curl -s -o /dev/null -w "%{http_code}\n" http://localhost/auth/realms/cbmdtm/.well-known/openid-configuration
```

**Beklenen:** health JSON + `200`.

### TLS (DEFTR IT onayÄ± geldiÄŸinde)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d matisse.deftr.com
```

Sonra `.env`'de `KEYCLOAK_ISSUER` ve `KC_HOSTNAME`'i `https://matisse.deftr.com/...` yap, `docker compose up -d keycloak` ve `systemctl restart matisse-api`.

---

## 9. SYSTEMD SERVÄ°SLERÄ° (1 sa)

> âš ï¸ **Bridge'i baÅŸlatmadan Ã¶nce:** dev makinendeki bridge'i durdur (tek instance kuralÄ±).

```bash
sudo cp /opt/matisse/deploy/systemd/matisse-*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now matisse-api matisse-worker matisse-bridge
sudo systemctl status matisse-api matisse-worker matisse-bridge --no-pager
```

```bash
sudo journalctl -u matisse-bridge -f
```

**Beklenen:** `IU token alindi (exp'e ~43200 sn)` ve **tekrarlayan login OLMAMALI.** PeÅŸ peÅŸe `IU'ya login yapiliyor` akÄ±yorsa `.env`'deki IU ÅŸifresi yanlÄ±ÅŸ â†’ durdur, dÃ¼zelt (bkz. Â§3 kuralÄ±).

---

## 10. KURU KOÅUÅ (30 dk)

| # | Test | Beklenen |
|---|---|---|
| 1 | `curl http://<IP>/health` | `status:ok` + PG 17 + TimescaleDB |
| 2 | TarayÄ±cÄ± `http://<IP>` | Login sayfasÄ± |
| 3 | `otokar_user` ile giriÅŸ | Dashboard, 3 modÃ¼l, `OTOKAR Â· OTOKAR_Viewer` |
| 4 | Start Stream â†’ KPI kartlarÄ± | GerÃ§ek sayÄ±lar, 10 sn'de bir tazeleniyor |
| 5 | `deftr_admin` ile giriÅŸ | 6 modÃ¼l |
| 6 | 15 dk sonra veri tazeliÄŸi | `max(ingest_ts_utc)` son dakikalar |

```bash
docker compose -f /opt/matisse/deploy/docker-compose.yml exec postgres \
  psql -U postgres -d cbmdtm -c \
  "SELECT source, count(*), max(ts_utc), max(ingest_ts_utc) FROM telemetry_measurements GROUP BY source;"
```

---

## 11. GÃœNLÃœK Ä°ÅLETÄ°M

```bash
# Genel saÄŸlÄ±k
systemctl status matisse-api matisse-worker matisse-bridge --no-pager
docker compose -f /opt/matisse/deploy/docker-compose.yml ps

# Log takibi
sudo journalctl -u matisse-bridge -f
sudo journalctl -u matisse-worker -n 100 --no-pager

# Yeniden baÅŸlatma
sudo systemctl restart matisse-api

# Veri akÄ±yor mu?
docker compose -f /opt/matisse/deploy/docker-compose.yml exec postgres \
  psql -U postgres -d cbmdtm -c \
  "SELECT max(ingest_ts_utc), now() FROM telemetry_measurements WHERE source='REAL';"
```

### Kod gÃ¼ncelleme

```bash
cd /opt/matisse
git pull
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
alembic -c backend/alembic.ini upgrade head
sudo systemctl restart matisse-api matisse-worker matisse-bridge

# Frontend deÄŸiÅŸtiyse
cd frontend && npm ci && npm run build
sudo cp -r dist/* /var/www/matisse/
```

> **Migration sonrasÄ± `matisse-worker` MUTLAKA restart** â€” resolver cache'i baÅŸlangÄ±Ã§ta bir kez yÃ¼klenir.

### Yedekleme

```bash
STAMP=$(date +%Y%m%d_%H%M%S)
docker compose -f /opt/matisse/deploy/docker-compose.yml exec -T postgres \
  pg_dump -U postgres -d cbmdtm -F c > /opt/matisse/backups/cbmdtm_$STAMP.dump
```

> **TODO(izin Ã¶ncesi):** bunu cron'a baÄŸla (gÃ¼nlÃ¼k 03:00) + 7 gÃ¼nden eski dump'larÄ± temizle.

---

## 12. ARIZA MÃœDAHALE (SK yokken â€” DK/ZG iÃ§in)

### Ekranda veri yok / KPI kartlarÄ± boÅŸ

```bash
systemctl status matisse-api matisse-worker matisse-bridge --no-pager
```

| Durum | YapÄ±lacak |
|---|---|
| Servis `failed` | `sudo systemctl restart <servis>` â†’ `journalctl -u <servis> -n 50` |
| Hepsi `active` ama veri yok | Bridge log'una bak: IU tarafÄ± kesinti olabilir (Otokar'da geÃ§miÅŸte 8 gÃ¼n sÃ¼rdÃ¼) |
| Bridge'de tekrarlayan `IU'ya login yapiliyor` | **IU ÅŸifresi yanlÄ±ÅŸ.** `.env`'i dÃ¼zelt, `sudo systemctl restart matisse-bridge`. DÃ¼zeltmeden bÄ±rakma â€” hesap kilitlenebilir. |

### Sayfa aÃ§Ä±lmÄ±yor

```bash
sudo nginx -t
sudo systemctl status nginx
curl http://localhost/health
```

`/health` Ã§alÄ±ÅŸÄ±p sayfa gelmiyorsa â†’ `/var/www/matisse/index.html` var mÄ±?

### Login Ã§alÄ±ÅŸmÄ±yor

```bash
docker compose -f /opt/matisse/deploy/docker-compose.yml ps keycloak
docker compose -f /opt/matisse/deploy/docker-compose.yml logs --tail 100 keycloak
curl -s -o /dev/null -w "%{http_code}\n" http://localhost/auth/realms/cbmdtm/.well-known/openid-configuration
```

`invalid_grant` = 4 olasÄ± sebep: yanlÄ±ÅŸ ÅŸifre, disabled user, required actions dolu, yanlÄ±ÅŸ username.

### Disk doluyor

```bash
df -h /
docker system df
docker system prune -a --volumes   # âš ï¸ DÄ°KKAT: pgdata volume'una dokunma
```

RAW retention 90 gÃ¼n olarak ayarlÄ±; normalde disk sorunu olmamalÄ±.

### Her ÅŸeyi yeniden baÅŸlat

```bash
sudo systemctl restart matisse-api matisse-worker matisse-bridge
docker compose -f /opt/matisse/deploy/docker-compose.yml restart
sudo systemctl reload nginx
```

---

## 13. Ä°ZÄ°N Ã–NCESÄ° KONTROL LÄ°STESÄ° (7 AÄŸustos)

- [ ] TÃ¼m systemd servisleri `enable` (yeniden baÅŸlatmada otomatik kalkar)
- [ ] Sunucu reboot testi: `sudo reboot` â†’ 5 dk sonra her ÅŸey ayakta mÄ±?
- [ ] Bridge login backoff'u doÄŸrulandÄ± (yanlÄ±ÅŸ ÅŸifreyle test â†’ 5 dk beklemeli, dÃ¶ngÃ¼ye girmemeli)
- [ ] Yedekleme cron'u kurulu ve bir kez Ã§alÄ±ÅŸtÄ±ÄŸÄ± doÄŸrulandÄ±
- [ ] Bu RUNBOOK'u DK ve ZG okudu, Â§12'yi uygulayabildiklerini teyit etti
- [ ] DK/ZG'nin SSH eriÅŸimi Ã§alÄ±ÅŸÄ±yor
- [ ] Ä°letiÅŸim: acil durumda kim aranacak, hangi karar SK'yi beklemeli

---

## 14. AÃ‡IK MADDELER

| Konu | Durum |
|---|---|
| TLS (Let's Encrypt) | DEFTR IT DNS + 443 yÃ¶nlendirmesine baÄŸlÄ± |
| Unreal Pixel Streaming systemd (`matisse-signaling`) | PaketlenmiÅŸ proje hazÄ±r olunca |
| STEP 27: kalÄ±cÄ± Keycloak admin (bootstrap admin sil) | Deploy sonrasÄ± |
| STEP 28: password policy + brute force protection | Deploy sonrasÄ± |
| STEP 31: `.env` â†’ systemd credentials | Faz 3 |
| STEP 32: rate limit Redis backend | Faz 3 |
| STEP 33: `KEYCLOAK_VERIFY_AUDIENCE=true` + audience mapper | Faz 3 |
| Docker image sÃ¼rÃ¼m pinleme (`timescaledb:latest-pg17`) | Ä°lk kurulumdan sonra |
| Yedekleme cron | Ä°zin Ã¶ncesi |
