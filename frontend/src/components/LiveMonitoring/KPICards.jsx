import React, { useEffect, useState, useRef } from 'react';
import { Activity, Clock, ShieldCheck, AlertTriangle, Database } from 'lucide-react';
import KPICard from '../shared/KPICard';
import { Panel, EmptyState } from '../shared';
import { fetchKpiLive } from '../../services/liveTelemetryApi';

/**
 * LIVE MONITORING - KPI DASHBOARD  (CANLI - Faz 2.4.3)
 *
 * ARTIK MOCK DEGIL: veriler backend'in GET /api/v1/kpi/live ucundan gelir.
 * Zincir: IU -> otokar_iu_bridge -> MQTT -> mqtt_worker -> TimescaleDB -> bu kart.
 *
 * Auth: utils/api.js interceptor Bearer token'i ekler; backend tenant
 * filtresini token'daki tenant_code'a gore uygular (otokar_user -> OTOKAR).
 *
 * Backend donusu:
 *   { computed_at, window_hours, ingest_lag_p95_ms, gap_rate_pct,
 *     threshold_violations, event_count, quality_ok_pct }
 */

const POLL_MS = 10000;   // 10 sn'de bir tazele

// Backend ham cevabini KPICard prop'larina cevirir (adapter gorevi).
const toCards = (k) => {
    const lagSec = k.ingest_lag_p95_ms != null ? k.ingest_lag_p95_ms / 1000 : null;
    const qualityPct = k.quality_ok_pct;

    return [
        {
            id: 'quality',
            title: 'Data Quality',
            value: qualityPct != null ? qualityPct.toFixed(1) : '--',
            unit: '%',
            icon: ShieldCheck,
            status: qualityPct == null ? 'neutral'
                : qualityPct >= 95 ? 'good'
                : qualityPct >= 80 ? 'warning' : 'critical',
            subtitle: 'OK oranı (son pencere)',
        },
        {
            id: 'lag',
            title: 'Ingest Lag p95',
            value: lagSec != null ? lagSec.toFixed(0) : '--',
            unit: 's',
            icon: Clock,
            status: 'neutral',
            subtitle: 'IU toplama periyodu dahil',
        },
        {
            id: 'events',
            title: 'Event Count',
            value: k.event_count != null ? String(k.event_count) : '--',
            unit: '',
            icon: Database,
            status: 'neutral',
            subtitle: `Son ${k.window_hours ?? '-'} saat`,
        },
        {
            id: 'gap',
            title: 'Gap Rate',
            value: k.gap_rate_pct != null ? k.gap_rate_pct.toFixed(1) : '--',
            unit: '%',
            icon: Activity,
            status: k.gap_rate_pct == null ? 'neutral'
                : k.gap_rate_pct <= 5 ? 'good' : 'warning',
            subtitle: 'Veri boşluğu oranı',
        },
        {
            id: 'violations',
            title: 'Threshold Violations',
            value: k.threshold_violations != null ? k.threshold_violations : '--',
            unit: '',
            icon: AlertTriangle,
            status: k.threshold_violations > 0 ? 'warning' : 'good',
            subtitle: 'Eşik ihlali sayısı',
        },
    ];
};

const KPICards = ({ isStreaming }) => {
    const [cards, setCards] = useState(null);
    const [error, setError] = useState(null);
    const timerRef = useRef(null);

    useEffect(() => {
        if (!isStreaming) {
            setCards(null);
            setError(null);
            return;
        }

        let cancelled = false;

        const load = async () => {
            try {
                const data = await fetchKpiLive();
                if (cancelled) return;
                setCards(toCards(data));
                setError(null);
            } catch (err) {
                if (cancelled) return;
                console.error('[KPI] canli veri alinamadi:', err);
                setError(err?.response?.status === 401 ? 'Oturum süresi doldu' : 'KPI alınamadı');
            }
        };

        load();                                    // hemen bir kez
        timerRef.current = setInterval(load, POLL_MS);

        return () => {
            cancelled = true;
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isStreaming]);

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

    if (error) {
        return (
            <Panel variant="ghost" className="border-dashed flex items-center justify-center p-6 text-red-500 bg-red-50/40">
                <span className="text-sm">{error}</span>
            </Panel>
        );
    }

    if (!cards) {
        return (
            <Panel variant="ghost" className="border-dashed flex items-center justify-center p-8 text-neutral-400">
                <span className="text-sm">KPI yükleniyor…</span>
            </Panel>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {cards.map((kpi) => (
                <KPICard
                    key={kpi.id}
                    title={kpi.title}
                    value={kpi.value}
                    unit={kpi.unit}
                    icon={kpi.icon}
                    status={kpi.status}
                    subtitle={kpi.subtitle}
                />
            ))}
        </div>
    );
};

export default KPICards;