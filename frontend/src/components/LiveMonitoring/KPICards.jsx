import React, { useMemo } from 'react';
import { Activity } from 'lucide-react';
import KPICard from '../shared/KPICard';
import { Panel, EmptyState } from '../shared';
import { fetchLiveMonitoringKPIs } from '../../services/kpiBackend';

/**
 * LIVE MONITORING - KPI DASHBOARD
 * 
 * Bu bileşen sadece "Görünüm" (View) katmanıdır.
 * Veri 'liveMonitoringService' (fake backend) üzerinden gelir.
 */
const KPICards = ({ showSimulation, isStreaming, selectedDT }) => {

    // Fake API çağrısı
    const kpis = useMemo(() => fetchLiveMonitoringKPIs(showSimulation, selectedDT), [showSimulation, selectedDT]);

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
