/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LIVE MONITORING ADAPTERS — Backend şeması → Görünüm (View) modeli
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Bu katmanın tek görevi, backend'in ham yanıtlarını (snake_case alanlar,
 * UUID'ler, birimler) görünüm bileşenlerinin beklediği modele çevirmektir.
 *
 * NEDEN AYRI BİR KATMAN?
 *   - Backend şeması değişirse (alan adı, birim, yeni alan) SADECE bu dosya
 *     güncellenir; görünüm bileşenlerine (KPICards, TimeSeriesWidgets, ...)
 *     dokunulmaz.
 *   - Görünüm bileşenleri backend'in varlığından habersizdir; test etmesi ve
 *     mock/canlı arasında geçiş yapması kolaydır.
 *
 * Katman sırası: config → services (transport) → ADAPTERS → hooks → views
 */

import { Activity, Clock, BarChart3, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { THRESHOLDS } from '../../config/telemetryConfig';

// ─── Sinyal Widget'ları ─────────────────────────────────────────────────────

/** Sinyal koduna göre kategori tahmini (widget renk/gruplaması için). */
export const signalCategory = (code = '') => {
    const c = code.toLowerCase();
    if (c.includes('temp')) return 'thermal';
    if (c.includes('vib')) return 'vibration';
    if (c.includes('speed') || c.includes('rpm') || c.includes('vel')) return 'velocity';
    if (c.includes('current') || c.includes('volt')) return 'electrical';
    if (c.includes('pres')) return 'hydraulic';
    if (c.includes('pos')) return 'position';
    return 'general';
};

/**
 * Sinyal kataloğu + seri tamponlarını TimeSeriesWidgets'ın beklediği
 * "signal" nesnelerine dönüştürür.
 *
 * @param {Array} signalsMeta   - GET /api/v1/signals çıktısı
 * @param {Object} seriesByCode - { [signal_code]: [{ts, value, quality}] }
 * @returns {Array<{id,title,unit,currentValue,simValue,category,thresholds,points}>}
 */
export const buildLiveSignalWidgets = (signalsMeta = [], seriesByCode = {}) => {
    return signalsMeta.map((meta) => {
        const points = seriesByCode[meta.signal_code] || [];
        const last = points.length ? points[points.length - 1] : null;

        let thresholds = null;
        if (meta.warn_threshold != null || meta.critical_threshold != null) {
            thresholds = {
                warning: meta.warn_threshold ?? meta.critical_threshold,
                critical: meta.critical_threshold ?? meta.warn_threshold
            };
        }

        return {
            id: meta.signal_id,
            title: meta.signal_code.replace(/_/g, ' '),
            unit: meta.unit,
            currentValue: last ? parseFloat(Number(last.value).toFixed(3)) : null,
            simValue: null, // backend'de simülasyon verisi yok
            category: signalCategory(meta.signal_code),
            thresholds,
            points
        };
    });
};

// ─── KPI Kartları ───────────────────────────────────────────────────────────

/**
 * GET /api/v1/kpi/live yanıtını KPICard modeline çevirir.
 * Eşikler config/telemetryConfig.js → THRESHOLDS'tan gelir.
 */
export const buildLiveKpiCards = (kpi) => {
    if (!kpi) return [];

    const lag = kpi.ingest_lag_p95_ms;
    const gap = kpi.gap_rate_pct;
    const quality = kpi.quality_ok_pct;
    const violations = kpi.threshold_violations ?? 0;
    const T = THRESHOLDS;

    return [
        {
            id: 'ingestLag',
            title: 'INGEST LAG (P95)',
            value: lag != null ? Math.round(lag) : '—',
            unit: 'ms',
            icon: Clock,
            status: lag == null ? 'inactive'
                : lag > T.ingestLagMs.critical ? 'critical'
                    : lag > T.ingestLagMs.warning ? 'warning' : 'success',
            trend: 'stable',
            subtitle: `Measurement → DB write latency (last ${kpi.window_hours}h)`
        },
        {
            id: 'gapRate',
            title: 'DATA GAP RATE',
            value: gap != null ? gap : '—',
            unit: '%',
            icon: BarChart3,
            status: gap == null ? 'inactive'
                : gap > T.gapRatePct.critical ? 'critical'
                    : gap > T.gapRatePct.warning ? 'warning' : 'success',
            trend: 'stable',
            subtitle: 'Missing samples vs expected (~1Hz)'
        },
        {
            id: 'violations',
            title: 'THRESHOLD VIOLATIONS',
            value: violations,
            unit: '',
            icon: AlertTriangle,
            status: violations > T.violations.critical ? 'critical'
                : violations > T.violations.warning ? 'warning' : 'success',
            trend: 'stable',
            subtitle: 'Warn/critical threshold breaches in window'
        },
        {
            id: 'eventCount',
            title: 'EVENT COUNT',
            value: kpi.event_count ?? 0,
            unit: '',
            icon: Activity,
            status: 'normal',
            trend: 'stable',
            subtitle: `Measurements ingested (last ${kpi.window_hours}h)`
        },
        {
            id: 'qualityOk',
            title: 'QUALITY OK',
            value: quality != null ? quality : '—',
            unit: '%',
            icon: CheckCircle2,
            status: quality == null ? 'inactive'
                : quality >= T.qualityOkPct.good ? 'success'
                    : quality >= T.qualityOkPct.degraded ? 'warning' : 'critical',
            trend: 'stable',
            subtitle: 'Samples with quality_flag = OK'
        }
    ];
};

// ─── Veri Kalitesi Metrikleri ───────────────────────────────────────────────

/**
 * Canlı KPI + SSE akış durumundan DataQualityIndicator'ın beklediği
 * metrikleri üretir.
 *
 * @param {Object|null} kpi     - GET /api/v1/kpi/live yanıtı
 * @param {{connected: boolean, lastEventTs: string|null}} stream
 * @param {boolean} isStreaming - kullanıcı "Start Stream" dedi mi
 */
export const buildLiveQualityMetrics = (kpi, stream, isStreaming) => {
    const connected = stream.connected && isStreaming;
    const T = THRESHOLDS;

    const latency = kpi?.ingest_lag_p95_ms != null ? Math.round(kpi.ingest_lag_p95_ms) : 0;
    let latencyStatus = 'good';
    if (latency > T.ingestLagMs.critical) latencyStatus = 'critical';
    else if (latency > T.ingestLagMs.warning) latencyStatus = 'warning';

    const gapRatePct = kpi?.gap_rate_pct ?? null;
    const packetLoss = kpi?.quality_ok_pct != null
        ? parseFloat((100 - kpi.quality_ok_pct).toFixed(1))
        : 0;

    let qualityFlag = 'UNKNOWN';
    if (kpi?.quality_ok_pct != null) {
        if (!connected) qualityFlag = 'BAD';
        else if (kpi.quality_ok_pct >= T.qualityOkPct.good) qualityFlag = 'GOOD';
        else qualityFlag = 'DEGRADED';
    }

    let lastUpdate = 'N/A';
    if (stream.lastEventTs) {
        const diffSec = Math.round((Date.now() - new Date(stream.lastEventTs).getTime()) / 1000);
        if (diffSec <= 5) lastUpdate = 'just now';
        else if (diffSec < 60) lastUpdate = `${diffSec}s ago`;
        else lastUpdate = `${Math.round(diffSec / 60)}m ago`;
    }

    return {
        latency,
        latencyStatus,
        gaps: gapRatePct != null ? gapRatePct : 0,
        gapRatePct,
        gapDuration: null,
        packetLoss,
        qualityFlag,
        connectionStatus: connected ? 'connected' : 'disconnected',
        lastUpdate
    };
};
