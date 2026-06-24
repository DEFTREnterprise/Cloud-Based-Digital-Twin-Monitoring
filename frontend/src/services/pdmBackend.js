/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDM BACKEND — Predictive Maintenance Services
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Mock backend service for the PdM module.
 * When the real backend is ready, replace function bodies with API calls.
 *
 * Contents:
 *   1. fetchPdmSummary()                      → KPI cards data
 *   2. fetchAlarmList(filters)                → Alarm Wall filtered list
 *   3. fetchAlarmDetail(alarmId)              → Single alarm detail + telemetry
 *   4. fetchAnomalyScoreHistory(compId, hrs)  → Score time series for chart
 *   5. fetchAssetRiskSummary()                → Per-asset risk overview
 *   6. fetchComponentOptions()                → Component dropdown options
 */

import {
    PdM_Context,
    PdM_Signal_Catalog,
    PdM_Anomaly_Scores,
    PdM_Alarm_Events,
    PdM_Alarm_Telemetry,
    PdM_Threshold_Profiles,
    getPdmSummaryStats,
    getAlarmList,
    getAlarmDetail,
    getAnomalyScoreHistory,
    getAssetRiskSummary,
} from '../data/mockPdmData';


// ═══════════════════════════════════════════════════════════════════════════
// 1. PdM SUMMARY — KPI Cards Data
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Returns summary statistics for the PdM KPI cards.
 *
 * @returns {{
 *   totalAlarms: number,
 *   openAlarms: number,
 *   ackAlarms: number,
 *   closedAlarms: number,
 *   criticalOpen: number,
 *   warnOpen: number,
 *   assetsMonitored: number,
 *   modelVersion: string,
 *   highestRiskAsset: { assetId, assetName, maxScore, riskLevel },
 *   assets: Array
 * }}
 */
export const fetchPdmSummary = () => {
    const stats = getPdmSummaryStats();

    // Compute average close time from closed alarms that have ack timestamps
    const closedWithAck = PdM_Alarm_Events.filter(
        a => a.State === 'closed' && a.Ack_Timestamp
    );

    let avgCloseTimeMinutes = 0;
    if (closedWithAck.length > 0) {
        const totalMs = closedWithAck.reduce((sum, a) => {
            const eventTime = new Date(a.Event_Timestamp_UTC).getTime();
            const ackTime = new Date(a.Ack_Timestamp).getTime();
            return sum + (ackTime - eventTime);
        }, 0);
        avgCloseTimeMinutes = Math.round(totalMs / closedWithAck.length / 60000);
    }

    // Find top problematic component (most alarms)
    const componentAlarmCount = {};
    PdM_Alarm_Events.forEach(a => {
        const key = a.Component_ID;
        componentAlarmCount[key] = (componentAlarmCount[key] || 0) + 1;
    });
    const topComponent = Object.entries(componentAlarmCount)
        .sort((a, b) => b[1] - a[1])[0];

    // Resolve component name
    let topComponentName = 'N/A';
    if (topComponent) {
        for (const asset of PdM_Context.Assets) {
            const comp = asset.Components.find(c => c.Component_ID === topComponent[0]);
            if (comp) {
                topComponentName = comp.Component_Name;
                break;
            }
        }
    }

    return {
        ...stats,
        avgCloseTimeMinutes,
        topProblemComponent: topComponentName,
        topProblemCount: topComponent ? topComponent[1] : 0,
        thresholds: PdM_Threshold_Profiles[0]?.Thresholds?.anomaly_score || {},
    };
};


// ═══════════════════════════════════════════════════════════════════════════
// 2. ALARM LIST — Filtered + Paginated
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Returns filtered and paginated alarm list for the Alarm Wall.
 *
 * @param {Object} filters
 * @param {string|null} filters.assetId
 * @param {string|null} filters.severity
 * @param {string|null} filters.state
 * @param {string|null} filters.alarmType
 * @param {string|null} filters.componentId
 * @param {string|null} filters.startDate
 * @param {string|null} filters.endDate
 * @param {number} filters.page
 * @param {number} filters.pageSize
 * @returns {{ items: Array, pagination: Object }}
 */
export const fetchAlarmList = (filters = {}) => {
    return getAlarmList(filters);
};


// ═══════════════════════════════════════════════════════════════════════════
// 3. ALARM DETAIL — Single Alarm + Telemetry Window
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Returns detailed information for a single alarm, including
 * related signal definitions and pre/post window telemetry data.
 *
 * @param {string} alarmId
 * @returns {Object|null}
 */
export const fetchAlarmDetail = (alarmId) => {
    return getAlarmDetail(alarmId);
};


// ═══════════════════════════════════════════════════════════════════════════
// 4. ANOMALY SCORE HISTORY — Time Series for Chart
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Returns anomaly score time series for a specific component.
 *
 * @param {string} componentId
 * @param {number} lastNHours
 * @returns {Array<{ timestamp: string, value: number, scoreType: string }>}
 */
export const fetchAnomalyScoreHistory = (componentId, lastNHours = 24) => {
    return getAnomalyScoreHistory(componentId, lastNHours);
};


// ═══════════════════════════════════════════════════════════════════════════
// 5. ASSET RISK SUMMARY — Per-Asset Overview
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Returns risk summary for each monitored asset.
 *
 * @returns {Array<{
 *   assetId: string,
 *   assetName: string,
 *   riskLevel: string,
 *   maxAnomalyScore: number,
 *   activeAlarmCount: number,
 *   componentScores: Array
 * }>}
 */
export const fetchAssetRiskSummary = () => {
    return getAssetRiskSummary();
};


// ═══════════════════════════════════════════════════════════════════════════
// 6. COMPONENT OPTIONS — Dropdown Options for Score Chart
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Returns a flat list of components that have anomaly score data,
 * for use in the anomaly score chart component dropdown.
 *
 * @returns {Array<{ value: string, label: string, assetName: string }>}
 */
export const fetchComponentOptions = () => {
    const options = [];

    PdM_Context.Assets.forEach(asset => {
        asset.Components.forEach(comp => {
            if (PdM_Anomaly_Scores[comp.Component_ID]) {
                options.push({
                    value: comp.Component_ID,
                    label: comp.Component_Name,
                    assetName: asset.Asset_Name,
                    assetId: asset.Asset_ID,
                });
            }
        });
    });

    return options;
};


/**
 * Returns threshold profile for anomaly score display.
 *
 * @returns {Object}
 */
export const fetchThresholds = () => {
    return PdM_Threshold_Profiles[0] || null;
};
