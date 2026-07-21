\# ADR-003: Dagitim paketleme modeli — Karma (Docker + systemd)



\*\*Durum:\*\* Kabul edildi

\*\*Tarih:\*\* 6 Temmuz 2026

\*\*Karar veren:\*\* Serhat Kahraman (DEFTR)

\*\*Iliski:\*\* K3 (Docker'siz baslangic), Faz 3 Ankara deployment



\## Baglam



CB-MDTM sistemi Ankara sunucusuna 20 Temmuz'da deploy edilecek. Sunucu su

an bos — sifirdan kurulacak. Local (Windows) gelistirme ortaminda su bilesenler

calisiyor: PostgreSQL 17 + TimescaleDB, Keycloak 26, Mosquitto, FastAPI API,

ingest worker, mock publisher.



Deployment mimarisi icin uc secenek degerlendirildi:

\- A) systemd + venv (Docker yok)

\- B) Docker Compose (her sey container)

\- C) Karma (bazi bilesenler Docker, bazilari systemd)



\## Karar



\*\*Karma model secildi.\*\*



\### Docker container olarak calisacak bilesenler

\- \*\*PostgreSQL 17 + TimescaleDB\*\* — resmi image `timescale/timescaledb:2.27.1-pg17`

\- \*\*Keycloak 26\*\* — resmi image `quay.io/keycloak/keycloak:26.6.3`

\- \*\*Redis\*\* (Faz 3, rate-limit backend'i icin) — resmi image `redis:7-alpine`

\- \*\*Mosquitto\*\* — resmi image `eclipse-mosquitto:2.1.2`



\*\*Sebep:\*\* Bu bilesenler hazir, versiyonlanmis, resmi image olarak var. Local

ile Ankara arasinda tam versiyon esitligi kritik; container tag'i bunu garanti

eder. Upgrade path: `image tag` degistir + `docker compose up -d`.



\### systemd altinda calisacak bilesenler

\- \*\*FastAPI API\*\* (uvicorn)

\- \*\*Ingest worker\*\* (mqtt\_worker.py)

\- \*\*nginx\*\* (TLS terminasyonu + reverse proxy)



\*\*Sebep:\*\* Kendi kodumuz; log'a direkt bakmak (`journalctl -u cbmdtm-api -f`),

crash'te hizli debug, deploy'da kolay guncelleme (`git pull` + `systemctl

restart`). Container'lastirmak overhead disinda katkida bulunmuyor cunku bu

kodlar zaten venv'de izole.



\## Sonuclar



\### Olumlu

\- Ankara + local versiyon esitligi garanti (PG/Keycloak/Redis image tag'i)

\- Kendi kodumuzun debug hizi korunuyor (systemd + journalctl)

\- Partner DT container'lari (Faz 4 hedefi) icin Docker altyapisi zaten hazir —

&#x20; ayni network'e katilirlar

\- Reboot / crash sonrasi otomatik toparlanma iki yolla da calisir (Docker

&#x20; restart policy + systemd Restart=always)



\### Olumsuz (kabul edilen)

\- Iki deployment modeli var — runbook iki bolumlu, ogrenme yuku orta

\- Container-systemd arasi ag config'i planlanmali (Docker network mode:

&#x20; host, ya da localhost port expose)

\- Backup iki katmanli — PG icin container volume'unden pg\_dump, kod icin git



\### Faz 4 hazirligi

Partnerlerin (OTOKAR PdM, ESOGU TPT vb.) DT solution container'lari geldiginde

ayni `docker-compose.yml`'e yeni service olarak eklenirler. Ayni Docker network'unde

PostgreSQL/Keycloak'a hostname ile erisirler.



\## Ankara sunucusu on gereksinimleri



Sifirdan kurulum — Ankara ekibi/DEFTR IT tarafindan yapilacak:

\- Ubuntu 22.04 LTS (veya benzeri modern Linux)

\- Docker Engine + Docker Compose plugin (`apt install docker.io docker-compose-plugin`)

\- Python 3.11 + venv (`apt install python3.11 python3.11-venv`)

\- nginx (`apt install nginx`)

\- git

\- SSH erisimi DEFTR ekibine (SK + DK + ZG public key'leri)

\- Firewall: 22 (SSH), 80/443 (HTTPS), 8883 (MQTT/TLS Faz 3)

\- Kalici disk: minimum 100GB (telemetri 90 gun retention + audit + Keycloak)



\## Sunucu donan\\u0131m\\u0131 (temin edildi)



\- \*\*Model:\*\* Dell Pro Max T2 Ultra 9 285

\- \*\*CPU:\*\* Intel Core Ultra 9 285 (24 core)

\- \*\*RAM:\*\* 32 GB

\- \*\*Disk:\*\* 1 TB NVMe SSD

\- \*\*GPU:\*\* NVIDIA RTX 4000 Ada (20 GB) — Faz 4 PdM/TPT inference i\\u00e7in rezerv

\- \*\*OS:\*\* Ubuntu 22.04 LTS (Windows 11 Pro ile geldi; \\u00fczerine kurulacak)



Kaynak analizi:

\- PostgreSQL 8GB, Keycloak 4GB, FastAPI+worker 4GB, sistem 4GB \\u2014 12GB rezerv

&#x20; Faz 4 Prometheus/Grafana/OpenSearch icin rahat yer var

\- Disk: 90 g\\u00fcn RAW telemetri + audit + log rotation icin fazla fazla yeter

\- CPU: tek node icin bol; scaling gerekmiyor MVP'de



\*\*Ankara IT'den istenen bilgi:\*\* sunucu spec (CPU/RAM), IP, hostname, DNS

kaydi, TLS sertifikasi (Let's Encrypt mi, kurumsal CA mi).

