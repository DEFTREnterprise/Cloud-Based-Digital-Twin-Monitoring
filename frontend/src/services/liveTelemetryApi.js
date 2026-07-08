/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LIVE TELEMETRY API — Gerçek Backend Bağlantı Katmanı
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Bu dosya, FastAPI backend'inin CANLI veri uç noktalarına bağlanan TEK
 * noktadır. Mock servislerin (liveMonitoringBackend.js vb.) aksine burada
 * hiçbir sahte veri üretilmez; her fonksiyon gerçek bir HTTP/SSE çağrısıdır.
 *
 * Backend kontratı (backend/app/routers/*):
 *   GET  /health                      → servis + DB durumu
 *   GET  /api/v1/assets               → varlık listesi (MOTOR_01..N, UUID eşlemesi)
 *   GET  /api/v1/signals              → sinyal kataloğu (birim + warn/critical eşikler)
 *   GET  /api/v1/kpi/live             → canlı KPI'lar (lag p95, gap rate, ihlal, adet, kalite %)
 *   GET  /api/v1/timeseries           → tarihsel seri (raw | 1m | 10m | 1h bucket)
 *   GET  /api/v1/stream/telemetry     → SSE canlı telemetri akışı (event: telemetry)
 *
 * YENİ BİR VERİ TÜRÜ BAĞLARKEN İZLENECEK YOL için kök dizindeki
 * README-INTEGRATION.md dosyasına bakın.
 */

import api, { API_BASE_URL } from '../utils/api';

// ─── REST Uç Noktaları ──────────────────────────────────────────────────────

/** Backend sağlık kontrolü: { status, app, db, timescaledb } */
export const fetchHealth = async () => {
    const { data } = await api.get('/health');
    return data;
};

/** Varlık listesi: [{ asset_id, dt_id, asset_code, subsystem }] */
export const fetchAssets = async () => {
    const { data } = await api.get('/api/v1/assets');
    return data;
};

/** Sinyal kataloğu: [{ signal_id, signal_code, unit, range_min, range_max, warn_threshold, critical_threshold }] */
export const fetchSignals = async () => {
    const { data } = await api.get('/api/v1/signals');
    return data;
};

/**
 * Canlı KPI'lar.
 * @param {string|null} assetId  - UUID; null ise tüm varlıklar
 * @param {number|null} windowHours - pencere (saat); null ise backend varsayılanı
 * @returns {{ computed_at, window_hours, ingest_lag_p95_ms, gap_rate_pct,
 *             threshold_violations, event_count, quality_ok_pct }}
 */
export const fetchKpiLive = async (assetId = null, windowHours = null) => {
    const params = {};
    if (assetId) params.asset_id = assetId;
    if (windowHours) params.window_hours = windowHours;
    const { data } = await api.get('/api/v1/kpi/live', { params });
    return data;
};

/**
 * Tarihsel zaman serisi.
 * @param {{ assetId: string, signalId: string, from: Date|string, to: Date|string,
 *           bucket?: 'raw'|'1m'|'10m'|'1h' }} q
 * @returns {{ points: [{ts, value, quality}], meta }}
 */
export const fetchTimeseries = async ({ assetId, signalId, from, to, bucket = 'raw' }) => {
    const { data } = await api.get('/api/v1/timeseries', {
        params: {
            asset_id: assetId,
            signal_id: signalId,
            from: from instanceof Date ? from.toISOString() : from,
            to: to instanceof Date ? to.toISOString() : to,
            bucket
        }
    });
    return data;
};

// ─── SSE Canlı Akış ─────────────────────────────────────────────────────────

/**
 * SSE telemetri akışını açar.
 *
 * Backend kontratı (backend/app/routers/stream.py):
 *   event: telemetry
 *   data:  {"asset_id","signal_id","ts","value","quality"}
 *
 * @param {string|null} assetId - UUID; null ise tüm varlıkların akışı
 * @param {{ onEvent: (msg) => void, onOpen?: () => void, onError?: (e) => void }} handlers
 * @returns {() => void} cleanup — akışı kapatan fonksiyon
 */
export const openTelemetryStream = (assetId, { onEvent, onOpen, onError }) => {
    const url = new URL('/api/v1/stream/telemetry', API_BASE_URL);
    if (assetId) url.searchParams.set('asset_id', assetId);

    const source = new EventSource(url.toString());

    source.addEventListener('telemetry', (e) => {
        try {
            onEvent(JSON.parse(e.data));
        } catch (err) {
            console.error('[SSE] telemetry parse hatası:', err);
        }
    });
    source.onopen = () => onOpen && onOpen();
    source.onerror = (e) => onError && onError(e);

    return () => source.close();
};

// NOT: Görünüm modeli dönüşümleri (widget/kart üretimi) bu dosyada DEĞİL,
// services/adapters/liveMonitoringAdapters.js dosyasındadır. Bu dosya yalnızca
// TRANSPORT (HTTP/SSE) içerir — backend şeması ham haliyle döndürülür.
