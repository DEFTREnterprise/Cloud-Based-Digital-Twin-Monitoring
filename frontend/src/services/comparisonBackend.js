
/**
 * Tek bir run için detaylı metrikleri hesaplar
 */
export const fetchRunMetrics = (run) => {
    if (!run) return null;

    // 1) Start/End Time Formatting (Date + Time Splits)
    const formatTimeOnly = (isoString) => {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const formatDateOnly = (isoString) => {
        if (!isoString) return '';
        return new Date(isoString).toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' });
    };

    const startTimeStr = formatTimeOnly(run.startTime);
    const endTimeStr = formatTimeOnly(run.endTime);
    // Genelde start date baz alınır
    const dateStr = formatDateOnly(run.startTime);

    // Time Range Object for better UI handling
    const timeRange = {
        time: `${startTimeStr} - ${endTimeStr}`,
        date: dateStr
    };

    // 2) Operation Time (Duration) Formatting
    const start = new Date(run.startTime).getTime();
    const end = new Date(run.endTime).getTime();
    const durationMs = Math.max(0, end - start);
    const minutes = Math.floor(durationMs / 60000);
    const seconds = ((durationMs % 60000) / 1000).toFixed(1);
    const operationTime = `${minutes}m ${seconds}s`;

    // 3) Speed & Acceleration
    const speedProfile = run.monitoringDetails?.speedProfile || {};
    const avgSpeed = speedProfile.avg_speed || '0 mm/s';
    const avgAccel = speedProfile.avg_accel || '0 mm/s²';

    // 4) Processed Waypoints
    const processedWaypoints = (run.raw?.Actual_Trajectory?.Waypoints || []).length;

    // 5) Status Determination
    const status = (run.status || 'success').toUpperCase();

    return {
        // Display values
        timeRange,          // { time: "HH:mm - HH:mm", date: "DD.MM.YYYY" }
        operationTime,
        avgSpeed,
        avgAccel,
        processedWaypoints,
        status,

        // Raw values for calculation
        durationMs,
        processedWaypointsRaw: processedWaypoints
    };
};

/**
 * İki run arasındaki karşılaştırma verisini ve validation statüsünü hazırlar.
 */
export const fetchComparisonData = (sessions, actualRunId, simulatedRunId) => {
    const runActual = sessions.find(s => s.id === actualRunId);
    const runSimulated = sessions.find(s => s.id === simulatedRunId);

    const actual = fetchRunMetrics(runActual);
    const simulated = fetchRunMetrics(runSimulated);

    // COMPARE STATUS LOGIC
    let validationStatus = 'UNKNOWN';

    if (actual && simulated) {
        const diffMs = Math.abs(actual.durationMs - simulated.durationMs);
        const thresholdMs = 5000; // 5 saniye tolerans

        if (actual.status === 'RUNNING' || simulated.status === 'RUNNING') {
            validationStatus = 'RUNNING';
        } else if (actual.status === 'CANCELLED' || simulated.status === 'CANCELLED') {
            validationStatus = 'CANCELLED';
        } else if (diffMs <= thresholdMs) {
            validationStatus = 'SUCCESS';
        } else {
            validationStatus = 'FAIL';
        }
    }

    return {
        actual,
        simulated,
        validationStatus
    };
};
