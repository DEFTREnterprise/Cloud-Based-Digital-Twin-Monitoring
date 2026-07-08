# Frontend Mimari Kılavuzu

Bu doküman, frontend'in **katmanlı veri mimarisini** ve arayüze yeni bir veri
türü ya da modül eklenirken izlenecek **standart adımları** anlatır.
Uçtan uca demoyu çalıştırma adımları için `README-INTEGRATION.md` dosyasına bakın.

---

## 1. Katman Modeli

Veri, aşağıdaki katmanlardan **tek yönlü** akar. Her katmanın tek bir
sorumluluğu vardır ve yalnızca bir alt katmanı bilir:

```
┌─────────────────────────────────────────────────────────────────────┐
│  5. VIEW (Görünüm)          components/LiveMonitoring/*.jsx         │
│     Sadece prop okur, render eder. Backend şemasını BİLMEZ.         │
├─────────────────────────────────────────────────────────────────────┤
│  4. CONTAINER (Orkestrasyon) LiveMonitoring.jsx                     │
│     UI state'i (seçimler, mod, aralık) + composite hook → prop.     │
├─────────────────────────────────────────────────────────────────────┤
│  3. COMPOSITE HOOK           hooks/useLiveMonitoringData.js         │
│     Modülün "veri yüzü": tekil hook'ları birleştirir, adapter       │
│     çağırır, HAZIR görünüm modelleri döndürür.                      │
├──────────────────────────────┬──────────────────────────────────────┤
│  2a. TEKİL HOOK'LAR          │  2b. ADAPTERS                        │
│  hooks/useLiveTelemetry.js   │  services/adapters/                  │
│  Fetch/SSE yaşam döngüsü,    │    liveMonitoringAdapters.js         │
│  polling, tampon (state).    │  Backend şeması → görünüm modeli.    │
├──────────────────────────────┴──────────────────────────────────────┤
│  1. TRANSPORT                services/liveTelemetryApi.js           │
│     Saf HTTP + SSE çağrıları. Ham backend yanıtı döndürür.          │
├─────────────────────────────────────────────────────────────────────┤
│  0. CONFIG                   config/telemetryConfig.js              │
│     Tüm sabitler: DT kimliği, polling sıklığı, pencereler,          │
│     history presetleri, bucket kuralı, eşikler.                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Dosya Sorumluluk Tablosu

| Dosya | Katman | Sorumluluk | Ne zaman değişir? |
|---|---|---|---|
| `src/config/telemetryConfig.js` | Config | Sabitler, eşikler, pencere/bucket kuralları | Davranış ayarı değişince (polling, eşik...) |
| `src/utils/api.js` | Transport | Axios instance + `API_BASE_URL` | Base URL / auth header değişince |
| `src/services/liveTelemetryApi.js` | Transport | Endpoint başına bir fetch fonksiyonu, SSE açma | Backend'e endpoint eklenince |
| `src/services/adapters/liveMonitoringAdapters.js` | Adapter | snake_case ham yanıt → kart/widget/metrik modeli | **Backend şeması değişince (SADECE burası)** |
| `src/hooks/useLiveTelemetry.js` | Hook | Tekil, modülden bağımsız veri hook'ları (katalog, KPI polling, SSE tamponu, tarihsel sorgu) | Yeni veri deseni gerekince (ör. WebSocket) |
| `src/hooks/useLiveMonitoringData.js` | Composite | Live Monitoring modülünün tüm verisini tek nesnede toplar | Modülün veri ihtiyacı değişince |
| `src/components/LiveMonitoring/LiveMonitoring.jsx` | Container | UI state + prop dağıtımı | Yeni panel/bileşen eklenince |
| `src/components/LiveMonitoring/*.jsx` (diğerleri) | View | Saf render; `liveMode` bayrağıyla mock/canlı seçimi | Görsel değişiklikte |
| `src/services/liveMonitoringBackend.js`, `kpiBackend.js`... | Mock | Backend'i olmayan modüller için sahte veri | Mock içerik değişince |

### Temel Kurallar

1. **View bileşenleri asla API çağırmaz** ve backend alan adlarını
   (`ingest_lag_p95_ms` gibi) bilmez. Şema bilgisi yalnızca adapter'dadır.
2. **Mock yol silinmez.** Her view `liveMode ? liveProp : mockData` deseniyle
   çalışır; backend kapalıyken UI bozulmaz. React hook kuralları gereği mock
   `useMemo` çağrıları **koşulsuz** yapılır, seçim sonradan yapılır.
3. **Sabit değer bileşene yazılmaz.** Yeni bir eşik/pencere/süre gerekirse
   `telemetryConfig.js`'e eklenir.
4. **Kontrollü bileşenler:** Paylaşılan state'in (ör. `timeRange`) kopyası
   bileşen içinde tutulmaz; tek doğruluk kaynağı container'daki state'tir,
   değişiklik `onChange` ile yukarı bildirilir.
5. **SSE kontratı sabittir:** `event: telemetry`,
   `data: {asset_id, signal_id, ts, value, quality}`. UUID → kod eşlemesi
   katalog (`/api/v1/assets`, `/api/v1/signals`) üzerinden yapılır.

---

## 2. Zaman Aralığı (Live / History) Davranışı

`timeRange` state'inin şekli: `{ mode, start, end, window, preset }`

- **Live modu:** SSE akışı açılır; `window` ('5m'|'15m'|'30m'|'1h') kadar veri
  kayan pencerede (rolling buffer) tutulur. Pencere süreleri
  `LIVE_WINDOWS` sabitinden gelir.
- **History modu:** `/api/v1/timeseries` sorgulanır. Aralık iki yolla seçilir:
  - **Preset butonları** (Last 15m / 1h / 6h / 24h → `HISTORY_PRESETS`):
    `[now - süre, now]` aralığı üretir.
  - **Custom girişler** (`datetime-local`): serbest başlangıç/bitiş.
  - History'e ilk geçişte aralık boşsa `DEFAULT_HISTORY_PRESET` (Last 1h)
    otomatik uygulanır — kullanıcı hiçbir şey seçmese bile veri gelir.
- **Bucket otomatik seçilir** (`bucketForRange`): ≤3 saat → `1m`,
  ≤24 saat → `10m`, üzeri → `1h`. Böylece uzun aralıklarda binlerce ham
  nokta çekilmez.

> Not: Hem live hem history görünümü, kullanıcının DT Selector'dan
> **Start Stream** ile modülü aktifleştirmesini bekler (modülün genel
> "etkinleştirme" anahtarı budur).

---

## 3. Standart Reçeteler

### Reçete A — Backend'e YENİ BİR ENDPOINT eklendi, arayüzde göstereceğim

Sıra her zaman aynıdır: **transport → (gerekirse hook) → adapter → composite → container → view**.

1. **Transport** — `services/liveTelemetryApi.js` içine fetch fonksiyonu ekle:
   ```js
   export const fetchAlarms = async (assetId) => {
       const { data } = await api.get('/api/v1/alarms', { params: { asset_id: assetId } });
       return data; // HAM yanıt — dönüştürme YOK
   };
   ```
2. **Hook** — `hooks/useLiveTelemetry.js` içindeki mevcut desenlerden birini
   kopyala (tek seferlik → `useLiveCatalog`, polling → `useLiveKpi`,
   akış → `useTelemetryStream`, aralıklı sorgu → `useTimeseriesHistory`).
3. **Adapter** — `services/adapters/liveMonitoringAdapters.js` içine
   `buildAlarmRows(rawAlarms)` gibi bir dönüştürücü yaz. Eşik/limit
   gerekiyorsa önce `telemetryConfig.js → THRESHOLDS`'a ekle.
4. **Composite** — `hooks/useLiveMonitoringData.js` içinde hook'u çağır,
   adapter'dan geçir, dönüş nesnesine ekle (ör. `alarms`).
5. **Container** — `LiveMonitoring.jsx`'te `live.alarms`'ı ilgili view'a
   prop olarak geçir.
6. **View** — Bileşene `liveMode`/`liveXxx` prop'u ekle; mock yolu koru:
   ```js
   const rows = liveMode ? (liveAlarms || []) : mockRows;
   ```

### Reçete B — Mock üretecine YENİ BİR SİNYAL eklendi

Frontend değişikliği **gerekmez**. UI, sinyal listesini `/api/v1/signals`
kataloğundan dinamik okur:

1. `tools/catalog.py → SIGNALS`'a sinyali ekle, `tools/seed.py`'yi çalıştır.
2. `tools/mock_otokar_publisher.py → CATALOG`'a üretim kuralını ekle.
3. Gerekirse `signalCategory()` (adapter) içine yeni kategori anahtarı ekle
   (yalnızca renk/gruplama için, zorunlu değil).

### Reçete C — YENİ BİR MODÜLÜ (örn. PdM) gerçek API'ye bağlayacağım

Live Monitoring'i şablon olarak kopyala:

1. `services/pdmApi.js` → o modülün transport dosyası.
2. `services/adapters/pdmAdapters.js` → şema dönüşümleri.
3. `hooks/usePdmData.js` → composite hook (`useLiveMonitoringData.js`'i
   şablon al: enabled bayrağı, tekil hook'lar, `useMemo`'lu adapter çağrıları,
   tek dönüş nesnesi).
4. Modülün container'ında hook'u çağır, view'lara prop dağıt.
5. View'lara `liveMode` + `liveXxx` prop'ları ekle; mock yolu silme.

Genel amaçlı sabitler `telemetryConfig.js`'te kalır; modüle özgü sabitler için
`config/pdmConfig.js` gibi yeni bir dosya aç.

### Reçete D — Backend ŞEMASI DEĞİŞTİ (alan adı/birim/yeni alan)

1. `services/adapters/liveMonitoringAdapters.js` içindeki ilgili
   `buildXxx` fonksiyonunu güncelle. **Başka hiçbir dosyaya dokunma.**
2. Eşik/limit değişiyorsa `telemetryConfig.js → THRESHOLDS`'ı güncelle.
3. View'lara verilen model şeklini (prop kontratını) değiştirmediğin sürece
   bileşenler etkilenmez.

### Reçete E — Mock modülü tamamen gerçek API'ye GEÇİRECEĞİM

1. Reçete C'yi uygula (transport + adapter + composite hook).
2. View'lardaki `liveMode ? live : mock` seçiminde mock dalını bir süre koru
   (backend kapalıyken demo yapılabilsin).
3. Gerçek API stabil olduğunda mock servis importlarını ve `data/mockXxx.js`
   dosyasını kaldır; `liveMode` bayrağını söküp prop'ları zorunlu yap.

---

## 4. Tarihsel (History) Modun Çalışma Şekli — Yapılan Düzeltme

Önceki sürümde history modu hiç veri göstermiyordu; kök nedenler ve çözümleri:

| Sorun | Çözüm |
|---|---|
| `TimeRangeControl`'de aralık seçici yoktu; `start/end` hep `null` kalıyordu, `useTimeseriesHistory` sorgu atmıyordu | Preset butonları + `datetime-local` custom girişler eklendi; moda geçişte varsayılan "Last 1h" otomatik uygulanır |
| Bileşen, `mode`'un yerel bir kopyasını (`isHistoryMode` state) tutuyordu; dışarıdan mod değişince (PdM drill-through) senkron kopuyordu | Bileşen tamamen **controlled** yapıldı; mod `timeRange.mode` prop'undan türetilir |
| Çalışmayan playback (⏮ ▶ ⏭) butonları vardı | Kaldırıldı (ölü UI, teknik borç) |
| Bucket sabit `1m` idi; 24 saatlik aralıkta gereksiz yük | `bucketForRange` ile süreye göre otomatik `1m`/`10m`/`1h` |

---

## 5. Bu Refactor'da Değişen / Eklenen Dosyalar

| Dosya | Durum | Not |
|---|---|---|
| `src/config/telemetryConfig.js` | **YENİ** | Tüm sabitler tek noktada |
| `src/services/adapters/liveMonitoringAdapters.js` | **YENİ** | `buildLiveSignalWidgets`, `buildLiveKpiCards`, `buildLiveQualityMetrics`, `signalCategory` buraya taşındı |
| `src/hooks/useLiveMonitoringData.js` | **YENİ** | Composite hook; container'ı inceltti |
| `src/components/LiveMonitoring/TimeRangeControl.jsx` | Yeniden yazıldı | Controlled + history aralık seçici (bug fix) |
| `src/components/LiveMonitoring/LiveMonitoring.jsx` | İnceltildi | Veri mantığı composite hook'a taşındı |
| `src/components/LiveMonitoring/KPICards.jsx` | Sadeleştirildi | Backend şeması bilgisi çıkarıldı; hazır `liveCards` prop'u alır |
| `src/components/LiveMonitoring/TimeSeriesWidgets.jsx` | Temizlendi | Ölü `streamError` state kaldırıldı; history hata/boş-durum mesajları eklendi |
| `src/services/liveTelemetryApi.js` | Sadeleştirildi | Artık saf transport; view-model üretimi adapter'da |
| `src/services/liveMonitoringBackend.js` | Küçük değişiklik | `'OTOKAR_LIVE'` literal'i yerine `LIVE_DT_ID` sabiti |

---

## 6. Hızlı Kontrol Listesi (PR öncesi)

- [ ] View bileşenine axios/fetch importu eklemedim.
- [ ] Backend alan adları yalnızca adapter dosyasında geçiyor.
- [ ] Yeni sabitleri config dosyasına koydum (bileşen içinde magic number yok).
- [ ] Mock yolu hâlâ çalışıyor (backend kapalıyken sayfa açılıyor).
- [ ] Hook'lar koşulsuz çağrılıyor (`if` içinde `useMemo`/`useEffect` yok).
- [ ] `npm run build` hatasız geçiyor.
