
/**
 * Mock Data for System Settings
 * Centralized data source for all System Settings panels.
 *
 * Project Scenario:
 *   Otokar factory — 2 inspection robot arms + bus chassis = 1 digital twin.
 *   The robots enter chassis compartments and verify correct assembly.
 *   Live Monitoring shows real camera + DT side-by-side.
 *   TPT handles collision-free trajectory testing for robot arms.
 *   ESOGU DT Tool runs an AI-managed STLC Manager.
 *   PdM algorithm will come from Otokar (not yet finalized).
 */

// ==================================================================
// 1. Identity & Context  (Users, Roles, Tenants)
// ==================================================================

export const Identity_Context = {
    Users: [
        { User_ID: 'USR-000', Username: 'super_admin', Full_Name: 'System Administrator', Role: 'Admin', Tenant_ID: 'SYSTEM', Email: 'admin@kocdigital.com', Permission_Set: ['config_read', 'config_write', 'system_manage', 'all_access'] },
        { User_ID: 'USR-001', Username: 'admin_otokar', Full_Name: 'OTOKAR (Admin)', Role: 'OTOKAR (Admin)', Tenant_ID: 'OTOKAR', Email: 'admin@otokar.com.tr', Permission_Set: ['config_read', 'config_write', 'user_manage'] },
        { User_ID: 'USR-002', Username: 'viewer_otokar', Full_Name: 'OTOKAR (Viewer)', Role: 'OTOKAR (Viewer)', Tenant_ID: 'OTOKAR', Email: 'viewer@otokar.com.tr', Permission_Set: ['config_read'] },
        { User_ID: 'USR-003', Username: 'admin_deftr', Full_Name: 'DEFTR (Admin)', Role: 'DEFTR (Admin)', Tenant_ID: 'DEFTR', Email: 'admin@deftr.gov.tr', Permission_Set: ['config_read', 'config_write'] },
        { User_ID: 'USR-004', Username: 'viewer_deftr', Full_Name: 'DEFTR (Viewer)', Role: 'DEFTR (Viewer)', Tenant_ID: 'DEFTR', Email: 'viewer@deftr.gov.tr', Permission_Set: ['config_read'] },
        { User_ID: 'USR-005', Username: 'admin_esogu', Full_Name: 'ESOGU (Admin)', Role: 'ESOGU (Admin)', Tenant_ID: 'ESOGU', Email: 'admin@esogu.edu.tr', Permission_Set: ['config_read', 'config_write', 'run_execute'] },
        { User_ID: 'USR-006', Username: 'viewer_esogu', Full_Name: 'ESOGU (Viewer)', Role: 'ESOGU (Viewer)', Tenant_ID: 'ESOGU', Email: 'student@esogu.edu.tr', Permission_Set: ['config_read'] },
        { User_ID: 'USR-007', Username: 'operator_esogu', Full_Name: 'ESOGU (Operator)', Role: 'ESOGU (Operator)', Tenant_ID: 'ESOGU', Email: 'operator@esogu.edu.tr', Permission_Set: ['config_read', 'run_execute'] },
    ],
    Roles: [
        { Role_ID: 'Admin', Description: 'Super user with full access to all tenants and settings.' },
        { Role_ID: 'OTOKAR (Admin)', Description: 'Admin access for Otokar tenant.' },
        { Role_ID: 'OTOKAR (Viewer)', Description: 'Read-only access for Otokar tenant.' },
        { Role_ID: 'DEFTR (Admin)', Description: 'Admin access for DEFTR tenant.' },
        { Role_ID: 'DEFTR (Viewer)', Description: 'Read-only access for DEFTR tenant.' },
        { Role_ID: 'ESOGU (Admin)', Description: 'Admin access for ESOGU tenant.' },
        { Role_ID: 'ESOGU (Viewer)', Description: 'Read-only access for ESOGU tenant.' },
        { Role_ID: 'ESOGU (Operator)', Description: 'Operator access for ESOGU — can execute runs but not modify config.' },
    ],
    Tenants: [
        { Tenant_ID: 'SYSTEM', Description: 'System Level' },
        { Tenant_ID: 'OTOKAR', Description: 'Otokar Automotive — Chassis Inspection' },
        { Tenant_ID: 'DEFTR', Description: 'Defence Technologies — TPT Trajectory' },
        { Tenant_ID: 'ESOGU', Description: 'Eskisehir Osmangazi University — STLC Manager' },
    ],
};

// ==================================================================
// 2. DT Registry  (Digital Twin definitions — structured)
// ==================================================================

export const DT_Registry = [
    {
        DT_ID: 'DT-001',
        DT_Name: 'Chassis Inspection Cell',
        DT_Type: 'OTOKAR_DT',
        Owner_Tenant: 'OTOKAR',
        Asset_ID_List: ['AST-001', 'AST-002', 'AST-003', 'AST-004', 'AST-005', 'AST-006', 'AST-007', 'AST-008', 'AST-009', 'AST-010', 'AST-011'],
        Asset_Group_ID: 'GRP-INSPECTION-CELL',
        DT_Versioning_Policy: 'v1.0.0',
    },
];

// Panel-friendly format  (used by DTInventoryPanel)
export const MOCK_TWINS = [
    {
        id: 'DT-001',
        name: 'Chassis Inspection Cell',
        type: 'Inspection Environment',
        status: 'active',
        lastSync: '2026-02-17T21:30:00Z',
        signals: 112,
        tenant: 'OTOKAR',
    },
];

export const MOCK_ASSETS = [
    { id: 'AST-001', name: 'Inspection Robot Arm #1', linkedTwin: 'DT-001', category: 'Robot', condition: 'Good', lastMaintenance: '2026-01-15' },
    { id: 'AST-002', name: 'Inspection Robot Arm #2', linkedTwin: 'DT-001', category: 'Robot', condition: 'Good', lastMaintenance: '2026-01-15' },
    { id: 'AST-003', name: 'Bus Chassis Fixture', linkedTwin: 'DT-001', category: 'Fixture', condition: 'Good', lastMaintenance: '2026-02-10' },
    { id: 'AST-004', name: 'End-Effector Camera (Arm #1)', linkedTwin: 'DT-001', category: 'Sensor', condition: 'Good', lastMaintenance: '2026-02-01' },
    { id: 'AST-005', name: 'End-Effector Camera (Arm #2)', linkedTwin: 'DT-001', category: 'Sensor', condition: 'Good', lastMaintenance: '2026-02-01' },
    { id: 'AST-006', name: 'Overhead Inspection Camera', linkedTwin: 'DT-001', category: 'Sensor', condition: 'Fair', lastMaintenance: '2025-12-15' },
    { id: 'AST-007', name: 'Proximity Sensor Array', linkedTwin: 'DT-001', category: 'Sensor', condition: 'Good', lastMaintenance: '2026-01-20' },
    { id: 'AST-008', name: 'Servo Motor — Axis 1 (Arm #1)', linkedTwin: 'DT-001', category: 'Actuator', condition: 'Good', lastMaintenance: '2026-01-15' },
    { id: 'AST-009', name: 'Servo Motor — Axis 2 (Arm #1)', linkedTwin: 'DT-001', category: 'Actuator', condition: 'Good', lastMaintenance: '2026-01-15' },
    { id: 'AST-010', name: 'Servo Motor — Axis 1 (Arm #2)', linkedTwin: 'DT-001', category: 'Actuator', condition: 'Fair', lastMaintenance: '2025-12-20' },
    { id: 'AST-011', name: 'Servo Motor — Axis 2 (Arm #2)', linkedTwin: 'DT-001', category: 'Actuator', condition: 'Good', lastMaintenance: '2026-01-15' },
];

// ==================================================================
// 3. Signal Catalog & Signal Sets
// ==================================================================

export const Signal_Catalog = [
    { Signal_ID: 'SIG-ARM-TEMP', Unit: '°C', Description: 'Robot Arm Motor Temperature', Source: 'PLC', Default_Thresholds: { Min: 0, Max: 120, Warn_High: 85, Critical_High: 100 } },
    { Signal_ID: 'SIG-ARM-VIB', Unit: 'mm/s²', Description: 'Robot Arm Vibration RMS', Source: 'ACCELEROMETER', Default_Thresholds: { Max: 10, Warn_High: 7, Critical_High: 9 } },
    { Signal_ID: 'SIG-ARM-CURRENT', Unit: 'A', Description: 'Robot Arm Motor Current', Source: 'PLC', Default_Thresholds: { Min: 0, Max: 30, Warn_High: 25, Critical_High: 28 } },
    { Signal_ID: 'SIG-JOINT-ANGLE', Unit: 'deg', Description: 'Joint Angle Position', Source: 'ENCODER', Default_Thresholds: { Min: -180, Max: 180 } },
    { Signal_ID: 'SIG-TCP-POS', Unit: 'mm', Description: 'Tool Center Point Position', Source: 'ENCODER', Default_Thresholds: null },
    { Signal_ID: 'SIG-TCP-VEL', Unit: 'mm/s', Description: 'TCP Linear Velocity', Source: 'ENCODER', Default_Thresholds: { Max: 2000, Warn_High: 1500 } },
    { Signal_ID: 'SIG-FORCE', Unit: 'N', Description: 'Contact Force', Source: 'FORCE_SENSOR', Default_Thresholds: { Max: 500, Warn_High: 300, Critical_High: 450 } },
    { Signal_ID: 'SIG-CAM-FEED', Unit: 'boolean', Description: 'Camera Feed Active Status', Source: 'CAMERA', Default_Thresholds: null },
    { Signal_ID: 'SIG-PROX', Unit: 'mm', Description: 'Proximity Sensor Distance', Source: 'SENSOR_ANALOG', Default_Thresholds: { Min: 5, Warn_Low: 10, Critical_Low: 5 } },
    { Signal_ID: 'SIG-POS-ERR', Unit: 'mm', Description: 'Position Error', Source: 'PLC', Default_Thresholds: { Max: 2, Warn_High: 1, Critical_High: 1.5 } },
];

export const Signal_Sets = [
    { Signal_Set_ID: 'SET-PDM-BASIC', Signal_ID_List: ['SIG-ARM-TEMP', 'SIG-ARM-VIB', 'SIG-ARM-CURRENT', 'SIG-POS-ERR', 'SIG-CAM-FEED'] },
    { Signal_Set_ID: 'SET-TPT-TRAJECTORY', Signal_ID_List: ['SIG-JOINT-ANGLE', 'SIG-TCP-POS', 'SIG-TCP-VEL', 'SIG-FORCE'] },
    { Signal_Set_ID: 'SET-INSPECTION-ALL', Signal_ID_List: ['SIG-ARM-TEMP', 'SIG-ARM-VIB', 'SIG-ARM-CURRENT', 'SIG-JOINT-ANGLE', 'SIG-TCP-POS', 'SIG-TCP-VEL', 'SIG-FORCE', 'SIG-CAM-FEED', 'SIG-PROX', 'SIG-POS-ERR'] },
];

// ==================================================================
// 4. Data Source Connections  (structured + panel-friendly)
// ==================================================================

export const Data_Source_Connections = [
    {
        Connection_ID: 'CONN-MQTT-01',
        Name: 'Primary MQTT Broker',
        RT_Source_Type: 'MQTT',
        Parameters: {
            Broker_URL: 'mqtt://mqtt.otokar-factory.local:1883',
            Topic_Pattern: 'otokar/inspection/+/telemetry',
            QoS: 1,
            Secret_Ref: 'vault:secret/mqtt/otokar-auth',
        },
        Schema_ID: 'SCH-INSPECTION-V1',
        Health_Check_Interval_Sec: 30,
        Status: 'CONNECTED',
    },
    {
        Connection_ID: 'CONN-MQTT-02',
        Name: 'Cloud MQTT Bridge',
        RT_Source_Type: 'MQTT',
        Parameters: {
            Broker_URL: 'mqtts://mqtt.matisse-cloud.eu:8883',
            Topic_Pattern: 'matisse/+/cloud/#',
            QoS: 1,
            Secret_Ref: 'vault:secret/mqtt/cloud-cert',
        },
        Schema_ID: 'SCH-CLOUD-V2',
        Health_Check_Interval_Sec: 60,
        Status: 'CONNECTED',
    },
    {
        Connection_ID: 'CONN-REST-01',
        Name: 'ESOGU STLC Manager',
        RT_Source_Type: 'REST_SSE',
        Parameters: {
            Endpoint_URL: 'http://esogu-ai.local:8000/api',
            Mode: 'SSE',
            Polling_Interval_Sec: null,
            Secret_Ref: 'vault:secret/api/esogu-key',
        },
        Schema_ID: 'SCH-ESOGU-V1',
        Health_Check_Interval_Sec: 120,
        Status: 'CONNECTED',
    },
    {
        Connection_ID: 'CONN-OPCUA-01',
        Name: 'OPC-UA Gateway (Otokar PLC)',
        RT_Source_Type: 'OPC-UA',
        Parameters: {
            Endpoint_URL: 'opc.tcp://opcua-gw.otokar-factory:4840',
            Secret_Ref: 'vault:secret/opcua/otokar-cert',
        },
        Schema_ID: 'SCH-OPCUA-V1',
        Health_Check_Interval_Sec: 30,
        Status: 'DEGRADED',
    },
];

// Panel-friendly format  (used by ConnectivityPanel)
export const MOCK_BROKERS = [
    { id: 'BRK-001', name: 'Primary MQTT Broker', host: 'mqtt.otokar-factory.local', port: 1883, protocol: 'MQTT', status: 'connected', tls: true, topics: 24, tenant: 'OTOKAR' },
    { id: 'BRK-002', name: 'Cloud MQTT Bridge', host: 'mqtt.matisse-cloud.eu', port: 8883, protocol: 'MQTTS', status: 'connected', tls: true, topics: 12, tenant: 'ALL' },
    { id: 'BRK-003', name: 'Otokar Factory Floor MQTT', host: '192.168.1.100', port: 1884, protocol: 'MQTT', status: 'connected', tls: false, topics: 8, tenant: 'OTOKAR' },
];

export const MOCK_ENDPOINTS = [
    { id: 'API-001', name: 'MATISSE REST API', url: 'https://api.matisse-platform.eu/v2', method: 'REST', status: 'healthy', latency: '23ms', auth: 'Bearer Token', lastCheck: '2026-02-17T21:30:00Z' },
    { id: 'API-002', name: 'ESOGU STLC Manager', url: 'http://esogu-ai.local:8000/api', method: 'REST', status: 'healthy', latency: '45ms', auth: 'API Key', lastCheck: '2026-02-17T21:29:00Z' },
    { id: 'API-003', name: 'OPC-UA Gateway (Otokar PLC)', url: 'opc.tcp://opcua-gw.otokar-factory:4840', method: 'OPC-UA', status: 'degraded', latency: '120ms', auth: 'Certificate', lastCheck: '2026-02-17T21:25:00Z' },
    { id: 'API-004', name: 'InfluxDB Time Series', url: 'http://influx.matisse.local:8086', method: 'REST', status: 'healthy', latency: '8ms', auth: 'Token', lastCheck: '2026-02-17T21:30:00Z' },
];

// ==================================================================
// 5. Adapter Configurations  (used by AdapterConfigPanel)
//    NOTE: icon references live in the component, not here.
// ==================================================================

export const MOCK_ADAPTERS = {
    pdm: {
        name: 'PdM Adapter',
        adapterId: 'ADP-PDM-01',
        description: 'Predictive Maintenance for chassis inspection robot arms (from Otokar)',
        color: 'blue',
        status: 'active',
        adapterVersion: 'v1.5',
        lastModified: '2026-02-16T14:00:00Z',
        ingestMode: 'Batch',
        retryPolicy: { maxRetries: 3, backoffMs: 1000 },
        timeoutMs: 5000,
        mappings: [
            { source: 'plc.arm1.motor_temp', target: 'pdm.temperature.arm1', transform: 'linear_scale(0.1)', enabled: true },
            { source: 'plc.arm1.vibration_rms', target: 'pdm.vibration.arm1_rms', transform: 'moving_avg(10)', enabled: true },
            { source: 'plc.arm2.motor_current', target: 'pdm.current.arm2', transform: 'abs_value()', enabled: true },
            { source: 'plc.arm2.position_error', target: 'pdm.position_err.arm2', transform: 'none', enabled: false },
            { source: 'plc.camera.feed_status', target: 'pdm.camera.health', transform: 'boolean()', enabled: true },
        ],
    },
    tpt: {
        name: 'TPT Adapter',
        adapterId: 'ADP-TPT-01',
        description: 'Collision-free trajectory testing for robot arms around bus chassis',
        color: 'amber',
        status: 'active',
        adapterVersion: 'v2.0',
        lastModified: '2026-02-15T09:30:00Z',
        trajectorySchemaMapping: 'TPT_XML_V4',
        retryPolicy: { maxRetries: 2, backoffMs: 2000 },
        timeoutMs: 30000,
        mappings: [
            { source: 'robot.joint1.angle', target: 'tpt.trajectory.j1_angle', transform: 'deg_to_rad()', enabled: true },
            { source: 'robot.joint2.angle', target: 'tpt.trajectory.j2_angle', transform: 'deg_to_rad()', enabled: true },
            { source: 'robot.tcp.position_x', target: 'tpt.tcp.pos_x', transform: 'mm_to_m()', enabled: true },
            { source: 'robot.tcp.position_y', target: 'tpt.tcp.pos_y', transform: 'mm_to_m()', enabled: true },
            { source: 'robot.tcp.position_z', target: 'tpt.tcp.pos_z', transform: 'mm_to_m()', enabled: true },
            { source: 'robot.velocity.linear', target: 'tpt.velocity.linear', transform: 'none', enabled: true },
            { source: 'robot.force.contact', target: 'tpt.force.contact_n', transform: 'clamp(0, 500)', enabled: false },
        ],
    },
    esogu: {
        name: 'ESOGU Adapter',
        adapterId: 'ADP-ESOGU-HIL',
        description: 'ESOGU DT Tool — AI-managed STLC Manager integration',
        color: 'emerald',
        status: 'active',
        adapterVersion: 'v0.9.beta',
        lastModified: '2026-02-17T16:45:00Z',
        stlcEndpoint: 'http://hil-bench.esogu.edu.tr/stlc',
        hilEndpoint: 'http://hil-bench.esogu.edu.tr/hil-control',
        semanticMapping: 'OWL_Ontology_V1',
        retryPolicy: { maxRetries: 3, backoffMs: 1500 },
        timeoutMs: 10000,
        mappings: [
            { source: 'dt.model.state', target: 'esogu.stlc.state_vector', transform: 'json_extract(state)', enabled: true },
            { source: 'dt.simulation.result', target: 'esogu.stlc.sim_output', transform: 'normalize(0,1)', enabled: true },
            { source: 'dt.test.verdict', target: 'esogu.stlc.test_verdict', transform: 'enum_map()', enabled: true },
            { source: 'dt.test.coverage', target: 'esogu.stlc.test_coverage', transform: 'percentage()', enabled: true },
        ],
    },
};

// ==================================================================
// 6. Run & Session Policies
// ==================================================================

export const Run_Policies = {
    Global_Limits: {
        Max_Concurrent_Runs: 10,
        Max_Run_Duration_Sec: 3600,
    },
    Permissions: {
        Who_Can_Start_Run: ['OTOKAR (Admin)', 'ESOGU (Operator)', 'ESOGU (Admin)', 'DEFTR (Admin)', 'Admin'],
    },
    Default_Param_Sets: {
        OTOKAR_DT: 'PARAM-SET-DEFAULT-PDM',
        TPT: 'PARAM-SET-DEFAULT-TPT',
        ESOGU_DT_TOOL: 'PARAM-SET-DEFAULT-ESOGU',
    },
    Evidence_Policy: {
        Evidence_Required: true,
        Packaging_Level: 'Full_Logs_And_Metrics', // Options: Minimal, Full, Debug
    },
};

// ==================================================================
// 7. Dashboard Templates & UI Config
// ==================================================================

export const Dashboard_Config = [
    {
        Dashboard_ID: 'DASH-INSPECTION-OVERVIEW',
        Name: 'Inspection Cell Overview',
        Layout_JSON: {
            grid: '2x2',
            sections: ['header', 'live_camera', 'digital_twin_viewer', 'kpi_cards'],
        },
        Widgets: [
            { Widget_ID: 'WID-CAM-FEED', Type: 'Video', Data_Binding: 'factory_camera_feed' },
            { Widget_ID: 'WID-DT-VIEWER', Type: '3D_Viewer', Data_Binding: 'DT-001' },
            { Widget_ID: 'WID-ARM-TEMP', Type: 'Gauge', Data_Binding: 'SIG-ARM-TEMP' },
            { Widget_ID: 'WID-ARM-VIB', Type: 'Timeseries', Data_Binding: 'SIG-ARM-VIB' },
        ],
        Default_Filters: {
            Default_Asset: 'DT-001',
            Default_Time_Window: 'Last_5_Minutes',
        },
        Dashboard_Role_Map: ['OTOKAR (Admin)', 'OTOKAR (Viewer)', 'Admin'],
    },
    {
        Dashboard_ID: 'DASH-TPT-ANALYSIS',
        Name: 'TPT Trajectory Analysis',
        Layout_JSON: {
            grid: '1x3',
            sections: ['run_selection', '3d_canvas', 'violation_table'],
        },
        Widgets: [
            { Widget_ID: 'WID-3D-CANVAS', Type: '3D_Canvas', Data_Binding: 'tpt_trajectory' },
            { Widget_ID: 'WID-VIOLATIONS', Type: 'Table', Data_Binding: 'tpt_violations' },
            { Widget_ID: 'WID-KPI-SUMMARY', Type: 'KPI_Grid', Data_Binding: 'tpt_metrics' },
        ],
        Default_Filters: {
            Default_Time_Window: 'Last_1_Hour',
        },
        Dashboard_Role_Map: ['DEFTR (Admin)', 'DEFTR (Viewer)', 'Admin'],
    },
    {
        Dashboard_ID: 'DASH-ESOGU-STLC',
        Name: 'ESOGU STLC Manager',
        Layout_JSON: {
            grid: '1x2',
            sections: ['pipeline_view', 'output_panel'],
        },
        Widgets: [
            { Widget_ID: 'WID-PIPELINE', Type: 'Pipeline', Data_Binding: 'esogu_pipeline' },
            { Widget_ID: 'WID-OUTPUT', Type: 'Output', Data_Binding: 'esogu_output' },
        ],
        Default_Filters: {},
        Dashboard_Role_Map: ['ESOGU (Admin)', 'ESOGU (Viewer)', 'ESOGU (Operator)', 'Admin'],
    },
];

// ==================================================================
// 8. Audit Logs  (used by AuditLogsPanel)
// ==================================================================

export const MOCK_AUDIT_LOGS = [
    {
        id: 'LOG-001',
        timestamp: '2026-02-17T21:30:15Z',
        user: 'admin@matisse.eu',
        role: 'ADMIN',
        action: 'UPDATE',
        category: 'settings',
        entityType: 'Connection',
        entityId: 'BRK-001',
        resource: 'MQTT Broker (BRK-001)',
        details: 'Updated TLS configuration from disabled to enabled for Primary MQTT Broker.',
        ip: '192.168.1.50',
        severity: 'medium',
        result: 'SUCCESS',
        changeRequestId: null,
    },
    {
        id: 'LOG-002',
        timestamp: '2026-02-17T20:15:00Z',
        user: 'otokar_admin@otokar.com',
        role: 'OTOKAR (Admin)',
        action: 'CREATE',
        category: 'twin',
        entityType: 'DT_Registry',
        entityId: 'DT-001',
        resource: 'Digital Twin (DT-001)',
        details: 'Registered "Chassis Inspection Cell" digital twin with 112 signal mappings (2 robot arms + bus chassis).',
        ip: '10.0.2.15',
        severity: 'low',
        result: 'SUCCESS',
        changeRequestId: 'CR-2026-001',
    },
    {
        id: 'LOG-003',
        timestamp: '2026-02-17T18:45:30Z',
        user: 'admin@matisse.eu',
        role: 'ADMIN',
        action: 'DELETE',
        category: 'asset',
        entityType: 'Asset',
        entityId: 'AST-010',
        resource: 'Asset (AST-010)',
        details: 'Removed deprecated "Legacy Proximity Sensor" from Otokar inspection cell inventory.',
        ip: '192.168.1.50',
        severity: 'high',
        result: 'SUCCESS',
        changeRequestId: null,
    },
    {
        id: 'LOG-004',
        timestamp: '2026-02-17T16:20:00Z',
        user: 'esogu_admin@esogu.edu.tr',
        role: 'ESOGU (Admin)',
        action: 'UPDATE',
        category: 'adapter',
        entityType: 'Adapter_Config',
        entityId: 'ADP-ESOGU-HIL',
        resource: 'ESOGU STLC Adapter',
        details: 'Modified signal mapping: added "dt.test.verdict" → "esogu.stlc.test_verdict" mapping for STLC Manager.',
        ip: '193.140.28.100',
        severity: 'medium',
        result: 'SUCCESS',
        changeRequestId: 'CR-2026-042',
    },
    {
        id: 'LOG-005',
        timestamp: '2026-02-17T14:00:00Z',
        user: 'admin@matisse.eu',
        role: 'ADMIN',
        action: 'UPDATE',
        category: 'policy',
        entityType: 'Storage_Policies',
        entityId: 'telemetry_retention',
        resource: 'Retention Policy',
        details: 'Changed telemetry data retention from 60 days to 90 days.',
        ip: '192.168.1.50',
        severity: 'medium',
        result: 'SUCCESS',
        changeRequestId: null,
    },
    {
        id: 'LOG-006',
        timestamp: '2026-02-16T11:30:00Z',
        user: 'otokar_admin@otokar.com',
        role: 'OTOKAR (Admin)',
        action: 'CREATE',
        category: 'connection',
        entityType: 'Connection',
        entityId: 'API-004',
        resource: 'API Endpoint (API-004)',
        details: 'Added InfluxDB Time Series endpoint for chassis inspection data ingestion.',
        ip: '10.0.2.15',
        severity: 'low',
        result: 'SUCCESS',
        changeRequestId: null,
    },
    {
        id: 'LOG-007',
        timestamp: '2026-02-16T09:00:00Z',
        user: 'system',
        role: 'SYSTEM',
        action: 'SYSTEM',
        category: 'maintenance',
        entityType: 'System',
        entityId: 'cleanup_job',
        resource: 'Automated Cleanup',
        details: 'Scheduled cleanup completed: removed 2.3 GB of expired telemetry data.',
        ip: '127.0.0.1',
        severity: 'info',
        result: 'SUCCESS',
        changeRequestId: null,
    },
    {
        id: 'LOG-008',
        timestamp: '2026-02-15T22:15:00Z',
        user: 'admin@matisse.eu',
        role: 'ADMIN',
        action: 'UPDATE',
        category: 'settings',
        entityType: 'Adapter_Config',
        entityId: 'ADP-TPT-01',
        resource: 'TPT Adapter',
        details: 'Disabled "robot.force.contact" mapping for TPT adapter pending recalibration.',
        ip: '192.168.1.50',
        severity: 'medium',
        result: 'SUCCESS',
        changeRequestId: null,
    },
];

// ==================================================================
// 9. Storage & Retention Policies
// ==================================================================

export const Storage_Policies = {
    Timescale_Retention: {
        Raw_Data: '7 days',
        Aggregated_1m: '3 months',
        Aggregated_1h: '1 year',
    },
    Downsample_Policy: {
        Bucket_Size_Raw: '0s',
        Bucket_Size_Archive: '5m',
    },
    Log_Retention_OpenSearch: {
        Index_Lifecycle: '30_Days_Hot_Warm',
    },
    MinIO_Bucket_Policy: {
        Evidence_Retention: '5 years',
    },
};

// ==================================================================
// 10. System Health Outputs
// ==================================================================

export const Health_Outputs_Sample = {
    Connections: {
        'BRK-001': { Status: 'OK', Latency_Ms: 12 },
        'BRK-002': { Status: 'OK', Latency_Ms: 45 },
        'BRK-003': { Status: 'OK', Latency_Ms: 8 },
        'API-001': { Status: 'OK', Latency_Ms: 23 },
        'API-003': { Status: 'DEGRADED', Latency_Ms: 120 },
    },
    Adapters: {
        'pdm': { Status: 'OK', Last_Heartbeat: '2026-02-18T12:00:00Z' },
        'tpt': { Status: 'OK', Last_Heartbeat: '2026-02-18T12:00:00Z' },
        'esogu': { Status: 'OK', Last_Heartbeat: '2026-02-18T11:58:00Z' },
    },
    Config_Drift: {
        Detected: false,
        Last_Check: '2026-02-18T12:00:00Z',
    },
};
