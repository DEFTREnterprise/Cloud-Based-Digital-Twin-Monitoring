/**
 * ═══════════════════════════════════════════════════════════════════════════
 * KPI BACKEND - KPI SERVİSLERİ
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Bu dosya, backend yazılana kadar kullanılacak "sahte" KPI veri servislerini içerir.
 * Gerçek backend hazır olduğunda, bu fonksiyonların içi API çağrılarıyla değiştirilecek.
 * 
 * İçerik:
 *   1. fetchTPTKPIMetrics()      → TPT Modülü için KPI verileri
 *   2. fetchLiveMonitoringKPIs() → Canlı İzleme modülü için KPI verileri
 *   3. fetchESOGUDTKPIs()        → ESOGU DT Tool için KPI verileri
 */

import {
    Activity,
    CheckCircle2,
    Clock,
    XCircle,
    AlertTriangle,
    GitCompare,
    BarChart3,
    Play,
    CheckCircle,
    Target,
    FileCheck,
    AlertOctagon,
    TrendingUp,
    RefreshCw,
    Zap,
    Thermometer,
    ActivitySquare,
    Timer,
    Bell
} from 'lucide-react';


// ═══════════════════════════════════════════════════════════════════════════
// 1. TPT MODÜLÜ - KPI SERVİSİ
// ═══════════════════════════════════════════════════════════════════════════

export const fetchTPTKPIMetrics = (selectedRun) => {
    if (!selectedRun || !selectedRun.raw) return null;

    const raw = selectedRun.raw;
    const events = raw.Trajectory_Validation_Events || [];

    // Sapma (Deviation) Hesaplama
    let maxDeviation = 0;
    events.forEach(e => {
        const match = e.Metric_Value?.match(/dev:\s*([0-9.]+)/i) ||
            e.Metric_Value?.match(/deviation_m:\s*([0-9.]+)/i) ||
            e.Metric_Value?.match(/(\d+(\.\d+)?)/);
        if (match) {
            const val = parseFloat(match[1]);
            if (val > maxDeviation) maxDeviation = val;
        }
    });
    const deviationStatus = maxDeviation > 2 ? 'critical' : (maxDeviation > 1 ? 'warning' : 'success');

    // İhlal (Violation) Hesaplama
    const violationStats = events.reduce((acc, curr) => {
        const type = curr.Violation_Type || 'Unknown';
        acc.total++;
        acc.byType[type] = (acc.byType[type] || 0) + 1;
        return acc;
    }, { total: 0, byType: {} });

    const violationStatus = violationStats.total > 10 ? 'critical' : (violationStats.total > 5 ? 'warning' : 'normal');

    const types = Object.entries(violationStats.byType);
    let violationSummary = 'No violations';
    if (types.length > 0) {
        const top = types.slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(', ');
        violationSummary = types.length > 2 ? `${top} +${types.length - 2} more` : top;
    }

    // Çarpışma (Collision) Hesaplama
    const collisionEvents = events.filter(e =>
        e.Violation_Type?.toLowerCase().includes('collision') ||
        e.Severity === 'CRITICAL'
    );
    const hasCollision = collisionEvents.length > 0;

    // Süre (Duration) Hesaplama
    let durationStr = '--';
    if (raw.Run_Meta_Status?.Start_Time && raw.Run_Meta_Status?.End_Time) {
        const start = new Date(raw.Run_Meta_Status.Start_Time);
        const end = new Date(raw.Run_Meta_Status.End_Time);
        const diffMs = end - start;
        const minutes = Math.floor(diffMs / 60000);
        const seconds = Math.floor((diffMs % 60000) / 1000);
        durationStr = `${minutes}m ${seconds}s`;
    }

    // Genel Durum (Status)
    const rawStatus = raw.Run_Meta_Status?.State || 'unknown';
    let statusColor = 'inactive';
    let statusIcon = Activity;

    if (rawStatus === 'success') { statusColor = 'success'; statusIcon = CheckCircle2; }
    else if (rawStatus === 'fail') { statusColor = 'critical'; statusIcon = XCircle; }
    else if (rawStatus === 'running') { statusColor = 'warning'; statusIcon = Clock; }

    return {
        deviation: { value: maxDeviation.toFixed(2), status: deviationStatus },
        violation: { count: violationStats.total, status: violationStatus, summary: violationSummary },
        collision: { text: hasCollision ? 'DETECTED' : 'None', status: hasCollision ? 'critical' : 'success', detail: hasCollision ? `${collisionEvents.length} critical events` : 'Safe operation' },
        duration: durationStr,
        status: { text: rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1), color: statusColor, icon: statusIcon, objective: raw.Target_Trajectory?.Objective || 'N/A' }
    };
};


// ═══════════════════════════════════════════════════════════════════════════
// 2. CANLI İZLEME (LIVE MONITORING) - KPI SERVİSİ
// ═══════════════════════════════════════════════════════════════════════════

export const fetchLiveMonitoringKPIs = (showSimulation = true, selectedDT = null) => {

    // 1. Common (Base) KPIs - Always shown
    const baseKPIs = [
        {
            id: 'latency',
            title: 'LIVE DATA LATENCY',
            value: 45,
            unit: 'ms',
            icon: Clock,
            status: 'normal',
            trend: 'stable',
            trendValue: '±2ms',
            subtitle: 'Live data latency (Target: < 100ms)'
        },
        {
            id: 'dataGap',
            title: 'DATA GAP RATE',
            value: 0.2,
            unit: '%',
            icon: BarChart3,
            status: 'normal',
            trend: 'down',
            trendValue: '-0.1%',
            subtitle: 'Data loss rate (Target: < 1%)'
        }
    ];

    // 2. TPT Specific KPIs
    if (selectedDT === 'TPT') {
        const tptKPIs = [
            {
                id: 'pathDev',
                title: 'PATH DEVIATION',
                value: 3.2,
                unit: 'mm',
                icon: GitCompare,
                status: 'warning',
                trend: 'up',
                trendValue: '+0.5mm',
                subtitle: 'Planned vs. Realized path deviation'
            },
            {
                id: 'cycleTime',
                title: 'CYCLE TIME',
                value: 40.5,
                unit: 's',
                icon: Clock,
                status: 'normal',
                trend: 'stable',
                subtitle: 'Process time (vs Target)'
            },
            {
                id: 'jointSync',
                title: 'JOINT SYNC ERROR',
                value: 0.02,
                unit: 'rad',
                icon: AlertTriangle,
                status: 'success',
                trend: 'stable',
                subtitle: 'Joint synchronization error'
            },
            {
                id: 'timeImp',
                title: 'TIME IMPROVEMENT',
                value: 12,
                unit: '%',
                icon: TrendingUp,
                status: 'success',
                trend: 'up',
                trendValue: '+2%',
                subtitle: 'Time saved vs old system'
            },
            {
                id: 'completedCycles',
                title: 'COMPLETED CYCLES',
                value: 85,
                unit: '',
                icon: RefreshCw,
                status: 'normal',
                trend: 'up',
                trendValue: '+5',
                subtitle: 'Cycles completed in last hour'
            }
        ];
        return [...baseKPIs, ...tptKPIs];
    }

    // 3. OTOKAR PDM Specific KPIs
    if (selectedDT === 'OTOKAR_PDM') {
        const otokarKPIs = [
            {
                id: 'anomalyScore',
                title: 'ANOMALY SCORE',
                value: 3.2,
                unit: 'z-score',
                icon: Zap,
                status: 'normal',
                trend: 'stable',
                trendValue: '±0.1',
                subtitle: 'AI-based anomaly score (Z-score)'
            },
            {
                id: 'maxTemp',
                title: 'MAX TEMPERATURE',
                value: 65,
                unit: '°C',
                icon: Thermometer,
                status: 'warning',
                trend: 'up',
                trendValue: '+2°C',
                subtitle: 'Max motor/driver temperature'
            },
            {
                id: 'paramDrift',
                title: 'PARAM DRIFT',
                value: 0.8,
                unit: '%',
                icon: ActivitySquare,
                status: 'normal',
                trend: 'stable',
                subtitle: 'Physical parameter drift'
            },
            {
                id: 'rul',
                title: 'RUL (REMAINING LIFE)',
                value: 1250,
                unit: 'h',
                icon: Timer,
                status: 'success',
                trend: 'down',
                subtitle: 'Estimated remaining life'
            },
            {
                id: 'activeAlerts',
                title: 'ACTIVE ALERTS',
                value: 2,
                unit: '',
                icon: Bell,
                status: 'warning',
                trend: 'up',
                trendValue: '+1',
                subtitle: 'Active critical or warning alerts'
            }
        ];
        return [...baseKPIs, ...otokarKPIs];
    }

    // 4. ESOGU DT Specific KPIs
    if (selectedDT === 'ESOGU_DT') {
        const esoguKPIs = [
            {
                id: 'realSimDev',
                title: 'REAL VS SIM DEVIATION',
                value: 0.15,
                unit: 'RMSE',
                icon: GitCompare,
                status: 'normal',
                trend: 'stable',
                subtitle: 'Real vs Simulation difference'
            },
            {
                id: 'fmuStepTime',
                title: 'FMU STEP TIME',
                value: 1.2,
                unit: 'ms',
                icon: Timer,
                status: 'normal',
                trend: 'up',
                trendValue: '+0.1ms',
                subtitle: 'Sim. step calculation time'
            },
            {
                id: 'scenarioPass',
                title: 'SCENARIO PASS RATE',
                value: 94,
                unit: '%',
                icon: CheckCircle,
                status: 'success',
                trend: 'up',
                trendValue: '+2%',
                subtitle: 'Test scenario success rate'
            },
            {
                id: 'testCoverage',
                title: 'TEST COVERAGE',
                value: 88,
                unit: '%',
                icon: FileCheck,
                status: 'warning',
                trend: 'stable',
                subtitle: 'Test coverage rate'
            },
            {
                id: 'solverWarnings',
                title: 'SOLVER WARNINGS',
                value: 0,
                unit: '',
                icon: AlertOctagon,
                status: 'success',
                subtitle: 'Mathematical solver errors'
            }
        ];
        return [...baseKPIs, ...esoguKPIs];
    }

    return baseKPIs;
};


// ═══════════════════════════════════════════════════════════════════════════
// 3. ESOGU DT TOOL - KPI SERVİSİ
// ═══════════════════════════════════════════════════════════════════════════

export const fetchESOGUDTKPIs = () => {
    return [
        { id: 'weeklyRuns', title: 'Weekly Runs', value: '42', icon: Play, status: 'normal', trend: 'up', trendValue: '+5', subtitle: 'vs. last week' },
        { id: 'successRate', title: 'Run Success Rate', value: '92%', icon: CheckCircle, status: 'success', subtitle: 'Target: 90%' },
        { id: 'verificationRate', title: 'Verification Pass Rate', value: '88%', icon: Target, status: 'warning', trend: 'down', trendValue: '-2%', subtitle: 'Slightly below target' },
        { id: 'avgDuration', title: 'Avg. Run Duration', value: '14m 20s', icon: Clock, status: 'normal', subtitle: 'Stable performance' },
        { id: 'coverage', title: 'Evidence Coverage', value: '100%', icon: FileCheck, status: 'success', trend: 'up', trendValue: '+5%', subtitle: 'Full Evidence Set' },
        { id: 'errors', title: 'HIL Errors/Timeout', value: '3', icon: AlertOctagon, status: 'critical', subtitle: 'Requires attention' }
    ];
};
