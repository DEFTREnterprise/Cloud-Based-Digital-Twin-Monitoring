/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LIVE MONITORING BACKEND - Canlı İzleme Servisleri
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Bu dosya, Live Monitoring modülündeki bileşenler için
 * "sahte" veri servislerini içerir.
 * Gerçek backend hazır olduğunda, bu fonksiyonların içi API çağrılarıyla değiştirilecek.
 * 
 * İçerik:
 *   1. fetchDTOptions()                → DTSelector için dropdown seçenekleri
 *   2. fetchDTStatus(dtId)             → Seçili DT'nin durum bilgisi
 *   3. fetchDataQualityMetrics(dtId)   → DataQualityIndicator için kalite metrikleri
 *   4. fetchSignalStream(dtId)         → TimeSeriesWidgets için sinyal listesi + değerler
 *   5. calculateDiffMetrics(real, sim) → Real vs Sim delta/RMSE hesaplaması
 *   6. generateSparklinePoints(...)    → Sparkline mini grafik veri üretimi
 *   7. fetchSimulationSummary(dtId)    → Simülasyon özet metrikleri
 */

import {
    DT_Registry,
    Signal_Catalog,
    liveMonitoringRawData,
    liveMonitoringSessions,
    Telemetry_Stream,
    Simulation_Stream
} from '../data/mockLiveMonitoringData';


// ═══════════════════════════════════════════════════════════════════════════
// 1. DT SELECTOR - Dropdown Seçenekleri
// ═══════════════════════════════════════════════════════════════════════════

/**
 * DT Selector için dropdown seçeneklerini döndürür.
 * Subsystem ve Signal Set seçenekleri, seçili DT Twin'e bağlı olarak filtrelenir.
 * 
 * @param {string} [selectedDT] - Seçili DT Twin (subsystem filtrelemesi için)
 * @param {string} [selectedSubsystem] - Seçili Subsystem (signalSet filtrelemesi için)
 * @returns {{
 *   dts:        Array<{ value: string, label: string }>,
 *   systems:    Array<{ value: string, label: string }>,
 *   robots:     Array<{ value: string, label: string }>,
 *   subsystems: Array<{ value: string, label: string }>,
 *   signalSets: Array<{ value: string, label: string }>
 * }}
 */
export const fetchDTOptions = (selectedDT, selectedSubsystem) => {
    // ── DT Twin seçenekleri ──
    const dts = [
        { value: 'TPT', label: 'TPT' },
        { value: 'ESOGU_DT', label: 'Esogü DT' },
        { value: 'OTOKAR_PDM', label: 'Otokar PDM' }
    ];

    // ── DT System (sabit) ──
    const systems = [
        { value: 'CHASSIS_INSPECTION', label: 'Otokar Chassis Inspection' }
    ];

    // ── Robot Asset (sabit) ──
    const robots = [
        { value: 'ROKOS', label: 'ROKOS' }
    ];

    // ── Subsystem → Signal Set eşleşmeleri (DT Twin'e bağlı) ──
    const subsystemMap = {
        TPT: [
            { subsystem: { value: 'AI_TRAJ_OPT', label: 'AI Trajectory Optimization' }, signalSet: { value: 'TRAJ_VAL_KPIS', label: 'Trajectory Validation KPIs' } }
        ],
        OTOKAR_PDM: [
            { subsystem: { value: 'SERVO_DRIVE', label: 'Servo Drive' }, signalSet: { value: 'SENSOR_DATA', label: 'Sensor Data' } },
            { subsystem: { value: 'ANOMALY_ENGINE', label: 'Anomaly Engine' }, signalSet: { value: 'HEALTH_INDICATORS', label: 'Health Indicators' } }
        ],
        ESOGU_DT: [
            { subsystem: { value: 'STLC_ENGINE', label: 'STLC Engine' }, signalSet: { value: 'TEST_LIFECYCLE', label: 'Test Lifecycle' } }
        ]
    };

    // Seçili DT'ye göre subsystem listesi
    const mappings = subsystemMap[selectedDT] || [];
    const subsystems = mappings.map(m => m.subsystem);

    // Seçili subsystem'e göre signal set listesi
    const matchedMapping = mappings.find(m => m.subsystem.value === selectedSubsystem);
    const signalSets = matchedMapping ? [matchedMapping.signalSet] : [];

    return { dts, systems, robots, subsystems, signalSets };
};


// ═══════════════════════════════════════════════════════════════════════════
// 2. DT SELECTOR - Seçili DT Durum Bilgisi
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Seçili DT_ID'ye göre durum bilgisi döndürür.
 * 
 * @param {string} dtId - Seçili Digital Twin kimliği
 * @returns {{ 
 *   status: string, 
 *   lastHeartbeat: string, 
 *   signalCount: number,
 *   assetType: string 
 * } | null}
 */
export const fetchDTStatus = (dtId) => {
    const dt = DT_Registry.find(d => d.DT_ID === dtId);
    if (!dt) return null;

    return {
        status: dt.Status,
        lastHeartbeat: dt.Last_Heartbeat_UTC,
        signalCount: dt.Signal_Set.Signals.length,
        assetType: dt.Asset_Type.replace(/_/g, ' ')
    };
};


// ═══════════════════════════════════════════════════════════════════════════
// 3. DATA QUALITY INDICATOR - Kalite Metrikleri
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Seçili DT_ID'ye göre veri kalitesi metriklerini döndürür.
 * liveMonitoringRawData'daki Telemetry_Status alanından hesaplanır.
 * 
 * @param {string} dtId - Seçili Digital Twin kimliği
 * @returns {{
 *   latency: number,
 *   latencyStatus: string,
 *   gaps: number,
 *   gapDuration: string | null,
 *   packetLoss: number,
 *   qualityFlag: string,
 *   connectionStatus: string,
 *   lastUpdate: string
 * }}
 */
export const fetchDataQualityMetrics = (dtId) => {
    const session = liveMonitoringRawData.find(s => s.DT_Context.DT_ID === dtId);

    // DT bulunamazsa varsayılan "bilinmiyor" durumu
    if (!session) {
        return {
            latency: 0,
            latencyStatus: 'good',
            gaps: 0,
            gapDuration: null,
            packetLoss: 0,
            qualityFlag: 'UNKNOWN',
            connectionStatus: 'disconnected',
            lastUpdate: 'N/A'
        };
    }

    const telemetry = session.Telemetry_Status;
    const quality = telemetry.Quality_Summary;
    const gapInfo = telemetry.Gap_Detection;

    // Connection Status: Stream_State'den türetilir
    let connectionStatus = 'connected';
    if (telemetry.Stream_State === 'OFFLINE') connectionStatus = 'disconnected';
    else if (telemetry.Stream_State === 'DEGRADED') connectionStatus = 'degraded';

    // Latency: Packet_Rate_Hz'den yaklaşık hesaplama (gerçek backend'de ölçülür)
    const latency = telemetry.Packet_Rate_Hz > 0
        ? Math.round(1000 / telemetry.Packet_Rate_Hz)
        : 0;

    let latencyStatus = 'good';
    if (latency > 100) latencyStatus = 'critical';
    else if (latency > 50) latencyStatus = 'warning';

    // Packet Loss: (DROPPED + OUTLIER) / toplam yüzde
    const totalPackets = quality.OK + quality.DELAYED + quality.DROPPED + quality.OUTLIER;
    const packetLoss = totalPackets > 0
        ? parseFloat(((quality.DROPPED + quality.OUTLIER) / totalPackets * 100).toFixed(1))
        : 0;

    // Quality Flag: Kalite durumuna göre
    let qualityFlag = 'GOOD';
    if (connectionStatus === 'disconnected') qualityFlag = 'BAD';
    else if (packetLoss > 5 || connectionStatus === 'degraded') qualityFlag = 'DEGRADED';

    // Gap Duration: Max gap'i okunabilir formata çevir
    let gapDuration = null;
    if (gapInfo.Max_Gap_Ms > 0) {
        gapDuration = gapInfo.Max_Gap_Ms >= 1000
            ? `${(gapInfo.Max_Gap_Ms / 1000).toFixed(1)}s`
            : `${gapInfo.Max_Gap_Ms}ms`;
    }

    // Last Update: Son timestamp'ten beri geçen süre
    const lastTs = new Date(telemetry.Last_Timestamp_UTC);
    const now = new Date();
    const diffSec = Math.round((now - lastTs) / 1000);
    let lastUpdate = 'just now';
    if (diffSec > 3600) lastUpdate = `${Math.round(diffSec / 3600)}h ago`;
    else if (diffSec > 60) lastUpdate = `${Math.round(diffSec / 60)}m ago`;
    else if (diffSec > 5) lastUpdate = `${diffSec}s ago`;

    return {
        latency,
        latencyStatus,
        gaps: gapInfo.Total_Gaps,
        gapDuration,
        packetLoss,
        qualityFlag,
        connectionStatus,
        lastUpdate
    };
};


// ═══════════════════════════════════════════════════════════════════════════
// 4. TIME SERIES WIDGETS - Sinyal Veri Servisleri
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Seçili DT'ye ait sinyal listesini, son değerleri ve simülasyon verilerini döndürür.
 * liveMonitoringSessions ve Telemetry_Stream'den beslenir.
 * 
 * @param {string} dtId - Seçili Digital Twin kimliği
 * @returns {Array<{
 *   id: string,
 *   title: string,
 *   unit: string,
 *   currentValue: number,
 *   simValue: number | null,
 *   category: string,
 *   thresholds: { warning: number, critical: number } | null
 * }>}
 */
export const fetchSignalStream = (dtId, signalSet) => {
    // TPT - Trajectory Validation KPIs Özel Sinyal Listesi
    if (dtId === 'TPT' && signalSet === 'TRAJ_VAL_KPIS') {
        const t = Date.now() / 1000;
        const sineWave = Math.sin(t) * 2 + 3; // 1-5 aralığında dalgalanma

        return [
            {
                id: 'deviation_mm',
                title: 'Deviation',
                unit: 'mm',
                currentValue: parseFloat((Math.abs(Math.sin(t * 2)) * 1.5).toFixed(3)),
                simValue: parseFloat((Math.abs(Math.sin(t * 2)) * 1.4).toFixed(3)),
                category: 'position',
                thresholds: { warning: 2.0, critical: 5.0 },
                description: 'Instantaneous path deviation (planned vs actual)',
                frequency: '~100Hz',
                dataType: 'float64'
            },
            {
                id: 'max_deviation_mm',
                title: 'max deviation',
                unit: 'mm',
                currentValue: 3.42,
                simValue: 3.10,
                category: 'position',
                thresholds: { warning: 4.0, critical: 6.0 },
                description: 'Maximum deviation per cycle',
                frequency: 'per-run',
                dataType: 'float64'
            },
            {
                id: 'process_time_s',
                title: 'process time',
                unit: 's',
                currentValue: 45.2,
                simValue: 44.8,
                category: 'time',
                thresholds: { warning: 50.0, critical: 60.0 },
                description: 'Total cycle time',
                frequency: 'per-run',
                dataType: 'float64'
            },
            {
                id: 'cycle_id',
                title: 'cycle id',
                unit: '-',
                currentValue: 124,
                simValue: null,
                category: 'general',
                thresholds: null,
                description: 'Cycle/Run number',
                frequency: 'per-run',
                dataType: 'int32'
            },
            {
                id: 'kpi_improvement_pct',
                title: 'kpi improvement',
                unit: '%',
                currentValue: 12.5,
                simValue: 10.0,
                category: 'analytics',
                thresholds: null,
                description: 'Time improvement rate (vs baseline)',
                frequency: 'per-run',
                dataType: 'float64'
            }
        ];
    }

    // ESOGU DT - Test Lifecycle Özel Sinyal Listesi
    if (dtId === 'ESOGU_DT' && signalSet === 'TEST_LIFECYCLE') {
        const now = new Date();
        const startTime = new Date(now.getTime() - 15000); // 15 sec ago

        return [
            {
                id: 'test_case_id',
                title: 'test case id',
                unit: '-',
                currentValue: 'TC-1042',
                simValue: null,
                category: 'general',
                thresholds: null,
                description: 'Test case ID',
                frequency: 'per-test',
                dataType: 'string'
            },
            {
                id: 'test_description',
                title: 'test description',
                unit: '-',
                currentValue: 'Emergency Stop Verification',
                simValue: null,
                category: 'general',
                thresholds: null,
                description: 'Test description',
                frequency: 'per-test',
                dataType: 'string'
            },
            {
                id: 'test_status',
                title: 'test status',
                unit: '-',
                currentValue: 'Passed',
                simValue: null,
                category: 'general',
                thresholds: null,
                description: 'Passed / Failed / Blocked / Skipped',
                frequency: 'per-test',
                dataType: 'enum'
            },
            {
                id: 'test_start_time',
                title: 'test start time',
                unit: '-',
                currentValue: startTime.toLocaleTimeString(),
                simValue: null,
                category: 'time',
                thresholds: null,
                description: 'Test start time',
                frequency: 'per-test',
                dataType: 'datetime'
            },
            {
                id: 'test_end_time',
                title: 'test end time',
                unit: '-',
                currentValue: now.toLocaleTimeString(),
                simValue: null,
                category: 'time',
                thresholds: null,
                description: 'Test end time',
                frequency: 'per-test',
                dataType: 'datetime'
            },
            {
                id: 'defect_count',
                title: 'defect count',
                unit: '-',
                currentValue: 0,
                simValue: null,
                category: 'quality',
                thresholds: { warning: 1, critical: 3 },
                description: 'Number of defects found',
                frequency: 'per-test',
                dataType: 'int32'
            },
            {
                id: 'coverage_pct',
                title: 'coverage pct',
                unit: '%',
                currentValue: 88.5,
                simValue: null,
                category: 'quality',
                thresholds: null,
                description: 'Test coverage rate',
                frequency: 'per-suite',
                dataType: 'float64'
            }
        ];
    }

    // OTOKAR PDM - Health Indicators Özel Sinyal Listesi
    if (dtId === 'OTOKAR_PDM' && (signalSet === 'HEALTH_INDICATORS' || signalSet === 'ANOMALY_ENGINE')) {
        const now = new Date();
        const t = Date.now() / 1000;

        // Z-score biraz oynasın
        const zScore = parseFloat((2.0 + Math.sin(t) * 0.5).toFixed(2));
        const isAnomaly = zScore > 2.2;

        return [
            {
                id: 'timestamp',
                title: 'timestamp',
                unit: '-',
                currentValue: now.toISOString(),
                simValue: null,
                category: 'time',
                thresholds: null,
                description: 'Event time',
                frequency: 'event',
                dataType: 'datetime'
            },
            {
                id: 'alert_type',
                title: 'alert type',
                unit: '-',
                currentValue: isAnomaly ? 'Warning' : 'Info',
                simValue: null,
                category: 'general',
                thresholds: null,
                description: 'Critical / Warning / Info',
                frequency: 'event',
                dataType: 'enum'
            },
            {
                id: 'alert_source',
                title: 'alert source',
                unit: '-',
                currentValue: 'Axis-2 Drive',
                simValue: null,
                category: 'general',
                thresholds: null,
                description: 'Source component (e.g. Axis-2 Drive)',
                frequency: 'event',
                dataType: 'string'
            },
            {
                id: 'alert_message',
                title: 'alert message',
                unit: '-',
                currentValue: isAnomaly ? 'High vibration detected' : 'System nominal',
                simValue: null,
                category: 'general',
                thresholds: null,
                description: 'Detailed alert message',
                frequency: 'event',
                dataType: 'string'
            },
            {
                id: 'zscore_value',
                title: 'zscore value',
                unit: '-',
                currentValue: zScore,
                simValue: null,
                category: 'quality',
                thresholds: { warning: 2.0, critical: 3.0 },
                description: 'Current z-score anomaly score',
                frequency: '1Hz',
                dataType: 'float64'
            },
            {
                id: 'threshold_status',
                title: 'threshold status',
                unit: '-',
                currentValue: isAnomaly, // bool values might need string conversion for some widgets but let's keep as bool to match request
                simValue: null,
                category: 'quality',
                thresholds: null,
                description: 'Threshold breach status (true/false)',
                frequency: '1Hz',
                dataType: 'bool'
            },
            {
                id: 'rul hours',
                title: 'rul hours',
                unit: 'hours',
                currentValue: 1245.5,
                simValue: null,
                category: 'analytics',
                thresholds: { warning: 100, critical: 50 }, // lower is worse for RUL usually, but thresholds might assume high=bad. Just placeholder.
                description: 'Estimated remaining useful life (RUL)',
                frequency: 'daily',
                dataType: 'float64'
            }
        ];
    }

    // OTOKAR PDM - Sensor Data (Servo Drive) Özel Sinyal Listesi
    if (dtId === 'OTOKAR_PDM' && signalSet === 'SENSOR_DATA') {
        const t = Date.now() / 1000;

        // Simüle edilmiş akım ve sıcaklık değerleri
        const baseCurrent = 5.0;
        const currentNoise = () => (Math.random() - 0.5) * 0.5;

        const baseTemp = 45.0;
        const tempDrift = Math.sin(t * 0.1) * 2;

        return [
            // 1kHz Signals - Timestamp & Motor Currents
            {
                id: 'timestamp_1khz',
                title: 'timestamp (1kHz)',
                unit: 's',
                currentValue: t.toFixed(3),
                simValue: null,
                category: 'time',
                thresholds: null,
                description: 'High frequency timestamp',
                frequency: '1kHz',
                dataType: 'float64'
            },
            {
                id: 'motor_1_current',
                title: 'motor 1 current',
                unit: 'A',
                currentValue: parseFloat((baseCurrent + Math.sin(t) + currentNoise()).toFixed(2)),
                simValue: parseFloat((baseCurrent + Math.sin(t)).toFixed(2)),
                category: 'electrical',
                thresholds: { warning: 8.0, critical: 10.0 },
                description: 'Motor 1 current value',
                frequency: '1kHz',
                dataType: 'float64'
            },
            {
                id: 'motor_2_current',
                title: 'motor 2 current',
                unit: 'A',
                currentValue: parseFloat((baseCurrent * 0.8 + Math.cos(t) + currentNoise()).toFixed(2)),
                simValue: parseFloat((baseCurrent * 0.8 + Math.cos(t)).toFixed(2)),
                category: 'electrical',
                thresholds: { warning: 8.0, critical: 10.0 },
                description: 'Motor 2 current value',
                frequency: '1kHz',
                dataType: 'float64'
            },
            {
                id: 'motor_3_current',
                title: 'motor 3 current',
                unit: 'A',
                currentValue: parseFloat((baseCurrent * 1.2 + Math.sin(t * 0.5) + currentNoise()).toFixed(2)),
                simValue: null,
                category: 'electrical',
                thresholds: { warning: 9.0, critical: 11.0 },
                description: 'Motor 3 current value',
                frequency: '1kHz',
                dataType: 'float64'
            },
            {
                id: 'motor_4_current',
                title: 'motor 4 current',
                unit: 'A',
                currentValue: parseFloat((baseCurrent + Math.cos(t * 0.5) + currentNoise()).toFixed(2)),
                simValue: null,
                category: 'electrical',
                thresholds: { warning: 8.0, critical: 10.0 },
                description: 'Motor 4 current value',
                frequency: '1kHz',
                dataType: 'float64'
            },
            {
                id: 'motor_5_current',
                title: 'motor 5 current',
                unit: 'A',
                currentValue: parseFloat((4.0 + currentNoise()).toFixed(2)),
                simValue: null,
                category: 'electrical',
                thresholds: { warning: 8.0, critical: 10.0 },
                description: 'Motor 5 current value',
                frequency: '1kHz',
                dataType: 'float64'
            },
            {
                id: 'motor_6_current',
                title: 'motor 6 current',
                unit: 'A',
                currentValue: parseFloat((4.2 + currentNoise()).toFixed(2)),
                simValue: null,
                category: 'electrical',
                thresholds: { warning: 8.0, critical: 10.0 },
                description: 'Motor 6 current value',
                frequency: '1kHz',
                dataType: 'float64'
            },

            // 1Hz Signals - Thermal Data
            {
                id: 'timestamp_1hz',
                title: 'timestamp (thermal)',
                unit: 's',
                currentValue: Math.floor(t),
                simValue: null,
                category: 'time',
                thresholds: null,
                description: 'Thermal timestamp',
                frequency: '1Hz',
                dataType: 'float64'
            },
            {
                id: 'servo_drive_temp',
                title: 'servo drive temp',
                unit: '°C',
                currentValue: parseFloat((55.0 + tempDrift).toFixed(1)),
                simValue: null,
                category: 'thermal',
                thresholds: { warning: 65, critical: 75 },
                description: 'Servo drive temperature (IGBT)',
                frequency: '1Hz',
                dataType: 'float64'
            },
            {
                id: 'motor_1_temp',
                title: 'motor 1 temp',
                unit: '°C',
                currentValue: parseFloat((baseTemp + tempDrift * 0.8).toFixed(1)),
                simValue: null,
                category: 'thermal',
                thresholds: { warning: 60, critical: 70 },
                description: 'Motor 1 temperature',
                frequency: '1Hz',
                dataType: 'float64'
            },
            {
                id: 'motor_2_temp',
                title: 'motor 2 temp',
                unit: '°C',
                currentValue: parseFloat((baseTemp - 2 + tempDrift * 0.9).toFixed(1)),
                simValue: null,
                category: 'thermal',
                thresholds: { warning: 60, critical: 70 },
                description: 'Motor 2 temperature',
                frequency: '1Hz',
                dataType: 'float64'
            },
            {
                id: 'ambient_temp',
                title: 'ambient temp',
                unit: '°C',
                currentValue: 24.5,
                simValue: null,
                category: 'thermal',
                thresholds: { warning: 35, critical: 40 },
                description: 'Ambient temperature',
                frequency: '1Hz',
                dataType: 'float64'
            }
        ];
    }

    const session = liveMonitoringSessions.find(s => s.id === dtId);
    if (!session) return [];

    // Simülasyon sapma verileri
    const deviations = session.simulationInfo?.deviations || {};

    return session.signals.map(signal => {
        // Son gerçek değer
        const latest = session.latestValues[signal.id];
        const currentValue = latest ? latest.value : 0;

        // Simülasyon değeri: sapma varsa gerçek değerden farkı çıkar
        const deviation = deviations[signal.id];
        const simValue = deviation
            ? parseFloat((currentValue - deviation.avg_deviation).toFixed(3))
            : parseFloat((currentValue * 0.98).toFixed(3)); // fallback: %2 fark

        // Threshold kontrolü: sadece warn/critical varsa ekle
        let thresholds = null;
        if (signal.thresholds) {
            const t = signal.thresholds;
            if (t.Warn_High !== null || t.Critical_High !== null) {
                thresholds = {
                    warning: t.Warn_High ?? t.Critical_High,
                    critical: t.Critical_High ?? t.Warn_High
                };
            }
        }

        // Kategori: sinyal adından türet
        let category = 'general';
        const name = signal.name.toLowerCase();
        if (name.includes('temp')) category = 'thermal';
        else if (name.includes('vel') || name.includes('speed')) category = 'velocity';
        else if (name.includes('torque')) category = 'torque';
        else if (name.includes('pos')) category = 'position';
        else if (name.includes('vib')) category = 'vibration';
        else if (name.includes('current')) category = 'electrical';
        else if (name.includes('pressure')) category = 'hydraulic';
        else if (name.includes('flow')) category = 'coolant';

        return {
            id: signal.id,
            title: signal.name.replace(/_/g, ' '),
            unit: signal.unit,
            currentValue,
            simValue,
            category,
            thresholds
        };
    });
};


/**
 * Real vs Simulation delta ve RMSE hesaplar.
 * 
 * @param {number} real - Gerçek değer
 * @param {number} sim  - Simülasyon değeri
 * @returns {{ delta: string, rmse: string }}
 */
export const calculateDiffMetrics = (real, sim) => {
    const delta = real - sim;
    const rmse = Math.sqrt(Math.pow(delta, 2));
    return { delta: delta.toFixed(2), rmse: rmse.toFixed(2) };
};


/**
 * Mini sparkline grafik için veri noktaları üretir.
 * 
 * @param {number} baseValue - Merkez değer
 * @param {number} variance  - Varyans miktarı
 * @param {number} points    - Nokta sayısı
 * @returns {number[]}
 */
export const generateSparklinePoints = (baseValue, variance, points = 30) => {
    // Non-numeric handling for text-based signals
    if (typeof baseValue !== 'number' || isNaN(baseValue)) {
        return new Array(points).fill(0);
    }

    const data = [];
    for (let i = 0; i < points; i++) {
        data.push(baseValue + (Math.random() - 0.5) * variance);
    }
    return data;
};


/**
 * Simülasyon overlay aktifken gösterilecek özet metrikleri hesaplar.
 * 
 * @param {string} dtId - Seçili Digital Twin kimliği
 * @returns {{ avgDelta: string, rmse: string, maxDev: string } | null}
 */
export const fetchSimulationSummary = (dtId) => {
    const session = liveMonitoringSessions.find(s => s.id === dtId);
    if (!session || !session.simulationInfo) return null;

    const deviations = session.simulationInfo.deviations;
    const entries = Object.values(deviations);
    if (entries.length === 0) return null;

    const avgDelta = entries.reduce((sum, d) => sum + d.avg_deviation, 0) / entries.length;
    const maxDev = Math.max(...entries.map(d => d.max_deviation));
    const rmse = Math.sqrt(entries.reduce((sum, d) => sum + Math.pow(d.avg_deviation, 2), 0) / entries.length);

    return {
        avgDelta: avgDelta.toFixed(2),
        rmse: rmse.toFixed(2),
        maxDev: maxDev.toFixed(1)
    };
};
