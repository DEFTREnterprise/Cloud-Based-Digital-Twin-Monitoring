# CB-MDTM Backend MVP — Faz 2 Güvenlik Katmanı Özeti

**Tarih aralığı:** 26-30 Haziran 2026
**Kapsam:** Kimlik doğrulama, yetkilendirme, denetim izi, trafik koruması
**Durum:** Faz 2 backend işleri tamamlandı; frontend entegrasyonu (2.4.1) kaldı

---

## 1. Kimlik ve Erişim Yönetimi (Keycloak)

**Kurulum:**
- Keycloak 26.6.3 standalone (Java 21 üzerinde), `C:\keycloak`, port 8080
- Kalıcı depolama: PostgreSQL 17'de ayrı `keycloak` veritabanı (~90 tablo, embedded H2 yerine)
- Dev modu (`start-dev`) + temporary admin (Faz 3'te kalıcı yönetim hesabıyla değiştirilecek)

**Realm konfigürasyonu — `cbmdtm`:**
- Issuer: `http://localhost:8080/realms/cbmdtm`
- **3 realm rolü:** `OTOKAR_Viewer`, `DEFTR_Admin`, `ESOGU_Operator`
- **1 client:** `cbmdtm-frontend` — Public + PKCE S256, redirect `http://localhost:5173/*`, Web Origins tanımlı, Direct access grants kapalı (sadece Authorization Code + PKCE)
- **Token mapper:** `tenant_code` User Attribute → access token'a claim olarak eklenir (multi-tenancy anahtarı)
- **3 test kullanıcısı:** `otokar_user / deftr_admin / esogu_op` — her biri tenant_code + rol atanmış

**Sonuç:** JWT içeriği doğrulandı — `iss, sub, preferred_username, email, tenant_code, realm_access.roles` tam olarak backend'in beklediği şekilde geliyor.

---

## 2. Backend JWT Doğrulama Pipeline (`app/core/security.py`)

**Bileşenler:**
- **JWKS Cache** — Keycloak public key'lerini TTL'li (1 saat) çeker, `asyncio.Lock` ile thread-safe; bilinmeyen `kid` gelirse force-refresh (key rotation desteği)
- **`verify_token(token)`** — RS256 imza + `iss` claim + expiry doğrulaması; algoritma karıştırma (`alg=none`, `HS256`) saldırılarına kapalı
- **`get_current_user`** — FastAPI dependency; Bearer token'ı doğrular, `AuthenticatedUser` DTO döner (username, email, tenant_code, roles)
- **`require_roles("DEFTR_Admin", ...)`** — dependency factory; OR mantığı (verilen rollerden en az biri yeterli)

**Test kanıtı (uçtan uca):**
| Kullanıcı | `/api/v1/me` | `/api/v1/me/admin-check` |
|---|---|---|
| otokar_user | 200 ✅ | 403 ✅ |
| deftr_admin | 200 ✅ | 200 ✅ |
| esogu_op | 200 ✅ | 403 ✅ |
| Token yok | 401 ✅ | — |
| Bozuk token | 401 ✅ | — |

---

## 3. Denetim İzi (Audit)

**Veritabanı (migration `0003_audit_event`):**
- Tablo: `audit_event` — 12 kolon (kim, ne, sonuç, ne zaman, tenant, IP, UA, correlation_id, JSONB details)
- Enum `audit_action`: `AUTH_OK / AUTH_FAIL_401 / AUTH_FAIL_403 / AUTH_ERROR`
- 4 index: `ts_utc DESC`, `(user_sub, ts_utc)`, `(action, ts_utc)`, `(tenant_code, ts_utc)`
- PK: `gen_random_uuid()` (paralel insert güvenli); `ts_utc` default `now()`

**Yazma katmanı (`app/services/audit.py`):**
- Best-effort async insert — audit yazamazsa (DB down) istek **bloklanmaz**, yalnızca `log.warning`
- Request session'ından bağımsız kısa ömürlü DB session — request rollback olsa bile audit COMMIT olur

**Kanca (`security.py` içine gömüldü):**
- `get_current_user` başarılı → `AUTH_OK`
- Token yok / bozuk → `AUTH_FAIL_401`
- JWKS erişim hatası → `AUTH_ERROR`
- `require_roles` reddi → `AUTH_FAIL_403` (details JSONB'de `required_roles + user_roles`)

**Test kanıtı:** 5 senaryolu smoke test sonrası tabloda 6 doğru satır (otokar `/admin-check` iki satır yazıyor: önce AUTH_OK, sonra AUTH_FAIL_403 — RBAC denetimi için önemli iz)

---

## 4. Trafik Koruması (slowapi + CORS)

**Rate limit (`slowapi`, memory backend):**
- Global default: **60/dakika/IP** — tüm endpoint'ler
- `/api/v1/me` özel: **30/dakika/IP** — sayfa yenileme spam'i için sıkı
- `/health` muaf — monitoring/load-balancer probu
- `/api/v1/stream/telemetry` muaf — SSE uzun bağlantı
- 429 handler slowapi standardı ile döner

**CORS sıkılaştırma:**
- Origins → `.env` (`CORS_ORIGINS_RAW`, virgülle ayrılmış list)
- Methods → `GET, POST, PUT, DELETE, PATCH, OPTIONS` (`*` bırakıldı, çünkü `allow_credentials=True` ile CORS spec çakışıyor)
- Headers → `Authorization, Content-Type, X-Correlation-Id` + Starlette default'ları
- `allow_credentials=True` (frontend cookie/token için)
- `expose_headers=[X-Correlation-Id]` + `max_age=600` (preflight cache)

**Test kanıtı:**
- Global limit: 70 istek → 60 OK + 10 × 429 (tam beklenen)
- CORS preflight (OPTIONS): 200, tüm header'lar doğru

---

## 5. Konfigürasyon Yönetimi

**`.env` yapısı:**
- Database (host/port/name/user/password + Alembic için düz `DATABASE_URL`)
- SSE/KPI parametreleri
- Keycloak (issuer, JWKS URL, algorithm, audience, cache TTL, verify_audience flag)
- CORS + rate limit (raw string olarak, `config.py`'de property ile parse)

**`config.py` (Pydantic Settings v2):**
- Tüm ayarlar type-safe
- `CORS_ORIGINS_RAW` string'den `CORS_ORIGINS` list'ine property dönüşümü
- `KEYCLOAK_VERIFY_AUDIENCE=false` — Keycloak default `aud=account` sorunu için gevşek başlangıç; audience mapper eklenince `true`'ya çevrilecek

---

## 6. Kod Değişikliklerinin Kapsamı

**Yeni dosyalar:**
- `app/core/security.py` — JWT doğrulama çekirdeği
- `app/services/audit.py` — Audit yazma helper'ı
- `app/routers/auth.py` — `/api/v1/me` + `/api/v1/me/admin-check` uçları
- `migrations/versions/0003_audit_event.py` — Audit tablosu migration'ı

**Güncellenen dosyalar:**
- `app/core/config.py` — Keycloak + CORS + rate limit ayarları
- `app/main.py` — CORS sıkılaştırma, slowapi entegrasyonu, auth router register
- `app/routers/stream.py` — SSE için `@limiter.exempt`
- `.env` — Yeni config değişkenleri

**Yeni bağımlılıklar:**
- `python-jose[cryptography]==3.3.0` — JWT decode + RS256 imza
- `httpx==0.27.2` — JWKS async fetch
- `slowapi==0.1.9` — Rate limit

---

## 7. Güvenlik Duruşu — MVP Kapsamı

| Katman | Uygulandı | Not |
|---|---|---|
| Kimlik doğrulama (OIDC/JWT) | ✅ | RS256, JWKS cache, issuer + expiry sıkı |
| Yetkilendirme (RBAC) | ✅ | 3 rol, `require_roles` OR mantığı |
| Multi-tenancy claim | ✅ | `tenant_code` token'da; backend filtresi ADIM 23 |
| Denetim izi | ✅ | 4 kategori, JSONB details, indeksli |
| Rate limiting | ✅ | IP başına; user-based Faz 3 |
| CORS | ✅ | Whitelist + credentials + sıkı methods/headers |
| Bekleyen | ⏳ | Modül-rol matrisi (ADIM 23), frontend keycloak-js (2.4.1), 3-rol uçtan uca canlı doğrulama (2.4.2) |

---

## 8. Ertelenen Kararlar (Bilinçli)

- **Kalıcı Keycloak admin** — Faz 3 sıkılaştırma
- **Audit tablosu için hypertable dönüşümü** — Faz 3, hacim gerçek gözlemden sonra
- **Rate limit Redis backend** — Faz 3, çoklu uvicorn worker'a geçince
- **Audience doğrulaması sıkılaştırma** — Keycloak'ta özel audience mapper eklendikten sonra `KEYCLOAK_VERIFY_AUDIENCE=true`
- **User-based rate limit** (IP değil) — ADIM 23 modül-rol matrisi ile birlikte
- **Realm export'a `default-roles-cbmdtm ` (boşluklu) kozmetik temizlik** — Faz 3

---

## 9. Doğrulama Metriği (2. konsorsiyum toplantısı için)

- ✅ 3 farklı role sahip kullanıcı, gerçek Keycloak token'ıyla, gerçek FastAPI endpoint'inde 200/403/401 senaryolarını doğru tetikledi
- ✅ RBAC ihlali (403) audit'e detay JSONB'siyle yazıldı (required vs actual roles)
- ✅ Rate limit gerçek trafikte tetiklendi (60/dk sınırı)
- ✅ CORS preflight tarayıcı kurallarına uyumlu döndü
- ✅ Anonim + bozuk token istekleri 401 döndü, audit'te iz bıraktı

Faz 2 kapsamı, MATISSE konsorsiyum FR-IAM ve FR-API-008 gereksinimlerini karşılıyor. Frontend entegrasyonu tamamlandıktan sonra Faz 2 kapanmış sayılabilir.