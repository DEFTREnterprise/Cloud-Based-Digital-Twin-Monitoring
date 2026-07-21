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
 * Auth (Faz 2.4.1 P0.6 + P0.11):
 *   REST cagrilar utils/api.js axios instance uzerinden gidiyor; interceptor
 *   Redux'taki access token'i Authorization: Bearer <token> olarak ekliyor.
 *
 *   SSE'de tarayicinin native EventSource'i custom header desteklemez; bu
 *   yuzden event-source-polyfill kullaniyoruz. Polyfill Authorization
 *   header'ini destekler → token URL'de gorunmez, backend Bearer'i normal
 *   sekilde okur.
 */

import api, { API_BASE_URL } from '../utils/api';
import { EventSourcePolyfill } from 'event-source-polyfill';
import { store } from '../store';
import { selectToken } from '../store/slices/authSlice';

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

    // Redux'tan taze token: SSE baglantisi acilirken Bearer olarak konur.
    // Polyfill baglanti kurulurken headers'i BIR KEZ gonderir; token bagli
    // sirasinda refresh olursa (KeycloakProvider 30 sn'de bir yenilenir),
    // mevcut baglanti eski token'la devam eder. 5 dk'lik access token
    // suresi dolmadan onEvent akisi kesilmez; expire olursa backend 401
    // ile SSE'yi keser, onError tetiklenir, ust katmanin yeniden baglanma
    // stratejisi devreye girer (bu dosyanin kapsami disinda).
    const token = selectToken(store.getState());
    if (!token) {
        console.warn('[SSE] token yok; akis acilmiyor');
        if (onError) onError(new Error('no-token'));
        return () => {};
    }

    const source = new EventSourcePolyfill(url.toString(), {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        // Polyfill varsayilanda 45 sn timeout uygular; SSE uzun-omurlu
        // baglantidir, timeout'u devre disi birakiyoruz. Backend keep-alive
        // yorumlari zaten yolluyor (stream.py comment "ping").
        heartbeatTimeout: 24 * 60 * 60 * 1000, // 24 sa
    });

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