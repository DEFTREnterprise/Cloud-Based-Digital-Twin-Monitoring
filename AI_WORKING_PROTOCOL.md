# AI_WORKING_PROTOCOL.md — CB-MDTM Çalışma Protokolü

> **Bu dosya nedir?** Claude'un CB-MDTM projesinde nasıl davranacağını tanımlayan kalıcı talimat setidir.
> `AI_CONTEXT.md` ile birlikte yeni sohbete eklenir. `AI_CONTEXT.md` = "ne yaptık / nerede kaldık", bu dosya = "nasıl çalışıyoruz".
> **Son güncelleme:** 29 Temmuz 2026 — MVP konsorsiyum sunumu yapıldı. IU sözlüğü teyitle tashih edildi, kalite modeli ritme-oranlı hale getirildi, KPI canlı bağlandı. Ankara uzaktan deploy 30 Temmuz. SK 7-15 Ağustos izinde.

---

## 1. SOHBETE NASIL DEVAM EDİLİR

Yeni bir sohbet açtığında:
1. `AI_CONTEXT.md` + `AI_WORKING_PROTOCOL.md` dosyalarını ekle.
2. İlk mesajda kaldığın adımı söyle.
3. Claude bağlamı bu iki dosyadan yükler, gereksiz tekrar sormaz, doğrudan kaldığın adımdan devam eder.

**Önemli:** Bu dosyaları eke koymak Claude'u şaşırtmaz; tam tersine tek doğru bağlam kaynağıdır.
Dosyalardaki bilgi ile sohbetteki güncel durum çelişirse → **sohbetteki güncel durum kazanır** (dosya o noktada güncellenmeli).

---

## 2. CLAUDE'UN DAVRANIŞ KURALLARI (bu projede)

1. **Adım adım, tek seferde tek somut iş.** Her adım numaralı. Bir adım bitmeden sonrakine geçme; kullanıcının çıktıyı paylaşmasını bekle.

2. **Komutlar Windows PowerShell formatında, kopyala-yapıştır hazır.** Tam yollar açık. Ankara deploy günü Linux'a geçince bash formatına dönülür — geçiş noktası açıkça belirtilir.

3. **Kod verirken: tam dosya yolu + dosyanın tamamı veya net "şu satırı şununla değiştir" talimatı.**

4. **Şema/kolon adı varsayma.** `AI_CONTEXT.md` §5'teki gerçek adları kullan. Emin değilsen önce `\d tablo` ile doğrulat. Aynı disiplin **frontend için** de geçerli.

5. **Her kod parçası için kısa "ne yapıyor, neden böyle" açıklaması.** Ekip teknolojiye yeni; somut kütüphane/komut düzeyinde anlat.

6. **Her adımdan sonra doğrulama komutu/testi ver.** Çıktının ne olması gerektiğini önceden söyle ("beklenen: ...").

7. **Çakışma/risk tespit edince önce uyar, sonra çöz.**

8. **Mimari kararlarda kısa gerekçe + ileriye etki.** Kontrat/izolasyon perspektifinden cevapla.

9. **Türkçe, net, gereksiz uzatmadan.** Övgü/dolgu minimum; teknik öz maksimum.

10. **Backup ve rollback yolu her zaman gösterilir.** Migration öncesi `pg_dump`, downgrade fonksiyonu, git commit önerisi.

11. **Uzun sohbetlerde context yönetimi.** Bir konu bittiğinde özet + `AI_CONTEXT.md` güncelleme önerisi ver.

12. **Görev bittiğinde "başka bir şey var mı?" sorusuna cevap ver.** Tüm sohbeti tarayıp eksik/atlanmış işleri listele. "Zaten tamamdı" deme.

13. **Dış sistem sözlük varsayımları hızlı yanılabilir — teyit al.** IU örneği: 0006'yı "bearing sıcaklığı (°C)" varsaymıştık; Taha teyit edince "akustik ses seviyesi (dB)" çıktı. 0001'i "m/s²" sanmıştık, gerçekte ivmenin karesi `(m/s2)^2` çıktı — ham değeri yanlış birimle saklamak her kaydı karesi kadar bozacaktı. **Sözlüğü mutlaka sistem sahibinden yazılı teyit ettir.** Belge de yanlış olabilir.

14. **Dış sistemin ritmi ile bizim performansımızı ayır.** Bir gecikme/kalite metriği tanımlarken sor: *bu sayı bizim boru hattımızı mı ölçüyor, yoksa kaynağın kendi periyodunu mu?* İkisi karışırsa metrik yanıltır. 28-29 Temmuz'da aynı hata **iki ayrı katmanda** çıktı:
   - `quality.py` sabit 2 sn eşiği → her IU kaydı `DELAYED` (%0 kalite)
   - `kpi.py` `expected = combo × pencere × 1Hz` → %99.8 sahte gap

   İkisinin de çözümü aynıydı: `expected_rate_hz`'e oranlamak. **Bir yerde ritim varsayımı bulursan diğer katmanlarda da ara.**

15. **Eşik gevşetmek ile eşiği doğru tanımlamak farklı şeylerdir.** Bir metrik kötü görünüyorsa önce *ölçtüğü şey doğru mu* sorulur. Sayıyı yeşile boyamak için eşik büyütmek kabul edilemez; savunulabilir bir kural (örn. "beklenen periyodun 4 katı") tanımlanır ve gerekçesi koda yorum olarak yazılır. Taban eşik (NFR referansı) korunur.

16. **Kimlik bilgisi rotate etmek İKİ adımlı iştir.** (1) Kaynakta değiştir, (2) **tüketen tarafın config'ini güncelle + tek istekle doğrula.** İkinci adım atlanırsa hata gecikmeli patlar. 21 Tem'de IU şifresi rotate edildi, `backend/.env` 16 Tem'de kalmış eski değeri taşıdı; bridge 7 gün boyunca her istekte 401 aldı, 28 Tem'de fark edildi. Ankara'da tüm şifreler resetlenecek — bu kural RUNBOOK'a girmeli.

17. **Bir dosyanın varlığını AI_CONTEXT'e bakarak varsayma.** Belge gerçekten sapabilir. 29 Tem'de §3/§7'deki frontend yapısı (`config/`, `hooks/`, `adapters/`) gerçekte yoktu; `Get-Content` üç kez `PathNotFound` verdi ve "DK'da kalmış, kopyalayayım" yanlış sonucuna varıldı. **Önce `Get-ChildItem -Recurse` ile gerçek yapıyı gör, sonra dosya iste.**

18. **Toplu dosya kopyalama, çalışan bir katmanı bozabilecek en riskli hamledir.** "Eksik dosya var" hissi geldiğinde önce neyin gerçekten eksik olduğunu tespit et. Genelde tek bir bağlantı (import) eksiktir, klasör değil. Kritik gün (sunum/deploy) toplu kopyalama yapılmaz.

19. **Sunum/deploy günü kod kurcalanmaz.** Toplantı başladıysa HMR tetikleyecek değişiklik yapılmaz — çalışan ekranı bozma riski, kozmetik düzeltmenin değerinden büyüktür. Düzeltmeler listeye alınır, sonra uygulanır.

20. **Demoda mock ile gerçeği ayırt et.** Mock veri "Real Data" etiketiyle gösteriliyorsa demoda o panel açılmaz. Karışık ekran, gerçek olan kısmın da güvenilirliğini düşürür. Sunumda kapsam dürüstçe çerçevelenir: *"bu katman canlı, şu katman iskeletten besleniyor, bağlanması sıradaki iş."*

21. **Uygulanmış migration editlenmez.** Düzeltme yeni revizyon olarak açılır (ADR MIG-A). Dosyayı geçmişe dönük değiştirmek dev ile prod DB'sini sessizce ayrıştırır ve downgrade yolunu yok eder.

---

## 3. GÖREV DAĞILIMI (efor: SK %50 / DK %25 / ZG %25)

- **SK (ana sorumlu):** Yüksek know-how — worker çekirdeği, JWT/OIDC, deployment, güvenlik, mimari kararlar, yük testi liderliği, IU bridge, frontend auth entegrasyonu, Pixel Streaming.
- **DK (destek):** Net kapsamlı/şablonlu — DB migration, seed, mock publisher, Keycloak rol/tenant formları, smoke test, **frontend iskelet ve mock veri katmanları**.
- **ZG (destek):** Sınırlı kapsamlı API — Query/SSE/KPI uçları, dependency şablonu, MinIO/upload, **Ankara sunucu OS/altyapı kurulumu**.
- **Ortak (TÜM) görevlerde liderlik daima SK'de.**

**Entegrasyon paterni:** DK/ZG bağımsız kaynak üretir → SK bunları `AI_CONTEXT.md` §3 klasör yapısına ve §5 gerçek şemaya **adapte ederek** entegre eder.

**ZG Ankara sunucu deseni:** ZG temel yığını (Docker + Python + nginx + git + UFW) kurdu; kayıtlar `deploy/ankara-server-README.md`. SK uygulama katmanını (Docker Compose + Keycloak realm + FastAPI systemd + Unreal signaling) bunun üzerine çıkarır.

**İzin dönemi (7-15 Ağustos):** SK yokken sistem kendi kendine ayakta kalmalı. `deploy/RUNBOOK.md` DK/ZG'nin müdahale edebileceği detayda olmalı. systemd restart policy'leri ve bridge backoff mantığı izin öncesi doğrulanmış olmalı.

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

# Frontend prod build test
npm run build
Get-ChildItem dist\assets -File | Select-String -Pattern "__store" -SimpleMatch  # bos donmeli

# Seed (gerekirse)
cd tools
$env:DATABASE_URL=(Get-Content ..\.env | Select-String '^DATABASE_URL=' | %{$_.ToString().Split('=',2)[1]})
python seed.py
python seed_test_tenants.py
cd ..

# Migration
alembic upgrade head        # uygula
alembic current             # mevcut surum (0006_iu_unit_fix olmali)
alembic history
alembic downgrade -1
```

**Başlatma sırası (kritik):** broker → worker → bridge/publisher.
**SSE testi:** broker → worker → tarayıcıda stream AÇ → publisher/bridge. (Tarayıcı publisher'dan ÖNCE açılmalı.)

**Worker resolver cache'i başlangıçta bir kez yüklenir.** Yeni/değişen `signal_code` sonrası worker **yeniden başlatılmalı**, yoksa "bilinmeyen signal" diye düşer.

### Doğrulama

```powershell
# Portlar
Get-NetTCPConnection -LocalPort 1883,5432,5173,8000,8080 -ErrorAction SilentlyContinue | Select-Object LocalPort, State -Unique

# Health (HER ZAMAN -UseBasicParsing)
(Invoke-WebRequest "http://localhost:8000/health" -UseBasicParsing).Content

# Veri tazeligi
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d cbmdtm -c "SELECT max(ts_utc), max(ingest_ts_utc), now() FROM telemetry_measurements WHERE source='REAL';"

# Kalite — ingest_ts_utc ile filtrele (ts_utc DEGIL)
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d cbmdtm -c "SELECT quality_flag, count(*) FROM telemetry_measurements WHERE source='REAL' AND ingest_ts_utc > now() - interval '5 minutes' GROUP BY quality_flag;"

# CANLI ZINCIR KANITI (demo yedegi — her sunumdan once hazir tut)
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d cbmdtm -c "SELECT sc.signal_code, sc.unit, count(*) AS n, max(tm.ts_utc) AS son FROM telemetry_measurements tm JOIN signal_catalog sc ON sc.signal_id = tm.signal_id WHERE tm.source='REAL' AND tm.ts_utc > now() - interval '1 hour' GROUP BY sc.signal_code, sc.unit ORDER BY sc.signal_code;"

# Gecikme dagilimi (esik ayari icin)
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d cbmdtm -c "SELECT sc.signal_code, count(*) AS n, round(avg(EXTRACT(EPOCH FROM (tm.ingest_ts_utc - tm.ts_utc)))::numeric,1) AS ort_sn, round(max(EXTRACT(EPOCH FROM (tm.ingest_ts_utc - tm.ts_utc)))::numeric,1) AS max_sn FROM telemetry_measurements tm JOIN signal_catalog sc ON sc.signal_id=tm.signal_id WHERE tm.source='REAL' AND tm.ts_utc > now() - interval '1 hour' GROUP BY sc.signal_code ORDER BY ort_sn DESC;"
```

**Auth gerektiren uçlar curl/IWR ile test edilemez** (`{"detail":"Authorization: Bearer bekleniyor"}` normaldir). Ham JSON için: tarayıcı DevTools → Network → istek → **Response** sekmesi.

### Backup ve rollback (migration öncesi zorunlu)

```powershell
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
& "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" -U postgres -d cbmdtm -F c -f "C:\Users\serha\Desktop\cbmdtm_backup_$stamp.dump"

# Teyit
Get-ChildItem "C:\Users\serha\Desktop\cbmdtm_backup_*.dump" | Select-Object Name, Length, LastWriteTime

# Restore
& "C:\Program Files\PostgreSQL\17\bin\pg_restore.exe" -U postgres -d cbmdtm -c "C:\Users\serha\Desktop\cbmdtm_backup_<stamp>.dump"
```

`pg_dump` TimescaleDB `continuous_agg` için "circular foreign-key" uyarısı verir — **zararsız**, dump tamamlanır.

### Şifre girerken (ekranda/geçmişte bırakma)

```powershell
$sec = Read-Host "sifre" -AsSecureString
$plain = [System.Net.NetworkCredential]::new("", $sec).Password
# ... kullan ...
Remove-Variable plain, sec
```

### Keycloak token PowerShell'de test

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

```bash
# Docker + Compose sagligi
docker --version && docker compose version && docker ps
docker compose -f /opt/matisse/docker-compose.yml ps

# Servisler
systemctl status matisse-api
systemctl status matisse-worker
systemctl status matisse-bridge
systemctl status matisse-signaling   # Unreal Pixel Streaming
systemctl status nginx

# Log
sudo journalctl -u matisse-api -f
sudo journalctl -u matisse-bridge -f      # login dongusu kontrolu!
docker compose -f /opt/matisse/docker-compose.yml logs -f

# nginx
sudo nginx -t && sudo systemctl reload nginx

# UFW
sudo ufw status verbose

# Migration
cd /opt/matisse/backend && source .venv/bin/activate
alembic current      # 0006_iu_unit_fix (head) olmali
alembic upgrade head
```

---

## 5. SIK KARŞILAŞILAN TUZAKLAR (öğrenilmiş dersler)

### Ortam ve venv
- **venv taşınmaz.** Klasör adı değişirse venv'i sil + yeniden kur.
- **Windows shared memory.** `shared_buffers` 1GB (8GB değil — CreateFileMapping hatası).
- **Türkçe locale i/I tuzağı.** PostgreSQL locale=C.
- **psql araçları sessizdir.** Başarılı işlem çıktı vermez.
- **Windows filesystem case-insensitive; Ubuntu case-sensitive.** `git mv` two-step ile düzelt.
- **PowerShell 5.1 ile PS 7 komut farkı.** `-SkipHttpErrorCheck` PS 7+; 5.1'de try/catch ile `$_.Exception.Response.StatusCode.value__`.
- **PowerShell varsayılan console encoding'i UTF-8 değil.** `Get-Content ... -Encoding UTF8` kullan; aksi halde Türkçe karakter bozuk görünür (`â€"` gibi).
- **`Invoke-WebRequest` her zaman `-UseBasicParsing` ile.** Aksi halde güvenlik uyarısı çıkar (demo sırasında kötü durur).

### PostgreSQL / asyncpg / TimescaleDB
- **asyncpg NULL-tip katı.** `(:param IS NULL OR col=:param)` patlar → sorguyu ikiye ayır.
- **TimescaleDB policy'leri transaction'da çalışmaz.** `op.get_context().autocommit_block()`.
- **Alembic asyncpg kullanamaz.** Migration psycopg2 ile.
- **Alembic revision hash tuzağı.** Dosya adını `000N_xxx.py` yaptıysan **içindeki `revision = "..."` string'ini de** değiştir. Alembic dosya adına değil, iç string'e bakar.
- **Alembic history sync bozulursa:** `UPDATE alembic_version SET version_num = '<gerçek_son>'`.
- **`Numeric` kolon Python'a `Decimal` gelir.** `float()` cast etmeden bölme yaparsan `TypeError`. `resolver.py`'de `expected_rate_hz` bu yüzden cast'li.
- **plpgsql `DO $$` bloğu içinde SQLAlchemy bind parametresi (`:isim`) kırılgan.** Çalışabilir ama güvenilmez; kontrolü Python tarafına almak daha sağlam.

### FastAPI / Pydantic / slowapi
- **FastAPI Depends'de `request: Request` otomatik enjekte olur** — Depends yazma.
- **slowapi limiter'ı main.py'de tanımlayıp router'lardan import etmek circular import verir.** `app/core/limiter.py`'ye çıkar.
- **Pydantic v2 `list[str]` alanı .env'de virgülle çalışmaz;** raw string sakla, property ile expose et.
- **SQL string manipulation ile filtre inşa etmek fragile.** İki ayrı `asset_filter` / `asset_filter_aliased` değişkeni tut. JOIN eklenen sorgularda **mutlaka alias'lı** olanı kullan, yoksa "column ambiguous" hatası.
- **KPI window default 1 saat** — DB verisi eskiyse `event_count=0` doğru.

### Kalite / KPI metrikleri
- **`quality_flag` satırın YAZILDIĞI anda damgalanır.** `classify` mantığını değiştirdikten sonra `ts_utc` ile filtrelersen eski damgalı satırlar sonuca karışır → düzeltmenin işe yarayıp yaramadığını göremezsin. **`ingest_ts_utc` ile filtrele.**
- **`lag = ingest_ts - ts_utc` kaynağın ritmini de içerir.** Dış sistem entegrasyonlarında bu fark bizim performansımız değildir.
- **`expected_rate_hz` KPI hesaplarının temelidir.** Beklenen kayıt sayısı, gap oranı, gecikme eşiği — hepsi buna oranlanmalı. Sabit 1 Hz varsayımı yapan her formül dış sistem verisinde patlar.
- **`OUTLIER` kontrolü `range_min/range_max` NULL ise fiilen devre dışıdır.** IU sinyallerinde eşikler NULL (Faz 3'te kalibre edilecek) → şu an sadece `INVALID` + `DELAYED` gerçekten çalışıyor. "Kalite damgası" anlatısında bunu dürüstçe belirt.

### Frontend / React / Vite / Redux
- **Tarayıcı `EventSource` custom header desteklemez;** `event-source-polyfill` kullanıyoruz (token URL'de görünmez).
- **Backend + frontend modül id senkronizasyonu kritik.**
- **Keycloak-js `check-sso` router olmadan çalışır.**
- **Redux selector `?? []` referans tuzağı.** `const EMPTY = Object.freeze([])` ile çöz.
- **HMR + `useRef(initialized)` init tuzağı.** Fallback: `if (keycloak.authenticated && keycloak.token) handleAuthenticated()`.
- **Konsoldan `await import('/src/store/index.js')` farklı store instance dönebilir.** `window.__store` dev expose kullan.
- **`window.__store` prod build'de kaybolmalı.** Her release'de `dist/assets/*.js` içinde grep boş dönmeli.
- **Vite `.env` dev sunucuyu restart etmeden okunmuyor.**
- **Keycloak teknik rolleri** (`default-roles-*`, `offline_access`, `uma_authorization`) UI'da bilgi taşımaz — `selectPrimaryRole` ile atla.
- **DevTools Network paneli sadece AÇIKKEN kayıt yapar.** Sayfa DevTools'tan önce yüklendiyse ilk API çağrıları görünmez → `Ctrl+Shift+R` ile hard reload.
- **`Fetch/XHR` filtresi bazı istekleri gizler.** Tam resim için `All` filtresine geç.
- **Frontend bundle 1.78 MB.** Ankara localhost + LAN için tolere edilir.

### Git / commit hijyeni
- **`git commit -m` boş stage'de sessiz geçer.** `git status` ile kontrol et.
- **`git status` çıktısında ilk sütun stage, ikinci working tree.**
- **Windows CRLF/LF uyarısı zararsız** ama Ubuntu deploy'unda `.gitattributes` ile normalize et.
- **Uzun sohbette commit borcu birikirse mantıklı gruplara böl.**
- **`signal_code` yeniden adlandırma + tüketici güncellemesi AYNI commit'te olmalı.** Ayrı commit'lerde giderse arada bridge çözülemeyen kod yayınlar.

### Keycloak
- **Keycloak 24+: user attribute'leri için Unmanaged Attributes = Enabled olmalı.**
- **Keycloak 26 access token `aud` claim'i "account" gelir;** `KEYCLOAK_VERIFY_AUDIENCE=false` ile başla.
- **Realm export'unda nested `"id"` UUID'leri çakışır (409).** Regex ile temizle.
- **PowerShell `Invoke-RestMethod` string body default ISO-8859-1;** UTF-8 byte array yolla.
- **Keycloak `invalid_grant` = 4 sebep:** yanlış şifre, disabled user, required actions dolu, yanlış username. Teşhis için `curl.exe -X POST`.
- **Access Token Lifespan dev'de 5 dk default.**

### IU (Infinite Uptime) API
- **IU `/plants` boş dönerse** (`status:true, data:[]`) hesabın plant read yetkisi yok demek.
- **IU JWT 12 saatlik;** `exp - 60 sn` kalınca proaktif refresh.
- **IU `basic-features` dakikada 1, `computed-features` ~30 dakikada 1** (belge yanlış). Computed'de olay tetiklemeli ek kayıtlar giriyor.
- **IU `computed-features.timestamp` string olarak epoch ms** (`"1783937867000"`), ISO değil.
- **IU basic kod sözlüğü — Taha Bey yazılı teyidi (28 Tem):**
  - 0001 = toplam ivmenin **KARESİ** — `(m/s2)^2`. "g" DEĞİL, "m/s2" de DEĞİL. Ham değeri m/s2 diye saklamak her kaydı karesi kadar bozar.
  - 0002/0003/0004 = X/Y/Z ekseni titreşim **hız RMS** — `mm/s`. "İvme g" DEĞİL.
  - 0005 = sensör sıcaklığı — `degC`
  - 0006 = **akustik ses seviyesi** — `dB`. "Bearing sıcaklığı" DEĞİL; değer aralığından çıkarım (57-63 → °C sanıldı) yanıltıcıydı.
- **IU'da hazır threshold yok.** Otokar "alert list" tutuyor; threshold hesabı running-mode gözlemiyle manuel.
- **IU teknik konularında yetkili Ali Kemal Bey.** Mail açılışı: "Taha Bey yönlendirdi, ..."
- **Bridge `rows[-1]` tuzağı (29 Tem'de düzeltildi).** Her turda sadece son satırı almak, IU o dakika yeni kova kapatmadıysa satırı kalıcı olarak atlıyordu → KPI'da ~%12 gap. Doğrusu: son işlenen zaman damgasından **sonraki tüm satırları** yayınlamak. Çift yayın riski yok, worker `ON CONFLICT DO NOTHING` idempotent.
- **Bridge login döngüsü kusuru (AÇIK — yüksek öncelik).** `_ensure_token()` başarısız login'de exception atıyor, monitör döngüsü bunu yakalayıp devam ediyor → her monitör yeniden login deniyor. Dakikada 12 başarısız login; 7/24 systemd altında saatte 720. **Hesap kilitleme riski.**

### Dış sistem entegrasyonu (genel)
- **Sözlük varsayımlarını sistem sahibinden yazılı teyit al.** Değer aralıklarından çıkarım hızlı yanılır.
- **Uzun kesintiler donanım kaynaklı olabilir.** IU 8 gün kesintide "monitör arızası" çıktı.
- **Yetkili kişi zinciri kayıt altında olsun.**
- **Kimlik rotate iki adımlıdır** (kural 16). Tüketici config'i güncellenmezse hata gecikmeli patlar ve teşhisi zorlaşır.
- **Dış sistemin ritmini kendi metriğinle karıştırma** (kural 14).

### Diğer
- **Publisher payload sözleşmesi sabit.** IU bridge de aynı formatı takip eder. Worker dokunulmaz.
- **Worker payload'daki `unit` alanını yok sayar.** Birim yalnızca metadata; kaliteyi etkilemez.
- **`catalog.py` IU sinyallerini bilmez.** Tek kaynak migration'dır; "seed rerun" IU için no-op.
- **Sohbete şifre/token paylaşımı** — geçtiyse ilk fırsatta değiştir, sonra **tüketici config'ini de güncelle**.

---

## 6. BAĞLAM GÜNCELLEME RİTÜELİ

Her faz/önemli adım bitiminde:
1. `AI_CONTEXT.md` §8 (ilerleme) ve §10 (adım no) güncellenir.
2. Yeni kalıcı karar çıktıysa §4'e (ADR) eklenir.
3. Yeni tuzak öğrenildiyse bu dosyanın §5'ine eklenir.
4. Yeni bekleyen açık çıktıysa `AI_CONTEXT.md` §9'a eklenir.
5. Uzun sohbet sonunda §12'ye durum özeti bloğu eklenir.

Claude'dan istenebilir: *"AI_CONTEXT'i güncel duruma göre revize et"* → güncel sürümü üretir.

**Bir sonraki sohbete geçiş sinyali:**
- Kısa özet (ne yapıldı, hangi kararlar alındı)
- `AI_CONTEXT.md` §12 için durum özeti taslağı
- Bir sonraki sohbette başlangıç cümlesi + ilk 3 iş
- Bekleyen dış bağımlılık listesi (Taha, Ali Kemal, DEFTR IT, ekip)

---

## 7. HIZLI REFERANS: DOSYA-SORUMLULUK EŞLEŞMESİ

### Backend
| Dosya | Ne yapar | Değiştirmek için sebep |
|---|---|---|
| `app/main.py` | FastAPI app, router register, CORS, limiter | Yeni router, middleware |
| `app/core/config.py` | Settings (env → typed) | Yeni env değişkeni |
| `app/core/security.py` | JWT verify, `get_current_user`, `require_roles`, TenantCache, `is_admin()` | Auth mantığı |
| `app/core/authz.py` | MODULE_ROLES matrisi, `modules_for_roles()` | Yeni modül/rol izni |
| `app/core/limiter.py` | slowapi Limiter singleton | Rate limit |
| `app/routers/auth.py` | `/me`, `/me/admin-check` | Profil response şeması |
| `app/routers/timeseries.py` | `/timeseries`, `/signals` | Query API |
| `app/routers/kpi.py` | `/kpi/live` — lag p95, gap_rate, violations, event_count, quality_ok_pct | KPI formülü |
| `app/routers/stream.py` | `/stream/telemetry` (SSE) | SSE polling |
| `app/routers/assets.py` | `/assets` (auth + tenant filtreli) | Asset listeleme |
| `app/ingest/mqtt_worker.py` | MQTT subscribe + DB insert | Ingest logic |
| `app/ingest/resolver.py` | cache: `signal_code → {signal_id, unit, range_min, range_max, expected_rate_hz}` | Yeni kolon (Numeric → `float()` cast zorunlu) |
| `app/ingest/quality.py` | `compute_lag_seconds`, `delayed_threshold_for`, `classify` | Eşik politikası |
| `app/services/audit.py` | audit_event async insert | Audit alanı |
| `tools/otokar_iu_bridge.py` | IU → MQTT bridge; `BASIC_SIGNAL_MAP` + `COMPUTED_SIGNAL_MAP` + `ASSET_MONITOR_MAP` | IU payload/sözlük değişikliği |
| `tools/catalog.py` | 3 mock sinyal + asset katalog (⚠️ IU sinyalleri BURADA DEĞİL) | Mock sinyal değişikliği |
| `tools/seed.py` + `seed_test_tenants.py` | DB seed | Test verisi |
| `migrations/versions/0006_iu_unit_fix.py` | IU sözlük tashihi | — (uygulanmış, editlenmez) |

### Frontend
⚠️ Gerçek yapı `AI_CONTEXT.md` **§7**'de. Planlanan katmanlı mimari (config → transport → adapter → hook → container → view) **uygulanmadı**; `src/config/`, `src/hooks/`, `src/services/adapters/` klasörleri yok. Veri katmanı `services/*Backend.js` (mock) + `services/liveTelemetryApi.js` (gerçek transport).

---

## 8. ÖNEMLİ DIŞ BAĞIMLILIKLAR

| Kaynak | Beklediğimiz | Etki |
|---|---|---|
| **Taha (OTOKAR)** | Genel iletişim + IU akış durumu | ✅ 28 Tem: sözlük yazılı teyidi alındı (0001 = ivmenin karesi) |
| **Ali Kemal Bey (OTOKAR — IU sorumlusu)** | MOTOR_07 neden veri üretmiyor, threshold danışmanlığı, ham örnekleme frekansı | Faz 3. Mail: "Taha Bey yönlendirdi, ..." |
| **DEFTR IT** | Public statik IP + DNS (`matisse.deftr.com` A kaydı) + firewall 443 yönlendirme | Deploy TLS adımı. Cevap gelmezse plan B: LAN'da HTTP ile ilk kanıt. |
| **ZG** | Ankara sunucu OS/altyapı + SSH hazırlığı | ✅ Altyapı hazır; SSH kısmı SK deploy günü tamamlayacak |
| **DK** | Frontend mock katmanları | ✅ İnisiyatif SK'da |
| **Anthropic (Claude)** | Uzun sohbette context sınırı → yeni sohbet + AI_CONTEXT güncelleme | Süreklilik |

---

## 9. YENİ SOHBETE BAŞLAMA TALİMATI

**1. Bu iki dosyayı ek olarak yükle:** `AI_CONTEXT.md` + `AI_WORKING_PROTOCOL.md`

**2. İlk mesaj — kaldığın yeri net söyle.**

Deploy günü (30 Temmuz):
> *"CB-MDTM devam — 30 Tem, Ankara uzaktan deploy günü. Dün MVP sunumu yapıldı, IU zinciri uçtan uca canlı (sözlük 0006 ile tashihli, quality %100, gap %12.5). Bugün sadece kurulum: SSH → Docker Compose → migrations (0006 dahil) → Keycloak realm import → frontend build → nginx + systemd. AI_CONTEXT §11 takvim güncel."*

**İlk 3 iş:**
1. SSH erişimi (openssh-server + authorized_keys) — 20 dk
2. Docker Compose (PG + Keycloak) + `alembic upgrade head` + seed
3. Keycloak realm import + ilk gerçek login testi

Deploy sonrası / rapor dönemi:
> *"CB-MDTM devam — [tarih]. Ankara ayakta. Bugün [bridge login düzeltmesi / RUNBOOK / teknik rapor] üzerinde çalışıyoruz."*

**3. Kural:**
- Claude'a "bana özet ver" deme — dosyalarda zaten var.
- Çelişki varsa sohbetteki güncel durum kazanır.
- Sohbet sonunda özet + `AI_CONTEXT` güncelleme talebi.

**4. Deploy günü kritik hatırlatmalar:**
- `alembic upgrade head` → **0006 dahil** olmalı (`alembic current` ile teyit)
- Şifre resetlerinden sonra: **tüketici config güncelle + tek istekle doğrula** (kural 16). 28 Tem IU olayı: şifre 21 Tem'de rotate edildi, `.env` güncellenmedi, bridge 7 gün sessizce 401 aldı.
- **Bridge'i systemd'ye almadan önce login döngüsü kusurunu düzelt** (§5 IU bölümü) — 7/24 çalışacak, IU hesabı kilitlenmemeli.
- Frontend prod build sonrası `dist/assets/*.js` içinde `__store` grep'i boş dönmeli.
- Windows→Ubuntu geçişi: dosya adı case duyarlılığı kontrolü.

**5. İzin dönemi (7-15 Ağustos) öncesi tamamlanmalı:**
1. Ankara sunucusu ayakta ve kendi kendine toparlayabilir (systemd restart policy + bridge backoff doğrulanmış)
2. `deploy/RUNBOOK.md` — DK/ZG'nin SK olmadan müdahale edebileceği detayda
3. 2 teknik rapor teslim
4. Bridge login döngüsü kusuru kesinlikle düzeltilmiş
