/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MOCK PDM DATA — Predictive Maintenance Module
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Otokar chassis inspection line context:
 *   • 2 KUKA robot arms (ROKOS-1, ROKOS-2) inspecting bus chassis
 *   • Each robot has 6-axis servo drives, vibration & temperature sensors
 *   • PdM solution detects anomalies and generates alarms
 *   • This file provides mock data until the real backend is ready
 *
 * Contents:
 *   1. PdM_Context          → DT registry, assets, subsystems
 *   2. PdM_Signal_Catalog   → Monitored sensor signals
 *   3. PdM_Anomaly_Stream   → Anomaly score time series
 *   4. PdM_Alarm_Events     → Alarm/event list
 *   5. PdM_Telemetry        → Related signal window (used in alarm detail)
 *   6. PdM_Threshold_Profiles → Threshold/rule parameters
 *   7. Adapter / Helper     → Transformed data for UI components
 */


// ═══════════════════════════════════════════════════════════════════════════
// 1. PdM CONTEXT — DT Registry, Assets, Subsystems
// ═══════════════════════════════════════════════════════════════════════════

export const PdM_Context = {
    DT_ID: 'OTOKAR_PdM_DT',
    DT_Name: 'Otokar Predictive Maintenance Digital Twin',
    Description: 'Predictive maintenance monitoring for robot arms and servo drives on the Otokar chassis inspection line',
    Model_Version: 'v1.3.0',
    Config_ID: 'PDM-CFG-OTOKAR-2026',

    Assets: [
        {
            Asset_ID: 'ROKOS-1',
            Asset_Name: 'KUKA KR 210 – Robot 1 (Left Line)',
            Asset_Type: 'Industrial_Robot',
            Location: 'Chassis_Inspection_Station_Left',
            Status: 'ONLINE',
            Last_Heartbeat_UTC: '2026-03-18T14:00:12Z',
            Components: [
                { Component_ID: 'ROKOS1-SERVO-AX1', Component_Name: 'Axis-1 Servo Drive', Component_Type: 'Servo_Drive' },
                { Component_ID: 'ROKOS1-SERVO-AX2', Component_Name: 'Axis-2 Servo Drive', Component_Type: 'Servo_Drive' },
                { Component_ID: 'ROKOS1-SERVO-AX3', Component_Name: 'Axis-3 Servo Drive', Component_Type: 'Servo_Drive' },
                { Component_ID: 'ROKOS1-SERVO-AX4', Component_Name: 'Axis-4 Servo Drive', Component_Type: 'Servo_Drive' },
                { Component_ID: 'ROKOS1-SERVO-AX5', Component_Name: 'Axis-5 Servo Drive', Component_Type: 'Servo_Drive' },
                { Component_ID: 'ROKOS1-SERVO-AX6', Component_Name: 'Axis-6 Servo Drive', Component_Type: 'Servo_Drive' },
                { Component_ID: 'ROKOS1-GEARBOX',   Component_Name: 'Reducer Gearbox',    Component_Type: 'Gearbox' },
                { Component_ID: 'ROKOS1-BRAKE',     Component_Name: 'Holding Brake Unit',  Component_Type: 'Brake' },
            ],
        },
        {
            Asset_ID: 'ROKOS-2',
            Asset_Name: 'KUKA KR 210 – Robot 2 (Right Line)',
            Asset_Type: 'Industrial_Robot',
            Location: 'Chassis_Inspection_Station_Right',
            Status: 'ONLINE',
            Last_Heartbeat_UTC: '2026-03-18T14:00:10Z',
            Components: [
                { Component_ID: 'ROKOS2-SERVO-AX1', Component_Name: 'Axis-1 Servo Drive', Component_Type: 'Servo_Drive' },
                { Component_ID: 'ROKOS2-SERVO-AX2', Component_Name: 'Axis-2 Servo Drive', Component_Type: 'Servo_Drive' },
                { Component_ID: 'ROKOS2-SERVO-AX3', Component_Name: 'Axis-3 Servo Drive', Component_Type: 'Servo_Drive' },
                { Component_ID: 'ROKOS2-SERVO-AX4', Component_Name: 'Axis-4 Servo Drive', Component_Type: 'Servo_Drive' },
                { Component_ID: 'ROKOS2-SERVO-AX5', Component_Name: 'Axis-5 Servo Drive', Component_Type: 'Servo_Drive' },
                { Component_ID: 'ROKOS2-SERVO-AX6', Component_Name: 'Axis-6 Servo Drive', Component_Type: 'Servo_Drive' },
                { Component_ID: 'ROKOS2-GEARBOX',   Component_Name: 'Reducer Gearbox',    Component_Type: 'Gearbox' },
                { Component_ID: 'ROKOS2-BRAKE',     Component_Name: 'Holding Brake Unit',  Component_Type: 'Brake' },
            ],
        },
    ],

    RBAC: {
        Roles: [
            { Role: 'OTOKAR (Admin)',  Permissions: ['READ', 'MONITOR', 'CONFIGURE_ALERTS', 'ACK_ALARM', 'WRITE_NOTES'] },
            { Role: 'OTOKAR (Viewer)', Permissions: ['READ', 'MONITOR'] },
            { Role: 'ADMIN',           Permissions: ['READ', 'MONITOR', 'CONFIGURE_ALERTS', 'ACK_ALARM', 'WRITE_NOTES', 'MANAGE_THRESHOLDS'] },
        ],
    },
};


// ═══════════════════════════════════════════════════════════════════════════
// 2. PdM SIGNAL CATALOG — Monitored Sensor Signals
// ═══════════════════════════════════════════════════════════════════════════

export const PdM_Signal_Catalog = [
    // ── Motor Currents (1 kHz) ──
    {
        Signal_ID: 'PDM-CUR-AX1',
        Signal_Name: 'Axis 1 Motor Current',
        Unit: 'A',
        Description: 'Axis-1 servo motor current value',
        Data_Type: 'float64',
        Sample_Rate_Hz: 1000,
        Category: 'electrical',
    },
    {
        Signal_ID: 'PDM-CUR-AX2',
        Signal_Name: 'Axis 2 Motor Current',
        Unit: 'A',
        Description: 'Axis-2 servo motor current value',
        Data_Type: 'float64',
        Sample_Rate_Hz: 1000,
        Category: 'electrical',
    },
    {
        Signal_ID: 'PDM-CUR-AX3',
        Signal_Name: 'Axis 3 Motor Current',
        Unit: 'A',
        Description: 'Axis-3 servo motor current value',
        Data_Type: 'float64',
        Sample_Rate_Hz: 1000,
        Category: 'electrical',
    },
    // ── Vibration (500 Hz) ──
    {
        Signal_ID: 'PDM-VIB-AX1',
        Signal_Name: 'Axis 1 Vibration RMS',
        Unit: 'mm/s',
        Description: 'Axis-1 vibration RMS (radial)',
        Data_Type: 'float64',
        Sample_Rate_Hz: 500,
        Category: 'vibration',
    },
    {
        Signal_ID: 'PDM-VIB-AX2',
        Signal_Name: 'Axis 2 Vibration RMS',
        Unit: 'mm/s',
        Description: 'Axis-2 vibration RMS (radial)',
        Data_Type: 'float64',
        Sample_Rate_Hz: 500,
        Category: 'vibration',
    },
    // ── Temperature (1 Hz) ──
    {
        Signal_ID: 'PDM-TEMP-SERVO',
        Signal_Name: 'Servo Drive Temperature',
        Unit: '°C',
        Description: 'Servo drive IGBT temperature',
        Data_Type: 'float64',
        Sample_Rate_Hz: 1,
        Category: 'thermal',
    },
    {
        Signal_ID: 'PDM-TEMP-MOTOR',
        Signal_Name: 'Motor Winding Temperature',
        Unit: '°C',
        Description: 'Motor winding temperature',
        Data_Type: 'float64',
        Sample_Rate_Hz: 1,
        Category: 'thermal',
    },
    // ── Torque (100 Hz) ──
    {
        Signal_ID: 'PDM-TRQ-AX2',
        Signal_Name: 'Axis 2 Torque',
        Unit: 'Nm',
        Description: 'Axis-2 torque value (heaviest loaded axis)',
        Data_Type: 'float64',
        Sample_Rate_Hz: 100,
        Category: 'mechanical',
    },
    // ── Gearbox ──
    {
        Signal_ID: 'PDM-GEAR-BACKLASH',
        Signal_Name: 'Gearbox Backlash',
        Unit: 'arcmin',
        Description: 'Reducer gearbox backlash measurement',
        Data_Type: 'float64',
        Sample_Rate_Hz: 10,
        Category: 'mechanical',
    },
];


// ═══════════════════════════════════════════════════════════════════════════
// 3. PdM ANOMALY SCORE STREAM — Anomaly Score Time Series
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generates anomaly scores for the last 24 hours.
 * One score point every 5 minutes (288 points / day).
 */
const generateAnomalyScores = (assetId, componentId, scoreType, baseLevel, spikeAt = null) => {
    const scores = [];
    const now = new Date('2026-03-18T14:00:00Z');
    const intervalMs = 5 * 60 * 1000; // 5 minutes
    const pointCount = 288; // 24 hours

    for (let i = 0; i < pointCount; i++) {
        const timestamp = new Date(now.getTime() - (pointCount - i) * intervalMs);
        const t = i / pointCount;

        // Normal trend + noise
        let score = baseLevel + Math.sin(t * Math.PI * 4) * 0.05 + (Math.random() - 0.5) * 0.03;

        // Spike at a specific point (anomaly)
        if (spikeAt !== null && Math.abs(t - spikeAt) < 0.02) {
            score = Math.min(1.0, score + 0.3 + Math.random() * 0.2);
        }

        // Slowly rising trend (degradation simulation)
        if (baseLevel > 0.3) {
            score += t * 0.1;
        }

        score = Math.max(0, Math.min(1, score));

        scores.push({
            Timestamp_UTC: timestamp.toISOString(),
            Asset_ID: assetId,
            Component_ID: componentId,
            Score_Type: scoreType,       // 'anomaly' | 'health' | 'risk'
            Score_Value: parseFloat(score.toFixed(4)),
            Model_Version: PdM_Context.Model_Version,
            Threshold_Profile_ID: 'THP-DEFAULT-01',
        });
    }

    return scores;
};

export const PdM_Anomaly_Scores = {
    // ── ROKOS-1 ──
    'ROKOS1-SERVO-AX1': generateAnomalyScores('ROKOS-1', 'ROKOS1-SERVO-AX1', 'anomaly', 0.12),
    'ROKOS1-SERVO-AX2': generateAnomalyScores('ROKOS-1', 'ROKOS1-SERVO-AX2', 'anomaly', 0.45, 0.85), // Spike near recent
    'ROKOS1-GEARBOX':   generateAnomalyScores('ROKOS-1', 'ROKOS1-GEARBOX',   'health',  0.35, 0.70),

    // ── ROKOS-2 ──
    'ROKOS2-SERVO-AX1': generateAnomalyScores('ROKOS-2', 'ROKOS2-SERVO-AX1', 'anomaly', 0.08),
    'ROKOS2-SERVO-AX2': generateAnomalyScores('ROKOS-2', 'ROKOS2-SERVO-AX2', 'anomaly', 0.15),
    'ROKOS2-GEARBOX':   generateAnomalyScores('ROKOS-2', 'ROKOS2-GEARBOX',   'health',  0.10),
};


// ═══════════════════════════════════════════════════════════════════════════
// 4. PdM ALARM EVENTS — Alarm / Event List
// ═══════════════════════════════════════════════════════════════════════════

export const PdM_Alarm_Events = [
    // ── ROKOS-1 Alarms ──
    {
        Alarm_ID: 'ALM-PDM-001',
        Event_Timestamp_UTC: '2026-03-18T13:42:00Z',
        Asset_ID: 'ROKOS-1',
        Component_ID: 'ROKOS1-SERVO-AX2',
        Severity: 'CRITICAL',
        Alarm_Type: 'anomaly_score',
        Generated_By: 'PdM_Model',
        Signal_IDs: ['PDM-CUR-AX2', 'PDM-VIB-AX2', 'PDM-TEMP-MOTOR'],
        Rule_Desc: 'Abnormal current increase in Axis-2 servo drive – anomaly score exceeded threshold (0.78)',
        Message: 'Unexpected current increase detected in Axis-2 motor. Possible servo drive degradation or mechanical load increase.',
        State: 'open',
        Ack_By: null,
        Ack_Timestamp: null,
        Note: null,
        Pre_Window_Minutes: 30,
        Post_Window_Minutes: 10,
    },
    {
        Alarm_ID: 'ALM-PDM-002',
        Event_Timestamp_UTC: '2026-03-18T12:15:00Z',
        Asset_ID: 'ROKOS-1',
        Component_ID: 'ROKOS1-GEARBOX',
        Severity: 'WARN',
        Alarm_Type: 'vibration',
        Generated_By: 'PdM_Rule',
        Signal_IDs: ['PDM-VIB-AX1', 'PDM-GEAR-BACKLASH'],
        Rule_Desc: 'Reducer gearbox vibration level exceeded warning threshold (4.2 mm/s > 4.0 mm/s)',
        Message: 'Gearbox vibration increase observed. Backlash value also trending upward – maintenance scheduling recommended.',
        State: 'ack',
        Ack_By: 'otokar_maintenance_engineer',
        Ack_Timestamp: '2026-03-18T12:25:00Z',
        Note: 'Scheduled for planned maintenance – March 20 periodic maintenance.',
        Pre_Window_Minutes: 60,
        Post_Window_Minutes: 30,
    },
    {
        Alarm_ID: 'ALM-PDM-003',
        Event_Timestamp_UTC: '2026-03-18T10:05:00Z',
        Asset_ID: 'ROKOS-1',
        Component_ID: 'ROKOS1-SERVO-AX2',
        Severity: 'WARN',
        Alarm_Type: 'overheat',
        Generated_By: 'PdM_Rule',
        Signal_IDs: ['PDM-TEMP-SERVO', 'PDM-TEMP-MOTOR'],
        Rule_Desc: 'Servo drive temperature exceeded warning level (68°C > 65°C)',
        Message: 'Axis-2 servo drive IGBT temperature rising. Cooling system should be inspected.',
        State: 'closed',
        Ack_By: 'otokar_maintenance_engineer',
        Ack_Timestamp: '2026-03-18T10:15:00Z',
        Note: 'Cooling fan filter cleaned, temperature returned to normal.',
        Pre_Window_Minutes: 30,
        Post_Window_Minutes: 30,
    },

    // ── ROKOS-2 Alarms ──
    {
        Alarm_ID: 'ALM-PDM-004',
        Event_Timestamp_UTC: '2026-03-18T09:30:00Z',
        Asset_ID: 'ROKOS-2',
        Component_ID: 'ROKOS2-SERVO-AX1',
        Severity: 'INFO',
        Alarm_Type: 'anomaly_score',
        Generated_By: 'PdM_Model',
        Signal_IDs: ['PDM-CUR-AX1'],
        Rule_Desc: 'Axis-1 anomaly score reached informational level (0.25)',
        Message: 'Slight change trend detected in Axis-1 motor current. Continued monitoring in progress.',
        State: 'closed',
        Ack_By: null,
        Ack_Timestamp: null,
        Note: null,
        Pre_Window_Minutes: 15,
        Post_Window_Minutes: 15,
    },
    {
        Alarm_ID: 'ALM-PDM-005',
        Event_Timestamp_UTC: '2026-03-17T16:40:00Z',
        Asset_ID: 'ROKOS-2',
        Component_ID: 'ROKOS2-SERVO-AX3',
        Severity: 'WARN',
        Alarm_Type: 'anomaly_score',
        Generated_By: 'PdM_Model',
        Signal_IDs: ['PDM-CUR-AX3', 'PDM-TRQ-AX2'],
        Rule_Desc: 'Axis-3 anomaly score exceeded warning threshold (0.52)',
        Message: 'Mechanical interaction anomaly detected between Axis-3 and Axis-2. Torque distribution imbalance.',
        State: 'closed',
        Ack_By: 'otokar_maintenance_engineer',
        Ack_Timestamp: '2026-03-17T17:00:00Z',
        Note: 'Inspected – temporary load increase caused by chassis type changeover. False positive.',
        Pre_Window_Minutes: 30,
        Post_Window_Minutes: 15,
    },

    // ── Historical Alarms ──
    {
        Alarm_ID: 'ALM-PDM-006',
        Event_Timestamp_UTC: '2026-03-16T08:20:00Z',
        Asset_ID: 'ROKOS-1',
        Component_ID: 'ROKOS1-SERVO-AX2',
        Severity: 'CRITICAL',
        Alarm_Type: 'anomaly_score',
        Generated_By: 'PdM_Model',
        Signal_IDs: ['PDM-CUR-AX2', 'PDM-VIB-AX2'],
        Rule_Desc: 'Axis-2 anomaly score exceeded critical threshold (0.82)',
        Message: 'Serious degradation signs detected in Axis-2 servo drive. Vibration and current values rose simultaneously.',
        State: 'closed',
        Ack_By: 'otokar_maintenance_engineer',
        Ack_Timestamp: '2026-03-16T08:35:00Z',
        Note: 'Servo motor carbon brushes replaced. System returned to nominal values.',
        Pre_Window_Minutes: 60,
        Post_Window_Minutes: 60,
    },
    {
        Alarm_ID: 'ALM-PDM-007',
        Event_Timestamp_UTC: '2026-03-15T14:10:00Z',
        Asset_ID: 'ROKOS-1',
        Component_ID: 'ROKOS1-BRAKE',
        Severity: 'WARN',
        Alarm_Type: 'anomaly_score',
        Generated_By: 'PdM_Model',
        Signal_IDs: ['PDM-CUR-AX1', 'PDM-TRQ-AX2'],
        Rule_Desc: 'Holding brake feedback delay detected',
        Message: 'Brake unit engage/disengage time exceeds normal range. Possible brake disc wear.',
        State: 'closed',
        Ack_By: 'otokar_maintenance_engineer',
        Ack_Timestamp: '2026-03-15T14:30:00Z',
        Note: 'Brake disc thickness measured – within tolerance. Brake pad replacement planned for next maintenance.',
        Pre_Window_Minutes: 15,
        Post_Window_Minutes: 15,
    },
    {
        Alarm_ID: 'ALM-PDM-008',
        Event_Timestamp_UTC: '2026-03-14T11:00:00Z',
        Asset_ID: 'ROKOS-2',
        Component_ID: 'ROKOS2-GEARBOX',
        Severity: 'WARN',
        Alarm_Type: 'vibration',
        Generated_By: 'PdM_Rule',
        Signal_IDs: ['PDM-VIB-AX1', 'PDM-GEAR-BACKLASH'],
        Rule_Desc: 'Robot-2 reducer gearbox vibration level trending upward',
        Message: 'Gearbox vibration average increased by 12% over the last 48 hours.',
        State: 'closed',
        Ack_By: 'otokar_maintenance_engineer',
        Ack_Timestamp: '2026-03-14T11:20:00Z',
        Note: 'Oil change performed, values returned to normal.',
        Pre_Window_Minutes: 30,
        Post_Window_Minutes: 30,
    },
];


// ═══════════════════════════════════════════════════════════════════════════
// 5. PdM TELEMETRY — Sensor Time Series (for Alarm Detail Window)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generates pre/post window signal data for a specific alarm.
 * @param {string} alarmId - Alarm identifier
 * @param {string[]} signalIds - Related signal identifiers
 * @param {string} centerTimestamp - Alarm timestamp
 * @param {number} preMinutes - Pre-event window (minutes)
 * @param {number} postMinutes - Post-event window (minutes)
 * @param {Object} anomalyConfig - { signalId: { baseValue, spikeValue, unit } }
 */
const generateAlarmTelemetry = (alarmId, signalIds, centerTimestamp, preMinutes, postMinutes, anomalyConfig) => {
    const center = new Date(centerTimestamp);
    const startTime = new Date(center.getTime() - preMinutes * 60000);
    const endTime = new Date(center.getTime() + postMinutes * 60000);
    const totalMinutes = preMinutes + postMinutes;
    const intervalMs = 10000; // one data point every 10 seconds
    const pointCount = Math.floor(totalMinutes * 60 / 10);

    const telemetry = {};

    signalIds.forEach(signalId => {
        const config = anomalyConfig[signalId] || { baseValue: 5, spikeValue: 8, unit: '-' };
        const points = [];

        for (let i = 0; i < pointCount; i++) {
            const timestamp = new Date(startTime.getTime() + i * intervalMs);
            const t = i / pointCount;
            const relativeToCenter = (timestamp.getTime() - center.getTime()) / 60000; // in minutes

            let value = config.baseValue;
            const noise = (Math.random() - 0.5) * config.baseValue * 0.05; // 5% noise

            // Spike near anomaly time
            if (Math.abs(relativeToCenter) < 5) {
                // Gradual rise and fall
                const proximity = 1 - Math.abs(relativeToCenter) / 5;
                value = config.baseValue + (config.spikeValue - config.baseValue) * proximity;
            }

            // Slow rising trend before the event
            if (relativeToCenter < 0 && relativeToCenter > -preMinutes) {
                const rampFactor = (relativeToCenter + preMinutes) / preMinutes;
                value += (config.spikeValue - config.baseValue) * 0.15 * rampFactor;
            }

            points.push({
                Timestamp_UTC: timestamp.toISOString(),
                Value: parseFloat((value + noise).toFixed(3)),
                Unit: config.unit,
                Quality_Flag: Math.random() > 0.98 ? 'DELAYED' : 'OK',
                Source: 'REAL',
            });
        }

        telemetry[signalId] = points;
    });

    return telemetry;
};

export const PdM_Alarm_Telemetry = {
    'ALM-PDM-001': generateAlarmTelemetry(
        'ALM-PDM-001',
        ['PDM-CUR-AX2', 'PDM-VIB-AX2', 'PDM-TEMP-MOTOR'],
        '2026-03-18T13:42:00Z',
        30, 10,
        {
            'PDM-CUR-AX2':    { baseValue: 5.2,  spikeValue: 9.8,  unit: 'A' },
            'PDM-VIB-AX2':    { baseValue: 2.1,  spikeValue: 6.5,  unit: 'mm/s' },
            'PDM-TEMP-MOTOR': { baseValue: 48.0,  spikeValue: 72.0, unit: '°C' },
        }
    ),
    'ALM-PDM-002': generateAlarmTelemetry(
        'ALM-PDM-002',
        ['PDM-VIB-AX1', 'PDM-GEAR-BACKLASH'],
        '2026-03-18T12:15:00Z',
        60, 30,
        {
            'PDM-VIB-AX1':      { baseValue: 2.5,  spikeValue: 4.8, unit: 'mm/s' },
            'PDM-GEAR-BACKLASH': { baseValue: 1.2,  spikeValue: 2.1, unit: 'arcmin' },
        }
    ),
    'ALM-PDM-003': generateAlarmTelemetry(
        'ALM-PDM-003',
        ['PDM-TEMP-SERVO', 'PDM-TEMP-MOTOR'],
        '2026-03-18T10:05:00Z',
        30, 30,
        {
            'PDM-TEMP-SERVO': { baseValue: 52.0, spikeValue: 68.0, unit: '°C' },
            'PDM-TEMP-MOTOR': { baseValue: 45.0, spikeValue: 63.0, unit: '°C' },
        }
    ),
    'ALM-PDM-006': generateAlarmTelemetry(
        'ALM-PDM-006',
        ['PDM-CUR-AX2', 'PDM-VIB-AX2'],
        '2026-03-16T08:20:00Z',
        60, 60,
        {
            'PDM-CUR-AX2': { baseValue: 5.5,  spikeValue: 11.2, unit: 'A' },
            'PDM-VIB-AX2': { baseValue: 2.3,  spikeValue: 7.9,  unit: 'mm/s' },
        }
    ),
};


// ═══════════════════════════════════════════════════════════════════════════
// 6. PdM THRESHOLD PROFILES — Threshold / Rule Parameters
// ═══════════════════════════════════════════════════════════════════════════

export const PdM_Threshold_Profiles = [
    {
        Threshold_Profile_ID: 'THP-DEFAULT-01',
        Profile_Name: 'Otokar Standard Thresholds',
        Rule_Set_ID: 'RS-OTOKAR-STD-2026',
        Rule_Version: 'v2.0',
        Thresholds: {
            anomaly_score: {
                Info:     0.20,   // Informational level
                Warn:     0.45,   // Warning level
                Critical: 0.70,   // Critical level
            },
            vibration_rms: {
                Warn:     4.0,    // mm/s — ISO 10816-3 warning
                Critical: 7.1,    // mm/s — ISO 10816-3 critical
            },
            servo_temperature: {
                Warn:     65,     // °C
                Critical: 80,     // °C
            },
            motor_temperature: {
                Warn:     60,     // °C
                Critical: 75,     // °C
            },
            motor_current: {
                Warn:     8.0,    // A
                Critical: 10.0,   // A
            },
            gearbox_backlash: {
                Warn:     2.0,    // arcmin
                Critical: 3.5,    // arcmin
            },
        },
        Alarm_Rate_Limit: {
            Max_Alarms_Per_Minute: 1,
            Grouping_Window_Sec: 60,
            Description: 'Maximum 1 alarm per minute for the same component + alarm type',
        },
    },
];


// ═══════════════════════════════════════════════════════════════════════════
// 7. ADAPTER — Transformed Data for UI Components
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Asset risk summary — calculates the current risk status for each asset.
 * Average of the latest anomaly scores + highest score.
 */
export const getAssetRiskSummary = () => {
    return PdM_Context.Assets.map(asset => {
        // Get the latest scores for all components belonging to this asset
        const componentScores = asset.Components
            .map(comp => {
                const scores = PdM_Anomaly_Scores[comp.Component_ID];
                if (!scores || scores.length === 0) return null;
                const lastScore = scores[scores.length - 1];
                return {
                    componentId: comp.Component_ID,
                    componentName: comp.Component_Name,
                    componentType: comp.Component_Type,
                    lastScore: lastScore.Score_Value,
                    scoreType: lastScore.Score_Type,
                    timestamp: lastScore.Timestamp_UTC,
                };
            })
            .filter(Boolean);

        // Risk calculation
        const scoreValues = componentScores.map(c => c.lastScore);
        const maxScore = scoreValues.length > 0 ? Math.max(...scoreValues) : 0;
        const avgScore = scoreValues.length > 0
            ? parseFloat((scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length).toFixed(4))
            : 0;

        // Risk level
        const thresholds = PdM_Threshold_Profiles[0].Thresholds.anomaly_score;
        let riskLevel = 'normal';
        if (maxScore >= thresholds.Critical) riskLevel = 'critical';
        else if (maxScore >= thresholds.Warn) riskLevel = 'warning';
        else if (maxScore >= thresholds.Info) riskLevel = 'info';

        // Active alarm count for this asset
        const activeAlarms = PdM_Alarm_Events.filter(
            a => a.Asset_ID === asset.Asset_ID && a.State === 'open'
        ).length;

        return {
            assetId: asset.Asset_ID,
            assetName: asset.Asset_Name,
            location: asset.Location,
            status: asset.Status,
            riskLevel,
            maxAnomalyScore: maxScore,
            avgAnomalyScore: avgScore,
            activeAlarmCount: activeAlarms,
            componentScores,
        };
    });
};

/**
 * Transforms alarm list for UI components.
 * Accepts filtering and sorting parameters.
 */
export const getAlarmList = ({
    assetId = null,
    severity = null,
    state = null,
    alarmType = null,
    componentId = null,
    startDate = null,
    endDate = null,
    page = 1,
    pageSize = 20,
} = {}) => {
    let filtered = [...PdM_Alarm_Events];

    if (assetId) filtered = filtered.filter(a => a.Asset_ID === assetId);
    if (severity) filtered = filtered.filter(a => a.Severity === severity);
    if (state) filtered = filtered.filter(a => a.State === state);
    if (alarmType) filtered = filtered.filter(a => a.Alarm_Type === alarmType);
    if (componentId) filtered = filtered.filter(a => a.Component_ID === componentId);
    if (startDate) filtered = filtered.filter(a => new Date(a.Event_Timestamp_UTC) >= new Date(startDate));
    if (endDate) filtered = filtered.filter(a => new Date(a.Event_Timestamp_UTC) <= new Date(endDate));

    // Sort from newest to oldest
    filtered.sort((a, b) => new Date(b.Event_Timestamp_UTC) - new Date(a.Event_Timestamp_UTC));

    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const items = filtered.slice((page - 1) * pageSize, page * pageSize);

    return {
        items: items.map(alarm => {
            const asset = PdM_Context.Assets.find(a => a.Asset_ID === alarm.Asset_ID);
            const component = asset?.Components.find(c => c.Component_ID === alarm.Component_ID);

            return {
                id: alarm.Alarm_ID,
                timestamp: alarm.Event_Timestamp_UTC,
                assetId: alarm.Asset_ID,
                assetName: asset?.Asset_Name || alarm.Asset_ID,
                componentId: alarm.Component_ID,
                componentName: component?.Component_Name || alarm.Component_ID,
                severity: alarm.Severity,
                alarmType: alarm.Alarm_Type,
                generatedBy: alarm.Generated_By,
                signalIds: alarm.Signal_IDs,
                ruleDesc: alarm.Rule_Desc,
                message: alarm.Message,
                state: alarm.State,
                ackBy: alarm.Ack_By,
                ackTimestamp: alarm.Ack_Timestamp,
                note: alarm.Note,
                preWindowMinutes: alarm.Pre_Window_Minutes,
                postWindowMinutes: alarm.Post_Window_Minutes,
            };
        }),
        pagination: {
            page,
            pageSize,
            total,
            totalPages,
        },
    };
};

/**
 * Detail information for a specific alarm + related signal window.
 */
export const getAlarmDetail = (alarmId) => {
    const alarm = PdM_Alarm_Events.find(a => a.Alarm_ID === alarmId);
    if (!alarm) return null;

    const asset = PdM_Context.Assets.find(a => a.Asset_ID === alarm.Asset_ID);
    const component = asset?.Components.find(c => c.Component_ID === alarm.Component_ID);
    const telemetry = PdM_Alarm_Telemetry[alarmId] || null;

    // Compute window boundaries from telemetry if available
    let windowStartUtc = null;
    let windowEndUtc = null;
    if (telemetry) {
        const allTs = Object.values(telemetry)
            .flat()
            .map(p => p.Timestamp_UTC)
            .filter(Boolean);
        if (allTs.length > 0) {
            allTs.sort((a, b) => new Date(a) - new Date(b));
            windowStartUtc = allTs[0];
            windowEndUtc = allTs[allTs.length - 1];
        }
    }

    // Build anomaly score window within the same time range (0..1)
    // Uses PdM_Anomaly_Scores stream (5-min cadence) and maps to nearest point.
    let anomalyScoreWindow = null;
    if (windowStartUtc && windowEndUtc && PdM_Anomaly_Scores[alarm.Component_ID]) {
        const scoreSeries = PdM_Anomaly_Scores[alarm.Component_ID]
            .filter(s => new Date(s.Timestamp_UTC) >= new Date(windowStartUtc) && new Date(s.Timestamp_UTC) <= new Date(windowEndUtc))
            .map(s => ({ timestamp: s.Timestamp_UTC, value: s.Score_Value }));

        // If no points fall exactly in range, still expose nearest around alarm timestamp (for UI overlay)
        if (scoreSeries.length === 0) {
            const center = new Date(alarm.Event_Timestamp_UTC).getTime();
            const all = PdM_Anomaly_Scores[alarm.Component_ID];
            const nearest = all.reduce((best, cur) => {
                const dt = Math.abs(new Date(cur.Timestamp_UTC).getTime() - center);
                return !best || dt < best.dt ? { dt, cur } : best;
            }, null);
            if (nearest?.cur) {
                anomalyScoreWindow = [{ timestamp: nearest.cur.Timestamp_UTC, value: nearest.cur.Score_Value }];
            }
        } else {
            anomalyScoreWindow = scoreSeries;
        }
    }

    // Get signal definitions for related signals
    const signalDefinitions = alarm.Signal_IDs.map(sigId => {
        const def = PdM_Signal_Catalog.find(s => s.Signal_ID === sigId);
        return def ? {
            id: def.Signal_ID,
            name: def.Signal_Name,
            unit: def.Unit,
            category: def.Category,
            description: def.Description,
        } : { id: sigId, name: sigId, unit: '-', category: 'unknown', description: '' };
    });

    return {
        // Alarm meta
        id: alarm.Alarm_ID,
        timestamp: alarm.Event_Timestamp_UTC,
        severity: alarm.Severity,
        alarmType: alarm.Alarm_Type,
        generatedBy: alarm.Generated_By,
        message: alarm.Message,
        ruleDesc: alarm.Rule_Desc,
        state: alarm.State,
        modelVersion: PdM_Context.Model_Version,

        // Ack information
        ackBy: alarm.Ack_By,
        ackTimestamp: alarm.Ack_Timestamp,
        note: alarm.Note,

        // Asset information
        assetId: alarm.Asset_ID,
        assetName: asset?.Asset_Name || alarm.Asset_ID,
        componentId: alarm.Component_ID,
        componentName: component?.Component_Name || alarm.Component_ID,
        componentType: component?.Component_Type || 'unknown',
        location: asset?.Location || '',

        // Related signals
        signals: signalDefinitions,

        // Event window (pre/post window signal data)
        windowConfig: {
            preMinutes: alarm.Pre_Window_Minutes,
            postMinutes: alarm.Post_Window_Minutes,
        },
        telemetryWindow: telemetry, // { signalId: [ { Timestamp_UTC, Value, ... } ] }

        // Anomaly score overlay data (0..1) to be shown on a 2nd Y axis in Alarm Detail
        anomalyScoreWindow, // Array<{ timestamp: string, value: number }> | null

        // Window boundaries (useful for drill-through)
        windowStartUtc,
        windowEndUtc,
    };
};

/**
 * Returns the anomaly score history for a specific component.
 */
export const getAnomalyScoreHistory = (componentId, lastNHours = 24) => {
    const scores = PdM_Anomaly_Scores[componentId];
    if (!scores) return [];

    const cutoff = new Date(Date.now() - lastNHours * 3600000);
    return scores
        .filter(s => new Date(s.Timestamp_UTC) >= cutoff)
        .map(s => ({
            timestamp: s.Timestamp_UTC,
            value: s.Score_Value,
            scoreType: s.Score_Type,
        }));
};

/**
 * General PdM statistics summary.
 */
export const getPdmSummaryStats = () => {
    const totalAlarms = PdM_Alarm_Events.length;
    const openAlarms = PdM_Alarm_Events.filter(a => a.State === 'open').length;
    const ackAlarms = PdM_Alarm_Events.filter(a => a.State === 'ack').length;
    const closedAlarms = PdM_Alarm_Events.filter(a => a.State === 'closed').length;

    const criticalOpen = PdM_Alarm_Events.filter(a => a.State === 'open' && a.Severity === 'CRITICAL').length;
    const warnOpen = PdM_Alarm_Events.filter(a => a.State === 'open' && a.Severity === 'WARN').length;

    const riskSummary = getAssetRiskSummary();
    const highestRiskAsset = riskSummary.reduce((max, a) =>
        a.maxAnomalyScore > max.maxAnomalyScore ? a : max,
        riskSummary[0]
    );

    return {
        totalAlarms,
        openAlarms,
        ackAlarms,
        closedAlarms,
        criticalOpen,
        warnOpen,
        assetsMonitored: PdM_Context.Assets.length,
        modelVersion: PdM_Context.Model_Version,
        highestRiskAsset: {
            assetId: highestRiskAsset.assetId,
            assetName: highestRiskAsset.assetName,
            maxScore: highestRiskAsset.maxAnomalyScore,
            riskLevel: highestRiskAsset.riskLevel,
        },
        assets: riskSummary,
    };
};
