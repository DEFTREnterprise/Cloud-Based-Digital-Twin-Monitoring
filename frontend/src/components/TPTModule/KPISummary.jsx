import React, { useMemo } from 'react';
import {
    Clock,
    AlertTriangle,
    TrendingUp,
    ShieldAlert,
    Activity
} from 'lucide-react';
import KPICard from '../shared/KPICard';
import { Panel, EmptyState } from '../shared';
import { fetchTPTKPIMetrics } from '../../services/kpiBackend';

/**
 * KPI DASHBOARD BİLEŞENİ
 * 
 * Bu bileşen sadece "Görünüm" (View) katmanıdır.
 * Veriyi process etmez, hesaplama yapmaz.
 * Sadece 'kpiService' (fake backend) üzerinden gelen hazır sonucu gösterir.
 */
const KPISummary = ({ selectedRun }) => {

    // Fake API çağrısı (Senkronize çalışır)
    const metrics = useMemo(() => fetchTPTKPIMetrics(selectedRun), [selectedRun]);

    if (!metrics) {
        return (
            <Panel variant="ghost" className="border-dashed flex items-center justify-center p-8 text-neutral-400">
                <EmptyState
                    icon={Activity}
                    title="Select a Run to Analyze"
                    description="Choose a valid run from the list to see KPI metrics."
                    className="min-h-[120px]"
                />
            </Panel>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">

            {/* 1. YÖRÜNGE SAPMASI */}
            <KPICard
                title="TCP Path Deviation"
                value={metrics.deviation.value}
                unit="mm"
                status={metrics.deviation.status}
                icon={TrendingUp}
                subtitle="Acceptable: < 1.0mm"
            />

            {/* 2. İHLAL SAYISI */}
            <KPICard
                title="Violation Count"
                value={metrics.violation.count}
                status={metrics.violation.status}
                icon={AlertTriangle}
                subtitle={metrics.violation.summary}
            />

            {/* 3. ÇARPIŞMA RİSKİ */}
            <KPICard
                title="Collision Risk"
                value={metrics.collision.text}
                status={metrics.collision.status}
                icon={ShieldAlert}
                subtitle={metrics.collision.detail}
            />

            {/* 4. TOPLAM SÜRE */}
            <KPICard
                title="Cycle Time"
                value={metrics.duration}
                status="normal"
                icon={Clock}
                subtitle="Run Duration"
            />

            {/* 5. GENEL DURUM */}
            <KPICard
                title="Run Status"
                value={metrics.status.text}
                status={metrics.status.color} // Backend'den uyumlu renk kodu gelmesi beklenir
                icon={metrics.status.icon}
                subtitle={`Objective: ${metrics.status.objective}`}
            />
        </div>
    );
};

export default KPISummary;
