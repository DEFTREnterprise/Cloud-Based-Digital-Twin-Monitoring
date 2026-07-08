import React, { useEffect, useMemo, useState } from 'react';
import DTSelector from './DTSelector';
import TimeSeriesWidgets from './TimeSeriesWidgets';
import KPICards from './KPICards';
import DataQualityIndicator from './DataQualityIndicator';
import FactoryCameraFeed from './FactoryCameraFeed';
import DigitalTwinViewer from './DigitalTwinViewer';
import { useLiveMonitoringData } from '../../hooks/useLiveMonitoringData';
import { DEFAULT_LIVE_WINDOW } from '../../config/telemetryConfig';

/**
 * LIVE MONITORING — Orkestrasyon (Container) Bileşeni
 *
 * Bu bileşen yalnızca UI state'i (seçimler, akış açık/kapalı, zaman aralığı)
 * yönetir ve useLiveMonitoringData bileşik hook'unun döndürdüğü HAZIR görünüm
 * modellerini alt bileşenlere prop olarak dağıtır.
 *
 * Veri toplama/dönüştürme mantığının tamamı katmanlıdır (bkz. FRONTEND-ARCHITECTURE.md):
 *   config/telemetryConfig.js            → sabitler (polling, pencere, eşikler)
 *   services/liveTelemetryApi.js         → transport (HTTP + SSE)
 *   services/adapters/liveMonitoringAdapters.js → backend şeması → görünüm modeli
 *   hooks/useLiveTelemetry.js            → tekil veri hook'ları (state/tampon)
 *   hooks/useLiveMonitoringData.js       → bileşik hook (bu modülün veri yüzü)
 */

const initialDTState = {
    dt: '',
    system: '',
    robot: '',
    subsystem: '',
    signalSet: ''
};

const initialTimeRange = {
    mode: 'live',
    start: null,
    end: null,
    window: DEFAULT_LIVE_WINDOW,
    preset: null
};

const LiveMonitoring = ({ drillContext }) => {
    const [selectedDT, setSelectedDT] = useState(initialDTState);
    const [showSimulation, setShowSimulation] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [timeRange, setTimeRange] = useState(initialTimeRange);

    // ═══ CANLI VERİ (composite hook — tüm fetch/SSE/dönüşüm mantığı içeride) ═══
    const live = useLiveMonitoringData({ selectedDT, isStreaming, timeRange });

    // Apply drill-through context from PdM (asset + time window) to Live Monitoring selections.
    // Note: LiveMonitoring currently doesn't have true "asset-aware" telemetry, so we map to OTOKAR_PDM twin + history mode.
    const drillBadge = useMemo(() => {
        if (!drillContext) return null;
        const start = drillContext.windowStartUtc ? new Date(drillContext.windowStartUtc) : null;
        const end = drillContext.windowEndUtc ? new Date(drillContext.windowEndUtc) : null;
        const rangeLabel = start && end
            ? `${start.toLocaleString('en-US')} → ${end.toLocaleString('en-US')}`
            : 'Time window unavailable';
        return {
            assetId: drillContext.assetId,
            componentId: drillContext.componentId,
            alarmId: drillContext.alarmId,
            rangeLabel
        };
    }, [drillContext]);

    useEffect(() => {
        if (!drillContext) return;

        // Switch to a reasonable default that can visualize PdM-related signals.
        setSelectedDT({
            dt: 'OTOKAR_PDM',
            system: 'CHASSIS_INSPECTION',
            robot: 'ROKOS',
            subsystem: 'SERVO_DRIVE',
            signalSet: 'SENSOR_DATA'
        });

        // Put time range control into history mode and show window range (if present).
        setTimeRange((prev) => ({
            ...prev,
            mode: 'history',
            preset: null,
            start: drillContext.windowStartUtc || null,
            end: drillContext.windowEndUtc || null
        }));

        // Do not auto-start streaming; user can decide.
        setIsStreaming(false);
    }, [drillContext]);

    const handleStreamToggle = () => {
        if (isStreaming) {
            // Stop Stream → seçimleri sıfırla
            setIsStreaming(false);
            setSelectedDT(initialDTState);
        } else {
            setIsStreaming(true);
        }
    };

    return (
        <div className="h-full flex flex-col min-h-0 p-4 bg-slate-50 overflow-auto">
            {/* ═══ ANA ODAK: Factory Camera + Digital Twin Viewer ═══ */}
            <div className="flex gap-4 h-[calc(100vh-5.5rem)] flex-none mb-4">
                <div className="flex-1 min-w-0">
                    <FactoryCameraFeed />
                </div>
                <div className="flex-1 min-w-0">
                    <DigitalTwinViewer />
                </div>
            </div>

            {/* Data Quality Indicator */}
            <div className="flex-none mb-4">
                <DataQualityIndicator
                    selectedDT={selectedDT.dt}
                    liveMetrics={live.liveActive ? live.qualityMetrics : null}
                />
            </div>

            {/* DT Selector (tam genişlik) */}
            <div className="flex-none mb-4">
                <DTSelector
                    selected={selectedDT}
                    onChange={setSelectedDT}
                    isStreaming={isStreaming}
                    onToggleStream={handleStreamToggle}
                    liveAssets={live.catalog.assets}
                />
            </div>

            {/* Canlı mod: katalog yüklenemedi uyarısı */}
            {live.isLive && live.catalog.error && (
                <div className="flex-none mb-4 px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                    <span className="font-bold">Backend unreachable.</span>
                    <span className="ml-2">
                        Could not load asset/signal catalog from the API. Make sure the backend
                        is running (uvicorn app.main:app) and reachable at the configured URL.
                    </span>
                </div>
            )}

            {/* KPI Cards Row */}
            <div className="flex-none mb-4">
                <KPICards
                    showSimulation={showSimulation}
                    isStreaming={isStreaming}
                    selectedDT={selectedDT.dt}
                    liveMode={live.isLive}
                    liveCards={live.kpiCards}
                />
            </div>

            {/* Time Series Section */}
            <div className="flex-none">
                {drillBadge && (
                    <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                        <span className="font-bold">From PdM Alarm</span>
                        <span className="ml-2 font-mono text-[10px] text-blue-700">{drillBadge.alarmId}</span>
                        <div className="mt-1 text-[11px] text-blue-700">
                            Asset: <span className="font-semibold">{drillBadge.assetId}</span>
                            {drillBadge.componentId ? (
                                <>
                                    {' '}· Component: <span className="font-semibold">{drillBadge.componentId}</span>
                                </>
                            ) : null}
                        </div>
                        <div className="text-[11px] text-blue-700">
                            Window: <span className="font-semibold">{drillBadge.rangeLabel}</span>
                        </div>
                    </div>
                )}
                <TimeSeriesWidgets
                    selectedDT={selectedDT}
                    showSimulation={showSimulation}
                    timeRange={timeRange}
                    onTimeRangeChange={setTimeRange}
                    isStreaming={isStreaming}
                    liveMode={live.isLive}
                    liveSignals={live.signals}
                    liveStreamError={live.streamError}
                    historyLoading={live.history.loading}
                    historyError={!!live.history.error}
                />
            </div>
        </div>
    );
};

export default LiveMonitoring;
