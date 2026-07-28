# AI_WORKING_PROTOCOL.md — CB-MDTM Çalışma Protokolü

> **Bu dosya nedir?** Claude'un CB-MDTM projesinde nasıl davranacağını tanımlayan kalıcı talimat setidir.
> `AI_CONTEXT.md` ile birlikte yeni sohbete eklenir. `AI_CONTEXT.md` = "ne yaptık / nerede kaldık", bu dosya = "nasıl çalışıyoruz".
> **Son güncelleme:** 28 Temmuz 2026 — Faz 2.4.1 + 2.4.2 kapanışı + Ankara sunucusu hazır + IU sözlüğü netleşti + MVP timeline (29 Tem konsorsiyum, deploy uzaktan sonrasında).

---

## 1. SOHBETE NASIL DEVAM EDİLİR

Yeni bir sohbet açtığında:
1. `AI_CONTEXT.md` + `AI_WORKING_PROTOCOL.md` dosyalarını ekle.
2. İlk mesajda kaldığın adımı söyle. Örnek: *"CB-MDTM devam — 22 Tem. Dün Faz 2.4.1 + 2.4.2 kapandı, IU akışı geri geldi. Bugün önce IU bridge duman testi, sonra Otokar PdM backend."*
3. Claude bağlamı bu iki dosyadan yükler, gereksiz tekrar sormaz, doğrudan kaldığın adımdan devam eder.

**Önemli:** Bu dosyaları eke koymak Claude'u şaşırtmaz; tam tersine tek doğru bağlam kaynağıdır.
Dosyalardaki bilgi ile sohbetteki güncel durum çelişirse → **sohbetteki güncel durum kazanır** (dosya o noktada güncellenmeli).

---

## 2. CLAUDE'UN DAVRANIŞ KURALLARI (bu projede)

Bu projede başarılı olmuş çalışma tarzı — aynen sürdürülecek:

1. **Adım adım, tek seferde tek somut iş.** Her adım numaralı (ADIM N veya P0.X). Bir adım bitmeden sonrakine geçme; kullanıcının çıktıyı paylaşmasını bekle.

2. **Komutlar Windows PowerShell formatında, kopyala-yapıştır hazır.** Tam yollar açık (örn. `& "C:\Program Files\PostgreSQL\17\bin\psql.exe"`). Ankara deploy günü Linux'a geçince bash formatına dönülür — geçiş noktası açıkça belirtilir.

3. **Kod verirken: tam dosya yolu + dosyanın tamamı veya net "şu satırı şununla değiştir" talimatı.** Kullanıcı kodu yapıştırıp çalıştırabilmeli.

4. **Şema/kolon adı varsayma.** `AI_CONTEXT.md` §5'teki gerçek adları kullan. Emin değilsen önce `\d tablo` ile doğrulat, sonra kod yaz. Aynı disiplin **frontend için** de geçerli: bilinmeyen bir dosyanın içeriğini varsayma, `Get-Content` ile göster.

5. **Her kod parçası için kısa "ne yapıyor, neden böyle" açıklaması.** Ekip teknolojiye yeni; somut kütüphane/komut düzeyinde anlat.

6. **Her adımdan sonra doğrulama komutu/testi ver.** Çıktının ne olması gerektiğini önceden söyle ("beklenen: ...").

7. **Çakışma/risk tespit edince önce uyar, sonra çöz.** (Örn. ZG'nin şeması DK ile çakışıyordu — önce işaretlendi, sonra adapte edildi.)

8. **Mimari kararlarda kısa gerekçe + ileriye etki.** Kullanıcı "bu production'ı etkiler mi?" diye sorabiliyor; kontrat/izolasyon perspektifinden cevapla.

9. **Türkçe, net, gereksiz uzatmadan.** Övgü/dolgu minimum; teknik öz maksimum.

10. **Backup ve rollback yolu her zaman gösterilir.** Migration öncesi `pg_dump`, downgrade fonksiyonu, git commit önerisi. Panik yaratma; her adımın geri dönüşü hazır olmalı.

11. **Uzun sohbetlerde context yönetimi.** Bir konu bittiğinde özet + `AI_CONTEXT.md` güncelleme önerisi ver. Yeni sohbete geçiş sinyali gelirse temiz kapatma yap.

12. **Görev bittiğinde "başka bir şey var mı?" sorusuna cevap ver.** Sohbet sonunda kullanıcı açık kalanları sorarsa, tüm sohbeti tarayıp eksik/atlanmış işleri listele. "Zaten tamamdı" deme; sistematik gözden geçir.

13. **Dış sistem sözlük varsayımları hızlı yanılabilir — teyit al.** IU örneği: 0006'yı "bearing sıcaklığı (°C)" varsaymıştık; Taha teyit edince "akustik ses seviyesi (dB)" çıktı. Bir dış sistem entegrasyonunda değer aralığından çıkarım yaparken *sözlüğü mutlaka sistem sahibine doğrulat*. Belge de yanlış olabilir; kesin cevap = sistem sahibinden yazılı teyit.

---

## 3. GÖREV DAĞILIMI (efor: SK %50 / DK %25 / ZG %25)

- **SK (ana sorumlu):** Yüksek know-how — worker çekirdeği, JWT/OIDC, deployment, güvenlik, mimari kararlar, yük testi liderliği, IU bridge, frontend auth entegrasyonu, Pixel Streaming.
- **DK (destek):** Net kapsamlı/şablonlu — DB migration, seed, mock publisher, Keycloak rol/tenant formları (arayüzden), smoke test, **frontend iskelet ve mock veri katmanları**.
- **ZG (destek):** Sınırlı kapsamlı API — Query/SSE/KPI uçları, dependency şablonu (SK temeli üzerine), MinIO/upload, **Ankara sunucu OS/altyapı kurulumu**.
- **Ortak (TÜM) görevlerde liderlik daima SK'de.** DK/ZG kendi katman adımlarını koşar; know-how karmaşası yaratılmaz.

**Entegrasyon paterni:** DK/ZG bağımsız kaynak üretir (kendi klasörlerinde) → SK bunları `AI_CONTEXT.md` §3 klasör yapısına ve §5 gerçek şemaya **adapte ederek** entegre eder. ZG'nin kendi database.py/models'i KULLANILMAZ; sadece router/sorgu mantığı alınıp DK şemasına uyarlanır.

**DK frontend deseni:** Frontend'de DK sağlam bir katmanlı mimari kurdu (config → transport → adapter/hook → composite → container → view). Faz 2.4.1 auth patchleri bu deseni bozmadı — sadece 8 dosyada minimal ekleme yapıldı. Yeni frontend işleri de bu katmanlı desene uymalı: view API çağırmaz, adapter backend şemasını bilir, hook state yönetir, container UI orkestra eder.

**ZG Ankara sunucu deseni:** ZG fiziksel sunucuda temel yığını (Docker + Python + nginx + git + UFW) kurdu ve test etti. Kurulum kayıtları `deploy/ankara-server-README.md` içinde. SK Ankara'ya gittiğinde uygulama katmanını (Docker Compose + Keycloak realm + FastAPI systemd + Unreal Pixel Streaming servisi) ZG'nin altyapısı üzerine çıkarır. SSH erişimi (openssh-server + authorized_keys) ZG'nin bıraktığı iş, deploy'a başlamadan önce SK tarafında.

---

## 4. BİLEŞENLERİ ÇALIŞTIRMA (referans komutlar)

### Windows dev (SK, günlük)

Hepsi `backend` klasöründe, venv aktif (`.\.venv\Scripts\Activate.ps1`). Her biri AYRI pencerede, paralel:

```powershell
# 1) API sunucusu
uvicorn app.main:app --reload --port 8000

# 2) MQTT broker
& "C:\Program Files\mosquitto\mosquitto.exe" -c "C:\Program Files\mosquitto\cbmdtm.conf" -v

# 3) Ingest worker
python -m app.ingest.mqtt_worker

# 4a) Mock publisher (test verisi — IU akışı yokken)
python tools\mock_otokar_publisher.py --duration 30

# 4b) OTOKAR IU bridge (canlı IU verisi çeker)
python tools\otokar_iu_bridge.py

# Keycloak
cd C:\keycloak
$env:KC_BOOTSTRAP_ADMIN_USERNAME = "admin"
$env:KC_BOOTSTRAP_ADMIN_PASSWORD = "admin"
.\bin\kc.bat start-dev

# Frontend dev server
cd frontend
npm run dev
# http://localhost:5173

# Frontend prod build test (Ankara deploy oncesi rutin)
npm run build
# dist/*.js icinde __store, gizli anahtar vb. grep

# Seed (gerekirse)
cd tools
$env:DATABASE_URL=(Get-Content ..\.env | Select-String '^DATABASE_URL=' | %{$_.ToString().Split('=',2)[1]})
python seed.py
python seed_test_tenants.py     # ESOGU + DEFTR tenant'ları
cd ..

# Migration
alembic upgrade head        # uygula
alembic current             # mevcut sürüm
alembic history             # tüm geçmiş
alembic downgrade -1        # tek adım geri
```

**Uçtan uca SSE testi sırası (kritik):** broker → worker → tarayıcıda `/api/v1/stream/telemetry` AÇ → publisher/bridge.
(Tarayıcı publisher'dan ÖNCE açılmalı; SSE sadece bağlandıktan sonrasını yayınlar.)

**Doğrulama:**
```powershell
(Invoke-WebRequest "http://localhost:8000/health").Content
(Invoke-WebRequest "http://localhost:8000/api/v1/kpi/live").Content
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d cbmdtm -c "SELECT count(*) FROM telemetry_measurements;"
```

**Backup ve rollback (migration öncesi zorunlu):**
```powershell
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
& "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" -U postgres -d cbmdtm -F c -f "C:\Users\serha\Desktop\cbmdtm_backup_$stamp.dump"

# Restore
& "C:\Program Files\PostgreSQL\17\bin\pg_restore.exe" -U postgres -d cbmdtm -c "C:\Users\serha\Desktop\cbmdtm_backup_<stamp>.dump"
```

**Keycloak token PowerShell'de test:**
```powershell
function Get-CbmdtmToken($user, $pass) {
    $body = @{
        grant_type = "password"
        client_id  = "cbmdtm-frontend"
        username   = $user
        password   = $pass
    }
    (Invoke-RestMethod -Method Post `
        -Uri "http://localhost:8080/realms/cbmdtm/protocol/openid-connect/token" `
        -ContentType "application/x-www-form-urlencoded" `
        -Body $body).access_token
}
$T = Get-CbmdtmToken "otokar_user" "OtokarUser1"
$h = @{ Authorization = "Bearer $T" }
Invoke-RestMethod "http://localhost:8000/api/v1/me" -Headers $h
```

### Ankara sunucu (Linux, deploy günü)

ZG'nin kurduğu ortam. `deploy/ankara-server-README.md` içinde tam kayıt.

```bash
# Docker + Compose sagligi
docker --version
docker compose version
docker ps

# Servisler (systemd sonrasi, Faz 3'te tanimlanacak)
systemctl status matisse-api
systemctl status matisse-worker
systemctl status matisse-bridge
systemctl status matisse-signaling   # Unreal Pixel Streaming
systemctl status nginx
systemctl status matisse-pg
systemctl status matisse-keycloak    # Docker Compose managed'lar burada da gorunmez, docker compose ps ile bakilir

# Log
sudo journalctl -u matisse-api -f
docker compose -f /opt/matisse/docker-compose.yml logs -f

# nginx test
sudo nginx -t
sudo systemctl reload nginx

# UFW durum
sudo ufw status verbose
```

---

## 5. SIK KARŞILAŞILAN TUZAKLAR (öğrenilmiş dersler)

### Ortam ve venv
- **venv taşınmaz.** Klasör adı değişirse venv'i sil + yeniden kur (mutlak yol gömülü).
- **Windows shared memory.** `shared_buffers` 1GB (8GB değil — CreateFileMapping hatası).
- **Türkçe locale i/I tuzağı.** PostgreSQL locale=C.
- **psql araçları sessizdir.** Başarılı işlem çıktı vermez; hata varsa konuşur.
- **Windows filesystem case-insensitive; Ubuntu case-sensitive.** `KeycloakProvider.jsx` küçük k ile yaratılırsa Windows'ta çalışır, Ubuntu'da patlar. `git mv` two-step ile düzelt: `git mv keycloakProvider.jsx tmp` → `git mv tmp KeycloakProvider.jsx`.
- **PowerShell 5.1 ile PS 7 komut farkı.** `Invoke-WebRequest -SkipHttpErrorCheck` PS 7+; 5.1'de yok. Alternatif: try/catch ile `$_.Exception.Response.StatusCode.value__`.
- **PowerShell `git status --short frontend/src/auth`** cwd'ye göre çözer; auth klasöründeysen "frontend/src/auth/frontend/src/auth" arar → boş çıktı. Repo kökünden çalıştır.
- **PowerShell varsayılan console encoding'i UTF-8 değil.** `Get-Content` `.md` dosyasını `windows-1252` gibi okur, Türkçe karakter bozuk gösterir. `Get-Content ... -Encoding UTF8` ile aç. Dosya UTF-8 olsa bile PowerShell yorumu bozar.

### PostgreSQL / asyncpg / TimescaleDB
- **asyncpg NULL-tip katı.** `(:param IS NULL OR col=:param)` deseni patlar → sorguyu filtreli/filtresiz ikiye ayır.
- **TimescaleDB policy'leri transaction'da çalışmaz.** Migration'da `op.get_context().autocommit_block()` kullan.
- **Continuous aggregate DROP+RECREATE'te RAW dokunulmaz, sadece cache regenerate olur.** `CALL refresh_continuous_aggregate(view, NULL, NULL)` autocommit içinde çağrılmalı.
- **Alembic asyncpg kullanamaz.** Migration psycopg2 ile (env.py'de düz DATABASE_URL).
- **Alembic revision hash tuzağı.** `alembic revision -m "..."` rastgele hash'li dosya oluşturur; 000N stili için Rename-Item ile "0005_xxx.py" olarak yeniden adlandır. **İçindeki `revision = "..."` string'i de dosya adına uygun değiştirilmeli**, yoksa DB'de "hayali hash" oluşur. Alembic dosya adına değil, iç string'e bakar.
- **Alembic history sync bozulursa:** `UPDATE alembic_version SET version_num = '<gerçek_son>'` ile elle senkronla. Migration dosyası mevcut ve doğruysa güvenli.

### FastAPI / Pydantic / slowapi
- **FastAPI Depends dependency'lerinde `request: Request` parametresi otomatik enjekte olur** — Depends yazma.
- **slowapi limiter'ı main.py'de tanımlayıp router'lardan import etmek circular import verir.** `app/core/limiter.py`'ye çıkar, hem main.py hem router'lar oradan import etsin.
- **Pydantic v2 `list[str]` alanı .env'de virgülle ayrılmış string ile çalışmaz;** validator önce JSON parse denenir. Çözüm: raw string olarak sakla, property ile list expose et.
- **SQL string manipulation ile filtre inşa etmek fragile.** `.replace('tenant_id', 'tm.tenant_id')` gibi cambazlıklar bind parameter'ları bozar. İki ayrı `asset_filter` / `asset_filter_aliased` değişkeni tutmak daha güvenli.
- **KPI window default 1 saat** — DB verisi eskiyse `event_count=0` doğru. `window_hours` parametresiyle test et.

### Frontend / React / Vite / Redux
- **Tarayıcı `EventSource` API custom header desteklemez;** SSE'ye JWT eklemek için (a) query parametre ile token ya da (b) `event-source-polyfill` npm paketi gerekir. Biz (b) seçtik — token URL'de görünmez.
- **Backend + frontend modül id senkronizasyonu kritik:** iki tarafın aynı id'yi kullanması gerek. Semantik id (frontend kolaylık) referans, backend `authz.py` bunla hizalı olmalı.
- **Keycloak-js `check-sso` modu router olmadan çalışır;** PKCE redirect URL parametrelerini keycloak-js kendisi temizler. Basit dashboard'da router eklemek gereksiz overhead.
- **`LoginPage` mock USERS silinince tasarım "Sign in with Keycloak" butonuna dönüşür** — form kaybolur, buton kalır. Kullanıcı Keycloak login sayfasına yönlendirilir.
- **Redux selector `?? []` referans tuzağı.** `state.x?.list ?? []` her çağrıda yeni `[]` referans üretir → React-Redux gereksiz re-render + konsol uyarısı ("returned a different result"). Çözüm: modül seviyesinde `const EMPTY = Object.freeze([])` tanımla, selector'da o sabiti dön. Ya da `createSelector` ile memoize et.
- **HMR + `useRef(initialized)` init tuzağı.** `KeycloakProvider` gibi bir kez çalışacak useEffect'te `if (initialized.current) return;` koyunca HMR sonrası ref kalıcı olarak `true` kalıyor → Redux boş. Fallback ekle: `if (keycloak.authenticated && keycloak.token) handleAuthenticated(); else keycloak.init(...)`.
- **Konsoldan `await import('/src/store/index.js')` farklı store instance dönebiliyor.** Vite dev'de HMR + dinamik import modül önbelleğini duplike edebilir. Dev'de gerçek store'a erişmek için `main.jsx`'e `if (import.meta.env.DEV) window.__store = store` ekle; konsoldan `window.__store.getState()` ile oku.
- **`window.__store` prod build'de kaybolmalı.** `import.meta.env.DEV` tree-shake'lenmeli. Her release'de `npm run build` sonrası `dist/assets/*.js` içinde `Select-String __store` grep boş dönmeli. 21 Tem'de test edildi, temiz. Ama her bundle değişikliğinde tekrar doğrula (Vite/plugin sürüm bump'ı kırar).
- **Vite `.env` dev sunucuyu restart etmeden okunmuyor.** `.env` değiştirdiysen `npm run dev`'i durdur/başlat.
- **Keycloak realm rolleri arasında teknik roller** (`default-roles-<realm>`, `offline_access`, `uma_authorization`) UI'da bilgi taşımaz. Footer'da/header'da rol gösterirken `roles[0]` alma; `selectPrimaryRole` gibi filtreli bir selector kullan (bkz. `authSlice.js`). Aksi halde `esogu_op` gibi kullanıcılar "default-roles-cbmdtm" görür, yanıltıcı.
- **Frontend bundle 1.78 MB.** Ankara localhost + LAN için tolere edilir; ama internet üzerinden erişim gerektiğinde ilk yükleme yavaşlar. Dynamic import ile code-split Faz 3 sonrasına planlı.

### Git / commit hijyeni
- **`git commit -m` boş stage'de sessiz geçer.** Bir şey commit'lendi sanma; `git status` ile kontrol et. "Nothing to commit, working tree clean" görmeden ilerleme.
- **`git status` çıktısında `M` (working tree) vs `M ` (staged) farkı.** İlk sütun stage, ikinci sütun working tree. Solda boşluk varsa stage'e alınmamış demek.
- **Windows CRLF/LF uyarısı zararsız** ama Ubuntu deploy'unda `.gitattributes` ile normalize et. `git add` sırasında "LF will be replaced by CRLF" uyarısı çıkabilir; commit'i etkilemez.
- **Uzun sohbette commit borcu birikirse toplu commit dağıtımı yap:** mantıklı gruplara böl (backend güvenlik, tenant izolasyon, IU, deploy, AI runtime, frontend patch). Her grup ayrı commit, sonra tek push. Böylece `git log` okunabilir kalır.
- **`git add DOSYA1 DOSYA2` kullanırken PowerShell backtick continuation'ı kullanmıyorsan, ikinci dosya yolu için ayrı `git add` at.** Aksi halde ilk hata sessizce ötekini de yutabiliyor.

### Keycloak
- **Keycloak 24+: user attribute'leri için Realm settings → Unmanaged Attributes = Enabled olmalı,** yoksa UI'da Attributes sekmesi gözükmez.
- **Keycloak 26 access token aud claim'i "account" gelir;** `KEYCLOAK_VERIFY_AUDIENCE=false` ile başlamak (audience mapper eklenince true'ya).
- **Keycloak realm export'unda tüm nested `"id"` alanları UUID;** farklı Keycloak instance'a import ederken çakışır (409). Regex ile temizle: `"id":"<uuid>"` kaldır, Keycloak yeni UUID atar.
- **PowerShell `Invoke-RestMethod` string body'i default ISO-8859-1;** Keycloak UTF-8 bekler. `[System.Text.Encoding]::UTF8.GetBytes($string)` ile byte array yolla.
- **Keycloak `invalid_grant` = 4 farklı sebep:** (1) yanlış şifre, (2) disabled user, (3) required actions dolu (Update Password, Verify Email vs.), (4) yanlış username. Teşhis için PowerShell yerine `curl.exe -X POST` ile direkt endpoint'e vur; PS Invoke-RestMethod parse'ına güvenme.
- **Access Token Lifespan dev'de 5 dk default;** 12 saatlik varsayımla test etme. `Get-CbmdtmToken` fonksiyonunu 5 dk'da bir yenile. Prod'da 15-30 dk uygun.

### Audit
- **Audit yazımı best-effort olmalı** (async DB insert); DB down'da API 500 vermez, `log.warning` düşer.
- **RBAC audit izi kritik:** `otokar_user` → `/admin-check` → önce AUTH_OK (kimlik doğrulandı), sonra AUTH_FAIL_403 (yetki yetersiz). İki satır, tek istek — bu audit'in gerçek değeri.

### IU (Infinite Uptime) API
- **IU `/plants` boş dönerse (`status:true, data:[]`)** hesabın plant read yetkisi yok demek — endpoint patlamaz, "success ama boş" döner. Login başarılı + veri boş = yetki eksik senaryosu, karıştırılmasın.
- **IU JWT 12 saatlik;** `exp - 60 sn` kalınca proaktif refresh. Token base64-decode ile exp okunur, imza doğrulama gerekmez (dış sistem).
- **IU `basic-features` dakikada 1, `computed-features` ~30 dakikada 1** (belge yanlış; snapshot'tan + Taha teyidiyle gözlendi). Computed'de araya olay tetiklemeli ek kayıtlar giriyor — yani "tam 30 dk periyodik" değil, "~30 dk periyodik + spike'larda ek".
- **IU `computed-features.timestamp` string olarak epoch ms** (`"1783937867000"`), ISO değil. Belge yanlış.
- **IU'da `basic-features` kod anahtarları** (`"0001".."0006"`) Taha teyidi ile netleşti (21 Tem):
  - 0001 = toplam ivme (g)
  - 0002/0003/0004 = X/Y/Z ekseni titreşim hız RMS (mm/s) — "titreşim ivmesi g" DEĞİL, "hız RMS mm/s"
  - 0005 = sıcaklık (°C)
  - 0006 = akustik ses seviyesi (dB) — "bearing sıcaklığı" DEĞİL. Değer aralığından çıkarım yanıltıcıydı; teyit almadan sözlüğe kesin karar verme.
- **IU'da hazır threshold yok.** Otokar "alert list" tutuyor ama sadece o anki değer; threshold hesabı Otokar tarafında running-mode gözlemiyle manuel. Bizim tarafta da benzer yaklaşım — Faz 3 sonrası analitik katman.
- **IU teknik konularında yetkili Ali Kemal Bey (Otokar).** Taha yönlendirdi. Mail açılışı: "Taha Bey yönlendirdi, ..." Yeni sensör, threshold detayı, uzun kesinti nedeni gibi konularda doğrudan.
- **JWT/access token'ı paylaşırken exp'sine dikkat:** IU token'ı 12 saatlik; sohbete yapıştırılırsa kim alıyorsa istek atabilir. `.gitignore`'a `iu_*.json` ekli olsun.

### Dış sistem entegrasyonu (genel)
- **Sözlük varsayımlarını sistem sahibinden teyit al.** Değer aralıklarından çıkarım hızlı yanılır. IU 0006 örneğinde `~57-63` aralığı "bearing sıcaklığı °C" düşündürüyordu, gerçek "akustik dB". Migration açtıktan sonra bile sözlük tashih edilebilmelidir — `catalog.py` + `signal_catalog.unit` UPDATE hazır olsun.
- **Uzun kesintiler donanım kaynaklı olabilir.** IU 8 gün kesintide "network problem" ihtimali yerine "monitör arızası" çıktı. Sohbete bloke yazarken "dış sisteme mail attık, bekliyoruz, mock ile devam" deseni doğru.
- **Yetkili kişi zinciri kayıt altında olsun.** "Taha Bey → Ali Kemal Bey" gibi yönlendirmeler zaman geçince unutulur. `AI_CONTEXT §2 / Otokar iletişim` bloğunda listeli tut.

### Diğer
- **catalog.py tek kaynak.** Seed ile mock publisher'ın sinyal tanımı senkron olmalı.
- **Publisher payload sözleşmesi sabit.** IU bridge de aynı formatı takip eder (topic + payload birebir aynı). Worker dokunulmaz.
- **Sohbete şifre paylaşımı** — token/password sohbete geçtiyse ilk fırsatta değiştir. Hijyen kuralı; abartma ama es geçme. IU şifresi 21 Tem'de rotate edildi.

---

## 6. BAĞLAM GÜNCELLEME RİTÜELİ

Her faz/önemli adım bitiminde:
1. `AI_CONTEXT.md` §7 (ilerleme) ve §9 (adım no) güncellenir.
2. Yeni kalıcı karar çıktıysa §4'e (ADR) eklenir.
3. Yeni tuzak öğrenildiyse bu dosyanın §5'ine ilgili alt başlık altına eklenir.
4. Yeni bekleyen açık çıktıysa `AI_CONTEXT.md` §8'e eklenir.
5. Uzun sohbet sonunda §11'e "N Ay durum özeti" bloğu eklenir.

Claude'dan istenebilir: *"AI_CONTEXT'i güncel duruma göre revize et"* → güncel sürümü üretir.

**Bir sonraki sohbete geçiş sinyali:**
- Kullanıcı "yeni sohbete geçiyoruz" dediğinde ya da context window doluluk hissi gelince:
  - Kısa özet (bugün ne yapıldı, hangi kararlar alındı)
  - `AI_CONTEXT.md` §11 için "N Ay durum özeti" taslağı
  - Bir sonraki sohbette başlangıç cümlesi + ilk 3 iş
  - Bekleyen dış bağımlılık listesi (Taha, Ali Kemal, DEFTR IT, ekip)

---

## 7. HIZLI REFERANS: DOSYA-SORUMLULUK EŞLEŞMESİ

### Backend
| Dosya | Ne yapar | Değiştirmek için sebep |
|---|---|---|
| `app/main.py` | FastAPI app, router register, CORS, limiter | Yeni router ekleme, middleware |
| `app/core/config.py` | Settings (env → typed) | Yeni env değişkeni |
| `app/core/security.py` | JWT verify, `get_current_user`, `require_roles`, TenantCache, `is_admin()` (method — `user.is_admin()`) | Auth mantığı değişikliği |
| `app/core/authz.py` | MODULE_ROLES matrisi, `modules_for_roles()` | Yeni modül veya rol izni |
| `app/core/limiter.py` | slowapi Limiter singleton | Rate limit değişikliği |
| `app/routers/auth.py` | `/me`, `/me/admin-check` | User profile response şeması |
| `app/routers/timeseries.py` | `/timeseries`, `/signals` | Query API değişikliği |
| `app/routers/kpi.py` | `/kpi/live` | KPI hesabı |
| `app/routers/stream.py` | `/stream/telemetry` (SSE) | SSE polling logic |
| `app/routers/assets.py` | `/assets` (auth + tenant filtreli) | Asset listeleme |
| `app/ingest/mqtt_worker.py` | MQTT subscribe + DB insert | Ingest logic |
| `app/ingest/resolver.py` | dt_type/asset_code/signal_code → UUID cache | Yeni resolve tipi |
| `app/services/audit.py` | audit_event async insert | Audit alan ekleme |
| `tools/otokar_iu_bridge.py` | IU → MQTT bridge | IU payload değişikliği |
| `tools/catalog.py` | Signal + asset katalog (tek kaynak) | IU sözlük tashihi, yeni sinyal |
| `tools/seed.py` + `seed_test_tenants.py` | DB seed | Test verisi |

### Frontend (DK'nın katmanlı deseni + Faz 2.4.1 auth eklemesi)
| Katman | Dosya | Sorumluluk | Ne zaman değişir |
|---|---|---|---|
| Config | `src/config/telemetryConfig.js` | Sabitler | Davranış ayarı (polling, eşik) |
| Config | `.env` (gitignore'da) | VITE_* env değişkenleri | Backend URL, Keycloak URL değişince |
| Transport | `src/utils/api.js` | Axios instance + Bearer interceptor + 401 handler | Base URL / auth header |
| Transport | `src/services/liveTelemetryApi.js` | Endpoint fetch + SSE (EventSourcePolyfill) | Backend'e endpoint eklenince |
| Adapter | `src/services/adapters/liveMonitoringAdapters.js` | snake_case ham → view model | **Backend şeması değişince (SADECE burası)** |
| Hook (tekil) | `src/hooks/useLiveTelemetry.js` | Fetch/SSE state | Yeni veri deseni |
| Hook (composite) | `src/hooks/useLiveMonitoringData.js` | Modül veri yüzü | Modül veri ihtiyacı |
| Container | `src/components/LiveMonitoring/LiveMonitoring.jsx` | UI state + prop dağıtımı | Yeni panel/bileşen |
| View | `src/components/LiveMonitoring/*.jsx` | Saf render | Görsel değişiklik |
| View | `src/components/LiveMonitoring/DigitalTwinViewer.jsx` | Unreal Pixel Streaming iframe | Retry stratejisi, "manuel bağlan" düğmesi (Faz 3) |
| Store | `src/store/index.js` | Redux configureStore | Yeni slice |
| Store | `src/store/slices/authSlice.js` | Auth state + selectors (selectPrimaryRole, selectAllowedModules dahil) | Auth model değişikliği |
| Store | `src/store/slices/apiKeySlice.js` | STLC API key state | STLC ihtiyacı |
| Auth | `src/auth/keycloakConfig.js` | Keycloak singleton + init options | Realm/client değişince |
| Auth | `src/auth/KeycloakProvider.jsx` | Init + login akışı + /me + refresh timer + Redux dispatch | Auth logic |
| Auth | `src/auth/useKeycloak.js` | Hook: login/logout/state accessor | API değişikliği |
| Entry | `src/main.jsx` | Provider sarma + dev store expose | Sarma katmanı ekleme |
| App | `src/App.jsx` | Auth gate + module switch | Yeni modül route |

### FRONTEND-ARCHITECTURE.md temel kurallar
1. View bileşenleri **asla API çağırmaz** ve backend alan adlarını bilmez.
2. Mock yol silinmez. Her view `liveMode ? liveProp : mockData` deseniyle çalışır.
3. Sabit değer bileşene yazılmaz — config dosyasına gider.
4. Kontrollü bileşenler: paylaşılan state kopyası bileşende tutulmaz.
5. SSE kontratı sabit: `event: telemetry`, `data: {asset_id, signal_id, ts, value, quality}`. UUID → kod eşlemesi katalog üzerinden.
6. **Auth state Redux'ta,** component'ler `useSelector` ile okur. Keycloak singleton API'sine ihtiyaç olan yerler `useKeycloak()` hook'unu kullanır.
7. **Modül id'ler frontend Sidebar `item.id` referansı;** backend `authz.py` MODULE_ROLES bu id'lere hizalı. Yeni modül eklerken iki tarafı beraber güncelle.
8. **Rol gösterimi `selectPrimaryRole` üzerinden.** `roles[0]` alma; Keycloak teknik rollerini (`default-roles-*`, `offline_access`, `uma_authorization`) atlayan filtreli selector.

---

## 8. ÖNEMLİ DIŞ BAĞIMLILIKLAR

| Kaynak | Beklediğimiz | Etki |
|---|---|---|
| **Taha (OTOKAR)** | Genel iletişim + IU akış durumu bildirimi | ✅ 21 Tem: IU akışı geri geldi + feature sözlüğü teyidi |
| **Ali Kemal Bey (OTOKAR — IU sorumlusu)** | Threshold hesaplama danışmanlığı, uzun kesinti nedeni, yeni sensör bilgisi (gerekirse) | Faz 3 sonrası. Mail: "Taha Bey yönlendirdi, ..." |
| **DEFTR IT** | Public statik IP + DNS (`matisse.deftr.com` A kaydı) + firewall dışarı yönlendirme (443 → Ankara sunucu) | Ankara deploy (29 Tem MVP sonrası, uzaktan). Cevap gelmezse plan B: LAN'da HTTP ile ilk kanıt, TLS sonraki iterasyonda. |
| **DK** | Frontend rol modeli 7→3 daralma onayı | ✅ İnisiyatif SK'da, sormaya gerek yok. |
| **ZG** | Ankara sunucu OS/altyapı (Docker, Python, nginx, UFW, git) + SSH hazırlığı | ✅ 21 Tem'den önce yapıldı, `deploy/ankara-server-README.md`. SSH kısmı SK deploy günü tamamlayacak. |
| **Anthropic (Claude)** | Uzun sohbette context sınırı hissedilirse → yeni sohbet + AI_CONTEXT güncelleme | Süreklilik |

---

## 9. YENİ SOHBETE BAŞLAMA TALİMATI (SK için hazır şablon)

Yeni sohbet açtığında:

**1. Bu iki dosyayı ek olarak yükle:**
- `AI_CONTEXT.md`
- `AI_WORKING_PROTOCOL.md`

**2. İlk mesaj — kaldığın yeri net söyle:**

Örnek (22 Temmuz sabahı):
> *"CB-MDTM devam — 22 Tem. Dün Faz 2.4.1 + 2.4.2 kapandı, IU akışı geri geldi. Bugün önce IU bridge duman testi + sözlük tashihi, sonra Otokar PdM backend."*

Ya da MVP günü (29 Tem):
> *"CB-MDTM devam — 29 Tem, konsorsiyum MVP günü. Sunum akışı: Keycloak login → Live Monitoring canlı IU verisi → cross-tenant izolasyon. AI_CONTEXT §10 MVP demo senaryosu."*

Ya da MVP sonrası uzaktan deploy günü:
> *"CB-MDTM devam — 30 Tem (veya sonrası), Ankara uzaktan deploy. Sunucuya SSH ile bağlandım. `deploy/RUNBOOK.md` üzerinden gidiyoruz. İlk migration'ı çalıştıracağız."*

**3. Kural:**
- Claude'a "bana özet ver" deme — dosyalarda zaten var, sadece kalınan noktayı belirt.
- Çelişki varsa sohbetteki güncel durum kazanır (dosya güncellenmeli).
- Sohbet sonunda özet + `AI_CONTEXT` güncelleme talebi.

**4. Hızlı komut hatırlatıcı:**
```powershell
# Bileşenler ayakta mı?
Get-NetTCPConnection -LocalPort 1883,5432,5173,8000,8080 -ErrorAction SilentlyContinue | Select-Object LocalPort, State

# DB durumu
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d cbmdtm -c "\d telemetry_measurements"
alembic current

# Backup (migration öncesi)
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
& "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" -U postgres -d cbmdtm -F c -f "C:\Users\serha\Desktop\cbmdtm_backup_$stamp.dump"

# Git durum + push borcu
git status --short
git log --oneline origin/main..HEAD  # push'lanmamış commit'ler

# Frontend prod build sanity
cd frontend
npm run build
Get-ChildItem dist\assets -File | Select-String -Pattern "__store" -SimpleMatch  # bos donmeli
cd ..
```

**5. Ankara günü hızlı hatırlatıcı (deploy):**
- SSH → sunucu (openssh-server + authorized_keys hazır olmalı)
- `docker compose ps` — PG + Keycloak sağlığı
- `systemctl status` — API, worker, bridge, nginx, signaling
- `nginx -t && systemctl reload nginx`
- `curl -k https://matisse.deftr.com/health` — DNS + TLS
- İlk gerçek kullanıcı login testi (Keycloak realm import edilmiş olmalı)