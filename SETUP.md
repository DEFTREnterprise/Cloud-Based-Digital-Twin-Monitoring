# CB-MDTM — Kurulum, Çalıştırma ve Doğrulama Rehberi

Bu doküman projeyi sıfırdan ayağa kaldırmak için gereken **tüm önkoşulları**, **adım adım çalıştırma talimatlarını** ve her adımdan sonra **doğrulama (sanity check)** yöntemlerini içerir.

---

## 1. Sistem Gereksinimleri

### 1.1 Donanım (önerilen minimum)
- **CPU:** 4 çekirdek
- **RAM:** 8 GB (TimescaleDB + Node + Python + browser için)
- **Disk:** 5 GB boş alan
- **OS:** Windows 10/11, macOS 12+, veya modern Linux

### 1.2 Yazılım Önkoşulları

| Bileşen | Sürüm | Niçin? |
|---|---|---|
| **Python** | 3.11+ | FastAPI, async SQLAlchemy, Pydantic v2 |
| **Node.js** | 18+ (LTS) | Vite + React frontend |
| **npm** | 9+ | Node ile birlikte gelir |
| **PostgreSQL** | 14+ | Ana veritabanı |
| **TimescaleDB extension** | 2.10+ | Hypertable + continuous aggregate |
| **Mosquitto MQTT broker** | 2.x | Telemetri taşıma |
| **Git** | Herhangi | Repo klonlama |

### 1.3 Python Paketleri (backend)
`backend/requirements.in` içeriği:
```
fastapi, uvicorn[standard], pydantic, pydantic-settings
sqlalchemy[asyncio], asyncpg, alembic, psycopg2-binary
paho-mqtt, sse-starlette, httpx, tenacity
python-dotenv, numpy
```

### 1.4 Node Paketleri (frontend)
`frontend/package.json` özet: React 18, Vite 5, Tailwind 3, Recharts, Three.js (@react-three/fiber + drei), Redux Toolkit, axios, lucide-react.

### 1.5 Ağ / Port Kullanımı

| Servis | Port | Açıklama |
|---|---|---|
| PostgreSQL/TimescaleDB | 5432 | DB bağlantısı |
| Mosquitto MQTT | 1883 | Telemetri broker |
| FastAPI (uvicorn) | 8000 | Backend API + SSE |
| Vite dev server | 5173 | Frontend (CORS izinli tek köken) |

> **Önemli:** Backend CORS yalnız `http://localhost:5173`'e açık (`app/main.py`). Frontend'i başka portta çalıştırırsanız orayı da eklemelisiniz.

---

## 2. Önkoşulların Kurulumu

### 2.1 PostgreSQL + TimescaleDB

**Windows:** [TimescaleDB Windows installer](https://docs.timescale.com/self-hosted/latest/install/installation-windows/) PostgreSQL 14+'ı ve TimescaleDB extension'ını birlikte kurar.

**macOS (Homebrew):**
```bash
brew tap timescale/tap
brew install timescaledb
brew services start postgresql
```

**Linux (Ubuntu):** [Timescale resmi APT reposu](https://docs.timescale.com/self-hosted/latest/install/installation-linux/).

### 2.2 Mosquitto MQTT Broker

- **Windows:** [mosquitto.org/download](https://mosquitto.org/download/) → installer.
- **macOS:** `brew install mosquitto && brew services start mosquitto`
- **Linux:** `sudo apt install mosquitto && sudo systemctl enable --now mosquitto`

Varsayılan yapılandırma `localhost:1883` üzerinden anonim erişime izin verir (geliştirme için yeterli).

### 2.3 Python ve Node

- Python: [python.org/downloads](https://www.python.org/downloads/) (3.11+, "Add to PATH" seçili).
- Node: [nodejs.org](https://nodejs.org/) (LTS 18 veya 20).

---

## 3. Veritabanı Hazırlama

### 3.1 Veritabanı + Kullanıcı Oluştur

`psql` ya da pgAdmin ile:
```sql
CREATE DATABASE cbmdtm;
-- Varsayılan postgres kullanıcısı şifresi .env'deki ile aynı olmalı
ALTER USER postgres WITH PASSWORD 'DEFTRServer1';
```

> Kullanıcı/şifreyi değiştirirseniz `.env` dosyasını da güncelleyin.

### 3.2 Doğrulama
```bash
psql -U postgres -h localhost -d cbmdtm -c "SELECT 1;"
```
Beklenen çıktı: tek satır `1`.

---

## 4. Backend Kurulumu

### 4.1 Sanal Ortam ve Bağımlılıklar

```bash
cd backend

# Sanal ortam oluştur
python -m venv .venv

# Aktive et
# Windows (Git Bash):
source .venv/Scripts/activate
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate

# Bağımlılıkları yükle
pip install --upgrade pip
pip install -r requirements.in
```

### 4.2 `.env` Dosyası

`backend/.env.example` dosyasını `backend/.env` olarak kopyalayın:
```bash
cp .env.example .env
```

`backend/.env` içeriği (varsayılan):
```dotenv
APP_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cbmdtm
DB_USER=postgres
DB_PASSWORD=DEFTRServer1
DATABASE_URL=postgresql://postgres:DEFTRServer1@localhost:5432/cbmdtm

OTOKAR_MODE=mock
OTOKAR_BASE_URL=
OTOKAR_API_KEY=
OTOKAR_POLL_INTERVAL=1.0
OTOKAR_MQTT_TOPIC=otokar/+/telemetry
```

> MQTT host/port varsayılan `localhost:1883`. Değiştirmek için `MQTT_HOST`/`MQTT_PORT` ekleyin.

### 4.3 Veritabanı Migration

```bash
cd backend
alembic upgrade head
```

**Beklenen:** İki migration uygulanır:
- `0001_initial` → tablolar (`tenant`, `dt_registry`, `asset_registry`, `signal_catalog`, `telemetry_measurements`) + TimescaleDB hypertable + enum tipleri.
- `0002_aggregates_retention` → `telemetry_1m`, `telemetry_10m`, `telemetry_1h` continuous aggregate'leri + retention policy.

#### Doğrulama
```bash
psql -U postgres -d cbmdtm -c "\dt"
psql -U postgres -d cbmdtm -c "SELECT extversion FROM pg_extension WHERE extname='timescaledb';"
```
Beklenen: 5 tablo listelenir, TimescaleDB sürümü döner (örn. `2.13.0`).

### 4.4 Referans Veriyi Yükle (Seed)

```bash
cd backend/tools
python seed.py
```

**Beklenen çıktı:**
```
[OK] seed tamam: 1 tenant, 1 dt, 3 sinyal, 12 motor yuklendi/guncellendi.
```

#### Doğrulama
```bash
psql -U postgres -d cbmdtm -c "SELECT count(*) FROM asset_registry;"   -- 12
psql -U postgres -d cbmdtm -c "SELECT signal_code FROM signal_catalog;" -- temperature, vibration, speed
```

> `seed.py` **idempotent**'tir; tekrar çalıştırmak güvenlidir, sadece günceller.

---

## 5. Frontend Kurulumu

```bash
cd frontend
npm install
```

Bu komut `package-lock.json`'a göre ~40 paket indirir (ilk seferde 1-3 dakika).

#### Doğrulama
```bash
node --version   # v18+ olmalı
npm ls react     # react@18.x görünmeli
```

---

## 6. Çalıştırma — Adım Adım

Aşağıdaki servisler **dört ayrı terminal** açılarak başlatılır. Sırasıyla:

### Terminal 1: Mosquitto MQTT Broker
```bash
# Windows: servis olarak otomatik çalışır (Services'tan kontrol edin)
# Manuel başlatmak için:
mosquitto -v
```
**Doğrulama:**
```bash
# Başka bir terminalden:
mosquitto_sub -h localhost -t "test/#" -v
# Ardından (üçüncü terminalden):
mosquitto_pub -h localhost -t "test/hello" -m "ping"
# İlk terminalde 'test/hello ping' görmelisiniz.
```

### Terminal 2: Mock Telemetri Üreteci
```bash
cd backend
source .venv/Scripts/activate   # OS'unuza göre
python tools/mock_otokar_publisher.py
```
**Beklenen çıktı:** her saniye motorlar için publish log'ları (`MOTOR_01 ... temperature=...`).

**Doğrulama:**
```bash
mosquitto_sub -h localhost -t "factory/+/+/telemetry" -v
```
Saniyede ~12 JSON mesajı akmalı.

### Terminal 3: Ingest Worker
```bash
cd backend
source .venv/Scripts/activate
python -m app.ingest.mqtt_worker
```
**Beklenen çıktı:**
```
[RESOLVER] yuklendi: 1 dt, 12 asset, 3 signal
[WORKER] MQTT baglandi (rc=0), abone: factory/+/+/telemetry
[WORKER] calisiyor. Durdurmak icin Ctrl+C.
[WORKER] yazilan=60 atlanan=0
[WORKER] yazilan=120 atlanan=0
...
```

**Doğrulama:**
```bash
psql -U postgres -d cbmdtm -c "SELECT count(*) FROM telemetry_measurements;"
# Sayı 5 saniye sonra tekrar sorgulandığında artmış olmalı
psql -U postgres -d cbmdtm -c "SELECT quality_flag, count(*) FROM telemetry_measurements GROUP BY quality_flag;"
# Çoğunluk 'OK', az miktarda 'OUTLIER'/'DELAYED' görünebilir
```

### Terminal 4: FastAPI Backend
```bash
cd backend
source .venv/Scripts/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
**Beklenen çıktı:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

**Doğrulama (4 ayrı endpoint):**

1. **Health check:**
   ```bash
   curl http://localhost:8000/health
   ```
   Beklenen: `{"status":"ok","app":"CB-MDTM Backend","db":"PostgreSQL ...","timescaledb":"2.x.x"}`

2. **Sinyal kataloğu:**
   ```bash
   curl http://localhost:8000/api/v1/signals
   ```
   Beklenen: 3 sinyal (temperature, vibration, speed) ile JSON dizi.

3. **Canlı KPI:**
   ```bash
   curl http://localhost:8000/api/v1/kpi/live
   ```
   Beklenen: `ingest_lag_p95_ms`, `quality_ok_pct`, `event_count` (sıfır olmamalı).

4. **SSE canlı akış (Ctrl+C ile durdur):**
   ```bash
   curl -N http://localhost:8000/api/v1/stream/telemetry
   ```
   Beklenen: her saniye `event: telemetry` ve `data: {...}` satırları.

5. **Swagger UI:** Tarayıcıda [http://localhost:8000/docs](http://localhost:8000/docs) → tüm endpoint'leri interaktif test edebilirsiniz.

### Terminal 5: Frontend
```bash
cd frontend
npm run dev
```
**Beklenen çıktı:**
```
VITE v5.x.x  ready in ... ms
➜ Local:   http://localhost:5173/
```

**Doğrulama:** Tarayıcıda [http://localhost:5173](http://localhost:5173) → panel açılmalı, motor seçici, canlı grafikler ve KPI kartları veri göstermeli.

---

## 7. Uçtan-Uca Sağlık Kontrolü (Tek Bakışta)

| # | Kontrol | Komut / Yol | Beklenen |
|---|---|---|---|
| 1 | PostgreSQL ayakta | `psql -U postgres -c "SELECT 1;"` | `1` |
| 2 | TimescaleDB yüklü | `psql -d cbmdtm -c "SELECT extversion FROM pg_extension WHERE extname='timescaledb';"` | sürüm satırı |
| 3 | Mosquitto ayakta | `mosquitto_sub -h localhost -t '#' -C 1` | en az 1 mesaj |
| 4 | Tablolar oluştu | `psql -d cbmdtm -c "\dt"` | 5+ tablo |
| 5 | Seed yüklü | `psql -d cbmdtm -c "SELECT count(*) FROM asset_registry;"` | `12` |
| 6 | Mock publisher yayında | `mosquitto_sub -h localhost -t 'factory/+/+/telemetry' -C 5` | 5 JSON |
| 7 | Worker yazıyor | iki kez `SELECT count(*) FROM telemetry_measurements;` | sayı artıyor |
| 8 | API canlı | `curl localhost:8000/health` | `status: ok` |
| 9 | SSE akıyor | `curl -N localhost:8000/api/v1/stream/telemetry` | sürekli satır |
| 10 | Frontend açılıyor | tarayıcı → `localhost:5173` | panel + canlı grafik |

**On adımın hepsi geçerse sistem uçtan-uca çalışıyor demektir.**

---

## 8. Sık Karşılaşılan Sorunlar

| Belirti | Olası Neden | Çözüm |
|---|---|---|
| `alembic upgrade head` → `extension "timescaledb" is not available` | TimescaleDB kurulu değil veya `shared_preload_libraries`'e eklenmemiş | `postgresql.conf`'a `shared_preload_libraries = 'timescaledb'` ekle, PostgreSQL servisini yeniden başlat |
| Worker `MQTT baglandi (rc=5)` | Mosquitto auth gerektiriyor ama .env'de cred yok | `mosquitto.conf` içinde `allow_anonymous true` veya MQTT user/pass yapılandır |
| `/health` → `db: null, status: degraded` | DB bilgileri yanlış | `backend/.env` içindeki `DB_*` değerlerini ve `DATABASE_URL`'i kontrol et |
| Frontend → "Network Error" / CORS | API farklı portta veya origin farklı | `app/main.py` `allow_origins` listesini güncelle |
| SSE bağlanıyor ama veri yok | Worker hiç satır yazmamış (mock publisher çalışmıyor) | Terminal 2 ve 3'ün canlı log'larını kontrol et |
| `quality_ok_pct` çok düşük | Saat senkron değil → DELAYED damgası | Sistem saatini kontrol et (NTP), `quality.py` `DELAYED_THRESHOLD_SEC` |
| `seed.py` → `connection refused` | PostgreSQL çalışmıyor | Servisi başlat (Windows: Services → postgresql-x64-14) |

---

## 9. Durdurma

Her terminalde `Ctrl+C`. Sırası önemli değil; worker idempotent olduğu için yeniden başlatınca veri tutarsızlığı olmaz.

Mosquitto'yu da durdurmak isterseniz:
- Windows: `Services` → Mosquitto Broker → Stop
- macOS: `brew services stop mosquitto`
- Linux: `sudo systemctl stop mosquitto`

---

## 10. Gerçek OTOKAR Verisine Geçiş (Opsiyonel)

Mock yerine gerçek veri kullanmak için:

1. `backend/.env`'de:
   ```dotenv
   OTOKAR_MODE=pull          # veya push
   OTOKAR_BASE_URL=https://otokar.example/api/telemetry
   OTOKAR_API_KEY=<token>
   ```
2. `tools/mock_otokar_publisher.py`'yi **durdur**.
3. Adaptörü başlat:
   ```bash
   python -m app.adapters.otokar_adapter
   ```
4. OTOKAR'ın gerçek payload formatı farklıysa `app/adapters/otokar_adapter.py` içindeki `_otokar_to_telemetry()` fonksiyonundaki alan eşlemesini güncelleyin (tek yer).

Geri kalan tüm hat (worker, DB, API, frontend) değişmeden çalışmaya devam eder.
