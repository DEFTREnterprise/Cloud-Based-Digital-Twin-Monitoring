\# Keycloak realm export — `cbmdtm`



Bu klasor CB-MDTM'in Keycloak realm konfigurasyonunu tutar. \*\*Kullanicilar

DAHIL DEGIL\*\* — kullanicilar prod ortaminda partner mailleri geldikten sonra

gercek isimlerle olusturulur.



\## Icerik



\- `cbmdtm-realm.json` — Realm ayarlari, roller, client, mapper (Keycloak

&#x20; 26.6.3'ten export edildi)



\## Ne iceriyor



\- Realm meta (accessTokenLifespan=300s, ssoSessionMax=36000s, sslRequired=external)

\- 3 realm rolu: `OTOKAR\_Viewer`, `DEFTR\_Admin`, `ESOGU\_Operator`

\- 1 client: `cbmdtm-frontend` (public, PKCE S256, standard flow)

\- 1 protocol mapper: `tenant\_code` (user attribute -> access/id/userinfo token)

\- Keycloak sistem client'lari (account, admin-cli vb.) — dokunulmadi



\## Ne icermiyor



\- Kullanicilar (`--users skip` ile export edildi)

\- Client secret'lar (bizim public client'imizda zaten yok)



\## Prod'a import ederken degistirilecek alanlar



`cbmdtm-frontend` client'inda dev hostname'leri var:



\- `redirectUris`: `http://localhost:5173/\*` -> prod URL'i (ornek: `https://cbmdtm.deftr.com.tr/\*`)

\- `webOrigins`: `http://localhost:5173`   -> prod URL'i (ornek: `https://cbmdtm.deftr.com.tr`)



Bu alanlar JSON icinde elle degistirilir; import sonrasi UI'dan da patch

edilebilir. \*\*En temizi import ONCESI JSON'da duzeltmek\*\* (unutulmaz).



\## Import — Ankara sunucu kurulumu sonrasi



\### Yontem 1: kc.sh CLI (Keycloak durdurulmus olmali)



```bash

/opt/keycloak/bin/kc.sh import \\

&#x20;   --file /path/to/cbmdtm-realm.json \\

&#x20;   --override false

```



`--override false` -> Ayni isimde realm varsa import iptal (yanlislikla ustune yazma yok).



\### Yontem 2: Admin REST API (Keycloak canli, downtime yok)



\*\*Onemli:\*\* Export'ta her kaynagin (rol, mapper, client scope) kendi UUID'si var.

Yeni Keycloak instance'a import ederken bu UUID'ler global namespace'te

catisirsa `409 Duplicate resource error` alirsin. Cozum: Import ONCESI JSON'daki

tum nested `"id"` alanlarini sil — Keycloak yeni UUID atar.



PowerShell (Windows) veya bash (Linux) — mantik ayni:



```powershell

\# Ham JSON'u oku

$raw = Get-Content .\\cbmdtm-realm.json -Raw



\# TUM nested "id":"<uuid>" alanlarini kaldir (kokteki realm.id de dahil,

\# gerekirse tekrar ekle)

$raw = $raw -replace '"id"\\s\*:\\s\*"\[0-9a-f]{8}-\[0-9a-f]{4}-\[0-9a-f]{4}-\[0-9a-f]{4}-\[0-9a-f]{12}"\\s\*,', ''

$raw = $raw -replace ',\\s\*"id"\\s\*:\\s\*"\[0-9a-f]{8}-\[0-9a-f]{4}-\[0-9a-f]{4}-\[0-9a-f]{4}-\[0-9a-f]{12}"', ''



\# UTF-8 byte olarak POST et (encoding tuzagi)

$bytes = \[System.Text.Encoding]::UTF8.GetBytes($raw)

Invoke-RestMethod -Method POST `

&#x20;   -Uri "https://<PROD\_HOSTNAME>/admin/realms" `

&#x20;   -Headers @{

&#x20;       "Authorization" = "Bearer <ADMIN\_TOKEN>"

&#x20;       "Content-Type"  = "application/json; charset=utf-8"

&#x20;   } `

&#x20;   -Body $bytes

```



Linux/bash icin `jq` ile temizleme:



```bash

\# Nested id alanlarini kaldir (kokteki realm/id disinda)

jq 'walk(if type == "object" and has("id") and (.id | test("^\[0-9a-f-]{36}$")) then del(.id) else . end)' \\

&#x20;   cbmdtm-realm.json > cbmdtm-realm-clean.json



\# Import

curl -X POST "https://<PROD\_HOSTNAME>/admin/realms" \\

&#x20;   -H "Authorization: Bearer <ADMIN\_TOKEN>" \\

&#x20;   -H "Content-Type: application/json; charset=utf-8" \\

&#x20;   --data-binary @cbmdtm-realm-clean.json

```



\## Prod'da patch — realm import'tan ONCE JSON'da degistirilecek alanlar



`cbmdtm-frontend` client'inda dev hostname'leri var:



\- `redirectUris`: `http://localhost:5173/\*` -> `https://cbmdtm.deftr.com.tr/\*`

\- `webOrigins`:   `http://localhost:5173`   -> `https://cbmdtm.deftr.com.tr`



En temizi import ONCESI JSON'da duzeltmek — dogrudan text editor ile veya

sed/PowerShell replace ile:



```powershell

$raw = $raw -replace 'http://localhost:5173', 'https://cbmdtm.deftr.com.tr'

```

\## Re-export prosedurü (kod tarafinda realm degisirse)



Keycloak UI'da yeni rol/client/mapper eklediysen bu dosyayi guncellemek zorundasin.

Yoksa Ankara ile local farkli olur, sonra bug ariyoruz.



1\. Keycloak'i durdur: `Ctrl+C` (start-dev penceresinde)

2\. Export cek:

```powershell

&#x20;  \& C:\\keycloak\\bin\\kc.bat export --dir C:\\keycloak-export --realm cbmdtm --users skip

```

3\. Yeni dosyayi buraya kopyala: `Copy-Item C:\\keycloak-export\\cbmdtm-realm.json .\\deploy\\keycloak\\cbmdtm-realm.json -Force`

4\. Git diff'e bak, degisiklikleri commit et

5\. Keycloak'i geri baslat



\## Sanitize kontrol (her export sonrasi)



Export sonrasi bu 3 kontrolu yap (README'nin altina git):



\- Kullanici alani bos mu? `--users skip` unutulmusa olur.

\- Client secret var mi? Public client'ta olmamali.

\- `directAccessGrantsEnabled` false mu? Test icin ON'a alip OFF'a almay

&#x20; unuttuysan burda kalir.

