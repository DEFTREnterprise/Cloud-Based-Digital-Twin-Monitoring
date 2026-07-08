/**
 * ═══════════════════════════════════════════════════════════════════════════
 * useLiveMonitoringData — Live Monitoring modülünün BİLEŞİK (composite) hook'u
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Katalog + KPI + SSE akışı + tarihsel sorgu hook'larını tek noktada birleştirir
 * ve adapter'lar üzerinden HAZIR görünüm modelleri döndürür. Böylece container
 * bileşeni (LiveMonitoring.jsx) yalnızca "state → prop" bağlantısı yapar;
 * veri kaynağı seçimi (canlı SSE mi, tarihsel sorgu mu), bucket seçimi ve
 * şema dönüşümü burada çözülür.
 *
 * YENİ BİR MODÜLÜ CANLI VERİYE BAĞLARKEN bu dosya şablon olarak kopyalanabilir:
 * kendi useXxxData hook'unuzu yazın, adapter'larınızı çağırın, container'a
 * tek nesne döndürün. (Bkz. FRONTEND-ARCHITECTURE.md)
 *
 * @param {{ selectedDT: Object, isStreaming: boolean, timeRange: Object }} params
 * @returns {{
 *   isLive, liveActive, catalog, liveAsset,
 *   kpi, kpiCards, stream, history,
 *   signals, qualityMetrics, streamError
 * }}
 */

import { useMemo } from 'react';
import {
    useLiveCatalog,
    useLiveKpi,
    useTelemetryStream,
    useTimeseriesHistory
} from './useLiveTelemetry';
import {
    buildLiveSignalWidgets,
    buildLiveKpiCards,
    buildLiveQualityMetrics
} from '../services/adapters/liveMonitoringAdapters';
import {
    LIVE_DT_ID,
    KPI_POLL_INTERVAL_MS,
    KPI_WINDOW_HOURS,
    windowToMs,
    bucketForRange
} from '../config/telemetryConfig';

export const useLiveMonitoringData = ({ selectedDT, isStreaming, timeRange }) => {
    // Canlı mod yalnızca backend'e bağlı DT seçiliyken aktiftir.
    const isLive = selectedDT.dt === LIVE_DT_ID;
    const liveActive = isLive && isStreaming;

    // 1) Katalog: varlıklar (MOTOR_01..N) + sinyal metadata'sı (eşikler dahil)
    const catalog = useLiveCatalog(isLive);

    // 2) Seçili varlık: DT Selector'daki "Subsystem" alanı asset_code taşır
    const liveAsset = useMemo(
        () => catalog.assets.find((a) => a.asset_code === selectedDT.subsystem) || null,
        [catalog.assets, selectedDT.subsystem]
    );

    // 3) KPI'lar: /api/v1/kpi/live (periyodik polling)
    const { kpi } = useLiveKpi(
        liveAsset?.asset_id ?? null,
        liveActive,
        KPI_POLL_INTERVAL_MS,
        KPI_WINDOW_HOURS
    );

    // 4) SSE canlı akış: seçili pencere kadar veri tamponda tutulur
    const stream = useTelemetryStream(
        liveAsset?.asset_id ?? null,
        liveActive && timeRange.mode === 'live',
        catalog.signalsById,
        windowToMs(timeRange.window)
    );

    // 5) Tarihsel mod: /api/v1/timeseries — bucket, aralık süresine göre seçilir
    const historyBucket = useMemo(
        () => (timeRange.start && timeRange.end
            ? bucketForRange(timeRange.start, timeRange.end)
            : '1m'),
        [timeRange.start, timeRange.end]
    );

    const history = useTimeseriesHistory({
        assetId: liveAsset?.asset_id ?? null,
        signals: catalog.signals,
        start: timeRange.start,
        end: timeRange.end,
        bucket: historyBucket,
        enabled: liveActive && timeRange.mode === 'history'
    });

    // 6) Görünüm modelleri (adapter katmanı üzerinden)
    const seriesByCode = timeRange.mode === 'history'
        ? history.seriesByCode
        : stream.seriesByCode;

    const signals = useMemo(
        () => (isLive ? buildLiveSignalWidgets(catalog.signals, seriesByCode) : null),
        [isLive, catalog.signals, seriesByCode]
    );

    const kpiCards = useMemo(
        () => (isLive ? buildLiveKpiCards(kpi) : null),
        [isLive, kpi]
    );

    const qualityMetrics = useMemo(
        () => (isLive ? buildLiveQualityMetrics(kpi, stream, isStreaming) : null),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [isLive, kpi, stream.connected, stream.lastEventTs, isStreaming]
    );

    const streamError = liveActive
        && timeRange.mode === 'live'
        && !stream.connected;

    return {
        isLive,
        liveActive,
        catalog,
        liveAsset,
        kpi,
        kpiCards,
        stream,
        history,
        signals,
        qualityMetrics,
        streamError
    };
};

export default useLiveMonitoringData;
