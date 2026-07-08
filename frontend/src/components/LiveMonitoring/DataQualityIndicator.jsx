import React, { useMemo } from 'react';
import { Wifi, WifiOff, Clock, AlertTriangle, Package, AlertCircle, HelpCircle } from 'lucide-react';
import { fetchDataQualityMetrics } from '../../services/liveMonitoringBackend';

/**
 * DATA QUALITY INDICATOR BİLEŞENİ
 * Veri kalitesi göstergesi.
 * 
 * Bu bileşen sadece "Görünüm" (View) katmanıdır.
 * - liveMetrics prop'u verilirse (OTOKAR_LIVE canlı mod), gerçek backend'den
 *   hesaplanan metrikler gösterilir (bkz. LiveMonitoring → buildLiveQualityMetrics).
 * - Aksi halde 'liveMonitoringBackend' (mock) servisi kullanılır.
 */
const DataQualityIndicator = ({ selectedDT, liveMetrics = null }) => {

    // Mock kalite metrikleri (canlı mod dışı)
    const mockMetrics = useMemo(() => fetchDataQualityMetrics(selectedDT), [selectedDT]);

    const metrics = liveMetrics || mockMetrics;

    const isHealthMissing = metrics.qualityFlag === 'UNKNOWN';
    const hasGapDetected = metrics.gaps > 0;
    const hasQualityIssue = metrics.qualityFlag !== 'GOOD' && !isHealthMissing;

    const getLatencyColor = (status) => {
        switch (status) {
            case 'critical': return 'text-rose-600';
            case 'warning': return 'text-amber-600';
            default: return 'text-emerald-600';
        }
    };

    const getLatencyBg = (status) => {
        switch (status) {
            case 'critical': return 'bg-rose-100';
            case 'warning': return 'bg-amber-100';
            default: return 'bg-slate-100';
        }
    };

    const getQualityFlagStyle = (flag) => {
        switch (flag) {
            case 'GOOD': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
            case 'DEGRADED': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
            case 'BAD': return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' };
            case 'UNKNOWN': return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' };
            default: return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' };
        }
    };

    const getConnectionIcon = () => {
        switch (metrics.connectionStatus) {
            case 'disconnected': return <WifiOff size={14} className="text-rose-500" />;
            case 'degraded': return <Wifi size={14} className="text-amber-500" />;
            default: return <Wifi size={14} className="text-emerald-500" />;
        }
    };

    const getConnectionLabel = () => {
        switch (metrics.connectionStatus) {
            case 'disconnected': return 'Disconnected';
            case 'degraded': return 'Degraded';
            default: return 'Connected';
        }
    };

    const getConnectionBg = () => {
        switch (metrics.connectionStatus) {
            case 'disconnected': return 'bg-rose-50 border-rose-200';
            case 'degraded': return 'bg-amber-50 border-amber-200';
            default: return 'bg-white border-slate-200';
        }
    };

    const qualityStyle = getQualityFlagStyle(metrics.qualityFlag);

    return (
        <div className="flex flex-col gap-2">
            {/* Main Indicator Bar */}
            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border shadow-sm ${getConnectionBg()}`}>
                {/* Connection Status */}
                <div className="flex items-center gap-1.5">
                    {getConnectionIcon()}
                    <span className={`text-xs font-semibold ${metrics.connectionStatus === 'connected' ? 'text-emerald-700' :
                        metrics.connectionStatus === 'degraded' ? 'text-amber-700' : 'text-rose-700'
                        }`}>
                        {getConnectionLabel()}
                    </span>
                </div>

                <div className="w-px h-4 bg-slate-200" />

                {/* Quality Flag */}
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border ${qualityStyle.bg} ${qualityStyle.border}`}>
                    {isHealthMissing ? (
                        <HelpCircle size={12} className="text-slate-400" />
                    ) : metrics.qualityFlag === 'GOOD' ? (
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    ) : (
                        <AlertCircle size={12} className={qualityStyle.text} />
                    )}
                    <span className={`text-[10px] font-bold ${qualityStyle.text}`}>
                        {metrics.qualityFlag}
                    </span>
                </div>

                <div className="w-px h-4 bg-slate-200" />

                {/* Latency */}
                <div className="flex items-center gap-1.5">
                    <div className={`p-1 rounded ${getLatencyBg(metrics.latencyStatus)}`}>
                        <Clock size={12} className={getLatencyColor(metrics.latencyStatus)} />
                    </div>
                    <div className="text-xs">
                        <span className="text-slate-500">Lag:</span>
                        <span className={`ml-1 font-semibold ${getLatencyColor(metrics.latencyStatus)}`}>
                            {metrics.latency}ms
                        </span>
                    </div>
                </div>

                <div className="w-px h-4 bg-slate-200" />

                {/* Data Gaps */}
                <div className="flex items-center gap-1.5">
                    <div className={`p-1 rounded ${hasGapDetected ? 'bg-amber-100' : 'bg-slate-100'}`}>
                        <AlertTriangle size={12} className={hasGapDetected ? 'text-amber-600' : 'text-slate-400'} />
                    </div>
                    <div className="text-xs">
                        <span className="text-slate-500">{metrics.gapRatePct != null ? 'Gap Rate:' : 'Gaps:'}</span>
                        <span className={`ml-1 font-semibold ${hasGapDetected ? 'text-amber-600' : 'text-slate-600'}`}>
                            {metrics.gapRatePct != null ? `${metrics.gapRatePct}%` : metrics.gaps}
                        </span>
                    </div>
                </div>

                <div className="w-px h-4 bg-slate-200" />

                {/* Packet Loss */}
                <div className="flex items-center gap-1.5">
                    <div className={`p-1 rounded ${metrics.packetLoss > 1 ? 'bg-rose-100' : 'bg-slate-100'}`}>
                        <Package size={12} className={metrics.packetLoss > 1 ? 'text-rose-600' : 'text-slate-400'} />
                    </div>
                    <div className="text-xs">
                        <span className="text-slate-500">Drop:</span>
                        <span className={`ml-1 font-semibold ${metrics.packetLoss > 1 ? 'text-rose-600' : 'text-slate-600'}`}>
                            {metrics.packetLoss}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Warning Banner */}
            {(hasGapDetected || hasQualityIssue || isHealthMissing) && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isHealthMissing ? 'bg-slate-50 border-slate-200' :
                    hasQualityIssue ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'
                    }`}>
                    <AlertCircle size={14} className={
                        isHealthMissing ? 'text-slate-500' :
                            hasQualityIssue ? 'text-rose-600' : 'text-amber-600'
                    } />
                    <span className={`text-xs font-medium ${isHealthMissing ? 'text-slate-700' :
                        hasQualityIssue ? 'text-rose-800' : 'text-amber-800'
                        }`}>
                        {isHealthMissing
                            ? 'Health metrics unavailable. Quality status: UNKNOWN.'
                            : hasQualityIssue
                                ? `Data quality degraded. Quality flag: ${metrics.qualityFlag}. Check signal integrity.`
                                : `Data gap detected. Last gap duration: ${metrics.gapDuration || 'N/A'}. Operator attention required.`
                        }
                    </span>
                </div>
            )}
        </div>
    );
};

export default DataQualityIndicator;
