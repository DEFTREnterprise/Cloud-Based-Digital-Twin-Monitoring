import React, { useMemo } from 'react';
import { Activity, Bell, Clock, AlertTriangle, Cpu } from 'lucide-react';
import KPICard from '../shared/KPICard';

const PdmKPICards = ({ summary }) => {
    const kpis = useMemo(() => {
        if (!summary) return null;

        const highest = summary.highestRiskAsset || {};
        const scoreValue = highest.maxScore ?? 0;

        let scoreStatus = 'normal';
        if (scoreValue >= 0.7) scoreStatus = 'critical';
        else if (scoreValue >= 0.45) scoreStatus = 'warning';
        else if (scoreValue > 0) scoreStatus = 'success';

        const hasOpenCritical = summary.criticalOpen > 0;

        return {
            highestScore: {
                title: 'Highest Anomaly Score',
                value: scoreValue.toFixed(2),
                status: scoreStatus,
                icon: Activity,
                subtitle: highest.assetName || highest.assetId || 'No active asset',
            },
            openAlarms: {
                title: 'Open Alarms',
                value: summary.openAlarms,
                status: hasOpenCritical ? 'critical' : summary.openAlarms > 0 ? 'warning' : 'success',
                icon: Bell,
                subtitle: `${summary.criticalOpen} critical · ${summary.warnOpen} warning`,
            },
            avgAckTime: {
                title: 'Avg Acknowledge Time',
                value: summary.avgCloseTimeMinutes > 0 ? summary.avgCloseTimeMinutes : '—',
                unit: summary.avgCloseTimeMinutes > 0 ? 'min' : undefined,
                status: summary.avgCloseTimeMinutes > 60 ? 'critical' : summary.avgCloseTimeMinutes > 30 ? 'warning' : 'normal',
                icon: Clock,
                subtitle: `${summary.closedAlarms} closed / ${summary.totalAlarms} total`,
            },
            topComponent: {
                title: 'Top Problem Component',
                value: summary.topProblemComponent || '—',
                status: summary.topProblemCount > 0 ? 'warning' : 'normal',
                icon: AlertTriangle,
                subtitle: `${summary.topProblemCount} alarm(s)`,
            },
            modelVersion: {
                title: 'PdM Model Version',
                value: summary.modelVersion || '—',
                status: 'normal',
                icon: Cpu,
                subtitle: `${summary.assetsMonitored} assets monitored`,
            },
        };
    }, [summary]);

    if (!summary || !kpis) {
        // Simple skeleton aligned with shared card layout
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl border border-neutral-200 p-5 animate-pulse">
                        <div className="h-3 bg-neutral-200 rounded w-1/2 mb-3" />
                        <div className="h-6 bg-neutral-200 rounded w-1/3 mb-2" />
                        <div className="h-3 bg-neutral-100 rounded w-2/3" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <KPICard
                title={kpis.highestScore.title}
                value={kpis.highestScore.value}
                status={kpis.highestScore.status}
                icon={kpis.highestScore.icon}
                subtitle={kpis.highestScore.subtitle}
            />
            <KPICard
                title={kpis.openAlarms.title}
                value={kpis.openAlarms.value}
                status={kpis.openAlarms.status}
                icon={kpis.openAlarms.icon}
                subtitle={kpis.openAlarms.subtitle}
            />
            <KPICard
                title={kpis.avgAckTime.title}
                value={kpis.avgAckTime.value}
                unit={kpis.avgAckTime.unit}
                status={kpis.avgAckTime.status}
                icon={kpis.avgAckTime.icon}
                subtitle={kpis.avgAckTime.subtitle}
            />
            <KPICard
                title={kpis.topComponent.title}
                value={kpis.topComponent.value}
                status={kpis.topComponent.status}
                icon={kpis.topComponent.icon}
                subtitle={kpis.topComponent.subtitle}
            />
            <KPICard
                title={kpis.modelVersion.title}
                value={kpis.modelVersion.value}
                status={kpis.modelVersion.status}
                icon={kpis.modelVersion.icon}
                subtitle={kpis.modelVersion.subtitle}
            />
        </div>
    );
};

export default PdmKPICards;
