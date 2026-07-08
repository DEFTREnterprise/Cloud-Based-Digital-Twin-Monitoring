import React, { useMemo } from 'react';
import { Activity, Loader2 } from 'lucide-react';
import KPICard from '../shared/KPICard';
import { Panel, EmptyState } from '../shared';
import { fetchLiveMonitoringKPIs } from '../../services/kpiBackend';

/**
 * LIVE MONITORING - KPI DASHBOARD
 *
 * Bu bileşen SAF "Görünüm" (View) katmanıdır ve backend şemasını BİLMEZ.
 * - liveMode=true iken hazır kart modelleri `liveCards` prop'u ile gelir
 *   (dönüşüm: services/adapters/liveMonitoringAdapters.js → buildLiveKpiCards).
 * - Diğer durumlarda 'kpiBackend' (mock) servisi kullanılır.
 */
const KPICards = ({ showSimulation, isStreaming, selectedDT, liveMode = false, liveCards = null }) => {

    // Mock API çağrısı (canlı mod dışındaki DT'ler için)
    const mockKpis = useMemo(
        () => fetchLiveMonitoringKPIs(showSimulation, selectedDT),
        [showSimulation, selectedDT]
    );

    const kpis = liveMode ? (liveCards || []) : mockKpis;

    if (!isStreaming) {
        return (
            <Panel variant="ghost" className="border-dashed flex items-center justify-center p-8 text-neutral-400 bg-slate-50/50">
                <EmptyState
                    icon={Activity}
                    title="No Live Data"
                    description="Start streaming to view Key Performance Indicators."
                    className="min-h-[120px]"
                />
            </Panel>
        );
    }

    // Canlı mod: ilk KPI yanıtı beklenirken yükleniyor durumu
    if (liveMode && kpis.length === 0) {
        return (
            <Panel variant="ghost" className="border-dashed flex items-center justify-center p-8 text-neutral-400 bg-slate-50/50">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 size={16} className="animate-spin" />
                    Loading live KPIs from backend...
                </div>
            </Panel>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {kpis.map((kpi) => (
                <KPICard
                    key={kpi.id}
                    title={kpi.title}
                    value={kpi.value}
                    unit={kpi.unit}
                    icon={kpi.icon}
                    status={kpi.status}
                    trend={kpi.trend}
                    trendValue={kpi.trendValue}
                    subtitle={kpi.subtitle}
                />
            ))}
        </div>
    );
};

export default KPICards;
