# AI_CONTEXT.md — CB-MDTM Proje Bağlam Dosyası

> **Bu dosya nedir?** Claude ile yürütülen CB-MDTM geliştirme projesinin kalıcı hafızasıdır.
> Yeni bir sohbet açtığında bu dosyayı (ve `AI_WORKING_PROTOCOL.md`'yi) ekleyerek tam kaldığın yerden devam edebilirsin.
> **Son güncelleme:** 29 Temmuz 2026 — MVP konsorsiyum sunumu yapıldı. IU sözlüğü Taha teyidiyle tashih edildi (migration 0006), kalite modeli ritme-oranlı hale getirildi, `gap_rate_pct` formülü düzeltildi, KPI kartları canlı backend'e bağlandı. **Ankara uzaktan deploy: 30 Temmuz.**

---

## 1. PROJE KİMLİĞİ

- **Proje:** CB-MDTM (Cloud-Based MATISSE Digital Twin Monitoring Tool)
- **Program:** MATISSE — EU KDT JU, Grant No. 101140216
- **Konsorsiyum (TR):** OTOKAR, DEFTR, ESOGU
- **Geliştirici:** DEFTR
- **Kullanıcı:** Serhat Kahraman (SK) — lead developer, backend, koordinatör
- **Ekip:** SK (ana sorumlu %50), Doğukan Kıyıklık (DK, destek %25), Zülfikar Güneş (ZG, destek %25)
- **İletişim dili:** Türkçe
- **Amaç:** OTOKAR fabrikasındaki ROKOS robotuyla otobüs şasisi kalite kontrolü için bulut tabanlı, kayıpsız, kalite damgalı, canlı izlenebilir Digital Twin monitoring platformu.

### Çalışma ortamı (SABİT — geliştirme)
- **OS:** Windows 11, **editör:** VS Code, **terminal:** PowerShell
- **Proje kökü:** `C:\Users\serha\Desktop\Cloud-Based-Digital-Twin-Monitoring`
- **Git:** DEFTR private repo (`DEFTREnterprise/Cloud-Based-Digital-Twin-Monitoring`).

### Prod ortam (Ankara sunucu — ZG hazırladı)
- **Sunucu:** Dell Pro Max T2 (Ultra 9 285 / 32GB RAM / 1TB SSD / RTX 4000 Ada) — DEFTR ofiste
- **OS:** Ubuntu (dual-boot Win/Linux, 5 sn timeout → Linux default). Kesin sürüm ZG'ye teyit ettirilecek (22.04 veya 24.04).
- **Kurulu yığın (ZG, `deploy/ankara-server-README.md`):**
  - Docker Engine + Compose plugin (`docker-ce`, `docker compose`)
  - Python 3.11 + venv (deadsnakes PPA)
  - nginx
  - git
  - UFW: 22 (SSH), 80/443 (HTTPS), 8883 (MQTT/TLS Faz 3)
  - Disk 100GB+
- **Eksik:** SSH erişimi (openssh-server + SK/DK/ZG public key'leri authorized_keys'e). 20 dk'lık iş, deploy'a başlamadan yapılacak.
- **Domain:** `matisse.deftr.com` (subdomain, path-based routing) — **DEFTR IT'de DNS + firewall dışarı yönlendirme bekliyor.**
- **Paketleme:** Karma (ADR-003) — Docker (PG + Keycloak) + systemd (FastAPI + worker + bridge + nginx + Pixel Streaming signaling)
- **TLS:** Let's Encrypt (default; DEFTR IT netleştirdikten sonra kesin karar)
- **Prod issuer:** `https://matisse.deftr.com/auth/realms/cbmdtm`
- **Prod frontend:** `https://matisse.deftr.com`
- **Prod backend:** `https://matisse.deftr.com/api`

### Path routing topolojisi (Ankara nginx)
| Path prefix | Backend | Servis |
|---|---|---|
| `/`         | frontend static (Vite build) | index.html + assets |
| `/api/*`    | http://localhost:8000        | FastAPI |
| `/auth/*`   | http://localhost:8080        | Keycloak |
| `/stream/*` (opsiyonel) | http://localhost:80 | Unreal Pixel Streaming signaling |

Tek TLS sertifikası + tek DNS A kaydı yeter. CORS önemsizleşir (frontend + API aynı origin).

### Ankara kurulum tarihi
**30 Temmuz 2026 — uzaktan (SSH).** Fiziksel saha ziyareti kalktı. 27 Tem planı MVP demosuna kaydı; 29 Tem konsorsiyum sunumu yapıldı, deploy sonrasına alındı.

---

## 2. TEKNOLOJİ YIĞINI (kurulu ve doğrulanmış)

| Katman | Teknoloji | Sürüm | Not |
|---|---|---|---|
| Dil | Python | 3.11.9 (dev), 3.11 (prod ZG) | venv: `backend\.venv` |
| DB | PostgreSQL | 17.10 | locale=C, port 5432 |
| Time-series | TimescaleDB | 2.27.1 | hypertable + continuous aggregate + retention |
| API | FastAPI + Uvicorn | — | port 8000, async |
| ORM/DB sürücü | SQLAlchemy 2.0 (async) + asyncpg | — | Alembic için ayrıca psycopg2-binary |
| Migration | Alembic | — | `backend\migrations\versions\` |
| MQTT broker | Mosquitto | 2.1.2 | port 1883, `allow_anonymous true` (yerel; auth Faz 3'te) |
| MQTT client | paho-mqtt | 2.1.0 | |
| SSE | sse-starlette | — | |
| Auth | Keycloak | 26.6.3 | Java 21, PG'de `keycloak` DB, port 8080 |
| JWT (backend) | python-jose[cryptography] | 3.3.0 | RS256 + JWKS cache |
| Rate limit | slowapi | 0.1.9 | in-memory (Faz 3'te Redis) |
| Frontend | React + Vite | 18.2.0 / 5.4.21 | port 5173, Tailwind 3.3.6 |
| Frontend state | Redux Toolkit | 2.11.2 | react-redux 9.2.0 (auth slice canlı) |
| Frontend HTTP | axios | 1.13.5 | `utils/api.js` (Bearer interceptor + 401 handler) |
| Frontend chart | Recharts | 3.7.0 | |
| Frontend 3D | react-three-fiber + drei | 8.18 / 9.122 | Unreal Pixel Streaming iframe |
| Frontend auth | keycloak-js | 26.2.4 | `check-sso` + PKCE, `checkLoginIframe:false` |
| Frontend SSE | event-source-polyfill | 1.0.31 | Bearer header desteği |
| Container | Docker Engine + Compose plugin | (Ankara: docker-ce) | Docker Compose v2 syntax (`docker compose ...`) |

### Önemli config / sabitler
- `.env` dosyası `.gitignore`'da (şifre içerir). `.env.example` repoda referans.
- `frontend/.env` de `.gitignore`'da. Değişkenler: `VITE_API_BASE_URL`, `VITE_KEYCLOAK_URL`, `VITE_KEYCLOAK_REALM`, `VITE_KEYCLOAK_CLIENT_ID` (dev'de sırasıyla `http://localhost:8000`, `http://localhost:8080`, `cbmdtm`, `cbmdtm-frontend`).
- DB bağlantı: `DATABASE_URL=postgresql://postgres:<sifre>@localhost:5432/cbmdtm` (düz, Alembic/psycopg2 için) ve `config.py`'de `database_url` property → `postgresql+asyncpg://...` (FastAPI için)
- Sabit tenant UUID'leri (seed + test):
  - OTOKAR: `00000000-0000-0000-0000-0000000000aa`
  - ESOGU:  `00000000-0000-0000-0000-0000000000cc`
  - DEFTR:  `00000000-0000-0000-0000-0000000000dd`
- Sabit DT UUID'leri:
  - OTOKAR DT (OTOKAR_CORE): `00000000-0000-0000-0000-0000000000bb`
  - ESOGU DT (ESOGU): `00000000-0000-0000-0000-0000000000ce`
- Sabit asset UUID'leri:
  - ESOGU TESTBED_01: `00000000-0000-0000-0000-0000000000cf`
  - OTOKAR MOTOR_01..12: dinamik UUID (seed'de `gen_random_uuid()`)
- Windows'a özgü: TimescaleDB `shared_buffers=1GB` (Windows'ta 8GB CreateFileMapping hatası verir)
- **Prod frontend build boyutu:** 1.78 MB (`dist/assets/index-*.js`). Localhost + LAN tolere edilir. Code-split Faz 3 sonrasına ertelendi.

### IU (Infinite Uptime) bağlantı bilgileri
- **IDAP API:** `https://api.infinite-uptime.com/api/3.0/idap-api`
- **PlantOS DT API:** `https://plantos-dt-api.infinite-uptime.com`
- **Kullanıcı:** `serhatkahraman@deftr.com` — şifre `.env`'de `OTOKAR_IU_PASSWORD` (21 Tem'de rotate edildi, 28 Tem'de `.env` senkronlandı)
- **Plant ID:** 1716 (Otokar Sakarya), machine group "Matisse", 12 monitor
- **Polling:** basic 60 sn (`OTOKAR_IU_BASIC_POLL_SEC`), computed 1800 sn (`OTOKAR_IU_COMPUTED_POLL_SEC`), lookback 60 dk (`OTOKAR_IU_LOOKBACK_MIN`)
- **Token:** 12 saatlik JWT, `exp - 60 sn` kalınca proaktif refresh

### Keycloak test kullanıcıları (dev şifreleri — Ankara'da resetlenecek)
- `otokar_user` / `OtokarUser1` → OTOKAR_Viewer, tenant OTOKAR
- `esogu_op` / `EsoguUser1` → ESOGU_Operator, tenant ESOGU
- `deftr_admin` / `Test1234!` → DEFTR_Admin, tenant DEFTR

**Uyarı:** Bu isim ve şifreler yalnız local dev için. Ankara realm import'unda yeni kullanıcı setleri açılacak; şifreler DEFTR IT ile paylaşılacak.

### Otokar iletişim
- **Taha Bey** — Otokar'da CB-MDTM ana muhatabı, IU verisi ve saha bilgisi
- **Ali Kemal Bey** — Otokar'da IU sorumlusu, yetkili kişi. Taha yönlendirdi. IU teknik konularında (yeni sensör, threshold hesaplama, veri boşluğu) doğrudan Ali Kemal Bey. Mail yazarken "Taha Bey yönlendirdi" cümlesi ile başla.

---

## 3. KLASÖR YAPISI (SABİT — versioning bunun üzerinde)

```
Cloud-Based-Digital-Twin-Monitoring
├── backend
│ ├── app
│ │ ├── core/
│ │ │ ├── config.py
│ │ │ ├── database.py
│ │ │ ├── security.py (Faz 2 — TenantCache, is_admin, require_roles)
│ │ │ ├── limiter.py (Faz 2 — slowapi singleton)
│ │ │ ├── authz.py (Faz 2 ADIM 24 + P0.10 — frontend id hizalı)
│ │ │ └── __init__.py
│ │ ├── models/ (ORM — şimdilik boş, migration kullanılıyor)
│ │ ├── schemas/ (Pydantic — çoğu router içinde)
│ │ ├── routers/
│ │ │ ├── assets.py (auth + tenant filtreli ✅ P0.1)
│ │ │ ├── timeseries.py (auth + tenant filtreli ✅)
│ │ │ ├── stream.py (SSE, auth + tenant filtreli ✅)
│ │ │ ├── kpi.py (auth + tenant filtreli ✅; gap_rate formülü 29 Tem düzeltildi)
│ │ │ └── auth.py (/me, /me/admin-check)
│ │ ├── ingest/
│ │ │ ├── mqtt_worker.py (tenant_id insert ekli; classify'a expected_rate_hz geçiyor)
│ │ │ ├── schemas.py
│ │ │ ├── resolver.py (dt_and_tenant(); signal cache'inde expected_rate_hz var)
│ │ │ └── quality.py (ritme-oranlı DELAYED eşiği — 28 Tem)
│ │ ├── services/
│ │ │ ├── audit.py (best-effort insert)
│ │ │ └── sse_bus.py (kullanılmıyor, Redis'e geçişte referans)
│ │ ├── adapters/
│ │ │ └── otokar_adapter.py (iskelet, mock modda)
│ │ └── main.py
│ ├── migrations/versions/
│ │ ├── 0001_initial_schema.py
│ │ ├── 0002_aggregates_retention.py
│ │ ├── 0003_audit_event.py
│ │ ├── 0004_tenant_id_denormalize.py
│ │ ├── 0005_iu_signals_monitor_mapping.py
│ │ └── 0006_iu_unit_fix.py (✅ 28 Tem — IU sözlük tashihi)
│ ├── tools/
│ │ ├── catalog.py (⚠️ SADECE 3 mock sinyal içeriyor; IU sinyalleri migration'dan geliyor)
│ │ ├── seed.py
│ │ ├── seed_test_tenants.py (ESOGU + DEFTR)
│ │ ├── mock_otokar_publisher.py
│ │ ├── otokar_iu_bridge.py (canlı; 29 Tem örnekleme düzeltmesi)
│ │ ├── iu_probe.py (dev debug)
│ │ ├── iu_explorer.py (dev debug)
│ │ └── debug.py (dev debug)
│ ├── tests/ (boş)
│ ├── Phase2.md (Faz 2 test notu)
│ ├── alembic.ini, pyproject.toml, requirements.in, .env(.example)
├── deploy/
│ ├── keycloak/
│ │ ├── cbmdtm-realm.json (config, users hariç)
│ │ └── README.md (import prosedürü + UUID temizleme + UTF-8 encoding)
│ └── ankara-server-README.md (ZG hazırladı)
├── docs/
│ ├── adr/ADR-003-packaging.md
│ └── tests/faz2-security-matrix.md
├── frontend/
│ ├── .env (gitignore'da)
│ ├── package.json, vite.config.js, tailwind.config.js, postcss.config.js
│ └── src/ (⚠️ gerçek yapı §7'de — planlanan mimari uygulanmadı)
├── AI_CONTEXT.md
├── AI_WORKING_PROTOCOL.md
└── (README, .gitignore, vs.)
```

---

## 4. MİMARİ KARARLAR (ADR — değişmez referans)

| Karar | İçerik | Gerekçe |
|---|---|---|
| **ADR-002** | PostgreSQL **17** (15 değil) | TimescaleDB + bulut yönetilen servis (RDS/Azure) uyumu |
| **ADR-003** | Karma paketleme (Docker: PG+Keycloak; systemd: FastAPI+worker+bridge+nginx+Pixel Streaming) | Ankara sunucusu için basit, tek node |
| **K1** | Ayrı NoSQL **YOK** | TimescaleDB + MinIO + OpenSearch yeterli |
| **K2** | MVP'de Kafka **YOK** | Kayıpsızlık = MQTT QoS-1 + idempotent PK + retry. Kafka kararı yük testi #1'e ertelendi |
| **SSE-A** | SSE = **DB-polling** (Seçenek A) | in-memory bus process'ler arası çalışmaz; worker ayrı process |
| **IU-B** | IU → MQTT bridge (Seçenek B) | Worker dokunulmaz, mock publisher ile birebir topic/payload |
| **AUTH-A** | Router yok, keycloak-js `check-sso` | Deadline riski; router overhead gereksiz |
| **AUTH-B** | Backend 3 rol referans (OTOKAR_Viewer/ESOGU_Operator/DEFTR_Admin) | Frontend mock 7 rol → 3'e daraldı |
| **AUTH-C** | Frontend modül id referans (live/platform/tpt/esogu/pdm/settings) | Backend `authz.py` bu id'lere hizalı |
| **AUTH-D** | Token: Keycloak singleton + Redux ayna | Keycloak-js refresh, Redux read |
| **AUTH-E** | SSE Bearer = event-source-polyfill | Native EventSource header desteklemez |
| **DT-A** | Digital Twin viewer = Unreal Pixel Streaming (canlı, iframe placeholder değil) | Signaling server (start.bat) + Unreal proje sunucuda systemd |
| **QUAL-A** (28 Tem) | `DELAYED` eşiği sinyalin **beklenen periyoduna oranlı**: `max(2.0, 4 × 1/expected_rate_hz)` | Sabit eşik dış sistemin ritmini bizim performansımız sanıyordu |
| **KPI-A** (29 Tem) | `gap_rate` beklenen kayıt = `Σ(expected_rate_hz × pencere)` | Eski formül her sinyali 1 Hz varsayıyordu → %99.8 sahte gap |
| **MIG-A** (28 Tem) | Uygulanmış migration **editlenmez**, düzeltme yeni revizyon olarak açılır | Dev ile prod DB'si sessizce ayrışmasın; downgrade yolu kalsın |

---

## 5. VERİTABANI ŞEMASI (gerçek kolon adları — KRİTİK)

**tenant:** PK=`tenant_id`, `tenant_code`(UNIQUE), `tenant_name`, `status`(enum: ACTIVE/PASSIVE)
**dt_registry:** PK=`dt_id`, `tenant_id`, `dt_type`(enum: OTOKAR_CORE/PDM/TPT/ESOGU), `dt_name`, `is_active`, `default_signal_set_id`
**asset_registry:** PK=`asset_id`, `dt_id`(FK), `asset_code`, `subsystem`, `tags`, `iu_monitor_id`(0005, nullable+UNIQUE); UNIQUE(`dt_id`,`asset_code`)
**signal_catalog:** PK=`signal_id`, `signal_code`(UNIQUE), `unit`, `data_type`, `expected_rate_hz`, `range_min`, `range_max`, `warn_threshold`, `critical_threshold`
**telemetry_measurements** (hypertable): PK=(`ts_utc`,`asset_id`,`signal_id`,`source`); `dt_id`, `tenant_id` (0004 ile denormalize), `value_num`(double), `value_bool`, `value_str`, `value_json`, `quality_flag`(default OK), `ingest_ts_utc`(default now()), `correlation_id`
**audit_event** (0003): PK=`event_id`, `ts_utc`, `user_sub`, `username`, `tenant_code`, `method`, `path`, `status_code`, `action`(enum), `client_ip`, `user_agent`, `correlation_id`, `details`(JSONB)
- `audit_action` enum: AUTH_OK / AUTH_FAIL_401 / AUTH_FAIL_403 / AUTH_ERROR

### IU sinyalleri — Taha Bey yazılı teyidi (28.07.2026) ile KESİNLEŞMİŞ sözlük

| IU kodu | `signal_code` | Fiziksel anlam | Birim | Periyot |
|---|---|---|---|---|
| 0001 | `accel_total` | Toplam ivmenin **KARESİ** (eksen katkılarının kareler toplamı) | `(m/s2)^2` | 60 sn |
| 0002 | `vibration_x` | X ekseni titreşim hız RMS | `mm/s` | 60 sn |
| 0003 | `vibration_y` | Y ekseni titreşim hız RMS | `mm/s` | 60 sn |
| 0004 | `vibration_z` | Z ekseni titreşim hız RMS | `mm/s` | 60 sn |
| 0005 | `temperature_sensor` | Sensör sıcaklığı | `degC` | 60 sn |
| 0006 | `acoustic_db` | Akustik ses seviyesi | `dB` | 60 sn |

**Computed sinyaller (18 adet, ~30 dk periyot, `expected_rate_hz=0.000556`):**
`vrms_x/y/z` (mm/s), `grms_accel_x/y/z` (g), `pp_accel_x/y/z` (g), `crest_x/y/z` (-), `kurtosis_x/y/z` (-), `rpm` (rpm), `idle` (-), `load` (-), `ta` (-)

**Mock sinyaller (seed'den, 1 Hz):** `temperature` (degC), `vibration` (g), `speed` (rpm)

**Kritik notlar:**
- **0001 birim tuzağı:** Değer ivmenin karesidir. `m/s2` yazıp ham değeri saklamak her kaydı karesi kadar yanlış yapardı. Taha Bey'in yazılı uyarısı: *"Etiket görsel hata değil."* Otokar kendi hesaplamalarını buna göre düzeltti.
- **0006 iki kez yanlış varsayıldı:** önce "bearing sıcaklığı (degC)". Gerçek: akustik dB. Birimle birlikte **`signal_code` de değişti** (`temperature_bearing` → `acoustic_db`).
- **0002-4 ile `vrms_x/y/z` çakışması:** ikisi de mm/s hız RMS ama farklı ritimde (60 sn vs 30 dk). Kod adları MVP'de ayrıştırılmadı; Faz 3'te `vrms_x_1m` / `vrms_x_30m` şemasına geçilmeli.
- **Birim yazımı ASCII:** `(m/s2)^2`, Unicode üst simge DEĞİL. Sebep: PowerShell/psql kod sayfası bozulmaları + Ankara'da log/CSV export riski. Güzel gösterim frontend adapter katmanının işi.
- **`catalog.py` IU sinyallerini BİLMEZ.** İçinde sadece 3 mock sinyal var. IU'nun 24 sinyali migration 0005'ten gelir, seed'den değil. Yani "catalog.py tashihi + seed rerun" IU için no-op'tur; tek kaynak migration'dır.

### Migration 0006 (`0006_iu_unit_fix.py`)
- 0005'i geriye dönük editlemek yerine yeni revizyon açıldı (ADR MIG-A).
- **Bu bir metadata tashihidir, veri dönüşümü DEĞİLDİR.** Bridge IU değerini ham geçirir (hiçbir çarpan yok) → `telemetry_measurements`'taki sayılar zaten doğruydu, yanlış olan sadece `signal_catalog` etiketiydi. Geçmiş veriye dokunulmadı.
- `signal_code` yeniden adlandırma güvenli: `signal_id` (PK) değişmez → FK'ler sağlam kalır. Ancak bridge `BASIC_SIGNAL_MAP` aynı commit'te güncellenmeli.

### Kalite (quality_flag) modeli — 28.07.2026'da yeniden tanımlandı

`app/ingest/quality.py`:
```
DELAYED_THRESHOLD_SEC = 2.0   # taban (NFR-PERF-003, 1 Hz sinyaller)
LAG_PERIOD_FACTOR     = 4.0   # yavas sinyaller icin carpan
esik = max(2.0, 4.0 × (1 / expected_rate_hz))
```

| Sinyal kümesi | Periyot | Eşik | Gözlenen gecikme |
|---|---|---|---|
| mock (1 Hz) | 1 sn | 2 sn (taban) | — |
| IU basic | 60 sn | 240 sn | ~140 sn |
| IU computed | 1800 sn | 7200 sn | ~1180 sn |

**Neden sabit eşik yanlıştı:** `lag = ingest_ts - ts_utc`. Bu fark IU için yalnızca bizim boru hattımız değil, **kaynağın kendi ritmini** de içeriyor (IU 1 dk kova + bizim polling). Sabit 2 sn eşiği her IU kaydını `DELAYED` işaretliyordu (%100 DELAYED, `quality_ok_pct` = 0). Eşiği gevşetmek "sayıyı yeşile boyamak" olurdu; ritme oranlamak savunulabilir bir kural: *"beklenen periyodun 4 katından geç gelen veri gerçekten gecikmiştir."* Sonuç: `quality_ok_pct` **%100**. Taban korunduğu için NFR-PERF-003 gevşetilmedi.

**Faz 3 gerçek çözümü:** payload'a `source_publish_ts` eklenerek **kaynak gecikmesi** (IU ritmi) ile **boru hattı gecikmesi** (bizim performansımız) ayrıştırılmalı.

**`resolver.py` değişikliği:** `signal_catalog` SELECT'ine `expected_rate_hz` eklendi (Numeric → `float()` cast zorunlu, yoksa Decimal/float bölmesi `TypeError`). `classify()` imzası `expected_rate_hz` parametresi aldı (varsayılan `None` → geriye dönük uyumlu).

**Continuous aggregate'ler:** `telemetry_1m`, `telemetry_10m`, `telemetry_1h` (0004'te tenant_id ile rebuild edildi)
**Retention:** RAW 90 gün.

**Seed:**
- `seed.py` — 1 OTOKAR tenant, 1 dt (OTOKAR_CORE), 3 mock sinyal, 12 motor (MOTOR_01..12)
- `seed_test_tenants.py` — ESOGU tenant + ESOGU DT + TESTBED_01 asset, DEFTR yönetim tenant'ı

**MQTT payload (publisher/bridge → worker):**
```json
{"schema_version":"1.0","dt_id":"OTOKAR_CORE","asset_code":"MOTOR_06","source":"REAL",
 "ts_utc":"2026-07-29T09:17:26.938478Z",
 "readings":[{"signal_code":"vibration_x","value":0.023,"unit":"mm/s"}, ...]}
```
Topic: `factory/motor/{id:02d}/telemetry` | Worker abone: `factory/+/+/telemetry`

**Worker `unit` alanını YOK SAYAR.** Payload'daki birim log'lanmaz, `signal_catalog` ile karşılaştırılmaz, kaliteyi etkilemez. Birim yalnızca metadata/sunum katmanında anlamlıdır.

---

## 6. API UÇLARI (çalışan ve doğrulanmış)

| Uç | Görev | Auth | Tenant | Durum |
|---|---|---|---|---|
| `GET /health` | DB + TimescaleDB sürüm | ❌ | ❌ | ✅ |
| `GET /api/v1/me` | Token sahibi profili + allowed_modules | ✅ | — | ✅ |
| `GET /api/v1/me/admin-check` | RBAC test (DEFTR_Admin) | ✅ | — | ✅ |
| `GET /api/v1/assets` | Varlık listesi | ✅ | ✅ JOIN dt_registry | ✅ |
| `GET /api/v1/signals` + `/{id}` | Sinyal katalog | ✅ | — | ✅ |
| `GET /api/v1/timeseries` | asset+signal+range+bucket | ✅ | ✅ | ✅ |
| `GET /api/v1/kpi/live` | KPI özet | ✅ | ✅ | ✅ **frontend'e bağlı (29 Tem)** |
| `GET /api/v1/stream/telemetry` | SSE canlı akış (DB-polling) | ✅ Bearer | ✅ | ✅ backend hazır, frontend tüketmiyor |

Admin (`DEFTR_Admin`) tüm endpoint'lerde tenant filtresinden muaf.

**⬜ Eklenecek:** `/api/v1/pdm/monitors`, `/api/v1/pdm/alarms` (Otokar PdM modülü).

### `/kpi/live` — `gap_rate_pct` düzeltmesi (29 Tem)
Eski formül: `expected = combo_sayisi × pencere_saniye` — **her sinyali 1 Hz varsayıyordu**. 264 kombo × 3600 = 950.400 beklenen vs 2.062 gerçekleşen → **%99.8 gap**. Bu bir veri kaybı değil, ölçüm hatasıydı.

Yeni formül: `expected = Σ(expected_rate_hz × pencere_saniye)`. `expected_rate_hz` NULL/0 olan sinyaller hem pay hem paydadan dışlanır. Sorgu `signal_catalog` JOIN'i içerdiği için **alias'lı filtreler** (`asset_filter_aliased`, `tenant_filter_aliased`) kullanılmalı.

Sonuç: %99.8 → **%12.5** → (bridge örnekleme düzeltmesi sonrası hedef %2-5).

**Bilinen kusur:** `threshold_violations` yalnızca **üst** eşiği kontrol ediyor (`value_num > threshold`). Alt eşik ihlali yakalanmıyor. IU eşikleri NULL olduğu için bugün etkisi yok.

---

## 7. FRONTEND GERÇEK YAPISI (⚠️ 29 Tem'de düzeltildi)

**Planlanan katmanlı mimari (config → transport → adapter → hook → container → view) UYGULANMADI.** FRONTEND-ARCHITECTURE.md ve önceki AI_CONTEXT sürümleri bu yapıyı tarif ediyordu; gerçekte yok. Bu yanlış referans 29 Tem'de zaman kaybettirdi.

**Olmayan klasörler:** `src/config/`, `src/hooks/`, `src/services/adapters/`
**Olmayan dosyalar:** `telemetryConfig.js`, `useLiveTelemetry.js`, `useLiveMonitoringData.js`, `liveMonitoringAdapters.js`

**Gerçek desen:** `src/services/*Backend.js` (mock veri) + `src/services/liveTelemetryApi.js` (gerçek transport). Container'lar bunları **doğrudan** import eder.

### Gerçek dosya haritası

| Dosya | Ne yapar | Durum |
|---|---|---|
| `services/liveTelemetryApi.js` | Gerçek backend transport: `fetchHealth`, `fetchAssets`, `fetchSignals`, `fetchKpiLive`, `fetchTimeseries`, `openTelemetryStream` (SSE + Bearer polyfill) | ✅ Tam (P0.11) |
| `services/liveMonitoringBackend.js` | Live Monitoring mock (`Math.sin` üretimi) | Mock — DTSelector, TimeSeriesWidgets, DataQualityIndicator buradan besleniyor |
| `services/kpiBackend.js` | KPI mock | ❌ Artık kullanılmıyor |
| `services/pdmBackend.js`, `platformBackend.js`, `runSelectionBackend.js`, `comparisonBackend.js` | Modül mock'ları | Mock |
| `services/api/apiClient.js`, `stlcManagerApi.js` | ESOGU STLC entegrasyonu | — |
| `utils/api.js` | Axios instance + Bearer interceptor + 401 handler | ✅ P0.6 |
| `auth/keycloakConfig.js`, `KeycloakProvider.jsx`, `useKeycloak.js` | Keycloak init + refresh + Redux dispatch | ✅ Faz 2.4.1 |
| `store/index.js`, `slices/authSlice.js`, `slices/apiKeySlice.js` | Redux (auth + STLC) | ✅ |
| `components/LiveMonitoring/KPICards.jsx` | **CANLI** — `/api/v1/kpi/live`, 10 sn polling | ✅ 29 Tem |
| `components/LiveMonitoring/DTSelector.jsx` | DT seçimi + Start/Stop Stream (`isStreaming` state) | Mock DT listesi (`TPT`/`ESOGU_DT`/`OTOKAR_PDM`) |
| `components/LiveMonitoring/TimeSeriesWidgets.jsx` | Sinyal grafikleri | Mock (⚠️ legend "Real Data" yazıyor — yanıltıcı) |
| `components/LiveMonitoring/DataQualityIndicator.jsx` | Kalite göstergesi | Mock (`N/A` rozeti) |
| `components/LiveMonitoring/DigitalTwinViewer.jsx` | Unreal Pixel Streaming iframe | Signaling yoksa sonsuz retry + konsol kırmızısı |
| `components/LiveMonitoring/FactoryCameraFeed.jsx` | Fabrika kamera | Mock (`factory-feed.mp4`) |
| `components/Sidebar.jsx`, `DashboardLayout.jsx` | allowedModules + selectPrimaryRole | ✅ P0.9 |
| `App.jsx`, `main.jsx` | Auth gate + Provider sarma | ✅ P0.5/P0.7 |

### Frontend temel kurallar (geçerli olanlar)
1. Mock yol silinmez; canlıya geçiş bileşen bazında yapılır.
2. SSE kontratı sabit: `event: telemetry`, `data: {asset_id, signal_id, ts, value, quality}`.
3. Auth state Redux'ta; Keycloak singleton API'si için `useKeycloak()`.
4. Modül id'ler frontend Sidebar `item.id` referansı; backend `authz.py` MODULE_ROLES bunlara hizalı.
5. Rol gösterimi `selectPrimaryRole` üzerinden (Keycloak teknik rollerini atlar).

---

## 8. İLERLEME DURUMU

### ✅ FAZ 0 — Hazırlık
PostgreSQL+TimescaleDB+Mosquitto+venv+FastAPI iskelet+/health. Mock publisher.

### ✅ FAZ 1 — Ingest + DB + API MVP
1116 satır kayıpsız worker, hypertable + rollup + retention, timeseries + signals + kpi + SSE endpoint'leri.

### ✅ FAZ 2 — Auth & Modül Erişimi (backend)
ADIM 15-26: Keycloak standalone + realm + roller + client + tenant_code mapper + backend JWT + /me + RBAC + audit + rate limit + tenant izolasyonu + modül-rol matrisi + realm export + test dokümanı.

### ✅ FAZ 2.4.1 — Frontend Auth Entegrasyonu (17-21 Temmuz)
P0.1–P0.12 tamamlandı. `otokar_user` + `esogu_op` + `deftr_admin` üçü de Keycloak login → dashboard → doğru Sidebar filtresi → doğru rol gösterimi.

### ✅ FAZ 2.4.2 — 3 rol × 6 modül canlı UI test (21 Temmuz)
- otokar_user → 3 modül (Live, PdM, Settings) + `OTOKAR · OTOKAR_Viewer` ✅
- esogu_op → 3 modül (Live, ESOGU, Settings) + `ESOGU · ESOGU_Operator` ✅
- deftr_admin → 6 modül + `DEFTR · DEFTR_Admin` ✅
- Cross-tenant izolasyon UI'da kanıtlandı.

### ✅ IU ENTEGRASYONU (13-29 Temmuz)
- Migration 0005 (24 IU sinyali + 12 asset backfill) ✅
- `tools/otokar_iu_bridge.py`: IU login + JWT auto-refresh + basic/computed polling ✅
- **IU Aşama 4 — bridge canlı duman testi ✅ (29 Tem):** 11/12 monitör akıyor, DB'de `source='REAL'` doğrulandı, 24 sinyal doğru birimlerle.

### ✅ FAZ 2.4.3 — MVP Canlı Akış (28-29 Temmuz)

| İş | Sonuç |
|---|---|
| IU sözlük tashihi (migration 0006) | ✅ 6 basic sinyal doğru birimde, `acoustic_db` kod adı düzeltildi |
| IU bridge duman testi (IU Aşama 4) | ✅ 11/12 monitör |
| Kalite eşiği ritme-oranlı model | ✅ `quality_ok_pct` %0 → %100 |
| `gap_rate_pct` formül düzeltmesi | ✅ %99.8 → %12.5 |
| Bridge örnekleme düzeltmesi (`rows[-1]` → tüm yeni satırlar) | ✅ 29 Tem |
| KPICards canlı backend bağlantısı | ✅ İlk gerçek `/api/v1/*` tüketicisi |
| **Konsorsiyum MVP sunumu** | ✅ 29 Temmuz — hedefler değişmedi |

### ⬜ Ankara Deploy (30 Temmuz) — sıralı iş
1. SSH erişimi (openssh-server + authorized_keys) — 20 dk
2. Docker Compose (PG + Keycloak) — 1 sa
3. Repo clone + venv + `alembic upgrade head` (**0006 dahil**) + seed — 1 sa
4. Keycloak realm import (`deploy/keycloak/cbmdtm-realm.json`) + kullanıcı oluşturma — 1 sa
5. Frontend `npm run build` → `/var/www/matisse/` — 30 dk
6. nginx config + path routing — 1 sa
7. systemd unit'ler (matisse-api, matisse-worker, matisse-bridge) — 1 sa
8. Kuru koşuş: `/health`, login, KPI kartları — 30 dk

### ⬜ Deploy sonrası (31 Tem – 6 Ağustos)
- **Bridge login döngüsü düzeltmesi** (systemd'ye almadan ÖNCE — §9 yüksek öncelik)
- TLS (Let's Encrypt) — DEFTR IT DNS onayına bağlı
- Unreal Pixel Streaming servisi + `matisse-signaling` systemd
- Blok 2 sertleştirme STEP 27-34
- `deploy/RUNBOOK.md`
- **2 teknik rapor** (7 Ağustos izin öncesi teslim)

### ⬜ FAZ 3+ (Ağustos sonrası)
- PdM `/monitors` + `/alarms` heuristik + frontend bağlama
- TimeSeriesWidgets canlı bağlantı, DT Selector registry bağlantısı
- Kaynak vs boru hattı gecikmesi ayrımı (`source_publish_ts`)
- IU threshold hesaplama (Otokar PdM analitik)
- Bundle code-split (1.78 MB)
- **Faz 4 (Ağustos sonu):** PdM/TPT adapter genişletme, Prometheus/Grafana, OpenSearch, yük testi #1
- **Faz 5 (Eylül, M24):** üretimleşme, güvenlik sıkılaştırma, yük testi #2

---

## 9. AÇIK / BEKLEYEN

| Konu | Kim | Durum |
|---|---|---|
| **Bridge login döngüsü kusuru** | SK | 🔴 **YÜKSEK.** `_ensure_token()` başarısız login'de exception atıyor, `_run_basic` bunu yakalayıp sonraki monitöre geçiyor → her monitör yeniden login deniyor. Tek kimlik hatası dakikada 12 başarısız login üretiyor; Ankara'da systemd altında saatte 720. **Hesap kilitleme riski. Bridge systemd'ye alınmadan ÖNCE düzeltilmeli.** Çözüm: login 401'de turu iptal et + uzun backoff. |
| **DEFTR IT: public statik IP + DNS + firewall yönlendirme** | DEFTR IT | ⏸ Mail bekliyor. `matisse.deftr.com` A kaydı + 443 yönlendirme. Cevap gelmezse plan B: LAN'da HTTP ile ilk kanıt, TLS sonraki iterasyonda. |
| **Ankara SSH erişimi** | SK | ⏸ openssh-server + authorized_keys. Deploy'un ilk adımı (20 dk). |
| **Ankara sunucu Ubuntu sürümü** | ZG | ⏸ 22.04 mü 24.04 mü — deploy'da netleşecek (deadsnakes PPA ikisi için de OK) |
| **`threshold_violations` tek yönlü** | SK | 🟠 Orta. Sadece üst eşik kontrol ediliyor; alt eşik ihlali yakalanmıyor. Faz 3 eşik kalibrasyonunda. |
| **Kaynak vs boru hattı gecikmesi ayrımı** | SK | 🟠 Orta. Payload'a `source_publish_ts` → iki ayrı metrik. Otokar PdM için değerli. |
| **TimeSeriesWidgets "Real Data" etiketi** | SK | 🟠 Orta. Mock veri "Real Data" legend'ıyla gösteriliyor — demoda yanıltıcı. Canlıya bağlanana kadar etiket değişmeli. |
| **DT Selector mock listesi** | SK | 🟠 Orta. Dropdown `TPT`/`ESOGU_DT`/`OTOKAR_PDM` gösteriyor; backend'deki gerçek DT `OTOKAR_CORE`. Canlı registry'ye bağlanmalı. |
| **0002-4 ile vrms_* kod çakışması** | SK | 🟠 Orta. Aynı büyüklüğün iki ritmi ayrı kodlarda değil. Faz 3'te `vrms_x_1m`/`vrms_x_30m`. |
| **MOTOR_07 (monitor 198282, "R2 K2AX1") veri üretmiyor** | Ali Kemal Bey | 🟡 12 monitörden 11'i akıyor. Sorulacak. |
| **Bridge log timezone etiketi** | SK | 🟡 Düşük. `datefmt` yerel saati basıp sonuna sabit `Z` ekliyor (15:49 yerel → "15:49Z", gerçek UTC 12:49). Veri doğru, sadece log etiketi yanlış. |
| **0006 migration `DO $$` bind param** | SK | 🟡 Düşük. plpgsql içinde `:isim` bind kullanıldı; çalıştı ama kırılgan. Faz 3 temizliğinde Python tarafına alınmalı. |
| **`catalog.py` IU sinyallerini bilmiyor** | SK | 🟡 Düşük. Tek-kaynak ilkesi IU için geçerli değil (migration tek kaynak). Faz 3'te ya catalog'a eklenmeli ya belge düzeltilmeli. |
| **Digital Twin viewer retry loop** | SK | 🟡 Ankara'da Unreal ayakta olduğunda konsol temiz olacak. Backoff + "manuel bağlan" düğmesi Faz 3. |
| **Bundle 1.78 MB code-split** | SK | ⏸ Faz 3 sonrası. |
| **IU threshold hesaplama** | SK + Ali Kemal | ⏸ Faz 3 sonrası. IU'da hazır threshold yok. |
| **IU sensor ham örnekleme frekansı** | Ali Kemal Bey | ⏸ API 1 dk RMS mi veriyor, altında ham uç var mı? MVP için mevcut sıklık yeterli. |
| **Ankara'da Unreal Pixel Streaming** | SK | ⏸ Paketlenmiş proje + signaling server systemd servisi olarak. |

---

## 10. ADIM NUMARALANDIRMA

- **ADIM 1-14:** Faz 0 + Faz 1 ✅
- **ADIM 15-26:** Faz 2 ✅
- **IU Aşama 1-4:** Keşif + 0005 + bridge + duman testi ✅ (29 Tem)
- **Faz 2.4.1 P0.1 → P0.12:** Frontend auth ✅
- **Faz 2.4.2:** 3×6 canlı UI test ✅
- **Faz 2.4.3:** MVP canlı akış (0006 + kalite modeli + KPI canlı) ✅

Sıradaki adım no: **STEP 27+** (Blok 2 sertleştirme, deploy sonrası).

---

## 11. TAKVİM

| Tarih | İş | Sonuç |
|---|---|---|
| 21 Tem | Faz 2.4.1 + 2.4.2 + IU akışı geri geldi + Ankara sunucu hazır | ✅ |
| **28 Tem** | IU sözlük tashihi (0006) + bridge duman testi + kalite modeli + KPI canlı bağlantı | ✅ |
| **29 Tem** | **Konsorsiyum MVP sunumu** + gap_rate düzeltmesi + bridge örnekleme düzeltmesi + bağlam güncellemesi | ✅ Hedefler değişmedi |
| **30 Tem (yarın)** | 🎯 **Ankara uzaktan deploy** (SSH → Docker Compose → migrations 0006 → realm import → frontend build → nginx → systemd → kuru koşuş) | Sunucu ayakta |
| **31 Tem – 1 Ağu** | Bridge login düzeltmesi + TLS + Unreal signaling + STEP 27-34 + RUNBOOK | Prod hardening |
| **2-6 Ağu** | **2 teknik rapor** + stabilizasyon + eksik kapatma | Teslim |
| **7-15 Ağu** | 🌴 **SK izinde** — sistem kendi kendine ayakta kalmalı | — |
| **16 Ağu sonrası** | Faz 3 kapanış: PdM canlı, TimeSeries canlı, DT Selector registry | — |

### İzin öncesi (7 Ağustos) tamamlanması gerekenler
1. Ankara sunucusu **ayakta ve kendi kendine toparlayabilir** durumda (systemd restart policy, bridge backoff düzgün)
2. `deploy/RUNBOOK.md` — DK/ZG'nin SK olmadan müdahale edebilmesi için
3. 2 teknik rapor teslim
4. Bridge login döngüsü kusuru **kesinlikle düzeltilmiş** (7/24 çalışacak, IU hesabı kilitlenmemeli)

---

## 12. 28-29 TEMMUZ DURUM ÖZETİ

### Yapılanlar
1. **IU sözlük tashihi (migration 0006)** — Taha Bey'in yazılı teyidi üzerine 0001 birimi `(m/s2)^2`, 0002-4 `mm/s`, 0006 hem birim (`dB`) hem kod adı (`acoustic_db`) düzeltildi. Bridge `BASIC_SIGNAL_MAP` aynı anda güncellendi.
2. **IU şifre senkronizasyonu** — bridge 401 alıyordu; sebep `.env`'in 16 Tem'de kalmış eski şifreyi taşıması (rotate 21 Tem'de yapılmıştı). `.env` güncellendi, tek istekle doğrulandı.
3. **IU bridge duman testi (Aşama 4)** — 11/12 monitör, 24 sinyal, `source='REAL'` DB'de doğrulandı.
4. **Kalite eşiği modeli** — `quality.py` ritme-oranlı hale getirildi; `quality_ok_pct` %0 → %100.
5. **`gap_rate_pct` formülü** — `kpi.py` `expected_rate_hz` toplamına geçti; %99.8 → %12.5.
6. **Bridge örnekleme** — `rows[-1]` yerine son işlenen damgadan sonraki tüm satırlar yayınlanıyor (kayıpsızlık).
7. **KPICards canlı bağlantı** — ilk gerçek `/api/v1/*` tüketicisi, 10 sn polling.
8. **Konsorsiyum MVP sunumu (29 Tem)** — hedefler değişmedi.

### Kritik netleşmeler (yeni öğrenimler)
- **Dış sistemin ritmi ≠ bizim performansımız.** Aynı hata iki ayrı katmanda çıktı (`quality.py` sabit 2 sn eşiği, `kpi.py` 1 Hz varsayımı). Bir yerde ritim varsayımı bulunca diğer katmanlarda da aranmalı.
- **Eşik gevşetmek ≠ eşiği doğru tanımlamak.** Metrik kötü görünüyorsa önce *ne ölçtüğü* sorulur.
- **Kimlik rotate iki adımlıdır.** Kaynağı değiştir + tüketici config'i güncelle + tek istekle doğrula. İkinci adım atlanınca hata 7 gün sessiz kaldı.
- **Belge gerçekten sapabilir.** §3/§7 frontend yapısı gerçekle uyuşmuyordu; `Get-ChildItem -Recurse` ile doğrulanmadan dosya istemek zaman kaybettirdi.
- **Uygulanmış migration editlenmez** (ADR MIG-A). Yeni revizyon açılır.
- **`signal_code` yeniden adlandırma güvenlidir** (`signal_id` PK değişmez) ama tüketici (bridge) aynı commit'te güncellenmeli.
- **Worker resolver cache'i başlangıçta bir kez yüklenir.** Yeni/değişen `signal_code` sonrası worker yeniden başlatılmalı.
- **Kalite sorgularında `ingest_ts_utc` ile filtrele**, `ts_utc` ile değil — flag yazım anında damgalanır.
- **Mock ile gerçeği demoda karıştırma.** "Real Data" etiketli mock panel, gerçek katmanın da güvenilirliğini düşürür.
