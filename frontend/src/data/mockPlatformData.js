/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MOCK PLATFORM DATA — General Platform Management (System Overview)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This file provides mock data for the
 * "General Platform Management (System Overview)" module.
 *
 * It is derived from the high-level requirements in `platform.txt`:
 *   - Identity / role / tenant context
 *   - Service health status (API, DB, adapters, auth, etc.)
 *   - Application / Prometheus-style metrics
 *   - Ingest / data flow health (RT + batch)
 *   - Run / session health (TPT / ESOGU / others)
 *   - Critical events / logs / audit
 *   - Configuration & DT registry state
 *
 * Contents:
 *   1. Platform_Identity_Context      → current user / role / tenant
 *   2. Platform_Service_Health       → service health list
 *   3. Platform_App_Metrics          → core application metrics (API/DB/etc.)
 *   4. Platform_Ingest_Health        → ingest status (RT + batch)
 *   5. Platform_Run_Status           → recent runs / sessions
 *   6. Platform_Events_And_Logs      → critical events + top error types
 *   7. Platform_Config_State         → DT registry, connections, retention
 *   8. Adapters / Helpers            → derived data for UI widgets
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. IDENTITY CONTEXT — User / Role / Tenant
// ═══════════════════════════════════════════════════════════════════════════

export const Platform_Identity_Context = {
  User_ID: 'admin_platform',
  Display_Name: 'Platform Administrator',
  Role: 'ADMIN',
  Tenant_ID: 'CB-MDTM-PLATFORM',
  Permission_Set: ['platform_read', 'platform_admin'],
};

// ═══════════════════════════════════════════════════════════════════════════
// 2. SERVICE HEALTH STATUS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Service_Health_Status:
 *   - Service_ID: logical service name
 *   - State: 'up' | 'down' | 'degraded'
 *   - Last_Check_Timestamp: ISO UTC time
 *   - Error_Summary: short description when not healthy
 *   - Latency_ms: health check latency
 */
export const Platform_Service_Health = [
  {
    Service_ID: 'api_gateway',
    Display_Name: 'API Gateway',
    State: 'up',
    Last_Check_Timestamp: '2026-03-18T13:59:30Z',
    Error_Summary: null,
    Latency_ms: 45,
  },
  {
    Service_ID: 'ui_frontend',
    Display_Name: 'Web UI',
    State: 'up',
    Last_Check_Timestamp: '2026-03-18T13:59:28Z',
    Error_Summary: null,
    Latency_ms: 30,
  },
  {
    Service_ID: 'auth_keycloak',
    Display_Name: 'Auth / Keycloak',
    State: 'up',
    Last_Check_Timestamp: '2026-03-18T13:59:25Z',
    Error_Summary: null,
    Latency_ms: 55,
  },
  {
    Service_ID: 'timescaledb',
    Display_Name: 'TimeSeries DB (TimescaleDB)',
    State: 'degraded',
    Last_Check_Timestamp: '2026-03-18T13:59:20Z',
    Error_Summary: 'High query latency on historical reads (p95 > 250ms)',
    Latency_ms: 260,
  },
  {
    Service_ID: 'minio',
    Display_Name: 'Object Storage (MinIO)',
    State: 'up',
    Last_Check_Timestamp: '2026-03-18T13:59:18Z',
    Error_Summary: null,
    Latency_ms: 70,
  },
  {
    Service_ID: 'opensearch',
    Display_Name: 'Logs / OpenSearch',
    State: 'up',
    Last_Check_Timestamp: '2026-03-18T13:59:15Z',
    Error_Summary: null,
    Latency_ms: 85,
  },
  {
    Service_ID: 'mosquitto',
    Display_Name: 'MQTT Broker (Mosquitto)',
    State: 'up',
    Last_Check_Timestamp: '2026-03-18T13:59:10Z',
    Error_Summary: null,
    Latency_ms: 40,
  },
  {
    Service_ID: 'ingest_adapter',
    Display_Name: 'Ingest Adapter',
    State: 'degraded',
    Last_Check_Timestamp: '2026-03-18T13:59:05Z',
    Error_Summary: 'RT ingest lag above threshold on PdM stream',
    Latency_ms: 120,
  },
  {
    Service_ID: 'orchestrator',
    Display_Name: 'Job Orchestrator',
    State: 'up',
    Last_Check_Timestamp: '2026-03-18T13:59:02Z',
    Error_Summary: null,
    Latency_ms: 60,
  },
  {
    Service_ID: 'grafana',
    Display_Name: 'Grafana / Prometheus',
    State: 'up',
    Last_Check_Timestamp: '2026-03-18T13:58:58Z',
    Error_Summary: null,
    Latency_ms: 90,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 3. APPLICATION METRICS (Prometheus-style aggregates)
// ═══════════════════════════════════════════════════════════════════════════

export const Platform_App_Metrics = {
  Timestamp_UTC: '2026-03-18T14:00:00Z',
  API_p95_latency_ms: 180,
  API_error_rate: 0.012, // 1.2%
  stream_clients_active: 7,
  rate_limit_hits_total: 23,
  db_query_latency_ms_p95: 210,
  db_write_latency_ms_p95: 95,
  // Overall availability / uptime KPIs
  uptime_7d_percent: 99.4,
  uptime_30d_percent: 99.1,
  // Log error rate (e.g. error entries / total log entries)
  error_logs_rate: 0.021, // 2.1%
  // DB connection error rate (fraction of failed connections)
  db_connection_error_rate: 0.004, // 0.4%
};

// ═══════════════════════════════════════════════════════════════════════════
// 3.1. RESOURCE USAGE (CPU / RAM / DISK)
// ═══════════════════════════════════════════════════════════════════════════

export const Platform_Resource_Usage = {
  cpu_percent: 42,
  ram_used_gb: 6.2,
  ram_total_gb: 16,
  disk_used_gb: 120,
  disk_total_gb: 500,
};

// ═══════════════════════════════════════════════════════════════════════════
// 4. INGEST / DATA FLOW HEALTH
// ═══════════════════════════════════════════════════════════════════════════

export const Platform_Ingest_Health = {
  Timestamp_UTC: '2026-03-18T14:00:00Z',
  // Real-time streams
  Realtime: [
    {
      Stream_ID: 'ingest_pdm_rt',
      Description: 'PdM real-time sensor ingest',
      messages_per_sec: 1200,
      ingest_lag_seconds: 8,
      gap_count: 3,
      dropped_count: 42,
      delayed_count: 18,
      Status: 'degraded', // normal | degraded | critical
    },
    {
      Stream_ID: 'ingest_live_monitoring',
      Description: 'Live Monitoring time-series ingest',
      messages_per_sec: 850,
      ingest_lag_seconds: 2,
      gap_count: 0,
      dropped_count: 3,
      delayed_count: 5,
      Status: 'normal',
    },
    {
      Stream_ID: 'ingest_esogu',
      Description: 'ESOGÜ test lifecycle events',
      messages_per_sec: 120,
      ingest_lag_seconds: 0,
      gap_count: 0,
      dropped_count: 0,
      delayed_count: 0,
      Status: 'normal',
    },
  ],
  // Batch jobs
  Batch: [
    {
      Job_ID: 'batch_hist_pdm_24h',
      Description: 'PdM 24h historical upload',
      Status: 'running', // running | success | fail
      Last_Run_Start_UTC: '2026-03-18T13:30:00Z',
      Last_Run_End_UTC: null,
      Last_Error: null,
    },
    {
      Job_ID: 'batch_esogu_reports',
      Description: 'ESOGÜ test reports daily export',
      Status: 'success',
      Last_Run_Start_UTC: '2026-03-18T02:00:00Z',
      Last_Run_End_UTC: '2026-03-18T02:05:00Z',
      Last_Error: null,
    },
    {
      Job_ID: 'batch_tpt_archive',
      Description: 'TPT run archive to MinIO',
      Status: 'fail',
      Last_Run_Start_UTC: '2026-03-17T23:00:00Z',
      Last_Run_End_UTC: '2026-03-17T23:02:30Z',
      Last_Error: 'S3/MinIO connection timeout',
    },
  ],
  schema_reject_total: 5,
};

// ═══════════════════════════════════════════════════════════════════════════
// 5. RUN / SESSION HEALTH (Recent Runs)
// ═══════════════════════════════════════════════════════════════════════════

export const Platform_Run_Status = [
  {
    Run_ID: 'TPT-RUN-2026-03-18-001',
    Type: 'TPT',
    Status: 'success',
    Duration_sec: 305,
    Start_Timestamp_UTC: '2026-03-18T13:50:00Z',
    End_Timestamp_UTC: '2026-03-18T13:55:05Z',
    Error_Message: null,
    Queue_Length: 0,
  },
  {
    Run_ID: 'TPT-RUN-2026-03-18-002',
    Type: 'TPT',
    Status: 'running',
    Duration_sec: 120,
    Start_Timestamp_UTC: '2026-03-18T13:58:00Z',
    End_Timestamp_UTC: null,
    Error_Message: null,
    Queue_Length: 1,
  },
  {
    Run_ID: 'ESOGU-SESSION-2026-03-18-101',
    Type: 'ESOGU',
    Status: 'fail',
    Duration_sec: 45,
    Start_Timestamp_UTC: '2026-03-18T13:40:00Z',
    End_Timestamp_UTC: '2026-03-18T13:40:45Z',
    Error_Message: 'Test environment not reachable (HIL bind fail)',
    Queue_Length: 0,
  },
  {
    Run_ID: 'ESOGU-SESSION-2026-03-18-102',
    Type: 'ESOGU',
    Status: 'success',
    Duration_sec: 210,
    Start_Timestamp_UTC: '2026-03-18T13:30:00Z',
    End_Timestamp_UTC: '2026-03-18T13:33:30Z',
    Error_Message: null,
    Queue_Length: 0,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 6. EVENTS / LOGS / AUDIT
// ═══════════════════════════════════════════════════════════════════════════

export const Platform_Events_And_Logs = {
  Critical_Events: [
    {
      Event_ID: 'EVT-GAP-001',
      Time_UTC: '2026-03-18T13:57:10Z',
      Severity: 'CRITICAL',
      Source: 'ingest_adapter',
      Type: 'gap_detected',
      Message: 'Gap detected on PdM_RT stream (duration 12s)',
      Link: {
        Type: 'logs',
        Target: 'opensearch_query_gap_evt_gap-001',
      },
    },
    {
      Event_ID: 'EVT-ADP-FAIL-001',
      Time_UTC: '2026-03-18T13:45:22Z',
      Severity: 'CRITICAL',
      Source: 'adapter_pdm',
      Type: 'adapter_fail',
      Message: 'PdM adapter restart required — connection lost to OT factory broker',
      Link: {
        Type: 'grafana',
        Target: 'grafana_dashboard_pdm_adapter',
      },
    },
    {
      Event_ID: 'EVT-AUTH-FAIL-001',
      Time_UTC: '2026-03-18T13:30:00Z',
      Severity: 'WARN',
      Source: 'auth_keycloak',
      Type: 'auth_fail',
      Message: 'Multiple failed login attempts for user otokar_viewer',
      Link: {
        Type: 'logs',
        Target: 'opensearch_query_auth_fail_evt-001',
      },
    },
    {
      Event_ID: 'EVT-RUN-FAIL-001',
      Time_UTC: '2026-03-18T13:40:45Z',
      Severity: 'CRITICAL',
      Source: 'ESOGU',
      Type: 'run_fail',
      Message: 'ESOGÜ session ESOGU-SESSION-2026-03-18-101 failed: HIL bind fail',
      Link: {
        Type: 'module',
        Target: 'esogu_dt_tool',
      },
    },
  ],
  Top_Error_Types: [
    {
      Error_Type: 'adapter_timeout',
      Count: 18,
      Last_Seen_UTC: '2026-03-18T13:57:10Z',
    },
    {
      Error_Type: 'auth_invalid_credentials',
      Count: 9,
      Last_Seen_UTC: '2026-03-18T13:30:00Z',
    },
    {
      Error_Type: 'db_slow_query',
      Count: 5,
      Last_Seen_UTC: '2026-03-18T13:55:30Z',
    },
  ],
  Audit_Events: [
    {
      Audit_ID: 'AUD-001',
      Time_UTC: '2026-03-18T12:15:00Z',
      Actor: 'admin_platform',
      Action: 'CONFIG_CHANGE',
      Target: 'ingest_adapter.thresholds',
      Summary: 'Updated ingest lag critical threshold from 10s → 8s',
    },
    {
      Audit_ID: 'AUD-002',
      Time_UTC: '2026-03-18T11:45:00Z',
      Actor: 'admin_platform',
      Action: 'ROLE_ASSIGN',
      Target: 'user otokar_viewer',
      Summary: 'Granted platform_read permission',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// 7. CONFIGURATION STATE
// ═══════════════════════════════════════════════════════════════════════════

export const Platform_Config_State = {
  DT_Registry: {
    Total_DT_Count: 6,
    Active_DT_Count: 5,
    Inactive_DT_Count: 1,
    Modules: [
      { Module_ID: 'live_monitoring', DT_Count: 4 },
      { Module_ID: 'pdm', DT_Count: 2 },
      { Module_ID: 'tpt', DT_Count: 1 },
      { Module_ID: 'esogu', DT_Count: 1 },
    ],
  },
  Connection_Tests: [
    {
      Connection_ID: 'timescaledb_primary',
      Target: 'TimescaleDB primary cluster',
      Last_Status: 'success',
      Last_Checked_UTC: '2026-03-18T13:59:40Z',
      Latency_ms: 190,
    },
    {
      Connection_ID: 'minio_internal',
      Target: 'MinIO internal bucket',
      Last_Status: 'success',
      Last_Checked_UTC: '2026-03-18T13:59:35Z',
      Latency_ms: 80,
    },
    {
      Connection_ID: 'opensearch_logs',
      Target: 'OpenSearch logs cluster',
      Last_Status: 'success',
      Last_Checked_UTC: '2026-03-18T13:59:25Z',
      Latency_ms: 120,
    },
    {
      Connection_ID: 'pdm_adapter',
      Target: 'PdM factory adapter',
      Last_Status: 'fail',
      Last_Checked_UTC: '2026-03-18T13:58:50Z',
      Latency_ms: null,
    },
  ],
  Adapter_Health: [
    {
      Adapter_ID: 'adapter_pdm',
      Status: 'degraded',
      Last_Heartbeat_UTC: '2026-03-18T13:59:05Z',
      Last_Error: 'Connection timeout to Mosquitto broker',
    },
    {
      Adapter_ID: 'adapter_esogu',
      Status: 'healthy',
      Last_Heartbeat_UTC: '2026-03-18T13:59:00Z',
      Last_Error: null,
    },
    {
      Adapter_ID: 'adapter_tpt',
      Status: 'healthy',
      Last_Heartbeat_UTC: '2026-03-18T13:58:45Z',
      Last_Error: null,
    },
  ],
  Retention_Policies: [
    {
      Policy_ID: 'timeseries_rt',
      Scope: 'Realtime telemetry',
      Retention_Days: 7,
      Downsample_Strategy: 'keep_1s_for_24h_then_1m',
    },
    {
      Policy_ID: 'timeseries_hist',
      Scope: 'Historical telemetry',
      Retention_Days: 365,
      Downsample_Strategy: 'keep_1m_for_30d_then_15m',
    },
    {
      Policy_ID: 'logs_platform',
      Scope: 'Platform logs',
      Retention_Days: 30,
      Downsample_Strategy: 'raw',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// 8. ADAPTERS / HELPERS — Derived data for UI components
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Returns high-level health summary cards for:
 * - API
 * - DB
 * - Ingest
 * - Adapter
 * - Auth
 * - Run / Session
 */
export const getPlatformHealthSummary = () => {
  const findService = (idPrefix) =>
    Platform_Service_Health.find((s) => s.Service_ID.startsWith(idPrefix));

  const api = findService('api_gateway');
  const db = findService('timescaledb');
  const ingest = findService('ingest_adapter');
  const auth = findService('auth_keycloak');

  const criticalEvents = Platform_Events_And_Logs.Critical_Events || [];
  const openCriticalEvents = criticalEvents.filter((e) => e.Severity === 'CRITICAL');

  const failedRuns = Platform_Run_Status.filter((r) => r.Status === 'fail').length;
  const runningRuns = Platform_Run_Status.filter((r) => r.Status === 'running').length;

  const now = new Date(Platform_App_Metrics.Timestamp_UTC);
  const last24hEvents = criticalEvents.filter((e) => {
    const t = new Date(e.Time_UTC);
    return now - t <= 24 * 3600 * 1000;
  });

  return {
    apiStatus: {
      state: api?.State || 'unknown',
      latencyMs: Platform_App_Metrics.API_p95_latency_ms,
      errorRate: Platform_App_Metrics.API_error_rate,
    },
    dbStatus: {
      state: db?.State || 'unknown',
      queryLatencyMs: Platform_App_Metrics.db_query_latency_ms_p95,
      writeLatencyMs: Platform_App_Metrics.db_write_latency_ms_p95,
      connectionErrorRate: Platform_App_Metrics.db_connection_error_rate,
    },
    ingestStatus: {
      state: ingest?.State || 'unknown',
      rtStreams: Platform_Ingest_Health.Realtime.length,
      degradedStreams: Platform_Ingest_Health.Realtime.filter(
        (s) => s.Status !== 'normal',
      ).length,
    },
    adapterStatus: {
      totalAdapters: Platform_Config_State.Adapter_Health.length,
      degradedAdapters: Platform_Config_State.Adapter_Health.filter(
        (a) => a.Status !== 'healthy',
      ).length,
    },
    authStatus: {
      state: auth?.State || 'unknown',
    },
    runStatus: {
      running: runningRuns,
      failed: failedRuns,
      recentTotal: Platform_Run_Status.length,
    },
    criticalEvents: openCriticalEvents.length,
    criticalEventsLast24h: last24hEvents.length,
    // Uptime & logs
    uptime7dPercent: Platform_App_Metrics.uptime_7d_percent,
    uptime30dPercent: Platform_App_Metrics.uptime_30d_percent,
    errorLogsRate: Platform_App_Metrics.error_logs_rate,
  };
};

/**
 * Returns ingest panel data: lag, gaps, throughput trend candidates.
 */
export const getIngestPanelData = () => {
  return {
    timestamp: Platform_Ingest_Health.Timestamp_UTC,
    realtime: Platform_Ingest_Health.Realtime,
    batch: Platform_Ingest_Health.Batch,
    schemaRejectTotal: Platform_Ingest_Health.schema_reject_total,
  };
};

/**
 * Returns recent run/session list.
 */
export const getRecentRuns = () => {
  // Sorted by start time desc
  return [...Platform_Run_Status].sort(
    (a, b) => new Date(b.Start_Timestamp_UTC) - new Date(a.Start_Timestamp_UTC),
  );
};

/**
 * Returns critical event feed data.
 */
export const getCriticalEventsFeed = () => {
  return {
    events: Platform_Events_And_Logs.Critical_Events,
    topErrorTypes: Platform_Events_And_Logs.Top_Error_Types,
    auditEvents: Platform_Events_And_Logs.Audit_Events,
  };
};

/**
 * Returns high-level platform configuration overview.
 */
export const getPlatformConfigOverview = () => {
  return Platform_Config_State;
};

export default {
  Platform_Identity_Context,
  Platform_Service_Health,
  Platform_App_Metrics,
  Platform_Ingest_Health,
  Platform_Resource_Usage,
  Platform_Run_Status,
  Platform_Events_And_Logs,
  Platform_Config_State,
  // Helpers
  getPlatformHealthSummary,
  getIngestPanelData,
  getRecentRuns,
  getCriticalEventsFeed,
  getPlatformConfigOverview,
};

