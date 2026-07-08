/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LIVE TELEMETRY HOOKS — Canlı veri için React state yönetimi
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Mimari: Bileşenler (View) doğrudan API çağırmaz. Veri akışı şöyledir:
 *
 *   config/telemetryConfig.js        →  sabitler (polling, pencere, eşikler)
 *   liveTelemetryApi.js (HTTP/SSE)   →  useLiveTelemetry.js (tekil hook'lar: state/tampon)
 *   adapters/liveMonitoringAdapters  →  useLiveMonitoringData.js (bileşik hook: görünüm modelleri)
 *                                    →  LiveMonitoring.jsx (orkestrasyon)
 *                                    →  KPICards / TimeSeriesWidgets / ... (görünüm)
 *
 * Bu dosyadaki hook'lar TEKİL ve modülden bağımsızdır (katalog, KPI polling,
 * SSE tamponu, tarihsel sorgu). Modüle özgü birleştirme/dönüşüm işi
 * useLiveMonitoringData.js içindedir. Ayrıntı: FRONTEND-ARCHITECTURE.md
 */

import { useEffect, useRef, useState } from 'react';
import {
    fetchAssets,
    fetchSignals,
    fetchKpiLive,
    fetchTimeseries,
    openTelemetryStream
} from '../services/liveTelemetryApi';

/**
 * Varlık + sinyal kataloğunu bir kez yükler (canlı mod seçilince).
 * @param {boolean} enabled
 * @returns {{ assets, signals, signalsById, loading, error }}
 */
export const useLiveCatalog = (enabled) => {
    const [state, setState] = useState({
        assets: [],
        signals: [],
        signalsById: {},
        loading: false,
        error: null
    });

    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;

        setState((s) => ({ ...s, loading: true, error: null }));
        Promise.all([fetchAssets(), fetchSignals()])
            .then(([assets, signals]) => {
                if (cancelled) return;
                const signalsById = Object.fromEntries(
                    signals.map((s) => [s.signal_id, s])
                );
                setState({ assets, signals, signalsById, loading: false, error: null });
            })
            .catch((error) => {
                if (cancelled) return;
                console.error('[Live] Katalog yüklenemedi:', error);
                setState((s) => ({ ...s, loading: false, error }));
            });

        return () => { cancelled = true; };
    }, [enabled]);

    return state;
};

/**
 * /api/v1/kpi/live uç noktasını periyodik olarak sorgular.
 * @param {string|null} assetId - UUID (null = tüm varlıklar)
 * @param {boolean} enabled
 * @param {number} intervalMs   - yenileme sıklığı
 * @param {number|null} windowHours
 * @returns {{ kpi, error }}
 */
export const useLiveKpi = (assetId, enabled, intervalMs = 5000, windowHours = 1) => {
    const [kpi, setKpi] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!enabled) {
            setKpi(null);
            return;
        }
        let cancelled = false;

        const poll = async () => {
            try {
                const data = await fetchKpiLive(assetId, windowHours);
                if (!cancelled) {
                    setKpi(data);
                    setError(null);
                }
            } catch (e) {
                if (!cancelled) setError(e);
            }
        };

        poll(); // hemen ilk çağrı
        const timer = setInterval(poll, intervalMs);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [assetId, enabled, intervalMs, windowHours]);

    return { kpi, error };
};

/**
 * SSE telemetri akışına abone olur ve sinyal koduna göre kayan pencereli
 * tampon (rolling buffer) tutar.
 *
 * @param {string|null} assetId  - UUID (null = tüm varlıklar)
 * @param {boolean} enabled
 * @param {Object} signalsById   - { [signal_id]: signalMeta } (UUID → kod eşlemesi)
 * @param {number} windowMs      - tamponda tutulacak süre (ms)
 * @returns {{ connected, lastEventTs, seriesByCode, eventCount }}
 */
export const useTelemetryStream = (assetId, enabled, signalsById, windowMs = 5 * 60e3) => {
    const [connected, setConnected] = useState(false);
    const [lastEventTs, setLastEventTs] = useState(null);
    const [seriesByCode, setSeriesByCode] = useState({});
    const [eventCount, setEventCount] = useState(0);

    // signalsById'yi ref'te tut: akışı yeniden başlatmadan güncel eşleme kullan
    const signalsRef = useRef(signalsById);
    signalsRef.current = signalsById;
    const windowRef = useRef(windowMs);
    windowRef.current = windowMs;

    useEffect(() => {
        if (!enabled) {
            setConnected(false);
            setSeriesByCode({});
            setEventCount(0);
            setLastEventTs(null);
            return;
        }

        const close = openTelemetryStream(assetId, {
            onOpen: () => setConnected(true),
            onError: () => setConnected(false),
            onEvent: (msg) => {
                const meta = signalsRef.current?.[msg.signal_id];
                const code = meta ? meta.signal_code : msg.signal_id;
                const point = {
                    ts: msg.ts,
                    value: Number(msg.value),
                    quality: msg.quality
                };

                setSeriesByCode((prev) => {
                    const buf = [...(prev[code] || []), point];
                    // Kayan pencere: windowMs'ten eski noktaları at
                    const cutoff = new Date(point.ts).getTime() - windowRef.current;
                    const pruned = buf.filter((p) => new Date(p.ts).getTime() >= cutoff);
                    return { ...prev, [code]: pruned };
                });
                setLastEventTs(msg.ts);
                setEventCount((c) => c + 1);
                setConnected(true);
            }
        });

        return () => {
            close();
            setConnected(false);
        };
    }, [assetId, enabled]);

    return { connected, lastEventTs, seriesByCode, eventCount };
};

/**
 * Tarihsel mod: seçili pencere için /api/v1/timeseries'ten seri çeker.
 *
 * @param {{ assetId: string|null, signals: Array, start: string|Date|null,
 *           end: string|Date|null, bucket?: string, enabled: boolean }} opts
 * @returns {{ seriesByCode, loading, error }}
 */
export const useTimeseriesHistory = ({ assetId, signals, start, end, bucket = '1m', enabled }) => {
    const [state, setState] = useState({ seriesByCode: {}, loading: false, error: null });

    useEffect(() => {
        if (!enabled || !assetId || !signals?.length || !start || !end) {
            setState({ seriesByCode: {}, loading: false, error: null });
            return;
        }
        let cancelled = false;
        setState((s) => ({ ...s, loading: true, error: null }));

        Promise.all(
            signals.map((sig) =>
                fetchTimeseries({
                    assetId,
                    signalId: sig.signal_id,
                    from: start,
                    to: end,
                    bucket
                }).then((res) => [sig.signal_code, res.points])
            )
        )
            .then((entries) => {
                if (cancelled) return;
                setState({
                    seriesByCode: Object.fromEntries(entries),
                    loading: false,
                    error: null
                });
            })
            .catch((error) => {
                if (cancelled) return;
                console.error('[Live] Tarihsel seri yüklenemedi:', error);
                setState({ seriesByCode: {}, loading: false, error });
            });

        return () => { cancelled = true; };
    }, [assetId, enabled, start, end, bucket, signals]);

    return state;
};
