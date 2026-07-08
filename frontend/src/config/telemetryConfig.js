/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TELEMETRY CONFIG — Canlı veri katmanının TEK yapılandırma noktası
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Amaç: "magic number" ve "magic string"lerin bileşenlere dağılmasını önlemek.
 * Polling sıklığı, pencere seçenekleri, bucket kuralları ve eşikler yalnızca
 * burada tanımlanır. Bir davranışı değiştirmek için bileşenlere dokunmadan
 * bu dosyayı düzenlemek yeterlidir.
 *
 * Katman sırası: config → services (transport) → adapters → hooks → views
 */

/** Backend'e bağlı gerçek canlı veri kaynağını temsil eden DT kimliği. */
export const LIVE_DT_ID = 'OTOKAR_LIVE';
export const LIVE_DT_LABEL = 'Otokar Core (Live)';

/** /api/v1/kpi/live sorgulama sıklığı ve pencere genişliği. */
export const KPI_POLL_INTERVAL_MS = 5000;
export const KPI_WINDOW_HOURS = 1;

/** Canlı mod kayan pencere seçenekleri (TimeRangeControl "Window" butonları). */
export const LIVE_WINDOWS = [
    { label: '5m', value: '5m', ms: 5 * 60e3 },
    { label: '15m', value: '15m', ms: 15 * 60e3 },
    { label: '30m', value: '30m', ms: 30 * 60e3 },
    { label: '1h', value: '1h', ms: 60 * 60e3 }
];

export const DEFAULT_LIVE_WINDOW = '5m';

/** '5m' | '15m' | '30m' | '1h' penceresini milisaniyeye çevirir. */
export const windowToMs = (window) => {
    const found = LIVE_WINDOWS.find((w) => w.value === window);
    return found ? found.ms : LIVE_WINDOWS[0].ms;
};

/**
 * Tarihsel mod hızlı seçim (preset) listesi.
 * TimeRangeControl bu listeyi buton olarak gösterir; seçim `ms` kadar geriye
 * giden bir [start, end=now] aralığı üretir.
 */
export const HISTORY_PRESETS = [
    { label: 'Last 15m', value: '15m', ms: 15 * 60e3 },
    { label: 'Last 1h', value: '1h', ms: 60 * 60e3 },
    { label: 'Last 6h', value: '6h', ms: 6 * 60 * 60e3 },
    { label: 'Last 24h', value: '24h', ms: 24 * 60 * 60e3 }
];

/** History moduna ilk geçişte otomatik uygulanan varsayılan aralık. */
export const DEFAULT_HISTORY_PRESET = HISTORY_PRESETS[1]; // Last 1h

/**
 * Aralık süresine göre uygun timeseries bucket'ını seçer.
 * Backend kontratı: 'raw' | '1m' | '10m' | '1h' (TimescaleDB aggregate'leri).
 * Amaç: uzun aralıklarda binlerce ham nokta çekmek yerine uygun özet
 * çözünürlüğü kullanmak (ölçeklenebilirlik).
 */
export const bucketForRange = (start, end) => {
    const startMs = start instanceof Date ? start.getTime() : new Date(start).getTime();
    const endMs = end instanceof Date ? end.getTime() : new Date(end).getTime();
    const durationMs = Math.max(0, endMs - startMs);

    const HOUR = 60 * 60e3;
    if (durationMs <= 3 * HOUR) return '1m';
    if (durationMs <= 24 * HOUR) return '10m';
    return '1h';
};

/**
 * KPI / kalite eşikleri. Adapter'lar (services/adapters/*) durum rengi
 * hesaplarken yalnızca bu değerleri kullanır.
 */
export const THRESHOLDS = {
    ingestLagMs: { warning: 1000, critical: 5000 },
    gapRatePct: { warning: 1, critical: 5 },
    violations: { warning: 0, critical: 50 },
    qualityOkPct: { good: 95, degraded: 80 },
    packetLossPct: { warning: 1 }
};
