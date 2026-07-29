# CB-MDTM — Ankara Deploy RUNBOOK

> **Amaç:** Ankara sunucusuna sıfırdan kurulum + günlük işletim + arıza müdahalesi.
> **Hedef okuyucu:** SK (kurulum), DK/ZG (SK yokken müdahale — özellikle 7-15 Ağustos izin dönemi).
> **Sunucu:** Dell Pro Max T2, Ubuntu 22.04, kullanıcı `matisse`, kurulum dizini `/opt/matisse`

---

## 0. ÖN KOŞULLAR

| Şart | Durum | Not |
|---|---|---|
| Ubuntu 22.04 | ✅ ZG kurdu | `git 2.34.1` ile teyit |
| Docker + Compose plugin | ✅ | `docker compose version` |
| Python 3.11 + venv (deadsnakes) | ✅ | `python3.11 --version` |
| nginx | ✅ | |
| git | ✅ | |
| UFW: 22, 80, 443, 8883 | ✅ | |
| Disk 100GB+ | ✅ | |
| **SSH erişimi** | ⬜ **İlk adım** | openssh-server + authorized_keys |
| **Sabit LAN IP** | ⬜ | DHCP rezervasyonu veya netplan statik |
| DEFTR IT: DNS + 443 yönlendirme | ⬜ | TLS için; gelmezse HTTP ile devam |

---

## 1. SSH ERİŞİMİ (20 dk)

Sunucuda **fiziksel olarak** ya da ZG üzerinden:

```bash
sudo apt update
sudo apt install -y openssh-server
sudo systemctl enable --now ssh

mkdir -p ~/.ssh && chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys        # SK, DK, ZG public key'lerini yapıştır
chmod 600 ~/.ssh/authorized_keys
```

Dev makinede public key üretimi (yoksa):

```powershell
ssh-keygen -t ed25519 -C "sk@deftr"
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
```

Bağlantı testi:

```powershell
ssh matisse@<LAN_IP>
```

**Sertleştirme (bağlantı doğrulandıktan SONRA):**

```bash
sudo nano /etc/ssh/sshd_config
# PasswordAuthentication no
# PermitRootLogin no
sudo systemctl restart ssh
```

> ⚠️ Key ile giriş çalıştığını **doğrulamadan** `PasswordAuthentication no` yapma — kendini kilitlersin.

---

## 2. SABİT IP

DHCP'de IP değişirse DEFTR IT'nin firewall yönlendirmesi ve SSH kırılır.

**Seçenek A (tercih):** Router'da MAC adresine DHCP rezervasyonu.

```bash
ip -brief link show          # MAC adresi
ip -brief addr show          # mevcut IP
```

**Seçenek B:** netplan ile statik IP.

```bash
sudo nano /etc/netplan/01-netcfg.yaml
sudo netplan try              # 120 sn içinde onaylanmazsa geri alır — güvenli
sudo netplan apply
```

---

## 3. REPO + PYTHON ORTAMI (30 dk)

```bash
sudo mkdir -p /opt/matisse
sudo chown -R matisse:matisse /opt/matisse

cd /opt
git clone https://github.com/DEFTREnterprise/Cloud-Based-Digital-Twin-Monitoring.git matisse
cd /opt/matisse

python3.11 -m venv backend/.venv
source backend/.venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt     # yoksa: pip install -r backend/requirements.in
```

### `.env` oluştur

```bash
cp backend/.env.example backend/.env
nano backend/.env
chmod 600 backend/.env
```

**Doldurulacaklar** (`deploy/.env.prod.example` referans):

| Değişken | Prod değeri |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:<YENI_SIFRE>@localhost:5432/cbmdtm` |
| `POSTGRES_PASSWORD` | Yeni güçlü şifre (Compose de bunu okur) |
| `KC_ADMIN_USER` / `KC_ADMIN_PASSWORD` | Geçici bootstrap admin |
| `KC_HOSTNAME` | `matisse.deftr.com` (DNS yoksa `<LAN_IP>`) |
| `KEYCLOAK_ISSUER` | `http://<LAN_IP>/auth/realms/cbmdtm` → TLS sonrası `https://matisse.deftr.com/auth/realms/cbmdtm` |
| `OTOKAR_IU_USERNAME` / `OTOKAR_IU_PASSWORD` | IU kimlik bilgileri |
| `OTOKAR_IU_LOOKBACK_MIN` | `60` |
| `MQTT_BROKER` | `localhost` |

> **🔑 KURAL (28 Tem dersi):** Her şifre değişikliği **iki adımlıdır** — kaynağı değiştir + tüketici config'ini güncelle + **tek istekle doğrula**. IU şifresi 21 Tem'de rotate edildi, `.env` güncellenmedi, bridge 7 gün boyunca sessizce 401 aldı.

---

## 4. DOCKER SERVİSLERİ (30 dk)

```bash
cd /opt/matisse/deploy

# Compose, .env'i backend'den okumaz; sembolik link ya da kopya gerekir
ln -sf /opt/matisse/backend/.env .env

docker compose up -d
docker compose ps
```

**Beklenen:** `matisse-postgres` (healthy), `matisse-keycloak` (running), `matisse-mosquitto` (running).

```bash
docker compose logs -f keycloak      # "Listening on ..." görünmeli, Ctrl+C
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

**Beklenen:** `0006_iu_unit_fix (head)` — **0006 dahil olmalı**, IU sözlük tashihi bu revizyonda.

```bash
cd tools
export DATABASE_URL=$(grep '^DATABASE_URL=' ../.env | cut -d'=' -f2-)
python seed.py
python seed_test_tenants.py
cd ..
```

Doğrulama:

```bash
docker compose -f /opt/matisse/deploy/docker-compose.yml exec postgres \
  psql -U postgres -d cbmdtm -c \
  "SELECT signal_code, unit FROM signal_catalog WHERE expected_rate_hz = 0.0167 ORDER BY signal_code;"
```

**Beklenen 6 satır:** `accel_total|(m/s2)^2`, `acoustic_db|dB`, `temperature_sensor|degC`, `vibration_x|mm/s`, `vibration_y|mm/s`, `vibration_z|mm/s`

---

## 6. KEYCLOAK REALM IMPORT (1 sa)

```bash
docker compose -f /opt/matisse/deploy/docker-compose.yml exec keycloak \
  /opt/keycloak/bin/kc.sh import --file /opt/keycloak/data/import/cbmdtm-realm.json
docker compose -f /opt/matisse/deploy/docker-compose.yml restart keycloak
```

> Import 409 (çakışma) verirse: realm JSON'undaki nested `"id"` UUID'leri temizlenmeli. Prosedür `deploy/keycloak/README.md` içinde.

**Kullanıcılar realm export'unda YOK** — admin konsolundan elle oluşturulacak (`http://<LAN_IP>/auth/admin`, nginx sonrası):

| Kullanıcı | Rol | tenant_code attribute |
|---|---|---|
| `otokar_user` | OTOKAR_Viewer | OTOKAR |
| `esogu_op` | ESOGU_Operator | ESOGU |
| `deftr_admin` | DEFTR_Admin | DEFTR |

> **Şifreler dev'dekilerden FARKLI olmalı.** DEFTR IT ile güvenli kanaldan paylaş.
> Keycloak 24+ için: Realm settings → **Unmanaged Attributes = Enabled** (yoksa Attributes sekmesi görünmez).

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

> `VITE_API_BASE_URL` **boş** — frontend ve API aynı origin'de (nginx path routing). CORS önemsizleşir.

```bash
npm ci
npm run build

# Güvenlik hijyeni: dev-only expose prod bundle'a sızmamalı
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

### TLS (DEFTR IT onayı geldiğinde)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d matisse.deftr.com
```

Sonra `.env`'de `KEYCLOAK_ISSUER` ve `KC_HOSTNAME`'i `https://matisse.deftr.com/...` yap, `docker compose up -d keycloak` ve `systemctl restart matisse-api`.

---

## 9. SYSTEMD SERVİSLERİ (1 sa)

> ⚠️ **Bridge'i başlatmadan önce:** dev makinendeki bridge'i durdur (tek instance kuralı).

```bash
sudo cp /opt/matisse/deploy/systemd/matisse-*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now matisse-api matisse-worker matisse-bridge
sudo systemctl status matisse-api matisse-worker matisse-bridge --no-pager
```

```bash
sudo journalctl -u matisse-bridge -f
```

**Beklenen:** `IU token alindi (exp'e ~43200 sn)` ve **tekrarlayan login OLMAMALI.** Peş peşe `IU'ya login yapiliyor` akıyorsa `.env`'deki IU şifresi yanlış → durdur, düzelt (bkz. §3 kuralı).

---

## 10. KURU KOŞUŞ (30 dk)

| # | Test | Beklenen |
|---|---|---|
| 1 | `curl http://<IP>/health` | `status:ok` + PG 17 + TimescaleDB |
| 2 | Tarayıcı `http://<IP>` | Login sayfası |
| 3 | `otokar_user` ile giriş | Dashboard, 3 modül, `OTOKAR · OTOKAR_Viewer` |
| 4 | Start Stream → KPI kartları | Gerçek sayılar, 10 sn'de bir tazeleniyor |
| 5 | `deftr_admin` ile giriş | 6 modül |
| 6 | 15 dk sonra veri tazeliği | `max(ingest_ts_utc)` son dakikalar |

```bash
docker compose -f /opt/matisse/deploy/docker-compose.yml exec postgres \
  psql -U postgres -d cbmdtm -c \
  "SELECT source, count(*), max(ts_utc), max(ingest_ts_utc) FROM telemetry_measurements GROUP BY source;"
```

---

## 11. GÜNLÜK İŞLETİM

```bash
# Genel sağlık
systemctl status matisse-api matisse-worker matisse-bridge --no-pager
docker compose -f /opt/matisse/deploy/docker-compose.yml ps

# Log takibi
sudo journalctl -u matisse-bridge -f
sudo journalctl -u matisse-worker -n 100 --no-pager

# Yeniden başlatma
sudo systemctl restart matisse-api

# Veri akıyor mu?
docker compose -f /opt/matisse/deploy/docker-compose.yml exec postgres \
  psql -U postgres -d cbmdtm -c \
  "SELECT max(ingest_ts_utc), now() FROM telemetry_measurements WHERE source='REAL';"
```

### Kod güncelleme

```bash
cd /opt/matisse
git pull
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
alembic -c backend/alembic.ini upgrade head
sudo systemctl restart matisse-api matisse-worker matisse-bridge

# Frontend değiştiyse
cd frontend && npm ci && npm run build
sudo cp -r dist/* /var/www/matisse/
```

> **Migration sonrası `matisse-worker` MUTLAKA restart** — resolver cache'i başlangıçta bir kez yüklenir.

### Yedekleme

```bash
STAMP=$(date +%Y%m%d_%H%M%S)
docker compose -f /opt/matisse/deploy/docker-compose.yml exec -T postgres \
  pg_dump -U postgres -d cbmdtm -F c > /opt/matisse/backups/cbmdtm_$STAMP.dump
```

> **TODO(izin öncesi):** bunu cron'a bağla (günlük 03:00) + 7 günden eski dump'ları temizle.

---

## 12. ARIZA MÜDAHALE (SK yokken — DK/ZG için)

### Ekranda veri yok / KPI kartları boş

```bash
systemctl status matisse-api matisse-worker matisse-bridge --no-pager
```

| Durum | Yapılacak |
|---|---|
| Servis `failed` | `sudo systemctl restart <servis>` → `journalctl -u <servis> -n 50` |
| Hepsi `active` ama veri yok | Bridge log'una bak: IU tarafı kesinti olabilir (Otokar'da geçmişte 8 gün sürdü) |
| Bridge'de tekrarlayan `IU'ya login yapiliyor` | **IU şifresi yanlış.** `.env`'i düzelt, `sudo systemctl restart matisse-bridge`. Düzeltmeden bırakma — hesap kilitlenebilir. |

### Sayfa açılmıyor

```bash
sudo nginx -t
sudo systemctl status nginx
curl http://localhost/health
```

`/health` çalışıp sayfa gelmiyorsa → `/var/www/matisse/index.html` var mı?

### Login çalışmıyor

```bash
docker compose -f /opt/matisse/deploy/docker-compose.yml ps keycloak
docker compose -f /opt/matisse/deploy/docker-compose.yml logs --tail 100 keycloak
curl -s -o /dev/null -w "%{http_code}\n" http://localhost/auth/realms/cbmdtm/.well-known/openid-configuration
```

`invalid_grant` = 4 olası sebep: yanlış şifre, disabled user, required actions dolu, yanlış username.

### Disk doluyor

```bash
df -h /
docker system df
docker system prune -a --volumes   # ⚠️ DİKKAT: pgdata volume'una dokunma
```

RAW retention 90 gün olarak ayarlı; normalde disk sorunu olmamalı.

### Her şeyi yeniden başlat

```bash
sudo systemctl restart matisse-api matisse-worker matisse-bridge
docker compose -f /opt/matisse/deploy/docker-compose.yml restart
sudo systemctl reload nginx
```

---

## 13. İZİN ÖNCESİ KONTROL LİSTESİ (7 Ağustos)

- [ ] Tüm systemd servisleri `enable` (yeniden başlatmada otomatik kalkar)
- [ ] Sunucu reboot testi: `sudo reboot` → 5 dk sonra her şey ayakta mı?
- [ ] Bridge login backoff'u doğrulandı (yanlış şifreyle test → 5 dk beklemeli, döngüye girmemeli)
- [ ] Yedekleme cron'u kurulu ve bir kez çalıştığı doğrulandı
- [ ] Bu RUNBOOK'u DK ve ZG okudu, §12'yi uygulayabildiklerini teyit etti
- [ ] DK/ZG'nin SSH erişimi çalışıyor
- [ ] İletişim: acil durumda kim aranacak, hangi karar SK'yi beklemeli

---

## 14. AÇIK MADDELER

| Konu | Durum |
|---|---|
| TLS (Let's Encrypt) | DEFTR IT DNS + 443 yönlendirmesine bağlı |
| Unreal Pixel Streaming systemd (`matisse-signaling`) | Paketlenmiş proje hazır olunca |
| STEP 27: kalıcı Keycloak admin (bootstrap admin sil) | Deploy sonrası |
| STEP 28: password policy + brute force protection | Deploy sonrası |
| STEP 31: `.env` → systemd credentials | Faz 3 |
| STEP 32: rate limit Redis backend | Faz 3 |
| STEP 33: `KEYCLOAK_VERIFY_AUDIENCE=true` + audience mapper | Faz 3 |
| Docker image sürüm pinleme (`timescaledb:latest-pg17`) | İlk kurulumdan sonra |
| Yedekleme cron | İzin öncesi |
