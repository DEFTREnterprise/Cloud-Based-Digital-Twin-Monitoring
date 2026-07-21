# AI_CONTEXT.md — CB-MDTM Proje Bağlam Dosyası

> **Bu dosya nedir?** Claude ile yürütülen CB-MDTM geliştirme projesinin kalıcı hafızasıdır.
> Yeni bir sohbet açtığında bu dosyayı (ve `AI_WORKING_PROTOCOL.md`'yi) ekleyerek tam kaldığın yerden devam edebilirsin.
> **Son güncelleme:** 21 Temmuz 2026 — Faz 2.4.1 %100 kapandı (uçtan uca Keycloak entegrasyonu doğrulandı). Ankara canlı deploy hedefi 22-23 Temmuz'a kaydı.

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

### Çalışma ortamı (SABİT)
- **OS:** Windows 11, **editör:** VS Code, **terminal:** PowerShell
- **Proje kökü:** `C:\Users\serha\Desktop\Cloud-Based-Digital-Twin-Monitoring`
  (eski adı `CB-MDTMv2-main` idi — taşındı; venv yeniden kuruldu)
- **Git:** DEFTR private repo (`DEFTREnterprise/Cloud-Based-Digital-Twin-Monitoring`). 21 Tem itibarıyla origin/main güncel; Faz 2 + IU + Faz 2.4.1 hepsi push edildi.
- **Tarih bağlamı:** Faz 2 backend Haziran-Temmuz'da tamamlandı. IU entegrasyonu 13-16 Temmuz. Faz 2.4.1 frontend auth 17-21 Temmuz. **Ankara canlı deploy hedefi: 22-23 Temmuz 2026** (20 Tem hedefi 2-3 gün kaydı, Faz 2.4.1 planlanandan uzun sürdü).

### Prod ortam (Ankara sunucu)
- **Sunucu:** Dell Pro Max T2 (Ultra 9 285 / 32GB RAM / 1TB SSD / RTX 4000 Ada)
- **OS:** Ubuntu 22.04 LTS (sunucuya kurulacak)
- **Domain:** `matisse.deftr.com` (subdomain, path-based routing)
- **Paketleme:** Karma (ADR-003) — Docker (PG + Keycloak) + systemd (FastAPI + worker + bridge + nginx)
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

Tek TLS sertifikası + tek DNS A kaydı yeter. CORS önemsizleşir (frontend + API aynı origin).

---

## 2. TEKNOLOJİ YIĞINI (kurulu ve doğrulanmış)

| Katman | Teknoloji | Sürüm | Not |
|---|---|---|---|
| Dil | Python | 3.11.9 | venv: `backend\.venv` |
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
| Frontend | React + Vite | 18.2.0 / 5.0.8 | port 5173, Tailwind 3.3.6 |
| Frontend state | Redux Toolkit | 2.11.2 | react-redux 9.2.0 (auth slice canlı) |
| Frontend HTTP | axios | 1.13.5 | `utils/api.js` (Bearer interceptor + 401 handler) |
| Frontend chart | Recharts | 3.7.0 | |
| Frontend 3D | react-three-fiber + drei | 8.18 / 9.122 | Unreal Pixel Streaming iframe |
| Frontend auth | keycloak-js | 26.2.4 | `check-sso` + PKCE, `checkLoginIframe:false` |
| Frontend SSE | event-source-polyfill | 1.0.31 | Bearer header desteği |

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

### Keycloak test kullanıcıları (dev şifreleri — Ankara'da resetlenecek)
- `otokar_user` / `OtokarUser1` → OTOKAR_Viewer, tenant OTOKAR
- `esogu_op` / `EsoguUser1` → ESOGU_Operator, tenant ESOGU
- `deftr_admin` / `Test1234!` → DEFTR_Admin, tenant DEFTR

**Uyarı:** Bu isim ve şifreler yalnız local dev için. Ankara realm import'unda yeni kullanıcı setleri açılacak; şifreler DEFTR IT ile paylaşılacak.

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
│ │ └── 0005_iu_signals_monitor_mapping.py
│ ├── tools/
│ │ ├── catalog.py
│ │ ├── seed.py
│ │ ├── seed_test_tenants.py (ESOGU + DEFTR)
│ │ ├── mock_otokar_publisher.py
│ │ ├── otokar_iu_bridge.py (Faz 2, canlıya hazır)
│ │ ├── iu_probe.py (dev debug)
│ │ ├── iu_explorer.py (dev debug)
│ │ └── debug.py (dev debug)
│ ├── tests/ (boş — 1.7 + 2.4.2'de doldurulacak)
│ ├── Phase2.md (Faz 2 test notu)
│ ├── alembic.ini, pyproject.toml, requirements.in, .env(.example)
├── deploy/
│ └── keycloak/
│ ├── cbmdtm-realm.json (config, users hariç)
│ └── README.md (import prosedürü + UUID temizleme + UTF-8 encoding)
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
│ ├── main.jsx (KeycloakProvider sarma ✅ P0.5; window.__store dev)
│ ├── App.jsx (useKeycloak + loading state ✅ P0.7)
│ ├── auth/ (YENİ — Faz 2.4.1)
│ │ ├── KeycloakProvider.jsx (HMR-safe init fallback dahil)
│ │ ├── useKeycloak.js
│ │ └── keycloakConfig.js
│ ├── components/
│ │ ├── LoginPage.jsx (Keycloak SSO butonu ✅ P0.8)
│ │ ├── Sidebar.jsx (allowedModules selector ✅ P0.9)
│ │ ├── Header.jsx
│ │ ├── DashboardLayout.jsx (user.roles[0] uyumlu ✅ P0.9 fix)
│ │ ├── LiveMonitoring/ (DTSelector, TimeSeriesWidgets, KPICards, FactoryCameraFeed, DigitalTwinViewer, TimeRangeControl, DataQualityIndicator, LiveMonitoring)
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
│ │ │ └── authSlice.js (YENİ — Faz 2.4.1 ✅ P0.3; Object.freeze empty selectors)
│ │ └── middleware/
│ │ └── apiKeyPersistence.js
│ └── utils/
│ └── api.js (Bearer + 401 handler ✅ P0.6)
├── AI_CONTEXT.md
├── AI_WORKING_PROTOCOL.md
└── (README, .gitignore, vs.)Cloud-Based-Digital-Twin-Monitoring
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
│ │ └── 0005_iu_signals_monitor_mapping.py
│ ├── tools/
│ │ ├── catalog.py
│ │ ├── seed.py
│ │ ├── seed_test_tenants.py (ESOGU + DEFTR)
│ │ ├── mock_otokar_publisher.py
│ │ ├── otokar_iu_bridge.py (Faz 2, canlıya hazır)
│ │ ├── iu_probe.py (dev debug)
│ │ ├── iu_explorer.py (dev debug)
│ │ └── debug.py (dev debug)
│ ├── tests/ (boş — 1.7 + 2.4.2'de doldurulacak)
│ ├── Phase2.md (Faz 2 test notu)
│ ├── alembic.ini, pyproject.toml, requirements.in, .env(.example)
├── deploy/
│ └── keycloak/
│ ├── cbmdtm-realm.json (config, users hariç)
│ └── README.md (import prosedürü + UUID temizleme + UTF-8 encoding)
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
│ ├── main.jsx (KeycloakProvider sarma ✅ P0.5; window.__store dev)
│ ├── App.jsx (useKeycloak + loading state ✅ P0.7)
│ ├── auth/ (YENİ — Faz 2.4.1)
│ │ ├── KeycloakProvider.jsx (HMR-safe init fallback dahil)
│ │ ├── useKeycloak.js
│ │ └── keycloakConfig.js
│ ├── components/
│ │ ├── LoginPage.jsx (Keycloak SSO butonu ✅ P0.8)
│ │ ├── Sidebar.jsx (allowedModules selector ✅ P0.9)
│ │ ├── Header.jsx
│ │ ├── DashboardLayout.jsx (user.roles[0] uyumlu ✅ P0.9 fix)
│ │ ├── LiveMonitoring/ (DTSelector, TimeSeriesWidgets, KPICards, FactoryCameraFeed, DigitalTwinViewer, TimeRangeControl, DataQualityIndicator, LiveMonitoring)
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
│ │ │ └── authSlice.js (YENİ — Faz 2.4.1 ✅ P0.3; Object.freeze empty selectors)
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
| **ADR-003** | Karma paketleme (Docker: PG+Keycloak; systemd: FastAPI+worker+bridge+nginx) | Ankara sunucusu için basit, tek node |
| **K1** | Ayrı NoSQL **YOK** | TimescaleDB + MinIO + OpenSearch yeterli |
| **K2** | MVP'de Kafka **YOK** | Kayıpsızlık = MQTT QoS-1 + idempotent PK + retry. Kafka kararı yük testi #1'e ertelendi |
| **SSE-A** | SSE = **DB-polling** (Seçenek A) | in-memory bus process'ler arası çalışmaz; worker ayrı process |
| **IU-B** | IU → MQTT bridge (Seçenek B) | Worker dokunulmaz, mock publisher ile birebir topic/payload |
| **AUTH-A** | Router yok, keycloak-js `check-sso` | 20 Tem deadline riski; router overhead gereksiz |
| **AUTH-B** | Backend 3 rol referans (OTOKAR_Viewer/ESOGU_Operator/DEFTR_Admin) | Frontend mock 7 rol → 3'e daraldı |
| **AUTH-C** | Frontend modül id referans (live/platform/tpt/esogu/pdm/settings) | Backend `authz.py` bu id'lere hizalı |
| **AUTH-D** | Token: Keycloak singleton + Redux ayna | Keycloak-js refresh, Redux read; interceptor ve Sidebar Redux'tan okur |
| **AUTH-E** | SSE Bearer = event-source-polyfill | Native EventSource header desteklemez; polyfill header koyar, token URL'de görünmez |

---

## 5. VERİTABANI ŞEMASI (gerçek kolon adları — KRİTİK)

**tenant:** PK=`tenant_id`, `tenant_code`(UNIQUE), `tenant_name`, `status`(enum: ACTIVE/PASSIVE)
**dt_registry:** PK=`dt_id`, `tenant_id`, `dt_type`(enum: OTOKAR_CORE/PDM/TPT/ESOGU), `dt_name`, `is_active`, `default_signal_set_id`
**asset_registry:** PK=`asset_id`, `dt_id`(FK), `asset_code`, `subsystem`, `tags`; UNIQUE(`dt_id`,`asset_code`)
**signal_catalog:** PK=`signal_id`, `signal_code`(UNIQUE), `unit`, `data_type`, `expected_rate_hz`, `range_min`, `range_max`, `warn_threshold`, `critical_threshold`
**telemetry_measurements** (hypertable): PK=(`ts_utc`,`asset_id`,`signal_id`,`source`); `dt_id`, `tenant_id` (0004 ile denormalize), `value_num`(double), `value_bool`, `value_str`, `value_json`, `quality_flag`(default OK), `ingest_ts_utc`(default now()), `correlation_id`
**audit_event** (0003): PK=`event_id`, `ts_utc`, `user_sub`, `username`, `tenant_code`, `method`, `path`, `status_code`, `action`(enum), `client_ip`, `user_agent`, `correlation_id`, `details`(JSONB)
- `audit_action` enum: AUTH_OK / AUTH_FAIL_401 / AUTH_FAIL_403 / AUTH_ERROR

**IU sinyalleri (0005):** 24 yeni sinyal (basic-features 0001..0006, computed-features 12 metrik × 2 kanal), 12 asset backfill.

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
- ADIM 26: Faz 2 test dokümanı (`docs/tests/faz2-security-matrix.md`, 20+ senaryo) ✅

### ✅ IU ENTEGRASYONU (13-16 Temmuz)
- Migration 0005 (24 IU sinyali + 12 asset backfill) ✅
- `tools/otokar_iu_bridge.py`: IU login + JWT auto-refresh + basic/computed polling + mock publisher payload uyumu ✅
- **Canlı test BLOKE:** IU'da 14 Tem 01:32'den beri veri kesintisi. Taha'ya bildirildi. Bridge akış geldiği an açılacak.

### ✅ FAZ 2.4.1 — Frontend Auth Entegrasyonu (17-21 Temmuz)
**Uçtan uca Keycloak entegrasyonu doğrulandı** (21 Temmuz). Tüm P0 patchleri tamamlandı:

| P0 | İş | Sonuç |
|---|---|---|
| P0.1 | `assets.py` auth + tenant filtresi | ✅ Cross-tenant izolasyon kanıtlandı (OTOKAR 12, ESOGU 1, DEFTR admin 13) |
| P0.2 | npm install `keycloak-js@26.2.4` + `event-source-polyfill@1.0.31` | ✅ |
| P0.3 | `authSlice.js` + store wiring + `Object.freeze` empty-array selectors | ✅ |
| P0.4 | `KeycloakProvider` + `useKeycloak` + `keycloakConfig` | ✅ HMR-safe init fallback ile |
| P0.5 | `main.jsx` KeycloakProvider sarma + `window.__store` dev expose | ✅ |
| P0.6 | `api.js` request interceptor Bearer + 401 handler + redirect flag | ✅ |
| P0.7 | `App.jsx` useKeycloak + loading state + logout | ✅ |
| P0.8 | `LoginPage` mock USERS silindi → "Sign in with Keycloak" | ✅ |
| P0.9 | `Sidebar` allowedModules selector + `DashboardLayout` user.roles[0] | ✅ |
| P0.10 | `authz.py` MODULE_ROLES frontend id'lerine hizalı (live/platform/tpt/esogu/pdm/settings) | ✅ |
| P0.11 | `liveTelemetryApi.js` SSE = EventSourcePolyfill + Bearer | ✅ Fetch testinde 200 + text/event-stream, polyfill'de [SSE] opened |
| P0.12 | LIVE_DT_ID uyum | ✅ Gereksiz — frontend'de hard-code UUID yok, dinamik |

**Uçtan uca test (21 Tem):** `otokar_user` ile Keycloak login → dashboard → Sidebar 3 modül (`live, pdm, settings`) → Redux state tam (username, tenantCode=OTOKAR, roles=OTOKAR_Viewer, allowedModules=['live','pdm','settings']) → SSE endpoint 200 döndü.

### ⏸ FAZ 2.4.2 — 3 rol × 6 modül canlı test
Sadece `otokar_user` UI'da doğrulandı. `esogu_op` ve `deftr_admin` UI ile test edilmedi (sadece backend `/me` çıktısı ile). ~15-20 dk'lık iş, bu sohbetin sonunda yapılacak.

### ⬜ Ankara Deploy Öncesi Kalan İşler (~12-15 saat)
- Otokar PdM backend endpoint'leri (`/pdm/monitors`, `/pdm/alarms`) + frontend hook: 3-4 sa
- STEP 27: Kalıcı Keycloak admin (temp admin kaldır): 30 dk
- STEP 28: Password policy + brute force protection: 30 dk
- STEP 30: nginx + Let's Encrypt + `matisse.deftr.com`: 2 sa
- STEP 31: `.env` → systemd credentials: 1 sa
- STEP 32: Rate limit Redis backend: 1 sa
- STEP 33: `KEYCLOAK_VERIFY_AUDIENCE=true` + audience mapper: 30 dk
- STEP 34: Direct access grants kalıcı OFF: 15 dk
- Docker Compose (PG + Keycloak): 2 sa
- `deploy/RUNBOOK.md`: 1 sa
- Local'de tam Ankara topolojisi kuru koşusu: 1 sa
- Sunucu kurulumu + canlı deploy: 1 gün

### ⬜ FAZ 3+ (Ankara sonrası)
- **Faz 3 sonu:** stabilizasyon, IU canlı verisi (Taha cevap verince), Otokar PdM tam entegre
- **Faz 4 (Ağustos):** PdM/TPT adapter genişletme, Prometheus/Grafana, OpenSearch, yük testi #1
- **Faz 5 (Eylül, M24):** üretimleşme, güvenlik sıkılaştırma, yük testi #2, runbook

---

## 8. AÇIK / BEKLEYEN

| Konu | Kim | Durum |
|---|---|---|
| **IU veri kesintisi** (14 Tem 01:32'den beri) | Taha (OTOKAR) | Mail atıldı, cevap bekleniyor. Bridge kod hazır, akış geldiği an açılacak. |
| **IU feature sözlüğü teyidi** (0001-0006 birim/anlam) | Taha | 2. mail hazır — cevap gelene kadar `temperature_bearing` birim varsayımı `degC` |
| **IU computed polling gerçek sıklığı** | Taha | Snapshot 30 dk gösterdi; belgeye göre dakikada 1 olmalıydı |
| **IU şifresi değişimi** (hijyen — token/şifre sohbete geçti) | SK | Yapılmadı, 21 Tem itibarıyla açık |
| **DEFTR IT: public statik IP + DNS + firewall (443/22)** | DEFTR IT | Mail atıldı, cevap bekleniyor. Ankara için kritik. |
| **Frontend rol modeli 3 vs 7 karar teyidi** | DK | Sohbette karar backend 3 rol; DK'ya iletildi mi? |
| **Faz 2.4.2 canlı test** (3 rol × 6 modül UI matrisi) | SK | 21 Tem — bu sohbetin sonunda |
| **Digital Twin viewer sonsuz fetch retry** (`DigitalTwinViewer.jsx:32`) | SK | Düşük öncelik. Ankara'da Pixel Streaming yoksa konsol dolar. Backoff veya "manuel bağlan" düğmesi gerekli. |
| **`window.__store` prod build kontrolü** | SK | Vite `import.meta.env.DEV` tree-shake edilmeli; prod build'de yok olduğu doğrulanmadı. |
| **Ankara timeline kayma resmi** | SK | 20 Tem hedefi 22-23 Tem'e kaydı. Konsorsiyum bilgilendirmesi? |

---

## 9. ADIM NUMARALANDIRMA

Adımlar Faz 0'dan beri tekil artan numara ile takip edildi. Son durum:

- **ADIM 1-14:** Faz 0 + Faz 1 (ortam → worker → Query API → SSE) ✅
- **ADIM 15:** Keycloak standalone kurulum ✅
- **ADIM 16:** realm cbmdtm ✅
- **ADIM 17:** 3 realm rolü ✅
- **ADIM 18:** cbmdtm-frontend client (public + PKCE) ✅
- **ADIM 19:** tenant_code mapper + 3 test kullanıcısı ✅
- **ADIM 20:** Backend JWT (security.py + /me + RBAC) ✅
- **ADIM 21:** AUDIT_EVENT migration + audit kancası ✅
- **ADIM 22:** Rate limit + CORS ✅
- **ADIM 23:** Tenant izolasyonu backend'e gömüldü ✅
- **ADIM 24:** Modül-rol matrisi + /me allowed_modules ✅
- **ADIM 25:** Keycloak realm export + import kanıtı ✅
- **ADIM 26:** Faz 2 test dokümanı ✅

### IU entegrasyon aşamaları (13-16 Temmuz)
- **Aşama 1:** IU keşif + feature sözlüğü çıkarımı ✅
- **Aşama 2:** Migration 0005 (24 sinyal + 12 asset mapping) ✅
- **Aşama 3:** `otokar_iu_bridge.py` ✅
- **Aşama 4:** Duman testi — IU veri kesintisi nedeniyle BLOKE

### Faz 2.4.1 P0 patchleri (17-21 Temmuz)
- P0.1 → P0.12 hepsi ✅ (§7'de tablo)

### Sıradaki adım no
- **STEP 27+ (Faz 3):** Blok 2 sertleştirme — Ankara öncesi

Yeni adımlar bu numaranın devamından gider.

---

## 10. ANKARA TİMELİNE (revize)

| Tarih | İş | Süre | Sonuç |
|---|---|---|---|
| **21 Tem (bu akşam)** | Faz 2.4.2 3×6 canlı test + AI_CONTEXT/PROTOCOL güncelleme + commit/push | 45 dk | Sohbet temiz kapanır |
| **22 Tem** | Otokar PdM backend (`/pdm/monitors`, `/pdm/alarms`) + frontend hook | 3-4 sa | PdM tam entegre |
| **22 Tem** | Blok 2 sertleştirme (STEP 27-34) | 3 sa | Prod hardening |
| **22 Tem akşam** | Docker Compose + `deploy/RUNBOOK.md` | 3 sa | Deploy paketi |
| **23 Tem** | Local'de tam Ankara topolojisi kuru koşusu | 1 sa | End-to-end doğrulama |
| **23 Tem** | Ankara canlı deploy | 1 gün | 🎯 Milestone |
| **24 Tem** | Buffer / stabilizasyon | Yedek | Yedek |

**Not:** 20 Temmuz hedefi Faz 2.4.1'in planlanandan uzun sürmesi nedeniyle 22-23 Temmuz'a kaydı. Konsorsiyum bilgilendirmesi §8'de bekleyen olarak işaretli.

---

## 11. 21 TEMMUZ DURUM ÖZETİ (bugünkü kapanış)

### Bugün yapılan (kronoloji)

1. **P0.1** `assets.py` auth + tenant filtresi — 12/1/13 cross-tenant kanıtı
2. **P0.10** `authz.py` MODULE_ROLES frontend id'lerine hizalandı (live/platform/tpt/esogu/pdm/settings)
3. **P0.2** npm install `keycloak-js@26.2.4` + `event-source-polyfill@1.0.31`
4. **P0.3** `authSlice.js` yazıldı, store'a bağlandı; `Object.freeze` empty-array selectors ile re-render tuzağı çözüldü
5. **P0.4** `KeycloakProvider` + `useKeycloak` + `keycloakConfig` yazıldı; frontend `.env` oluşturuldu
6. **P0.5** `main.jsx` sarma + `window.__store` dev-only expose
7. **P0.6** `api.js` request interceptor Bearer + 401 handler + redirect flag
8. **P0.7** `App.jsx` useKeycloak entegrasyonu, loading state, logout Redux üzerinden
9. **P0.8** `LoginPage` Keycloak SSO butonuna dönüştürüldü, mock USERS silindi
10. **P0.9** `Sidebar` allowedModules selector; `DashboardLayout` user.roles[0]'a uyumlandı
11. **P0.11** `liveTelemetryApi.js` SSE = EventSourcePolyfill + Bearer; fetch testi 200, polyfill [SSE] opened kanıtı
12. **P0.12** LIVE_DT_ID hard-code taraması — frontend'de yok, atlandı
13. **Git backlog temizliği** — 24 Haziran'dan bugüne 17 commit remote'a push edildi (Faz 2 backend + IU + Faz 2.4.1 + deploy + docs + AI runtime)

### Kritik netleşmeler

- **Faz 2.4.1 %100 çalışıyor.** Uçtan uca Keycloak entegrasyonu doğrulandı: `otokar_user` login → dashboard → Redux state tam → Sidebar 3 modül → SSE endpoint Bearer'ı kabul ediyor.
- **Konsol testleri yanıltıcı olabilir.** Dinamik `import('/src/store/index.js')` HMR'de farklı store instance dönebiliyor. `window.__store` dev expose ile kesin sonuç alındı.
- **Redux selector `?? []` tuzağı.** Her çağrıda yeni referans → gereksiz re-render + React uyarısı. `Object.freeze([])` ile çözüldü.
- **Windows case-insensitive filename** → Ubuntu'da patlar. `KeycloakProvider.jsx` küçük k ile yaratıldı, `git mv` two-step ile düzeltildi.
- **HMR + `useRef(initialized)` tuzağı.** Provider init bir kere çalışıp ref kalıcı olarak `true` kalıyor → HMR sonrası Redux boş. Fallback: `if (keycloak.authenticated && keycloak.token) handleAuthenticated()` eklendi.
- **Keycloak `invalid_grant` = 4 olasılık.** Yanlış şifre, disabled user, required-actions dolu, ya da yanlış username. curl ile teşhis; PS Invoke-RestMethod parse'ına güvenme.
- **Git commit boş stage'de sessiz geçer.** `git status` ile kontrol etmeden "commit'lendi" varsayma.
- **Faz 2.4.2 3×6 canlı test bekliyor.** Backend `/me` çıktısı doğru; UI'da 3 kullanıcı ile giriş test edilmedi.

### Bekleyen dış bağımlılıklar
- Taha (OTOKAR): IU kesinti + feature sözlüğü + computed polling
- DEFTR IT: public statik IP + DNS + firewall port teyidi
- DK: frontend rol modeli 7→3 daralma onayı

### Yarın (22 Temmuz) — sıradaki sohbet

**Başlangıç cümlesi:** *"CB-MDTM devam — AI_CONTEXT §10 timeline 22 Tem. Otokar PdM backend endpoint'lerinden başla."*

**Sıralı iş:**
1. Otokar PdM backend (`/pdm/monitors`, `/pdm/alarms`) — 3-4 sa
2. Frontend PdM hook + adapter
3. Blok 2 sertleştirme (STEP 27-34) — 3 sa
4. Docker Compose (PG + Keycloak) — 2 sa
5. `deploy/RUNBOOK.md` — 1 sa

**Ardından:** Local kuru koşusu (23 Tem), sunucu deploy (23 Tem).