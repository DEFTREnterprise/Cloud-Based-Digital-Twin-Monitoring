# AI_WORKING_PROTOCOL.md — CB-MDTM Çalışma Protokolü

> **Bu dosya nedir?** Claude'un CB-MDTM projesinde nasıl davranacağını tanımlayan kalıcı talimat setidir.
> `AI_CONTEXT.md` ile birlikte yeni sohbete eklenir. `AI_CONTEXT.md` = "ne yaptık/nerede kaldık",
> bu dosya = "nasıl çalışıyoruz".

---

## 1. SOHBETE NASIL DEVAM EDİLİR

Yeni bir sohbet açtığında:
1. `AI_CONTEXT.md` + `AI_WORKING_PROTOCOL.md` dosyalarını ekle.
2. İlk mesajda kaldığın adımı söyle. Örnek: *"AI_CONTEXT'teki ADIM 15'ten devam. Keycloak ZIP'i C:\keycloak'a açtım, kc.bat start-dev çıktısı şu: ..."*
3. Claude bağlamı bu iki dosyadan yükler, gereksiz tekrar sormaz, doğrudan kaldığın adımdan devam eder.

**Önemli:** Bu dosyaları eke koymak Claude'u şaşırtmaz; tam tersine tek doğru bağlam kaynağıdır.
Dosyalardaki bilgi ile sohbetteki güncel durum çelişirse → **sohbetteki güncel durum kazanır** (dosya o noktada güncellenmeli).

---

## 2. CLAUDE'UN DAVRANIŞ KURALLARI (bu projede)

Bu projede başarılı olmuş çalışma tarzı — aynen sürdürülecek:

1. **Adım adım, tek seferde tek somut iş.** Her adım numaralı (ADIM N). Bir adım bitmeden sonrakine geçme; kullanıcının çıktıyı paylaşmasını bekle.

2. **Komutlar Windows PowerShell formatında, kopyala-yapıştır hazır.** Tam yollar açık (örn. `& "C:\Program Files\PostgreSQL\17\bin\psql.exe"`).

3. **Kod verirken: tam dosya yolu + dosyanın tamamı veya net "şu satırı şununla değiştir" talimatı.** Kullanıcı kodu yapıştırıp çalıştırabilmeli.

4. **Şema/kolon adı varsayma.** `AI_CONTEXT.md` §5'teki gerçek adları kullan. Emin değilsen önce `\d tablo` ile doğrulat, sonra kod yaz. (Bu projede "column does not exist" hataları hep varsayımdan çıktı.)

5. **Her kod parçası için kısa "ne yapıyor, neden böyle" açıklaması.** Ekip teknolojiye yeni; somut kütüphane/komut düzeyinde anlat.

6. **Her adımdan sonra doğrulama komutu/testi ver.** Çıktının ne olması gerektiğini önceden söyle ("beklenen: ...").

7. **Çakışma/risk tespit edince önce uyar, sonra çöz.** (Örn. ZG'nin şeması DK ile çakışıyordu — önce işaretlendi, sonra adapte edildi.)

8. **Mimari kararlarda kısa gerekçe + ileriye etki.** Kullanıcı "bu production'ı etkiler mi?" diye sorabiliyor; kontrat/izolasyon perspektifinden cevapla.

9. **Türkçe, net, gereksiz uzatmadan.** Övgü/dolgu minimum; teknik öz maksimum.

---

## 3. GÖREV DAĞILIMI (efor: SK %50 / DK %25 / ZG %25)

- **SK (ana sorumlu):** Yüksek know-how — worker çekirdeği, JWT/OIDC, deployment, güvenlik, mimari kararlar, yük testi liderliği.
- **DK (destek):** Net kapsamlı/şablonlu — DB migration, seed, mock publisher, Keycloak rol/tenant formları (arayüzden), smoke test.
- **ZG (destek):** Sınırlı kapsamlı API — Query/SSE/KPI uçları, dependency şablonu (SK temeli üzerine), MinIO/upload.
- **Ortak (TÜM) görevlerde liderlik daima SK'de.** DK/ZG kendi katman adımlarını koşar; know-how karmaşası yaratılmaz.

**Entegrasyon paterni:** DK/ZG bağımsız kaynak üretir (kendi klasörlerinde) → SK bunları
`AI_CONTEXT.md` §3 klasör yapısına ve §5 gerçek şemaya **adapte ederek** entegre eder.
ZG'nin kendi database.py/models'i KULLANILMAZ; sadece router/sorgu mantığı alınıp DK şemasına uyarlanır.

---

## 4. BİLEŞENLERİ ÇALIŞTIRMA (referans komutlar)

Hepsi `backend` klasöründe, venv aktif (`.\.venv\Scripts\Activate.ps1`). Her biri AYRI pencerede, paralel:

```powershell
# 1) API sunucusu
uvicorn app.main:app --reload --port 8000

# 2) MQTT broker
& "C:\Program Files\mosquitto\mosquitto.exe" -c "C:\Program Files\mosquitto\cbmdtm.conf" -v

# 3) Ingest worker
python -m app.ingest.mqtt_worker

# 4) Mock publisher (test verisi)
cd tools; python mock_otokar_publisher.py --duration 30; cd ..

# Seed (gerekirse)
cd tools; $env:DATABASE_URL=(Get-Content ..\.env | Select-String '^DATABASE_URL=' | %{$_.ToString().Split('=',2)[1]}); python seed.py; cd ..

# Migration
alembic upgrade head        # uygula
alembic current             # mevcut sürüm
```

**Uçtan uca SSE testi sırası (kritik):** broker → worker → tarayıcıda `/api/v1/stream/telemetry` AÇ → publisher.
(Tarayıcı publisher'dan ÖNCE açılmalı; SSE sadece bağlandıktan sonrasını yayınlar.)

**Doğrulama:**
```powershell
(Invoke-WebRequest "http://localhost:8000/health").Content
(Invoke-WebRequest "http://localhost:8000/api/v1/kpi/live").Content
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d cbmdtm -c "SELECT count(*) FROM telemetry_measurements;"
```

---

## 5. SIK KARŞILAŞILAN TUZAKLAR (öğrenilmiş dersler)

- **venv taşınmaz.** Klasör adı değişirse venv'i sil + yeniden kur (mutlak yol gömülü).
- **asyncpg NULL-tip katı.** `(:param IS NULL OR col=:param)` deseni patlar → sorguyu filtreli/filtresiz ikiye ayır.
- **TimescaleDB policy'leri transaction'da çalışmaz.** Migration'da `op.get_context().autocommit_block()` kullan.
- **Windows shared memory.** `shared_buffers` 1GB (8GB değil).
- **Türkçe locale i/I tuzağı.** PostgreSQL locale=C.
- **psql araçları sessizdir.** Başarılı işlem çıktı vermez; hata varsa konuşur.
- **Alembic asyncpg kullanamaz.** Migration psycopg2 ile (env.py'de düz DATABASE_URL).
- **catalog.py tek kaynak.** Seed ile mock publisher'ın sinyal tanımı senkron olmalı.
- Keycloak 24+: user attribute'leri için Realm settings → Unmanaged Attributes = Enabled olmalı, yoksa UI'da Attributes sekmesi gözükmez.
- Keycloak 26 access token aud claim'i "account" gelir; KEYCLOAK_VERIFY_AUDIENCE=false ile başlamak (audience mapper eklenince true'ya).
- FastAPI yeni sürümlerde include_router → _IncludedRouter (path attribute yok); route introspection için openapi.json daha güvenilir.
- PowerShell heredoc çıktısını .env'e komutla yazarken, komutun KENDİSİNİ .env'e yazmamak için scripti PowerShell'de çalıştır, .env içine yapıştırma.
- Alembic revision -m "..." rastgele hash'li dosya oluşturur; 000N stili için Rename-Item ile "0003_xxx.py" olarak yeniden adlandır.
- Audit yazımı best-effort olmalı (async DB insert); DB down'da API 500 vermez, log.warning düşer.
- FastAPI Depends dependency'lerinde `request: Request` parametresi otomatik enjekte olur — Depends yazma.
- FastAPI + slowapi limiter'ı main.py'de tanımlayıp router'lardan import etmek circular import verir.
  Çözüm: limiter'ı app/core/limiter.py'ye çıkar, hem main.py hem router'lar oradan import etsin.
  - Pydantic v2 list[str] alani .env'de virgulle ayrilmis string ile calismaz; validator once JSON parse denenir. Cozum: raw string olarak sakla, property ile list expose et.
- Alembic revision hash sonrasi dosya rename yaptin ama icerideki revision = "..." stringini degistirmezsen DB tarafinda hayali hash olusur. Alembic dosya adina degil, ic string'e bakar.
- SQL string manipulation ile filtre insa etmek fragile — .replace('tenant_id', 'tm.tenant_id') gibi cambazliklar bind parameter'lari da bozar. Iki ayri asset_filter / asset_filter_aliased degiskeni tutmak daha guvenli.
- KPI window default 1 saat — DB verisi eskiyse event_count=0 dogru. window_hours parametresiyle test et.
- Keycloak realm export'unda tum nested "id" alanlari UUID; farkli Keycloak instance'a import ederken cakisir (409). Regex ile temizle: '"id":"<uuid>"' kaldir, Keycloak yeni UUID atar.
- PowerShell Invoke-RestMethod string body'i default'ta ISO-8859-1'e cevirir; Keycloak UTF-8 bekler. Cozum: [System.Text.Encoding]::UTF8.GetBytes($string) ile byte array yolla.
- IU (Infinite Uptime) API kesfinde: /plants bos donerse (status:true, data:[]) hesabin plant read yetkisi yok demek — endpoint patlamaz, "success ama bos" doner. Login basarili + veri bos = yetki eksik senaryosu, karistirilmasin.
- JWT/access token'i paylasirken exp'sine dikkat: IU token'i 12 saatlik; sohbete yapistirilirsa kim aliyorsa istek atabilir. .gitignore'a iu_*.json ekli olsun.

- Tarayici EventSource API custom header desteklemez; SSE'ye JWT eklemek icin ya (a) query parametre ile token ya (b) event-source-polyfill npm paketi gerekir. Biz (b) sectik cunku token URL'de gorunmez.
- Backend + frontend modul id senkronizasyonu kritik: iki tarafin ayni id'yi kullanmasi gerek. Semantik id (frontend kolaylik) referans, backend authz.py bunla hizali olmali.
- assets endpoint gibi "listeleme" endpoint'lerinde tenant filtresi unutmak kolay — asset_id UUID'ler bile sizinti sayilir (baska tenant hedefli sorgu icin materyal).
- Keycloak-js check-sso modu router olmadan calisir; PKCE redirect URL parametrelerini kendisi temizler. Basit dashboard'da router eklemek gereksiz overhead.
- LoginPage tasarimi guzelse mock yerine "Sign in with Keycloak" butonuna donusuyor — form kaybolur, buton kalir. Kullanici Keycloak login sayfasina yonlendirilir.
---

## 6. BAĞLAM GÜNCELLEME RİTÜELİ

Her faz/önemli adım bitiminde:
1. `AI_CONTEXT.md` §7 (ilerleme) ve §9 (adım no) güncellenir.
2. Yeni kalıcı karar çıktıysa §4'e (ADR) eklenir.
3. Yeni tuzak öğrenildiyse bu dosyanın §5'ine eklenir.

Claude'dan istenebilir: *"AI_CONTEXT'i güncel duruma göre revize et"* → güncel sürümü üretir.
