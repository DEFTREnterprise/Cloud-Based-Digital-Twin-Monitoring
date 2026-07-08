# Canlı Veri Entegrasyon Kılavuzu (Frontend ↔ Backend)

Bu kılavuz iki şeyi anlatır:

1. **Uçtan uca demoyu nasıl çalıştırırsın** (mock veri üreteci → MQTT → ingest worker → TimescaleDB → FastAPI → React arayüzü).
2. **Gelecekte yeni bir veri türünü arayüze nasıl bağlarsın** (adım adım, hangi dosyaya ne eklenir).

> **Frontend mimarisinin güncel ve ayrıntılı açıklaması** (katman modeli,
> adapter/config/composite-hook yapısı, standart geliştirme reçeteleri) için
> bkz. **`FRONTEND-ARCHITECTURE.md`**. Frontend tarafında geliştirme
> yapacaksanız güncel referans o dokümandır.

---

## 1. Mimari Genel Bakış

```
mock_otokar_publisher.py ──MQTT──► Mosquitto ──► mqtt_worker.py ──► TimescaleDB
                                                                        │
                              ┌─────────────────────────────────────────┤
                              │  FastAPI (backend/app)                  │
                              │   GET /health                           │
                              │   GET /api/v1/assets      (varlıklar)   │
                              │   GET /api/v1/signals     (katalog)     │
                              │   GET /api/v1/kpi/live    (KPI'lar)     │
                              │   GET /api/v1/timeseries  (tarihsel)    │
                              │   GET /api/v1/stream/telemetry  (SSE)   │
                              └───────────────┬─────────────────────────┘
                                              │ HTTP + SSE
                              ┌───────────────▼─────────────────────────┐
                              │  React Frontend (frontend/src)          │
                              │                                         │
                              │  services/liveTelemetryApi.js  ← API katmanı (HTTP/SSE)
                              │  hooks/useLiveTelemetry.js     ← State katmanı (tampon/polling)
                              │  components/LiveMonitoring/    ← Görünüm katmanı
                              │    LiveMonitoring.jsx          ← Orkestratör (container)
                              └─────────────────────────────────────────┘
```

### Frontend katman mimarisi (önemli!)

Canlı veri entegrasyonu üç katmanla yapılır; bileşenler (View) asla doğrudan
API çağırmaz:

| Katman | Dosya | Sorumluluk |
|---|---|---|
| **API** | `frontend/src/services/liveTelemetryApi.js` | Tüm HTTP/SSE çağrıları tek yerde. Backend kontratı değişirse yalnızca burası değişir. |
| **State (Hooks)** | `frontend/src/hooks/useLiveTelemetry.js` | Polling, SSE aboneliği, kayan pencere tamponu, yükleme/hata durumları. |
| **Orkestrasyon** | `frontend/src/components/LiveMonitoring/LiveMonitoring.jsx` | Hook'ları çağırır, veriyi görünüm modeline çevirir, alt bileşenlere **prop** olarak dağıtır. |
| **Görünüm** | `KPICards.jsx`, `TimeSeriesWidgets.jsx`, `DataQualityIndicator.jsx`, `DTSelector.jsx` | Sadece prop'ları çizer. `liveMode` kapalıyken mock servislerle çalışmaya devam eder. |

### Hangi modüller canlı veriye bağlandı, hangileri bağlanmadı ve neden?

Backend'in mock üreteci yalnızca **motor telemetrisi** (`temperature`, `vibration`,
`speed` — 12 motor) ve bundan türeyen KPI'ları sağlar. Bu nedenle:

- ✅ **Live Monitoring** modülü canlıya bağlandı (DT Selector'da **"Otokar Core (Live)"** seçeneği):
  - **DT Selector** → `/api/v1/assets` (MOTOR_01..12 listesi)
  - **KPI Cards** → `/api/v1/kpi/live` (5 sn'de bir yenilenir)
  - **Data Quality Indicator** → `/api/v1/kpi/live` + SSE bağlantı durumu
  - **Time Series Widgets (Live)** → `/api/v1/stream/telemetry` (SSE, kayan pencere)
  - **Time Series Widgets (History)** → `/api/v1/timeseries` (1m aggregate bucket)
- ❌ **PdM, TPT, ESOGU DT, Platform, System Settings** modülleri mock'ta bırakıldı,
  çünkü backend'de bu modüllerin beklediği veriler (alarm/anomali skorları,
  trajectory run'ları, test yaşam döngüsü, servis/ingest sağlık ayrıntıları,
  audit log vb.) mevcut değil. Backend bu verileri sunmaya başladığında
  aşağıdaki "Yeni veri türü bağlama" adımları aynen uygulanabilir.

---

## 2. Uçtan Uca Demoyu Çalıştırma

### Ön koşullar

- **PostgreSQL + TimescaleDB** eklentisi (DB adı: `cbmdtm`)
- **Mosquitto** MQTT broker (varsayılan port 1883)
- **Python 3.11+** (backend/venv) ve **Node 18+**

### Adım 1 — Veritabanı ve şema

```bash
cd backend
# .env dosyasındaki DB_* değerlerini kendi ortamına göre düzenle (bkz. .env.example)
venv\Scripts\activate           # Windows (Linux/macOS: source venv/bin/activate)
alembic upgrade head            # tabloları + continuous aggregate'leri oluşturur
python tools/seed.py --database-url postgresql://postgres:<ŞİFRE>@localhost:5432/cbmdtm
```

`seed.py`, `tools/catalog.py`'deki referans veriyi yükler: 1 tenant, 1 DT,
3 sinyal ve 12 motor. **Sinyal/motor eklemek istersen tek dokunacağın yer
`catalog.py`'dir** (sonra seed'i tekrar çalıştır).

### Adım 2 — MQTT broker + ingest worker

```bash
# Mosquitto'yu başlat (servis olarak kuruluysa zaten çalışıyordur)
mosquitto -v

# Ayrı bir terminalde worker'ı başlat (MQTT → DB yazıcı)
cd backend
venv\Scripts\activate
python -m app.ingest.mqtt_worker
# Ortam değişkenleri: MQTT_HOST, MQTT_PORT, MQTT_TOPIC (varsayılan: factory/+/+/telemetry)
```

### Adım 3 — Mock telemetri üreteci

```bash
cd backend
venv\Scripts\activate
python tools/mock_otokar_publisher.py --broker localhost --motors 12 --rate 1
# Auth açıksa: --username <kullanıcı> --password <şifre>
```

### Adım 4 — FastAPI backend

```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

Kontrol: `http://localhost:8000/health` → `{"status":"ok", ...}` ve
`http://localhost:8000/api/v1/assets` → 12 motorluk liste dönmeli.

> **CORS notu:** `app/main.py` yalnızca `http://localhost:5173` origin'ine izin
> verir. Frontend'i farklı bir portta çalıştırırsan buraya eklemen gerekir.

### Adım 5 — Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Backend farklı bir adresteyse: `frontend/` içinde `.env` dosyası oluşturup
`VITE_API_BASE_URL=http://<host>:<port>` tanımla (varsayılan `http://localhost:8000`).

### Adım 6 — Demoyu görme

1. Arayüzde **Live Monitoring** modülüne git.
2. DT Selector'da sırasıyla: **Digital Twin = "Otokar Core (Live)"** →
   DT System → Robot Asset → **Subsystem = MOTOR_XX** (backend'den gelen gerçek
   liste) → **Signal Set = "Live Telemetry (Backend)"**.
3. **Start Stream**'e bas:
   - KPI kartları `/api/v1/kpi/live`'dan dolar (lag p95, gap rate, ihlal sayısı,
     event count, kalite %).
   - Zaman serisi grafikleri SSE akışıyla saniye saniye ilerler
     (temperature / vibration / speed, warn-critical eşikleriyle).
   - Data Quality çubuğu bağlantı/kalite durumunu gösterir.
4. Time Series başlığındaki **History** düğmesiyle tarihsel moda geçilebilir
   (PdM drill-through bir zaman penceresi sağlar; `/api/v1/timeseries` 1m
   bucket'ı sorgulanır).

> Mock üreteç ara ara **spike/drift anomalileri** enjekte eder; grafiklerde
> eşik aşımı (WARN/CRIT rozetleri) ve KPI'da threshold violation artışı olarak
> gözlemlenebilir.

---

## 3. Yeni Bir Veri Türünü Arayüze Bağlama (Reçete)

Örnek senaryo üzerinden: motorlara **`pressure`** sinyali eklemek ya da
backend'e **yeni bir endpoint** (ör. alarm listesi) gelmesi.

### Durum A — Mevcut telemetri hattına yeni SİNYAL eklemek

Bu durumda frontend'e **hiç dokunman gerekmez**; arayüz sinyal kataloğunu
dinamik okur.

1. `backend/tools/catalog.py` → `SIGNALS` listesine yeni `SignalDef` satırı ekle
   (birim, range, warn/critical, sim parametreleri).
2. `python tools/seed.py ...` çalıştır (idempotent; mevcut kayıtları günceller).
3. `backend/tools/mock_otokar_publisher.py` → `CATALOG` listesine aynı kodla bir
   `SignalSpec` ekle (gerçek kaynak geldiğinde bu adım kalkar).
4. Üreteci ve worker'ı yeniden başlat. **Bitti** — yeni sinyal
   `/api/v1/signals`'da görünür, SSE'de akar ve Live Monitoring'de otomatik
   olarak yeni bir grafik kartı oluşur (eşik çizgileri dahil).

### Durum B — Backend'e yeni bir ENDPOINT / veri türü gelmek

Sıra hep aynıdır: **1) API fonksiyonu → 2) Hook → 3) Orkestratör → 4) Görünüm prop'u**

1. **Backend** (gerekiyorsa): `backend/app/routers/` altına yeni router dosyası
   yaz, `app/main.py`'de `app.include_router(...)` ile kaydet.
   Örnek şablon: `backend/app/routers/assets.py` (bu entegrasyonda eklendi).

2. **API katmanı**: `frontend/src/services/liveTelemetryApi.js` içine fetch
   fonksiyonunu ekle:

   ```js
   export const fetchAlarms = async (assetId) => {
       const { data } = await api.get('/api/v1/alarms', { params: { asset_id: assetId } });
       return data;
   };
   ```

3. **Hook katmanı**: `frontend/src/hooks/useLiveTelemetry.js` içine bir hook ekle.
   - Tek seferlik veri → `useLiveCatalog` desenini kopyala.
   - Periyodik yenilenen veri → `useLiveKpi` desenini kopyala (polling).
   - Sürekli akış (SSE) → `useTelemetryStream` desenini kopyala
     (backend'de yeni bir `event:` tipi tanımlanırsa `openTelemetryStream`'e
     yeni bir `addEventListener` eklenir).

4. **Orkestratör**: `LiveMonitoring.jsx` (veya ilgili modülün container'ı,
   ör. `PdmModule.jsx`) içinde hook'u çağır, gerekiyorsa görünüm modeline
   çevir ve hedef bileşene **prop** olarak geçir:

   ```jsx
   const { alarms } = useLiveAlarms(liveAsset?.asset_id, liveActive);
   ...
   <AlarmWall liveMode={isLive} liveAlarms={alarms} />
   ```

5. **Görünüm bileşeni**: bileşene `liveMode` + `liveXxx` prop'ları ekle ve mock
   yolunu bozmadan koşullu kullan (mevcut örnekler: `KPICards.jsx` →
   `buildLiveKpiCards`, `TimeSeriesWidgets.jsx` → `signal.points`,
   `DataQualityIndicator.jsx` → `liveMetrics`):

   ```jsx
   const mockData = useMemo(() => fetchMockAlarms(...), [...]);  // hook'lar koşulsuz çağrılır
   const data = liveMode ? (liveAlarms || []) : mockData;
   ```

6. **Doğrulama**: `npm run build` ile derle; tarayıcı konsolunda `[API]`
   loglarını ve Network sekmesinde SSE bağlantısını (`stream/telemetry`)
   kontrol et.

### Altın kurallar

- **Bileşen içinden asla doğrudan `axios`/`fetch` çağırma** — her çağrı
  `liveTelemetryApi.js`'ten geçmeli.
- **Mock yolunu silme, koşullandır**: `liveMode` false iken eski davranış
  birebir korunur; böylece backend kapalıyken de arayüz gezilebilir kalır.
- **UUID ↔ kod eşlemesi**: SSE ve timeseries uç noktaları UUID döner. İnsan
  okur adlar için `/api/v1/assets` ve `/api/v1/signals` kataloglarını yükleyip
  eşleme yap (bkz. `useLiveCatalog` → `signalsById`).
- **React hook kuralları**: `useMemo`/`useEffect` koşullu çağrılamaz; "canlı mı
  mock mu" seçimini hook çağrısından **sonra** yap.
- **SSE kontratı sabittir** (`{"asset_id","signal_id","ts","value","quality"}`);
  backend ileride Redis pub/sub'a geçse bile frontend değişmez.

---

## 4. Bu Entegrasyonda Değişen / Eklenen Dosyalar

| Dosya | Değişiklik |
|---|---|
| `backend/app/routers/assets.py` | **YENİ** — `GET /api/v1/assets` (UUID → MOTOR_XX eşlemesi) |
| `backend/app/main.py` | `assets` router kaydı + yinelenen import/include temizliği |
| `frontend/src/services/liveTelemetryApi.js` | **YENİ** — tüm REST + SSE çağrıları, görünüm modeli yardımcıları |
| `frontend/src/hooks/useLiveTelemetry.js` | **YENİ** — `useLiveCatalog`, `useLiveKpi`, `useTelemetryStream`, `useTimeseriesHistory` |
| `frontend/src/components/LiveMonitoring/LiveMonitoring.jsx` | Orkestrasyon: canlı hook'lar + alt bileşenlere prop dağıtımı |
| `frontend/src/components/LiveMonitoring/DTSelector.jsx` | `liveAssets` prop'u (gerçek varlık listesi) |
| `frontend/src/components/LiveMonitoring/KPICards.jsx` | `liveMode`/`liveKpi` — `/api/v1/kpi/live` kartları |
| `frontend/src/components/LiveMonitoring/TimeSeriesWidgets.jsx` | `liveMode`/`liveSignals` — gerçek seri çizimi (SSE + history) |
| `frontend/src/components/LiveMonitoring/DataQualityIndicator.jsx` | `liveMetrics` prop'u + gap rate gösterimi |
| `frontend/src/services/liveMonitoringBackend.js` | `fetchDTOptions`'a `OTOKAR_LIVE` seçeneği + canlı varlık listesi desteği |

Mock veri dosyalarına (`src/data/*`) dokunulmadı; diğer tüm modüller eskisi
gibi mock ile çalışır.
