export const Signal_Catalog = [
    {
        Signal_ID: "SIG-TEMP-001",
        Signal_Name: "Motor_Temperature",
        Unit: "°C",
        Description: "Motor temperature sensor",
        Data_Type: "float",
        Sample_Rate_Hz: 10,
        Thresholds: {
            Min: 0,
            Max: 120,
            Warn_Low: 10,
            Warn_High: 85,
            Critical_Low: null,
            Critical_High: 100,
            Threshold_Type: "Static",
            Rule_Desc: "Motor temperature warning above 85°C, critical alarm above 100°C"
        }
    },
    {
        Signal_ID: "SIG-VEL-001",
        Signal_Name: "Joint_1_Velocity",
        Unit: "deg/s",
        Description: "Joint 1 angular velocity",
        Data_Type: "float",
        Sample_Rate_Hz: 100,
        Thresholds: {
            Min: -180,
            Max: 180,
            Warn_Low: null,
            Warn_High: 150,
            Critical_Low: null,
            Critical_High: 170,
            Threshold_Type: "Config-based",
            Rule_Desc: "Maximum velocity limit exceeded check"
        }
    },
    {
        Signal_ID: "SIG-TRQ-001",
        Signal_Name: "Joint_1_Torque",
        Unit: "Nm",
        Description: "Joint 1 torque value",
        Data_Type: "float",
        Sample_Rate_Hz: 100,
        Thresholds: {
            Min: -500,
            Max: 500,
            Warn_Low: -400,
            Warn_High: 400,
            Critical_Low: -480,
            Critical_High: 480,
            Threshold_Type: "Static",
            Rule_Desc: "Torque limits safety boundaries"
        }
    },
    {
        Signal_ID: "SIG-POS-001",
        Signal_Name: "TCP_Position_X",
        Unit: "mm",
        Description: "Tool Center Point X coordinate",
        Data_Type: "float",
        Sample_Rate_Hz: 50,
        Thresholds: {
            Min: -2000,
            Max: 2000,
            Warn_Low: null,
            Warn_High: null,
            Critical_Low: -1800,
            Critical_High: 1800,
            Threshold_Type: "Config-based",
            Rule_Desc: "Workspace boundary check"
        }
    },
    {
        Signal_ID: "SIG-CUR-001",
        Signal_Name: "Drive_Current",
        Unit: "A",
        Description: "Drive current value",
        Data_Type: "float",
        Sample_Rate_Hz: 200,
        Thresholds: {
            Min: 0,
            Max: 50,
            Warn_Low: null,
            Warn_High: 35,
            Critical_Low: null,
            Critical_High: 45,
            Threshold_Type: "Static",
            Rule_Desc: "Current limit exceeded - thermal protection"
        }
    },
    {
        Signal_ID: "SIG-VIB-001",
        Signal_Name: "Vibration_RMS",
        Unit: "mm/s",
        Description: "Vibration RMS value",
        Data_Type: "float",
        Sample_Rate_Hz: 500,
        Thresholds: {
            Min: 0,
            Max: 20,
            Warn_Low: null,
            Warn_High: 4.5,
            Critical_Low: null,
            Critical_High: 7.1,
            Threshold_Type: "Static",
            Rule_Desc: "ISO 10816-3 vibration classification"
        }
    },
    {
        Signal_ID: "SIG-PRES-001",
        Signal_Name: "Hydraulic_Pressure",
        Unit: "bar",
        Description: "Hydraulic system pressure",
        Data_Type: "float",
        Sample_Rate_Hz: 20,
        Thresholds: {
            Min: 0,
            Max: 350,
            Warn_Low: 150,
            Warn_High: 280,
            Critical_Low: 100,
            Critical_High: 320,
            Threshold_Type: "Static",
            Rule_Desc: "Hydraulic pressure operating range"
        }
    },
    {
        Signal_ID: "SIG-FLW-001",
        Signal_Name: "Coolant_Flow_Rate",
        Unit: "L/min",
        Description: "Coolant flow rate",
        Data_Type: "float",
        Sample_Rate_Hz: 5,
        Thresholds: {
            Min: 0,
            Max: 50,
            Warn_Low: 5,
            Warn_High: null,
            Critical_Low: 2,
            Critical_High: null,
            Threshold_Type: "Config-based",
            Rule_Desc: "Minimum coolant flow requirement"
        }
    }
];


export const DT_Registry = [
    {
        DT_ID: "DT-ROBOT-WELD-01",
        Asset_ID: "AST-KUKA-KR210-001",
        Asset_Name: "KUKA KR 210 R2700 Welding Robot",
        Asset_Type: "Industrial_Robot",
        Subsystem: "Welding_Cell_A",
        Location: "Body_Shop_Line_1",
        Signal_Set: {
            TagGroup: "TG-WELD-FULL",
            Signals: ["SIG-TEMP-001", "SIG-VEL-001", "SIG-TRQ-001", "SIG-POS-001", "SIG-CUR-001", "SIG-VIB-001"]
        },
        RBAC: {
            Role: "Weld_Engineer",
            Permission: ["READ", "MONITOR", "CONFIGURE_ALERTS"],
            Access_Level: 3
        },
        Status: "ONLINE",
        Last_Heartbeat_UTC: "2026-02-08T13:14:55Z"
    },
    {
        DT_ID: "DT-ROBOT-PAINT-01",
        Asset_ID: "AST-FANUC-P250-002",
        Asset_Name: "FANUC P-250iB Paint Robot",
        Asset_Type: "Paint_Robot",
        Subsystem: "Paint_Booth_2",
        Location: "Paint_Shop",
        Signal_Set: {
            TagGroup: "TG-PAINT-STD",
            Signals: ["SIG-TEMP-001", "SIG-VEL-001", "SIG-PRES-001", "SIG-FLW-001"]
        },
        RBAC: {
            Role: "Paint_Technician",
            Permission: ["READ", "MONITOR"],
            Access_Level: 2
        },
        Status: "ONLINE",
        Last_Heartbeat_UTC: "2026-02-08T13:14:58Z"
    },
    {
        DT_ID: "DT-DRIVE-SERVO-01",
        Asset_ID: "AST-SIEMENS-S120-003",
        Asset_Name: "Siemens S120 Servo Drive",
        Asset_Type: "Servo_Drive",
        Subsystem: "Assembly_Line_3",
        Location: "Final_Assembly",
        Signal_Set: {
            TagGroup: "TG-DRIVE-PERF",
            Signals: ["SIG-CUR-001", "SIG-TEMP-001", "SIG-VIB-001"]
        },
        RBAC: {
            Role: "Maintenance_Tech",
            Permission: ["READ", "MONITOR", "CONFIGURE_ALERTS", "WRITE_PARAMS"],
            Access_Level: 4
        },
        Status: "WARNING",
        Last_Heartbeat_UTC: "2026-02-08T13:14:50Z"
    },
    {
        DT_ID: "DT-HYD-PRESS-01",
        Asset_ID: "AST-SCHULER-HPU-004",
        Asset_Name: "Schuler Hydraulic Press Unit",
        Asset_Type: "Hydraulic_Press",
        Subsystem: "Stamping_Line_1",
        Location: "Press_Shop",
        Signal_Set: {
            TagGroup: "TG-PRESS-FULL",
            Signals: ["SIG-PRES-001", "SIG-TEMP-001", "SIG-FLW-001", "SIG-VIB-001"]
        },
        RBAC: {
            Role: "Process_Engineer",
            Permission: ["READ", "MONITOR", "CONFIGURE_ALERTS"],
            Access_Level: 3
        },
        Status: "OFFLINE",
        Last_Heartbeat_UTC: "2026-02-08T12:45:00Z"
    }
];

const generateTelemetryStream = (assetId, signalIds, pointCount = 100) => {
    const stream = [];
    const now = new Date("2026-02-08T13:15:00Z");
    const qualityFlags = ["OK", "OK", "OK", "OK", "OK", "OK", "OK", "OK", "DELAYED", "OUTLIER"];

    for (let i = 0; i < pointCount; i++) {
        signalIds.forEach((signalId, idx) => {
            const signalDef = Signal_Catalog.find(s => s.Signal_ID === signalId);
            if (!signalDef) return;

            // Generate realistic values based on signal type
            let value;
            const t = i / pointCount;

            switch (signalId) {
                case "SIG-TEMP-001":
                    value = 45 + Math.sin(t * Math.PI * 2) * 15 + Math.random() * 5;
                    break;
                case "SIG-VEL-001":
                    value = Math.sin(t * Math.PI * 4) * 80 + Math.random() * 10;
                    break;
                case "SIG-TRQ-001":
                    value = Math.sin(t * Math.PI * 4 + 0.5) * 200 + Math.random() * 20;
                    break;
                case "SIG-POS-001":
                    value = 500 + Math.sin(t * Math.PI * 2) * 300;
                    break;
                case "SIG-CUR-001":
                    value = 15 + Math.abs(Math.sin(t * Math.PI * 4)) * 15 + Math.random() * 3;
                    break;
                case "SIG-VIB-001":
                    value = 1.5 + Math.random() * 2;
                    break;
                case "SIG-PRES-001":
                    value = 200 + Math.sin(t * Math.PI) * 50 + Math.random() * 10;
                    break;
                case "SIG-FLW-001":
                    value = 12 + Math.random() * 3;
                    break;
                default:
                    value = Math.random() * 100;
            }

            const timestamp = new Date(now.getTime() - (pointCount - i) * 100);

            stream.push({
                Timestamp_UTC: timestamp.toISOString(),
                Asset_ID: assetId,
                Signal_ID: signalId,
                Value: parseFloat(value.toFixed(3)),
                Unit: signalDef.Unit,
                Source: "REAL",
                Quality_Flag: qualityFlags[Math.floor(Math.random() * qualityFlags.length)],
                Seq_No: i * signalIds.length + idx + 1
            });
        });
    }

    return stream;
};

export const Telemetry_Stream = {
    "AST-KUKA-KR210-001": generateTelemetryStream(
        "AST-KUKA-KR210-001",
        ["SIG-TEMP-001", "SIG-VEL-001", "SIG-TRQ-001", "SIG-CUR-001"],
        50
    ),
    "AST-FANUC-P250-002": generateTelemetryStream(
        "AST-FANUC-P250-002",
        ["SIG-TEMP-001", "SIG-PRES-001", "SIG-FLW-001"],
        50
    ),
    "AST-SIEMENS-S120-003": generateTelemetryStream(
        "AST-SIEMENS-S120-003",
        ["SIG-CUR-001", "SIG-TEMP-001", "SIG-VIB-001"],
        50
    )
};

const generateSimulationStream = (runId, sessionId, modelVersion, paramSetId, signalIds, pointCount = 100) => {
    const stream = [];
    const now = new Date("2026-02-08T13:15:00Z");

    for (let i = 0; i < pointCount; i++) {
        signalIds.forEach((signalId, idx) => {
            const signalDef = Signal_Catalog.find(s => s.Signal_ID === signalId);
            if (!signalDef) return;

            // Simulation values are smoother (no noise)
            let value;
            const t = i / pointCount;

            switch (signalId) {
                case "SIG-TEMP-001":
                    value = 45 + Math.sin(t * Math.PI * 2) * 15;
                    break;
                case "SIG-VEL-001":
                    value = Math.sin(t * Math.PI * 4) * 80;
                    break;
                case "SIG-TRQ-001":
                    value = Math.sin(t * Math.PI * 4 + 0.5) * 200;
                    break;
                case "SIG-POS-001":
                    value = 500 + Math.sin(t * Math.PI * 2) * 300;
                    break;
                default:
                    value = Math.sin(t * Math.PI * 2) * 50 + 50;
            }

            const timestamp = new Date(now.getTime() - (pointCount - i) * 100);

            stream.push({
                Timestamp_UTC: timestamp.toISOString(),
                Signal_ID: signalId,
                Value: parseFloat(value.toFixed(3)),
                Unit: signalDef.Unit,
                Source: "SIM",
                Run_ID: runId,
                Session_ID: sessionId,
                Model_Version: modelVersion,
                Param_Set_ID: paramSetId
            });
        });
    }

    return stream;
};

export const Simulation_Stream = {
    "RUN-SIM-001": generateSimulationStream(
        "RUN-SIM-001",
        "SESS-SIM-2026-001",
        "v2.5.0-beta",
        "P-Set-Weld-Optimal",
        ["SIG-TEMP-001", "SIG-VEL-001", "SIG-TRQ-001", "SIG-POS-001"],
        50
    ),
    "RUN-SIM-002": generateSimulationStream(
        "RUN-SIM-002",
        "SESS-SIM-2026-002",
        "v2.4.1",
        "P-Set-Paint-Std",
        ["SIG-TEMP-001", "SIG-PRES-001"],
        50
    )
};

export const Timeseries_Read = {
    Query_Templates: [
        {
            Query_ID: "QRY-HIST-001",
            Description: "Last 24 hours motor temperature",
            From: "2026-02-07T13:15:00Z",
            To: "2026-02-08T13:15:00Z",
            Downsample_Rate: "1m",
            Bucket_Size: 60,
            Signal_ID_List: ["SIG-TEMP-001"],
            Filters: {
                Asset_ID: "AST-KUKA-KR210-001",
                Subsystem: "Welding_Cell_A",
                Source: "REAL"
            },
            Aggregation: "AVG"
        },
        {
            Query_ID: "QRY-HIST-002",
            Description: "Last 1 hour all servo signals",
            From: "2026-02-08T12:15:00Z",
            To: "2026-02-08T13:15:00Z",
            Downsample_Rate: "10s",
            Bucket_Size: 10,
            Signal_ID_List: ["SIG-CUR-001", "SIG-TEMP-001", "SIG-VIB-001"],
            Filters: {
                Asset_ID: "AST-SIEMENS-S120-003",
                Subsystem: null,
                Source: "REAL"
            },
            Aggregation: "RAW"
        },
        {
            Query_ID: "QRY-HIST-003",
            Description: "Weekly pressure trend",
            From: "2026-02-01T00:00:00Z",
            To: "2026-02-08T00:00:00Z",
            Downsample_Rate: "1h",
            Bucket_Size: 3600,
            Signal_ID_List: ["SIG-PRES-001"],
            Filters: {
                Asset_ID: "AST-SCHULER-HPU-004",
                Subsystem: "Stamping_Line_1",
                Source: "REAL"
            },
            Aggregation: "MAX"
        }
    ],
    // Sample historical data results
    Sample_Results: {
        "QRY-HIST-001": generateTelemetryStream("AST-KUKA-KR210-001", ["SIG-TEMP-001"], 100)
            .map((d, i) => ({
                ...d,
                Timestamp_UTC: new Date(new Date("2026-02-07T13:15:00Z").getTime() + i * 60000 * 15).toISOString()
            }))
    }
};

export const liveMonitoringRawData = [
    {
        DT_Context: {
            DT_ID: "DT-ROBOT-WELD-01",
            Asset_ID: "AST-KUKA-KR210-001",
            Asset_Name: "KUKA KR 210 R2700 Welding Robot",
            Subsystem: "Welding_Cell_A",
            Signal_Set: {
                TagGroup: "TG-WELD-FULL",
                Active_Signals: ["SIG-TEMP-001", "SIG-VEL-001", "SIG-TRQ-001", "SIG-CUR-001"]
            },
            RBAC: {
                Role: "Weld_Engineer",
                Permission: ["READ", "MONITOR", "CONFIGURE_ALERTS"]
            }
        },
        Telemetry_Status: {
            Stream_State: "ACTIVE",
            Last_Timestamp_UTC: "2026-02-08T13:14:59.123Z",
            Packet_Rate_Hz: 100,
            Signal_Count: 4,
            Quality_Summary: {
                OK: 95,
                DELAYED: 3,
                DROPPED: 1,
                OUTLIER: 1
            },
            Gap_Detection: {
                Total_Gaps: 2,
                Max_Gap_Ms: 150,
                Last_Gap_UTC: "2026-02-08T13:10:00Z"
            }
        },
        Active_Alerts: [
            {
                Alert_ID: "ALT-001",
                Signal_ID: "SIG-TEMP-001",
                Timestamp_UTC: "2026-02-08T13:12:30Z",
                Type: "THRESHOLD_WARN",
                Current_Value: 87.5,
                Threshold_Value: 85,
                Severity: "WARN",
                Status: "ACTIVE",
                Rule_Desc: "Motor temperature exceeded warning threshold"
            }
        ],
        Simulation_Comparison: {
            Enabled: true,
            Run_ID: "RUN-SIM-001",
            Session_ID: "SESS-SIM-2026-001",
            Model_Version: "v2.5.0-beta",
            Deviation_Summary: {
                "SIG-TEMP-001": { avg_deviation: 2.3, max_deviation: 5.1 },
                "SIG-VEL-001": { avg_deviation: 1.8, max_deviation: 8.2 },
                "SIG-TRQ-001": { avg_deviation: 12.5, max_deviation: 35.0 }
            }
        },
        Meta: {
            Session_Start_UTC: "2026-02-08T08:00:00Z",
            Last_Update_UTC: "2026-02-08T13:15:00Z"
        }
    },
    {
        DT_Context: {
            DT_ID: "DT-ROBOT-PAINT-01",
            Asset_ID: "AST-FANUC-P250-002",
            Asset_Name: "FANUC P-250iB Paint Robot",
            Subsystem: "Paint_Booth_2",
            Signal_Set: {
                TagGroup: "TG-PAINT-STD",
                Active_Signals: ["SIG-TEMP-001", "SIG-PRES-001", "SIG-FLW-001"]
            },
            RBAC: {
                Role: "Paint_Technician",
                Permission: ["READ", "MONITOR"]
            }
        },
        Telemetry_Status: {
            Stream_State: "ACTIVE",
            Last_Timestamp_UTC: "2026-02-08T13:14:58.456Z",
            Packet_Rate_Hz: 50,
            Signal_Count: 3,
            Quality_Summary: {
                OK: 99,
                DELAYED: 1,
                DROPPED: 0,
                OUTLIER: 0
            },
            Gap_Detection: {
                Total_Gaps: 0,
                Max_Gap_Ms: 0,
                Last_Gap_UTC: null
            }
        },
        Active_Alerts: [],
        Simulation_Comparison: {
            Enabled: false,
            Run_ID: null,
            Session_ID: null,
            Model_Version: null,
            Deviation_Summary: {}
        },
        Meta: {
            Session_Start_UTC: "2026-02-08T06:00:00Z",
            Last_Update_UTC: "2026-02-08T13:15:00Z"
        }
    },
    {
        DT_Context: {
            DT_ID: "DT-DRIVE-SERVO-01",
            Asset_ID: "AST-SIEMENS-S120-003",
            Asset_Name: "Siemens S120 Servo Drive",
            Subsystem: "Assembly_Line_3",
            Signal_Set: {
                TagGroup: "TG-DRIVE-PERF",
                Active_Signals: ["SIG-CUR-001", "SIG-TEMP-001", "SIG-VIB-001"]
            },
            RBAC: {
                Role: "Maintenance_Tech",
                Permission: ["READ", "MONITOR", "CONFIGURE_ALERTS", "WRITE_PARAMS"]
            }
        },
        Telemetry_Status: {
            Stream_State: "DEGRADED",
            Last_Timestamp_UTC: "2026-02-08T13:14:50.789Z",
            Packet_Rate_Hz: 80,
            Signal_Count: 3,
            Quality_Summary: {
                OK: 75,
                DELAYED: 15,
                DROPPED: 8,
                OUTLIER: 2
            },
            Gap_Detection: {
                Total_Gaps: 12,
                Max_Gap_Ms: 500,
                Last_Gap_UTC: "2026-02-08T13:14:30Z"
            }
        },
        Active_Alerts: [
            {
                Alert_ID: "ALT-002",
                Signal_ID: "SIG-VIB-001",
                Timestamp_UTC: "2026-02-08T13:08:00Z",
                Type: "THRESHOLD_CRITICAL",
                Current_Value: 7.8,
                Threshold_Value: 7.1,
                Severity: "CRITICAL",
                Status: "ACTIVE",
                Rule_Desc: "Vibration exceeded critical level - ISO 10816-3"
            },
            {
                Alert_ID: "ALT-003",
                Signal_ID: "SIG-TEMP-001",
                Timestamp_UTC: "2026-02-08T13:10:00Z",
                Type: "THRESHOLD_WARN",
                Current_Value: 92.3,
                Threshold_Value: 85,
                Severity: "WARN",
                Status: "ACTIVE",
                Rule_Desc: "Motor temperature high"
            },
            {
                Alert_ID: "ALT-004",
                Signal_ID: null,
                Timestamp_UTC: "2026-02-08T13:14:35Z",
                Type: "QUALITY_DEGRADED",
                Current_Value: null,
                Threshold_Value: null,
                Severity: "WARN",
                Status: "ACTIVE",
                Rule_Desc: "Telemetry quality degraded - packet losses detected"
            }
        ],
        Simulation_Comparison: {
            Enabled: true,
            Run_ID: "RUN-SIM-003",
            Session_ID: "SESS-SIM-2026-003",
            Model_Version: "v1.2.0",
            Deviation_Summary: {
                "SIG-CUR-001": { avg_deviation: 5.2, max_deviation: 12.0 },
                "SIG-TEMP-001": { avg_deviation: 8.5, max_deviation: 15.2 }
            }
        },
        Meta: {
            Session_Start_UTC: "2026-02-08T07:30:00Z",
            Last_Update_UTC: "2026-02-08T13:15:00Z"
        }
    },
    {
        DT_Context: {
            DT_ID: "DT-HYD-PRESS-01",
            Asset_ID: "AST-SCHULER-HPU-004",
            Asset_Name: "Schuler Hydraulic Press Unit",
            Subsystem: "Stamping_Line_1",
            Signal_Set: {
                TagGroup: "TG-PRESS-FULL",
                Active_Signals: ["SIG-PRES-001", "SIG-TEMP-001", "SIG-FLW-001", "SIG-VIB-001"]
            },
            RBAC: {
                Role: "Process_Engineer",
                Permission: ["READ", "MONITOR", "CONFIGURE_ALERTS"]
            }
        },
        Telemetry_Status: {
            Stream_State: "OFFLINE",
            Last_Timestamp_UTC: "2026-02-08T12:45:00.000Z",
            Packet_Rate_Hz: 0,
            Signal_Count: 0,
            Quality_Summary: {
                OK: 0,
                DELAYED: 0,
                DROPPED: 0,
                OUTLIER: 0
            },
            Gap_Detection: {
                Total_Gaps: 1,
                Max_Gap_Ms: 1800000,
                Last_Gap_UTC: "2026-02-08T12:45:00Z"
            }
        },
        Active_Alerts: [
            {
                Alert_ID: "ALT-005",
                Signal_ID: null,
                Timestamp_UTC: "2026-02-08T12:45:30Z",
                Type: "CONNECTION_LOST",
                Current_Value: null,
                Threshold_Value: null,
                Severity: "CRITICAL",
                Status: "ACTIVE",
                Rule_Desc: "Asset connection lost - no signal for 30 minutes"
            }
        ],
        Simulation_Comparison: {
            Enabled: false,
            Run_ID: null,
            Session_ID: null,
            Model_Version: null,
            Deviation_Summary: {}
        },
        Meta: {
            Session_Start_UTC: "2026-02-08T06:00:00Z",
            Last_Update_UTC: "2026-02-08T12:45:00Z"
        }
    }
];

export const liveMonitoringSessions = liveMonitoringRawData.map(session => {
    const telemetryData = Telemetry_Stream[session.DT_Context.Asset_ID] || [];
    const activeSignals = session.DT_Context.Signal_Set.Active_Signals;

    // Get latest values for each active signal
    const latestValues = {};
    activeSignals.forEach(signalId => {
        const signalData = telemetryData.filter(d => d.Signal_ID === signalId);
        if (signalData.length > 0) {
            const latest = signalData[signalData.length - 1];
            latestValues[signalId] = {
                value: latest.Value,
                unit: latest.Unit,
                quality: latest.Quality_Flag,
                timestamp: latest.Timestamp_UTC
            };
        }
    });

    // Get signal definitions for active signals
    const signalDefinitions = activeSignals.map(signalId => {
        const def = Signal_Catalog.find(s => s.Signal_ID === signalId);
        return def ? {
            id: def.Signal_ID,
            name: def.Signal_Name,
            unit: def.Unit,
            description: def.Description,
            thresholds: def.Thresholds
        } : null;
    }).filter(Boolean);

    return {
        // Primary identifiers
        id: session.DT_Context.DT_ID,
        assetId: session.DT_Context.Asset_ID,
        assetName: session.DT_Context.Asset_Name,
        subsystem: session.DT_Context.Subsystem,

        // User context
        userRole: session.DT_Context.RBAC.Role,
        permissions: session.DT_Context.RBAC.Permission,

        // Stream status
        streamState: session.Telemetry_Status.Stream_State,
        lastUpdate: session.Telemetry_Status.Last_Timestamp_UTC,
        packetRate: session.Telemetry_Status.Packet_Rate_Hz,
        signalCount: session.Telemetry_Status.Signal_Count,

        // Quality metrics
        qualitySummary: session.Telemetry_Status.Quality_Summary,
        gapInfo: session.Telemetry_Status.Gap_Detection,

        // Active signals and their current values
        signals: signalDefinitions,
        latestValues: latestValues,

        // Alerts
        alerts: session.Active_Alerts.map(alert => ({
            id: alert.Alert_ID,
            signalId: alert.Signal_ID,
            timestamp: alert.Timestamp_UTC,
            type: alert.Type,
            currentValue: alert.Current_Value,
            thresholdValue: alert.Threshold_Value,
            severity: alert.Severity,
            status: alert.Status,
            description: alert.Rule_Desc
        })),
        alertCount: session.Active_Alerts.length,
        criticalAlertCount: session.Active_Alerts.filter(a => a.Severity === "CRITICAL").length,
        warnAlertCount: session.Active_Alerts.filter(a => a.Severity === "WARN").length,

        // Simulation comparison
        hasSimulation: session.Simulation_Comparison.Enabled,
        simulationInfo: session.Simulation_Comparison.Enabled ? {
            runId: session.Simulation_Comparison.Run_ID,
            sessionId: session.Simulation_Comparison.Session_ID,
            modelVersion: session.Simulation_Comparison.Model_Version,
            deviations: session.Simulation_Comparison.Deviation_Summary
        } : null,

        // Session timing
        sessionStart: session.Meta.Session_Start_UTC,
        lastUpdated: session.Meta.Last_Update_UTC,

        // Raw data reference
        raw: session
    };
});


export const getTelemetryData = (assetId, signalId, limit = 50) => {
    const assetData = Telemetry_Stream[assetId] || [];
    return assetData
        .filter(d => d.Signal_ID === signalId)
        .slice(-limit);
};


export const getSignalDefinition = (signalId) => {
    return Signal_Catalog.find(s => s.Signal_ID === signalId);
};

export const getAssetInfo = (assetId) => {
    return DT_Registry.find(a => a.Asset_ID === assetId);
};

export const getDTInfo = (dtId) => {
    return DT_Registry.find(a => a.DT_ID === dtId);
};

export const checkThresholds = (signalId, value) => {
    const signal = Signal_Catalog.find(s => s.Signal_ID === signalId);
    if (!signal || !signal.Thresholds) return null;

    const t = signal.Thresholds;
    let status = "OK";
    let message = null;

    if (t.Critical_High !== null && value >= t.Critical_High) {
        status = "CRITICAL";
        message = `Critical upper limit exceeded (${t.Critical_High} ${signal.Unit})`;
    } else if (t.Critical_Low !== null && value <= t.Critical_Low) {
        status = "CRITICAL";
        message = `Critical lower limit exceeded (${t.Critical_Low} ${signal.Unit})`;
    } else if (t.Warn_High !== null && value >= t.Warn_High) {
        status = "WARN";
        message = `Warning upper limit exceeded (${t.Warn_High} ${signal.Unit})`;
    } else if (t.Warn_Low !== null && value <= t.Warn_Low) {
        status = "WARN";
        message = `Warning lower limit exceeded (${t.Warn_Low} ${signal.Unit})`;
    }

    return { status, message, thresholds: t };
};

export default {
    Signal_Catalog,
    DT_Registry,
    Telemetry_Stream,
    Simulation_Stream,
    Timeseries_Read,
    liveMonitoringRawData,
    liveMonitoringSessions,
    // Utility functions
    getTelemetryData,
    getSignalDefinition,
    getAssetInfo,
    getDTInfo,
    checkThresholds
};
