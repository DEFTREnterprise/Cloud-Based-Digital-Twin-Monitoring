# AI_CONTEXT.md — CB-MDTM Proje Bağlam Dosyası

> **Bu dosya nedir?** Claude ile yürütülen CB-MDTM backend geliştirme projesinin kalıcı hafızasıdır.
> Yeni bir sohbet açtığında bu dosyayı (ve `AI_WORKING_PROTOCOL.md`'yi) ekleyerek tam kaldığın yerden devam edebilirsin.
> **Son güncelleme:** Faz 2 / ADIM 15 (Keycloak kurulumu) — 16 Haziran sonrası.

---

## 1. PROJE KİMLİĞİ

- **Proje:** CB-MDTM (Cloud-Based MATISSE Digital Twin Monitoring Tool)
- **Program:** MATISSE — EU KDT JU, Grant No. 101140216
- **Konsorsiyum (TR):** OTOKAR, DEFTR, ESOGU
- **Geliştirici:** DEFTR
- **Kullanıcı:** Serhat Kahraman (SK) — lead developer, backend, koordinatör
- **Ekip:** SK (ana sorumlu %50), Doğukan Kıyıklık (DK, destek %25), Zülfikar Güneş (ZG, destek %25)
- **İletişim dili:** Türkçe
- **Amaç:** OTOKAR fabrikasındaki ROKOS robotuyla otobüs şasisi kalite kontrolü için bulut tabanlı,
  kayıpsız, kalite damgalı, canlı izlenebilir Digital Twin monitoring platformu.

### Çalışma ortamı (SABİT)
- **OS:** Windows, **editör:** VS Code, **terminal:** PowerShell
- **Proje kökü:** `C:\Users\serha\Desktop\Cloud-Based-Digital-Twin-Monitoring`
  (eski adı `CB-MDTMv2-main` idi — taşındı; venv yeniden kuruldu)
- **Git:** DEFTR private repo, push/pull bu dizin üzerinden otomatik
- **Tarih bağlamı:** Geliştirme 14–16 Haziran 2026'da yoğun ilerledi. Faz 2 deadline: 30 Haziran (2. konsorsiyum toplantısı).

---

## 2. TEKNOLOJİ YIĞINI (kurulu ve doğrulanmış)

| Katman | Teknoloji | Sürüm | Not |
|---|---|---|---|
| Dil | Python | 3.11.9 | venv: `backend\.venv` |
| DB | PostgreSQL | 17.10 | locale=C (Türkçe i/I tuzağından kaçınıldı), port 5432 |
| Time-series | TimescaleDB | 2.27.1 | hypertable + continuous aggregate + retention |
| API | FastAPI + Uvicorn | — | port 8000, async |
| ORM/DB sürücü | SQLAlchemy 2.0 (async) + asyncpg | — | alembic için ayrıca psycopg2-binary |
| Migration | Alembic | — | `backend\migrations\versions\` |
| MQTT broker | Mosquitto | 2.1.2 | port 1883, `allow_anonymous true` (yerel; auth Faz 3'te) |
| MQTT client | paho-mqtt | 2.1.0 | |
| SSE | sse-starlette | — | |
| Auth (Faz 2) | Keycloak | 23+ | Java 21.0.11 LTS ile; PostgreSQL `keycloak` DB'sine bağlı; port 8080 |

### Önemli config / sabitler
- `.env` dosyası `.gitignore`'da (şifre içerir). `.env.example` repoda referans.
- DB bağlantı: `DATABASE_URL=postgresql://postgres:<sifre>@localhost:5432/cbmdtm` (düz, psycopg2/araçlar için)
  ve `config.py`'de `database_url` property → `postgresql+asyncpg://...` (FastAPI için)
- Sabit DT UUID (seed): `00000000-0000-0000-0000-0000000000bb` (dt_type=OTOKAR_CORE)
- Windows'a özgü: TimescaleDB `shared_buffers=1GB` (tune'un önerdiği 8GB Windows'ta CreateFileMapping hatası verir)

---

## 3. KLASÖR YAPISI (SABİT — versioning bunun üzerinde)

```
Cloud-Based-Digital-Twin-Monitoring
├── backend
│   ├── app
│   │   ├── core/        (config.py, database.py, __init__.py)  [+ security.py Faz2]
│   │   ├── models/      (ORM — şimdilik boş, migration kullanılıyor)
│   │   ├── schemas/     (Pydantic — bazıları router içinde)
│   │   ├── routers/     (timeseries.py, stream.py, kpi.py)  [+ auth/me Faz2]
│   │   ├── ingest/      (mqtt_worker.py, schemas.py, resolver.py, quality.py)
│   │   ├── adapters/    (otokar_adapter.py)
│   │   ├── services/    (sse_bus.py — şu an kullanılmıyor, Redis'e geçişte referans)
│   │   └── main.py
│   ├── migrations/versions/  (0001_initial_schema.py, 0002_aggregates_retention.py)
│   ├── tools/           (catalog.py, seed.py, mock_otokar_publisher.py)
│   ├── tests/           (boş — 1.7 + 2.4.2'de doldurulacak)
│   ├── alembic.ini, pyproject.toml, requirements.in, .env(.example)
├── deploy/   (keycloak/, mosquitto/, nginx/ — Faz 3 config + realm export)
├── docs/adr/ (mimari karar kayıtları)
├── frontend/ (React + Vite — 6 modül, mock data; backend'e bağlanma ay sonunda)
├── core/
│   ├── config.py
│   ├── database.py
│   ├── security.py       (Faz 2)
│   └── limiter.py        (Faz 2)

**İlke:** `app/routers/*` dosyaları frontend `components/*` modülleriyle 1:1 eşleşir.

> NOT: `tools/app/services/` yanlışlıkla oluşmuş boş bir iskelettir, silinebilir.

---

## 4. MİMARİ KARARLAR (ADR — değişmez referans)

| Karar | İçerik | Gerekçe |
|---|---|---|
| **ADR-002** | PostgreSQL **17** (15 değil) | TimescaleDB + bulut yönetilen servis (RDS/Azure) uyumu |
| **K1** | Ayrı NoSQL **YOK** | TimescaleDB + MinIO + OpenSearch yeterli (TRS 5.1) |
| **K2** | MVP'de Kafka **YOK** | Kayıpsızlık = MQTT QoS-1 + idempotent PK + retry. Kafka kararı yük testi #1'e (Faz 4) ertelendi; tetik: ingest_lag p95 > 2 sn |
| **K3** | Docker'sız başlangıç | Toplantı kararı; paketleme kararı 1–7 Temmuz (ADR-003, Faz 3) |
| **SSE-A** | SSE = **DB-polling** (Seçenek A) | in-memory bus process'ler arası çalışmaz; worker ayrı process. Dışa kontrat sabit (`event: telemetry`), ileride Redis'e geçiş frontend'i etkilemez |

---

## 5. VERİTABANI ŞEMASI (gerçek kolon adları — KRİTİK)

**dt_registry:** PK=`dt_id`, `tenant_id`, `dt_type`(enum: OTOKAR_CORE/PDM/TPT/ESOGU), `dt_name`, `is_active`, `default_signal_set_id`
**asset_registry:** PK=`asset_id`, `dt_id`(FK), `asset_code`, `subsystem`, `tags`; UNIQUE(`dt_id`,`asset_code`)
**signal_catalog:** PK=`signal_id`, `signal_code`(UNIQUE), `unit`, `data_type`, `expected_rate_hz`, `range_min`, `range_max`, `warn_threshold`, `critical_threshold`
**telemetry_measurements** (hypertable): PK=(`ts_utc`,`asset_id`,`signal_id`,`source`); `dt_id`, `value_num`(double), `value_bool`, `value_str`, `value_json`, `quality_flag`(default OK), `ingest_ts_utc`(default now()), `correlation_id`
- Diğer: `tenant`, `signal_set`, `signal_set_item`

**Enum değerleri:**
- `quality_flag`: OK / GAP / DELAYED / OUTLIER / INVALID / UNKNOWN
- `telemetry_source`: REAL / SIM / DERIVED
- `signal_data_type`: numeric (default)

**Continuous aggregate'ler:** `telemetry_1m`, `telemetry_10m`, `telemetry_1h`
(kolonlar: `bucket`, `asset_id`, `signal_id`, `source`, `avg_value`, `min_value`, `max_value`, `sample_count`)
**Retention:** RAW 90 gün.

**Seed verisi:** 1 tenant, 1 dt (OTOKAR_CORE), 3 sinyal, 12 motor (MOTOR_01..12)
- temperature/degC/warn80/crit90, vibration/g/warn3.5/crit5, speed/rpm/warn2500/crit2800

**MQTT payload formatı (publisher → worker):**
```json
{"schema_version":"1.0","dt_id":"OTOKAR_CORE","asset_code":"MOTOR_06","source":"REAL",
 "ts_utc":"2026-06-15T09:17:26.938478Z",
 "readings":[{"signal_code":"temperature","value":67.346,"unit":"degC"}, ...]}
```
- Publisher topic: `factory/motor/{id:02d}/telemetry`
- Worker abone: `factory/+/+/telemetry`

**audit_event** (Faz 2, migration 0003): PK=`event_id` (UUID, gen_random_uuid), `ts_utc`(default now), `user_sub`(nullable), `username`, `tenant_code`, `method`, `path`, `status_code`, `action`(enum), `client_ip`, `user_agent`, `correlation_id`, `details`(JSONB).
İndeksler: (ts_utc DESC), (user_sub, ts_utc DESC), (action, ts_utc DESC), (tenant_code, ts_utc DESC).
- `audit_action` enum: AUTH_OK / AUTH_FAIL_401 / AUTH_FAIL_403 / AUTH_ERROR
- Best-effort insert (services/audit.py): DB down ise istek bloklanmaz, log.warning düşer.

---

## 6. API UÇLARI (çalışan ve doğrulanmış)

| Uç | Görev | Durum |
|---|---|---|
| `GET /health` | DB + TimescaleDB sürüm | ✅ |
| `GET /api/v1/timeseries` | asset_id, signal_id, from, to, bucket(raw/1m/10m/1h) | ✅ |
| `GET /api/v1/signals` + `/signals/{id}` | sinyal katalog metadata | ✅ |
| `GET /api/v1/kpi/live` | ingest_lag p95, gap %, eşik ihlali, quality_ok %, event_count | ✅ |
| `GET /api/v1/stream/telemetry` | SSE canlı akış (DB-polling, asset_id filtresi opsiyonel) | ✅ |
| GET /api/v1/me            | Token sahibi kullanıcı profili (Keycloak JWT)            | ✅ |
| GET /api/v1/me/admin-check| RBAC test ucu (DEFTR_Admin)                              | ✅ |
---

## 7. İLERLEME DURUMU (Gantt v4 takip)

### ✅ FAZ 0 — Hazırlık (TAMAM, yeni dizinde doğrulandı)
PostgreSQL+TimescaleDB+Mosquitto+venv+FastAPI iskelet+/health. Mock publisher.

### ✅ FAZ 1 — Ingest + DB + API MVP / Item-1 (TAMAM)
- 1.1 DB şeması (7 tablo, hypertable, idempotent PK) ✅
- 1.2 Continuous aggregate + retention ✅
- 1.3 MQTT Worker (schemas/resolver/quality/mqtt_worker) ✅ — 1116 satır kayıpsız, idempotency `INSERT 0 0` ile kanıtlandı
- 1.4 OTOKAR adapter — **iskelet hazır (mock modda)**; kontrat gelince `_otokar_to_telemetry()` + .env doldurulacak (~5dk). ⏳ R1
- 1.5 Query API (timeseries + signals) ✅
- 1.6 SSE stream + KPI/live ✅
- 1.7 testler + uçtan uca demo — ⏳ ay sonu (frontend ile)

### 🔄 FAZ 2 — Authentication & Modül Erişimi / Item-2
Deadline: 30 Haziran (2. konsorsiyum toplantısı).
- 2.1.1 Keycloak standalone ✅ (port 8080, PG'de keycloak DB, admin temp)
- 2.1.2 realm cbmdtm + roller + client + tenant_code mapper ✅
- ADIM 25: Keycloak realm export + import kaniti ✅
  * deploy/keycloak/cbmdtm-realm.json (config, users haric)
  * README.md: UTF-8 encoding + UUID temizleme prosedurleri
  * REST API import canli test edildi — Ankara icin gercek prod kaniti- 2.2.1 JWT doğrulama (security.py: JWKS cache, verify_token, get_current_user, require_roles) ✅
- 2.2.2 AUDIT_EVENT tablosu (migration 0003) + security.py audit kancası ✅
- 2.3.1 kismen: /api/v1/me tenant_id + is_admin ekli; MODUL-ROL matrisi ADIM 24
- ADIM 23 (2.2.1 uzantisi): tenant izolasyonu backend'e gomuldu ✅
  * migration 0004 (denormalize + CAgg rebuild + backfill)
  * seed_test_tenants (ESOGU + DEFTR)
  * security.py TenantCache + is_admin()
  * timeseries/kpi/stream tenant filtresi + DEFTR_Admin muafiyet
  * cross-tenant kanit: 3 kullanici x 7 senaryo gecti
- 2.3.1 modul-rol matrisi + /me genisletmesi ✅
  * app/core/authz.py: MODULE_ROLES sozlugu + modules_for_roles()
  * /api/v1/me yanitina allowed_modules eklendi
  * frontend menu karari hard-code degil, backend'den geliyor
- 2.3.2 slowapi rate limit + CORS whitelist ✅
  * Global 60/dk (IP), /me 30/dk özel, /health & SSE muaf
  * CORS origin/methods/headers .env'den, allow_credentials=True uyumlu
  * limiter app/core/limiter.py'de (main.py'den ayrı, circular import fix)

2.4.1 keycloak-js frontend → TÜM, ay sonu
- 2.4.2 3 rol ile uçtan uca doğrulama → SK yönetir

### ⬜ SONRAKİ FAZLAR
- **Faz 3 (Temmuz):** Ankara deployment, dağıtım paketleme kararı (ADR-003), quarantine+buffer/replay, MinIO+batch upload, TLS
- **Faz 4 (Ağustos):** PdM/TPT adapter, Prometheus/Grafana, OpenSearch, yük testi #1 (Kafka karar noktası)
- **Faz 5 (Eylül, M24):** üretimleşme, güvenlik sıkılaştırma, yük testi #2, runbook

---

## 8. AÇIK / BEKLEYEN

| Konu | Durum |
|---|---|
| OTOKAR API kontratı (0.2) | Mail iletildi; **Salı 30 Haziran toplantısında** ele alınacak (risk R1). Mock ile paralel devam. |
| Git/branch/PR (0.1.4) | First deploy yapıldı ✅ |
| Frontend → backend bağlama | Ay sonu. Frontend incelemesi kritik (askıda). |
| 1.7 testler + demo | Ay sonu (frontend ile) |

---

## 9. ADIM NUMARALANDIRMA (süreklilik için)

Adımlar Faz 0'dan beri tekil artan numara ile takip edildi. Son durum:
- ADIM 1–14: Faz 0 + Faz 1 (ortam → worker → Query API → SSE)
- **ADIM 15: Keycloak kurulumu (DEVAM — şu an buradayız)**
- ADIM 15: Keycloak kurulumu ✅
- ADIM 16: realm cbmdtm ✅
- ADIM 17: 3 realm rolü ✅
- ADIM 18: cbmdtm-frontend client (public + PKCE) ✅
- ADIM 19: tenant_code mapper + 3 test kullanıcısı ✅
- ADIM 20: backend JWT (security.py + /me + RBAC) ✅
- ADIM 21: AUDIT_EVENT migration (sıradaki — ZG görevi)
- ADIM 16+: Faz 2 devamı (realm/roller → JWT → /me → rate limit → frontend)
- ADIM 23: tenant izolasyonu backend'e gomuldu ✅
- ADIM 24: modul-rol matrisi + /me allowed_modules ✅
- ADIM 25: Keycloak realm export ✅
- ADIM 26: Faz 2 test dokumani (SIRADAKI)

### 13 Temmuz durum notu
- Faz 2 backend %100 tamam (ADIM 15-26)
- 2.4 (frontend auth) + 2.5 (milestone) beklemede — DK iskeleti + IU verisi ile birlikte gidecek
- OTOKAR sensor API = 3. parti Infinite Uptime (surpriz: Otokar'in kendi API'si degil)
- IU test hesabi olustu; plant 1716 (Sakarya) read yetkisi bekleniyor (Taha'dan)
- Mimari karar: Secenek B bridge (IU -> MQTT -> mevcut worker) — mock_publisher yerine otokar_iu_bridge.py
- Ankara kapsam: SSE + KPI + timeseries + Otokar PdM health/alarm (tam kapsam)
- ADR-003 kesin: Karma (Docker: PG+Keycloak; systemd: FastAPI+worker+nginx), matisse.deftr.com path-routing

Yeni adımlar bu numaranın devamından gider.

### 16 Temmuz durumu — sistemin bütünsel resmi

**Backend:**
- Faz 2 auth backend %100 tamam (ADIM 15-26)
- IU bridge (otokar_iu_bridge.py) hazır, tokenize çalışıyor
- IU tarafında 14 Tem 01:32'den beri veri kesintisi — Taha bildirildi
- assets.py tenant filtresi eksik (STEP P0.1 ile düzeltilecek)

**Frontend (DK):**
- 5 modül tam mimarili: LiveMonitoring, PdmModule, PlatformModule, TPTModule, ESOGUDTTool, SystemSettings
- Katmanlı mimari sağlam: config → transport → adapter → hooks → composite → container → view
- Mock veri ile canlı akış hissi çalışıyor
- Auth yok (`useState` client-side, `USERS` hard-coded 7 kullanıcı)
- Router yok (`useState('live')` + switch)
- Redux hazır ama sadece apiKey slice

**Bilinen entegrasyon açıkları:**
- SSE tarayıcı EventSource header yollayamaz → `event-source-polyfill` paketi
- `/api/v1/me` frontend çağrılmıyor → `allowedModules` boşuna hesaplanıyor
- Frontend rol modeli 7 rol, backend 3 rol → backend 3'te kal, frontend uyar
- Modül id ayrışması: frontend `live/pdm/esogu`, backend `liveMonitoring/otokarPdM/esoguDtTool` → backend uyar

**Karar noktaları (netleştirildi):**
- Router: manuel Keycloak init/callback (deadline riski, ihtiyaç yok)
- Rol modeli: backend 3 rol (OTOKAR_Viewer/DEFTR_Admin/ESOGU_Operator) referans
- Modül id senkronizasyonu: backend authz.py güncellenecek
- Token storage: Keycloak singleton + Redux ayna (karma)
- SSE auth: EventSourcePolyfill (fetch tabanlı, header destekli)

**Ankara timeline:**
- 16 Tem akşam: Faz 2.4.1 P0.1-P0.6
- 17 Tem: Faz 2.4.1 P0.7-P0.12 + Faz 2.4.2 canlı test
- 18 Tem: Otokar PdM modülü + Blok 2 (STEP 27-31)
- 19 Tem: Blok 2 (STEP 33-34) + Docker Compose + Runbook
- 20 Tem: Ankara canlı deploy
- 21 Tem: yedek buffer gün
