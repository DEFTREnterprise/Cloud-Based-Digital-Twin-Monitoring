import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PdmKPICards from './PdmKPICards';
import AlarmWall from './AlarmWall';
import AnomalyScoreChart from './AnomalyScoreChart';
import AlarmDetailPanel from './AlarmDetailPanel';
import {
    fetchPdmSummary,
    fetchAlarmList,
    fetchAlarmDetail,
    fetchAnomalyScoreHistory,
    fetchAssetRiskSummary,
    fetchComponentOptions,
    fetchThresholds,
} from '../../services/pdmBackend';

const PdmModule = ({ onDrillThroughToLive }) => {
    // ── State ──────────────────────────────────────────────────────────────
    const [summary, setSummary] = useState(null);
    const [alarms, setAlarms] = useState(null);
    const [filters, setFilters] = useState({
        assetId: null,
        severity: null,
        state: null,
        alarmType: null,
        componentId: null,
        startDate: null,
        endDate: null,
        page: 1,
        pageSize: 20,
    });
    const [selectedAlarmId, setSelectedAlarmId] = useState(null);
    const [alarmDetail, setAlarmDetail] = useState(null);
    const [selectedComponent, setSelectedComponent] = useState(null);
    const [scoreHistory, setScoreHistory] = useState([]);
    const [componentOptions, setComponentOptions] = useState([]);
    const [assetRisk, setAssetRisk] = useState([]);
    const [thresholds, setThresholds] = useState(null);

    // ── Initial Data Load ──────────────────────────────────────────────────
    useEffect(() => {
        // Load summary stats
        const summaryData = fetchPdmSummary();
        setSummary(summaryData);

        // Load component options for anomaly chart
        const options = fetchComponentOptions();
        setComponentOptions(options);

        // Auto-select first component with data
        if (options.length > 0) {
            setSelectedComponent(options[0].value);
        }

        // Load asset risk summary
        const risk = fetchAssetRiskSummary();
        setAssetRisk(risk);

        // Load thresholds
        const thresh = fetchThresholds();
        setThresholds(thresh);
    }, []);

    // ── Alarm list load (reacts to filter changes) ─────────────────────────
    useEffect(() => {
        const alarmData = fetchAlarmList(filters);
        setAlarms(alarmData);
    }, [filters]);

    // ── Alarm detail load (reacts to selected alarm) ───────────────────────
    useEffect(() => {
        if (selectedAlarmId) {
            const detail = fetchAlarmDetail(selectedAlarmId);
            setAlarmDetail(detail);
        } else {
            setAlarmDetail(null);
        }
    }, [selectedAlarmId]);

    // ── Anomaly score history load (reacts to selected component) ──────────
    useEffect(() => {
        if (selectedComponent) {
            const history = fetchAnomalyScoreHistory(selectedComponent, 24);
            setScoreHistory(history);
        } else {
            setScoreHistory([]);
        }
    }, [selectedComponent]);

    // ── Handlers ───────────────────────────────────────────────────────────
    const handleFiltersChange = useCallback((newFilters) => {
        setFilters(newFilters);
    }, []);

    const handleAlarmSelect = useCallback((alarmId) => {
        setSelectedAlarmId(alarmId);
    }, []);

    const handleComponentChange = useCallback((componentId) => {
        setSelectedComponent(componentId);
    }, []);

    const handleCloseDetail = useCallback(() => {
        setSelectedAlarmId(null);
    }, []);

    const handleDrillThrough = useCallback((payload) => {
        // payload: { assetId, componentId, windowStartUtc, windowEndUtc, alarmId }
        if (typeof onDrillThroughToLive === 'function') {
            onDrillThroughToLive(payload);
        }
    }, [onDrillThroughToLive]);

    return (
        <div className="h-full w-full overflow-y-auto space-y-6 p-6 bg-gray-50/50">

            {/* ═══ KPI Cards Row ═══ */}
            <div>
                <PdmKPICards summary={summary} />
            </div>

            {/* ═══ Anomaly Score Trend (full width) ═══ */}
            <div style={{ minHeight: '420px' }}>
                <AnomalyScoreChart
                    scoreHistory={scoreHistory}
                    componentOptions={componentOptions}
                    selectedComponent={selectedComponent}
                    onComponentChange={handleComponentChange}
                    thresholds={thresholds}
                    assetRisk={assetRisk}
                    modelVersion={summary?.modelVersion}
                />
            </div>

            {/* ═══ Alarm Wall (full width) ═══ */}
            <div style={{ minHeight: '420px' }}>
                <AlarmWall
                    alarms={alarms}
                    filters={filters}
                    onFiltersChange={handleFiltersChange}
                    selectedAlarmId={selectedAlarmId}
                    onAlarmSelect={handleAlarmSelect}
                />
            </div>

            {/* ═══ Alarm Detail Panel (conditional) ═══ */}
            {alarmDetail && (
                <div>
                    <AlarmDetailPanel
                        detail={alarmDetail}
                        onClose={handleCloseDetail}
                        onDrillThrough={handleDrillThrough}
                    />
                </div>
            )}
        </div>
    );
};

export default PdmModule;
