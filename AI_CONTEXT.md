# AI_CONTEXT.md — CB-MDTM Proje Bağlam Dosyası

> **Bu dosya nedir?** Claude ile yürütülen CB-MDTM geliştirme projesinin kalıcı hafızasıdır.
> Yeni bir sohbet açtığında bu dosyayı (ve `AI_WORKING_PROTOCOL.md`'yi) ekleyerek tam kaldığın yerden devam edebilirsin.
> **Son güncelleme:** 21 Temmuz 2026 akşamı — Faz 2.4.1 + 2.4.2 kapandı, IU akışı geri geldi + feature sözlüğü netleşti, Ankara sunucu hazır. **Ankara canlı deploy: 27 Temmuz.**

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
- **Git:** DEFTR private repo (`DEFTREnterprise/Cloud-Based-Digital-Twin-Monitoring`). 21 Tem itibarıyla origin/main güncel.

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
**27 Temmuz 2026** — SK sahada. Buffer 2-3 gün (Faz 2.4.1 kapandığı ve IU akışı geldiği için sağlıklı takvim).

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
- `frontend/.env` de `.gitignore`'da; içindeki değişkenler public (client id, URL) ama tek yerden yönetim için ayrı tutuluyor. `VITE_API_BASE_URL`, `VITE_KEYCLOAK_URL`, `VITE_KEYCLOAK_REALM`, `VITE_KEYCLOAK_CLIENT_ID`.
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
Cloud-Based-Digital-Twin-Monitoring
├── backend
│ ├── app
│ │ ├── core/
│ │ │ ├── config.py
│ │ │ ├── database.py
│ │ │ ├── security.py (Faz 2 — TenantCache, is_admin, require_roles)
│ │ │ ├── limiter.py (Faz 2 — slowapi singleton)
│ │ │ ├── authz.py (Faz 2 ADIM 24 + P0.10 — frontend id hizalı)
│ │ │ └── init.py
│ │ ├── models/ (ORM — şimdilik boş, migration kullanılıyor)
│ │ ├── schemas/ (Pydantic — çoğu router içinde)
│ │ ├── routers/
│ │ │ ├── assets.py (auth + tenant filtreli ✅ P0.1)
│ │ │ ├── timeseries.py (auth + tenant filtreli ✅)
│ │ │ ├── stream.py (SSE, auth + tenant filtreli ✅)
│ │ │ ├── kpi.py (auth + tenant filtreli ✅)
│ │ │ └── auth.py (/me, /me/admin-check)
│ │ ├── ingest/
│ │ │ ├── mqtt_worker.py (tenant_id insert ekli)
│ │ │ ├── schemas.py
│ │ │ ├── resolver.py (dt_and_tenant() metodu)
│ │ │ └── quality.py
│ │ ├── services/
│ │ │ ├── audit.py (best-effort insert)
│ │ │ └── sse_bus.py (kullanılmıyor, Redis'e geçişte referans)
│ │ ├── adapters/
│ │ │ └── otokar_adapter.py (iskelet, mock modda)
│ │ └── main.py (assets router register ✅)
│ ├── migrations/versions/
│ │ ├── 0001_initial_schema.py
│ │ ├── 0002_aggregates_retention.py
│ │ ├── 0003_audit_event.py
│ │ ├── 0004_tenant_id_denormalize.py
│ │ └── 0005_iu_signals_monitor_mapping.py (⚠️ IU sözlüğü tashih edilecek — Taha teyidi)
│ ├── tools/
│ │ ├── catalog.py (⚠️ IU signal unit'leri tashih edilecek: 0001=g, 0002-4=mm/s, 0005=°C, 0006=dB)
│ │ ├── seed.py
│ │ ├── seed_test_tenants.py (ESOGU + DEFTR)
│ │ ├── mock_otokar_publisher.py
│ │ ├── otokar_iu_bridge.py (Faz 2, canlıya hazır)
│ │ ├── iu_probe.py (dev debug — 21 Tem akşamı IU akış teyidi)
│ │ ├── iu_explorer.py (dev debug)
│ │ └── debug.py (dev debug)
│ ├── tests/ (boş — 1.7 + 2.4.2'de doldurulacak)
│ ├── Phase2.md (Faz 2 test notu)
│ ├── alembic.ini, pyproject.toml, requirements.in, .env(.example)
├── deploy/
│ ├── keycloak/
│ │ ├── cbmdtm-realm.json (config, users hariç)
│ │ └── README.md (import prosedürü + UUID temizleme + UTF-8 encoding)
│ └── ankara-server-README.md (ZG hazırladı — Ubuntu sunucu kurulum kayıtları)
├── docs/
│ ├── adr/
│ │ └── ADR-003-packaging.md
│ └── tests/
│ └── faz2-security-matrix.md
├── frontend/
│ ├── .env (gitignore'da; Vite VITE_* env)
│ ├── package.json (keycloak-js + event-source-polyfill dahil)
│ ├── vite.config.js, tailwind.config.js, postcss.config.js
│ └── src/
│ ├── main.jsx (KeycloakProvider sarma ✅ P0.5; window.__store dev — prod'da tree-shake DOĞRULANDI)
│ ├── App.jsx (useKeycloak + loading state ✅ P0.7)
│ ├── auth/ (YENİ — Faz 2.4.1)
│ │ ├── KeycloakProvider.jsx (HMR-safe init fallback dahil)
│ │ ├── useKeycloak.js
│ │ └── keycloakConfig.js
│ ├── components/
│ │ ├── LoginPage.jsx (Keycloak SSO butonu ✅ P0.8)
│ │ ├── Sidebar.jsx (allowedModules + selectPrimaryRole ✅ P0.9)
│ │ ├── Header.jsx
│ │ ├── DashboardLayout.jsx (selectPrimaryRole ✅ P0.9 fix)
│ │ ├── LiveMonitoring/ (... + DigitalTwinViewer)
│ │ ├── PdmModule/ (AlarmWall, AnomalyScoreChart, PdmKPICards, AlarmDetailPanel, PdmModule)
│ │ ├── PlatformModule/ (6 panel + PlatformModule)
│ │ ├── SystemSettings/ (5 panel + SystemSettings)
│ │ ├── TPTModule/ (Canvas3D, Timeline, ViolationTable, KPISummary, ControlBar, ComparisonSection, RunSelection, Visualization, TPTModule)
│ │ ├── ESOGUDTTool/ (SessionDashboard, SessionManager, ApiStatusBar, STLCIntegrationPanel, ESOGUDTTool)
│ │ └── shared/ (Panel, KPICard, Dropdown, EmptyState, StatusBadge)
│ ├── config/
│ │ └── telemetryConfig.js (LIVE_DT_ID hard-code YOK — dinamik)
│ ├── data/ (mockLiveMonitoringData vb.)
│ ├── hooks/ (useLiveTelemetry, useLiveMonitoringData)
│ ├── services/
│ │ ├── liveTelemetryApi.js (EventSourcePolyfill + Bearer ✅ P0.11)
│ │ └── adapters/liveMonitoringAdapters.js
│ ├── store/
│ │ ├── index.js (apiKey + auth slice)
│ │ ├── slices/
│ │ │ ├── apiKeySlice.js (STLC — dokunulmuyor)
│ │ │ └── authSlice.js (YENİ — Faz 2.4.1 ✅ P0.3; Object.freeze empty selectors + selectPrimaryRole)
│ │ └── middleware/
│ │ └── apiKeyPersistence.js
│ └── utils/
│ └── api.js (Bearer + 401 handler ✅ P0.6)
├── AI_CONTEXT.md
├── AI_WORKING_PROTOCOL.md
└── (README, .gitignore, vs.)
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
| **AUTH-A** | Router yok, keycloak-js `check-sso` | 20 Tem deadline riski; router overhead gereksiz |
| **AUTH-B** | Backend 3 rol referans (OTOKAR_Viewer/ESOGU_Operator/DEFTR_Admin) | Frontend mock 7 rol → 3'e daraldı |
| **AUTH-C** | Frontend modül id referans (live/platform/tpt/esogu/pdm/settings) | Backend `authz.py` bu id'lere hizalı |
| **AUTH-D** | Token: Keycloak singleton + Redux ayna | Keycloak-js refresh, Redux read; interceptor ve Sidebar Redux'tan okur |
| **AUTH-E** | SSE Bearer = event-source-polyfill | Native EventSource header desteklemez; polyfill header koyar, token URL'de görünmez |
| **DT-A** | Digital Twin viewer = Unreal Pixel Streaming (canlı, iframe placeholder değil) | Ankara'da gerçek gösterim planlı. Signaling server (start.bat) + Unreal proje (denemeProje.bat) sunucuda systemd olarak servis edilecek. |

---

## 5. VERİTABANI ŞEMASI (gerçek kolon adları — KRİTİK)

**tenant:** PK=`tenant_id`, `tenant_code`(UNIQUE), `tenant_name`, `status`(enum: ACTIVE/PASSIVE)
**dt_registry:** PK=`dt_id`, `tenant_id`, `dt_type`(enum: OTOKAR_CORE/PDM/TPT/ESOGU), `dt_name`, `is_active`, `default_signal_set_id`
**asset_registry:** PK=`asset_id`, `dt_id`(FK), `asset_code`, `subsystem`, `tags`; UNIQUE(`dt_id`,`asset_code`)
**signal_catalog:** PK=`signal_id`, `signal_code`(UNIQUE), `unit`, `data_type`, `expected_rate_hz`, `range_min`, `range_max`, `warn_threshold`, `critical_threshold`
**telemetry_measurements** (hypertable): PK=(`ts_utc`,`asset_id`,`signal_id`,`source`); `dt_id`, `tenant_id` (0004 ile denormalize), `value_num`(double), `value_bool`, `value_str`, `value_json`, `quality_flag`(default OK), `ingest_ts_utc`(default now()), `correlation_id`
**audit_event** (0003): PK=`event_id`, `ts_utc`, `user_sub`, `username`, `tenant_code`, `method`, `path`, `status_code`, `action`(enum), `client_ip`, `user_agent`, `correlation_id`, `details`(JSONB)
- `audit_action` enum: AUTH_OK / AUTH_FAIL_401 / AUTH_FAIL_403 / AUTH_ERROR

**IU sinyalleri (0005) — Taha teyidi ile netleşmiş sözlük:**

| Kod | Fiziksel anlam | Birim | Not |
|---|---|---|---|
| 0001 | Toplam ivme | g | |
| 0002 | X ekseni titreşim hız RMS | mm/s | ⚠️ Migration 0005'te hatalı olabilir, tashih edilecek |
| 0003 | Y ekseni titreşim hız RMS | mm/s | ⚠️ Tashih |
| 0004 | Z ekseni titreşim hız RMS | mm/s | ⚠️ Tashih |
| 0005 | Sıcaklık | °C | |
| 0006 | Akustik ses seviyesi | dB | ⚠️ "Bearing sıcaklığı" varsayımı YANLIŞTI — akustik/dB olarak tashih edilecek |

**Threshold:** IU'da hazır threshold yok, "sadece alert list". Otokar tarafında da running-mode gözlemi ile hesaplanıyor. **Bizim tarafta threshold hesaplama Faz 3 sonrasına** — Otokar PdM analitik katmanının işi.

**Continuous aggregate'ler:** `telemetry_1m`, `telemetry_10m`, `telemetry_1h` (0004'te tenant_id ile rebuild edildi)
**Retention:** RAW 90 gün.

**Seed:**
- `seed.py` — 1 OTOKAR tenant, 1 dt (OTOKAR_CORE), 3+24 sinyal, 12 motor (MOTOR_01..12)
- `seed_test_tenants.py` — ESOGU tenant + ESOGU DT + TESTBED_01 asset, DEFTR yönetim tenant'ı

**MQTT payload (publisher/bridge → worker):**
```json
{"schema_version":"1.0","dt_id":"OTOKAR_CORE","asset_code":"MOTOR_06","source":"REAL",
 "ts_utc":"2026-06-15T09:17:26.938478Z",
 "readings":[{"signal_code":"temperature","value":67.346,"unit":"degC"}, ...]}
```
Topic: `factory/motor/{id:02d}/telemetry` | Worker abone: `factory/+/+/telemetry`

---

## 6. API UÇLARI (çalışan ve doğrulanmış)

| Uç | Görev | Auth | Tenant | Durum |
|---|---|---|---|---|
| `GET /health` | DB + TimescaleDB sürüm | ❌ | ❌ | ✅ |
| `GET /api/v1/me` | Token sahibi profili + allowed_modules | ✅ | — | ✅ |
| `GET /api/v1/me/admin-check` | RBAC test (DEFTR_Admin) | ✅ | — | ✅ |
| `GET /api/v1/assets` | Varlık listesi (P0.1) | ✅ | ✅ JOIN dt_registry | ✅ |
| `GET /api/v1/signals` + `/{id}` | Sinyal katalog | ✅ | — | ✅ |
| `GET /api/v1/timeseries` | asset+signal+range+bucket | ✅ | ✅ | ✅ |
| `GET /api/v1/kpi/live` | KPI özet | ✅ | ✅ | ✅ |
| `GET /api/v1/stream/telemetry` | SSE canlı akış (DB-polling) | ✅ Bearer | ✅ | ✅ |

Admin (`DEFTR_Admin`) tüm endpoint'lerde tenant filtresinden muaf.

**⬜ Ankara öncesi eklenecek:** `/api/v1/pdm/monitors`, `/api/v1/pdm/alarms` (Otokar PdM modülü için).

---

## 7. İLERLEME DURUMU

### ✅ FAZ 0 — Hazırlık
PostgreSQL+TimescaleDB+Mosquitto+venv+FastAPI iskelet+/health. Mock publisher.

### ✅ FAZ 1 — Ingest + DB + API MVP
1116 satır kayıpsız worker, hypertable + rollup + retention, timeseries + signals + kpi + SSE endpoint'leri.

### ✅ FAZ 2 — Auth & Modül Erişimi (backend)
- ADIM 15-20: Keycloak standalone + realm + roller + client + tenant_code mapper + backend JWT + /me + RBAC ✅
- ADIM 21: AUDIT_EVENT migration + best-effort audit kancası ✅
- ADIM 22: Rate limit + CORS ✅
- ADIM 23: Tenant izolasyonu backend'e gömüldü ✅ (0004 + seed_test_tenants + tenant filtresi tüm router'larda + cross-tenant kanıt)
- ADIM 24: Modül-rol matrisi + /me allowed_modules ✅
- ADIM 25: Keycloak realm export + import kanıtı ✅
- ADIM 26: Faz 2 test dokümanı ✅

### ✅ IU ENTEGRASYONU (13-21 Temmuz)
- Migration 0005 (24 IU sinyali + 12 asset backfill) ✅ (⚠️ sözlük tashihi Faz 3 içinde: 0002-4 unit=mm/s, 0006=dB)
- `tools/otokar_iu_bridge.py`: IU login + JWT auto-refresh + basic/computed polling + mock publisher payload uyumu ✅
- **21 Tem akşam:** IU akışı geri açıldı (8 gün monitör arızası bitti). `iu_probe.py` teyidi tam. Taha feature sözlüğü teyit etti.
- **⬜ Yarın (22 Tem):** Bridge canlı duman testi (Faz 4 Aşama 4 — kaldığı yerden).

### ✅ FAZ 2.4.1 — Frontend Auth Entegrasyonu (17-21 Temmuz)
**Uçtan uca Keycloak entegrasyonu doğrulandı** (21 Temmuz). Tüm P0 patchleri tamamlandı:

| P0 | İş | Sonuç |
|---|---|---|
| P0.1 | `assets.py` auth + tenant filtresi | ✅ Cross-tenant izolasyon kanıtlandı (OTOKAR 12, ESOGU 1, DEFTR admin 13) |
| P0.2 | npm install `keycloak-js@26.2.4` + `event-source-polyfill@1.0.31` | ✅ |
| P0.3 | `authSlice.js` + store wiring + `Object.freeze` empty-array selectors | ✅ |
| P0.4 | `KeycloakProvider` + `useKeycloak` + `keycloakConfig` | ✅ HMR-safe init fallback ile |
| P0.5 | `main.jsx` KeycloakProvider sarma + `window.__store` dev expose | ✅ + prod tree-shake doğrulandı |
| P0.6 | `api.js` request interceptor Bearer + 401 handler + redirect flag | ✅ |
| P0.7 | `App.jsx` useKeycloak + loading state + logout | ✅ |
| P0.8 | `LoginPage` mock USERS silindi → "Sign in with Keycloak" | ✅ |
| P0.9 | `Sidebar` allowedModules selector + `DashboardLayout` primaryRole | ✅ |
| P0.9 fix | `selectPrimaryRole` Keycloak teknik rollerini atlar | ✅ |
| P0.10 | `authz.py` MODULE_ROLES frontend id'lerine hizalı (live/platform/tpt/esogu/pdm/settings) | ✅ |
| P0.11 | `liveTelemetryApi.js` SSE = EventSourcePolyfill + Bearer | ✅ Fetch testinde 200 + text/event-stream, polyfill'de [SSE] opened |
| P0.12 | LIVE_DT_ID uyum | ✅ Gereksiz — frontend'de hard-code UUID yok, dinamik |

**Uçtan uca test (21 Tem):** `otokar_user` + `esogu_op` + `deftr_admin` üçü de Keycloak login → dashboard → doğru Sidebar filtresi → doğru header/footer + role gösterimi.

### ✅ FAZ 2.4.2 — 3 rol × 6 modül canlı UI test (21 Temmuz akşam)
- otokar_user → 3 modül (Live, PdM, Settings) + `OTOKAR · OTOKAR_Viewer` ✅
- esogu_op → 3 modül (Live, ESOGU, Settings) + `ESOGU · ESOGU_Operator` ✅
- deftr_admin → 6 modül tümü + `DEFTR · DEFTR_Admin` (header kırmızı — admin ayırt edici) ✅
- Cross-tenant izolasyon UI'da tam kanıtlandı.

### ⬜ Ankara Deploy Öncesi Kalan İşler

- **1. Uçtan uca canlı akış demosu** (2-3 sa, Ankara demosunun kendisi) — IU bridge → MQTT → worker → DB → SSE → frontend Live Monitoring KPI kartları canlı hareket. Mock → gerçek IU verisi geçişinin fiili kanıtı. Faz 1'de "kayıpsız veri kontratı" olarak inşa edilmiş yapıyı gerçek veriyle bir kez daha koşmak; şu ana kadar IU kesintisi yüzünden hiç yapılmadı. Bu, Ankara demosunda projeksiyona vurulacak şey.
- **2. Otokar PdM `/pdm/alarms` — heuristik MVP**: signal_catalog.warn_threshold / critical_threshold üzerinden basit filtreleme. Gerçek ML/PdM algoritması Faz 4. Ankara için "PdM konsept çalışıyor" kanıtı yeterli.

Öncelik sırasıyla:

1. **IU bridge duman testi** — 30 dk (Faz 4 Aşama 4, IU akışı geri geldi)
2. **IU sözlüğü tashihi** — 15 dk (`catalog.py` unit'leri güncelle; migration'da UPDATE için küçük SQL veya 0006 migration açma; seed rerun)
3. **Otokar PdM backend endpoint'leri** (`/pdm/monitors`, `/pdm/alarms`) + frontend hook — 3-4 sa
4. **Ankara sunucusu SSH erişimi** — 20 dk (openssh-server + SK/DK/ZG public key'leri)
5. **STEP 27: Kalıcı Keycloak admin** (temp admin kaldır) — 30 dk
6. **STEP 28: Password policy + brute force protection** — 30 dk
7. **STEP 30: nginx + Let's Encrypt + `matisse.deftr.com`** — 2 sa (DEFTR IT'nin DNS + firewall dışarı yönlendirme onayı gerekli)
8. **STEP 31: `.env` → systemd credentials** — 1 sa
9. **STEP 32: Rate limit Redis backend** — 1 sa
10. **STEP 33: `KEYCLOAK_VERIFY_AUDIENCE=true` + audience mapper** — 30 dk
11. **STEP 34: Direct access grants kalıcı OFF** — 15 dk
12. **Docker Compose (PG + Keycloak)** — 2 sa
13. **Unreal Pixel Streaming paketleme (Ankara için)** — Süre: SK'nın Pixel Streaming test çalışmalarının sonuçlarına bağlı. Signaling server (`start.bat` Linux karşılığı) + Unreal paketlenmiş proje sunucuda systemd olarak servis edilecek.
14. **`deploy/RUNBOOK.md`** — 1 sa
15. **Local'de tam Ankara topolojisi kuru koşusu** — 2 sa
16. **Ankara canlı deploy** — 27 Temmuz, SK sahada, 1 gün

### ⬜ FAZ 3+ (Ankara sonrası)
- **Faz 3 sonu:** stabilizasyon, IU threshold hesaplama (Otokar PdM analitik), Digital Twin viewer retry backoff (Unreal olmadığında konsol temiz kalması için)
- **Bundle code-split** (1.78 MB → daha küçük chunk'lar, dynamic import)
- **Faz 4 (Ağustos):** PdM/TPT adapter genişletme, Prometheus/Grafana, OpenSearch, yük testi #1
- **Faz 5 (Eylül, M24):** üretimleşme, güvenlik sıkılaştırma, yük testi #2, runbook

---

## 8. AÇIK / BEKLEYEN

| Konu | Kim | Durum |
|---|---|---|
| **IU veri kesintisi** | Taha | ✅ ÇÖZÜLDÜ (21 Tem akşam) |
| **IU feature sözlüğü** | Taha | ✅ NETLEŞTİ (21 Tem) — 0001=g, 0002/0003/0004=mm/s (X/Y/Z RMS), 0005=°C, 0006=dB. Migration 0005 sözlüğü tashih edilecek. |
| **IU computed polling** | Taha | ✅ TEYİT — ~30 dk periyodik + olay tetiklemeli ek kayıt. Bridge ayarı doğru. |
| **IU şifresi rotate** | SK | ✅ TAMAM |
| **`window.__store` prod build** | SK | ✅ TAMAM — Vite tree-shake doğrulandı, dist'te yok |
| **Faz 2.4.2 3×6 canlı test** | SK | ✅ TAMAM (21 Tem akşam) |
| **Ali Kemal Bey (Otokar IU sorumlusu)** | — | ℹ️ NOT: Taha yönlendirdi. IU teknik konularında yetkili. Mail açılışı: "Taha Bey yönlendirdi, ..." |
| **Ankara sunucu Ubuntu sürümü teyidi** | ZG | 22.04 mü 24.04 mü — deploy'da netleştirilecek (deadsnakes PPA ikisi için de OK) |
| **Ankara SSH erişimi** | SK+DK+ZG | ⏸ openssh-server + authorized_keys. Deploy'a başlamadan yapılacak (20 dk). |
| **DEFTR IT: public statik IP + DNS + firewall dışarı yönlendirme** | DEFTR IT | ⏸ Mail bekliyor. ZG sunucu içi UFW 443 açık; dışarıdan gelen 443'ün sunucuya yönlendirilmesi + `matisse.deftr.com` A kaydı gerekli. |
| **DK 3-rol onayı** | SK | ✅ İnisiyatif SK'da, sormaya gerek yok |
| **Ankara'da Unreal Pixel Streaming** | SK | ⏸ Pixel Streaming test çalışmaları devam ediyor. Sunucuda systemd servis olarak çalışacak. Deploy öncesi paketlenmiş Unreal proje + signaling server hazır olacak. |
| **Digital Twin viewer retry loop** (`DigitalTwinViewer.jsx:32`) | SK | ⏸ Orta öncelik. Ankara'da Unreal ayakta olduğunda konsol temiz olacak. Backoff + "manuel bağlan" düğmesi Faz 3'te. |
| **Bundle 1.78 MB code-split** | SK | ⏸ Faz 3 sonrası. Ankara için tolere (localhost + LAN). |
| **IU threshold hesaplama** | SK + Ali Kemal | ⏸ Faz 3 sonrası. IU'da hazır threshold yok; running-mode gözlemiyle bizim tarafta hesaplanacak. |

---

## 9. ADIM NUMARALANDIRMA

- **ADIM 1-14:** Faz 0 + Faz 1 (ortam → worker → Query API → SSE) ✅
- **ADIM 15-26:** Faz 2 (Keycloak + JWT + RBAC + tenant izolasyon + modül-rol + realm export + test dokümanı) ✅
- **IU Aşama 1-3:** Keşif + 0005 + bridge ✅
- **IU Aşama 4:** Bridge duman testi — 21 Tem'e kadar BLOKE (IU kesinti), **22 Tem'de yapılacak**
- **Faz 2.4.1 P0.1 → P0.12:** Frontend auth entegrasyonu ✅ (§7)
- **Faz 2.4.2:** 3×6 canlı UI test ✅

Sıradaki adım no: **STEP 27+** (Blok 2 sertleştirme, Ankara öncesi).

---

## 10. ANKARA TİMELİNE (27 Tem — güncel)

| Tarih | İş | Süre | Sonuç |
|---|---|---|---|
| **21 Tem (bugün)** | Faz 2.4.1 + 2.4.2 kapanış + IU akışı teyit + AI runtime güncelleme | ✅ TAMAM | Kapanış |
| **22 Tem** | IU bridge duman testi + IU sözlük tashihi + Otokar PdM backend | 5-6 sa | PdM canlı IU verisiyle beslenmeye başlar |
| **22 Tem akşam** | Blok 2 sertleştirme STEP 27-34 | 3 sa | Prod hardening |
| **23 Tem** | Docker Compose + `deploy/RUNBOOK.md` + Unreal Pixel Streaming paketleme | 4 sa | Deploy paketi |
| **24 Tem** | Local'de tam Ankara topolojisi kuru koşusu | 2 sa | End-to-end doğrulama |
| **25-26 Tem** | Buffer + son test + Ankara kutusu için son check | — | Deploy hazırlığı |
| **27 Tem** | 🎯 **Ankara canlı deploy** (SK sahada) | 1 gün | Milestone |
| **28 Tem** | Stabilizasyon + konsorsiyum sunum hazırlığı | Yedek | Yedek |

**Yeni gerçekçilik:** 27 Tem'e 6 tam gün var. Faz 2.4.1 kapandı, IU akışı geldi, sunucu hazır. Buffer 2-3 gün — güvenli. DEFTR IT (DNS + firewall) 25 Tem'e kadar cevap vermezse plan B: DEFTR ofis LAN'da HTTP ile ilk kanıt, TLS + domain 28 Tem sonrasına.

---

## 11. 21 TEMMUZ DURUM ÖZETİ (bugünkü kapanış)

### Sabah–öğle yapılan
1. **P0.1-P0.10** — assets tenant + authz hizala + npm install + authSlice + KeycloakProvider + main.jsx sarma + api.js interceptor + App refactor + LoginPage + Sidebar
2. **P0.11** — SSE polyfill + Bearer. Fetch testi 200, [SSE] opened.
3. **P0.12** — LIVE_DT_ID tarama, hard-code yok, atlandı.
4. **Git backlog** — 24 Haziran'dan bugüne 17 commit remote'a push.
5. **AI_CONTEXT + AI_WORKING_PROTOCOL** — güncel, push.

### Akşam
6. **Faz 2.4.2** 3×6 UI matris testi — 3 kullanıcı ile giriş, ekran görüntüsü kanıtları.
7. **P0.9 fix** — `selectPrimaryRole` Keycloak teknik rollerini atlıyor. Footer'da anlamlı rol.
8. **`window.__store` prod güvenlik testi** — `npm run build` → grep boş → tree-shake mükemmel.
9. **IU akışı geri açıldı** — Taha bildirdi. `iu_probe.py` teyidi: latest 2026-07-22T08:27:03Z, 30k+ basic + 1k+ computed.
10. **Taha IU feature sözlüğü cevabı** — 0001=g, 0002-4=X/Y/Z mm/s RMS, 0005=°C, 0006=dB akustik. Computed ~30 dk periyodik + olay tetiklemeli. Ali Kemal Bey yetkili kişi.
11. **IU şifresi rotate** — hijyen tamam.
12. **Ankara sunucu (ZG)** — `deploy/ankara-server-README.md` repo'ya eklendi. Ubuntu + Docker + Python + nginx + UFW + git. Dual-boot (Linux default). SSH eksik (20 dk).
13. **Ankara deploy tarihi** — 27 Temmuz kesinleşti. SK sahada.

### Kritik netleşmeler (yeni öğrenimler)

- **Konsol testleri yanıltıcı olabilir.** Dinamik `import('/src/store/index.js')` HMR'de farklı store instance dönebiliyor. `window.__store` dev expose ile kesin sonuç alındı.
- **Redux selector `?? []` tuzağı.** Her çağrıda yeni referans → gereksiz re-render + React uyarısı. `Object.freeze([])` ile çözüldü.
- **Windows case-insensitive filename** → Ubuntu'da patlar. `git mv` two-step ile düzeltildi.
- **HMR + `useRef(initialized)` tuzağı.** Fallback: `if (keycloak.authenticated && keycloak.token) handleAuthenticated()`.
- **Keycloak `invalid_grant` = 4 olasılık.** Şifre, disabled user, required-actions, yanlış username. curl ile teşhis.
- **Git commit boş stage'de sessiz geçer.** `git status` ile kontrol et.
- **Keycloak teknik rolleri** (`default-roles-<realm>`, `offline_access`, `uma_authorization`) UI'da bilgi taşımaz. `selectPrimaryRole` ile atla, anlamlı rolü göster.
- **IU sözlük varsayımları hızlı yanılabilir.** 0006 için "bearing sıcaklığı" varsayımı yanlıştı, gerçek "akustik dB". Migration açtıktan sonra dış sistemin sözlüğünü **kesin teyit** ile kontrol et.
- **Ankara sunucu Ubuntu sürümü tam netleşmedi** (22.04 vs 24.04). ZG readme'de belirtilmemiş; deploy'da netleştirilecek. deadsnakes PPA ikisi için de çalışır.
- **`window.__store` prod tree-shake güvenli.** `import.meta.env.DEV` blokları prod bundle'a girmiyor. Ama her release'de `npm run build` sonrası `dist/*.js` içinde grep ile tekrar doğrula (kalıcı güvenlik hijyeni).

### Yarına (22 Temmuz) devir

**Başlangıç cümlesi:**
> *"CB-MDTM devam — 22 Tem. Dün Faz 2.4.1 + 2.4.2 kapandı, IU akışı geri geldi + Taha sözlüğü teyit etti. Bugün önce IU bridge duman testi (Aşama 4), sonra IU sözlük tashihi + Otokar PdM backend."*

**Sıralı iş:**
1. IU bridge duman testi (30 dk) — kaldığı yerden
2. `catalog.py` IU unit tashihi + migration UPDATE + seed rerun (15 dk)
3. Otokar PdM backend endpoint'leri (`/pdm/monitors`, `/pdm/alarms`) + frontend hook (3-4 sa)
4. Blok 2 sertleştirme STEP 27-34 (3 sa)
5. Docker Compose + RUNBOOK (3 sa)

**Ankara için tam kalan gün sayısı:** 6 gün (22-27 Tem). Buffer sağlıklı.