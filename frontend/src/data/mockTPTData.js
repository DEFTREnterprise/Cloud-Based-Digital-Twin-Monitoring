
// Helper to generate trajectory points (Simulating End-Effector Path in 3D Space)
const generateTrajectory = (pointCount = 50, pattern = 'weld_seam') => {
    const waypoints = [];
    // Robot Base Coordinates (mm)
    const baseX = 500;
    const baseY = 0;
    const baseZ = 800;

    for (let i = 0; i < pointCount; i++) {
        const t = i * 0.1; // 0.1 seconds per step (10Hz)
        let xOffset = 0;
        let yOffset = 0;
        let zOffset = 0;

        if (pattern === 'weld_seam') {
            // Linear weld motion with slight weaving
            xOffset = i * 10; // Moving along X axis
            yOffset = Math.sin(i * 0.5) * 2; // Weave pattern
        } else if (pattern === 'pick_place') {
            // S-curve motion profile
            const phase = i / pointCount * Math.PI;
            xOffset = Math.sin(phase) * 300;
            zOffset = Math.sin(phase) * 100 - (Math.abs(Math.sin(phase * 2)) * 50); // Lift and drop
        }

        waypoints.push({
            id: `WP-${String(i).padStart(2, '0')}`,
            x: baseX + xOffset,
            y: baseY + yOffset,
            z: baseZ + zOffset,
            t: t,
            // Simulating joint angles for context
            j1: (Math.sin(t * 0.1) * 10).toFixed(2),
            j2: (45 + Math.cos(t * 0.1) * 5).toFixed(2),
            j3: (-30 + Math.sin(t * 0.2) * 2).toFixed(2)
        });
    }
    return waypoints;
};

// Generate Data
const run1_Waypoints = generateTrajectory(100, 'weld_seam');
const run2_Waypoints = generateTrajectory(80, 'pick_place');

// Generate Actuals (with simulated noise/error)
const addNoise = (wps) => wps.map(wp => ({
    ...wp,
    x: wp.x + (Math.random() - 0.5) * 1.5, // mm error
    y: wp.y + (Math.random() - 0.5) * 1.5,
    z: wp.z + (Math.random() - 0.5) * 0.5
}));

const tptRawData = [
    // ── OTOBÜS GRUBU (VH-BUS-001) ──
    // Run 1: Actual (Gerçek)
    {
        TPT_Context: {
            DT_ID: "Chassis_Inspection_Station",
            Asset_ID: "KUKA-KR-210-L",
            Vehicle_ID: "VH-BUS-001",
            Run_ID: "ACT-BUS-001",
            Algorithm_Version: "v4.2.0",
            Param_Set_ID: "P-Set-Bus-Steel-05",
            Role_Permission: "Automation_Lead"
        },
        Target_Trajectory: {
            Waypoints: run1_Waypoints,
            Segment_Info: [
                { Start: "WP-00", End: "WP-20", Segment_ID: "Approach", Type: "PTP" },
                { Start: "WP-20", End: "WP-80", Segment_ID: "Weld_Seam_Left", Type: "LIN" }
            ],
            TimeWindow_SpeedProfile: { type: "Process_Controlled", target_speed: "50 mm/s" },
            Constraints: { max_cartesian_jerk: "1000 mm/s3", path_accuracy: "0.5 mm", safety_stop_dist: "10mm" },
            Objective: "MaxPrecision"
        },
        Actual_Trajectory: {
            Waypoints: addNoise(run1_Waypoints),
            Speed_Accel_Profile: { avg_speed: "49.8 mm/s", avg_accel: "120 mm/s²", max_jerk: "850 mm/s3" },
            Timestamp_UTC: "2026-02-06T09:00:00Z",
            Source: "REAL_ROBOT"
        },
        Trajectory_Validation_Events: [
            {
                Violation_ID: "VIO-WLD-01",
                Event_Timestamp_UTC: "2026-02-06T09:00:05Z",
                Violation_Type: "path_deviation",
                Severity: "WARN",
                Location_Ref: "WP-25",
                Rule_Desc: "Seam Tracking Deviation > 0.5mm",
                Metric_Value: "dev: 0.85 mm",
                Collision_Risk: false
            }
        ],
        Run_Meta_Status: {
            Start_Time: "2026-02-06T09:00:00Z",
            End_Time: "2026-02-06T09:05:00Z",
            State: "pass",
            Error_Code: null,
            Error_Message: null,
            Artifact_URI: "minio://tpt-runs/run-001/weld_data.json"
        },
        Map_Context: { Map_ID: "Cell-04-Body-Shop", Traffic_Context: "Fixture_Closed" }
    },
    // Run 2: Simulated (Dijital İkiz) - Aynı araç
    {
        TPT_Context: {
            DT_ID: "DT-Chassis-Simulation",
            Asset_ID: "DT-KUKA-KR-210-L",
            Vehicle_ID: "VH-BUS-001",
            Run_ID: "SIM-BUS-001",
            Algorithm_Version: "v4.2.1-beta",
            Param_Set_ID: "P-Set-Bus-Steel-05",
            Role_Permission: "Sim_Engineer"
        },
        Target_Trajectory: {
            Waypoints: run1_Waypoints,
            Segment_Info: [],
            TimeWindow_SpeedProfile: { type: "Process_Controlled", target_speed: "50 mm/s" },
            Constraints: { max_cartesian_jerk: "1000 mm/s3", path_accuracy: "0.5 mm", safety_stop_dist: "10mm" },
            Objective: "MaxPrecision"
        },
        Actual_Trajectory: { // Simulation result
            Waypoints: run1_Waypoints, // Perfect trajectory (almost)
            Speed_Accel_Profile: { avg_speed: "50.0 mm/s", avg_accel: "118 mm/s²", max_jerk: "800 mm/s3" },
            Timestamp_UTC: "2026-02-06T09:00:00Z",
            Source: "DIGITAL_TWIN"
        },
        Trajectory_Validation_Events: [], // No violations in sim
        Run_Meta_Status: {
            Start_Time: "2026-02-06T09:00:00Z",
            End_Time: "2026-02-06T09:04:55Z", // Slightly faster
            State: "pass",
            Error_Code: null,
            Error_Message: null,
            Artifact_URI: "minio://tpt-runs/sim-001/sim_data.json"
        },
        Map_Context: { Map_ID: "Cell-04-Body-Shop", Traffic_Context: "Virtual" }
    },

    // ── KAMYONET GRUBU (VH-PICKUP-002) ──
    // Run 3: Actual (Gerçek) - Fail Scenario
    {
        TPT_Context: {
            DT_ID: "Chassis_Weld_Spot_Gun",
            Asset_ID: "FANUC-R-2000iD",
            Vehicle_ID: "VH-PICKUP-002",
            Run_ID: "ACT-PCK-002",
            Algorithm_Version: "v1.1.2",
            Param_Set_ID: "P-Set-Alloy-02",
            Role_Permission: "Safety_Operator"
        },
        Target_Trajectory: {
            Waypoints: run2_Waypoints,
            Segment_Info: [],
            TimeWindow_SpeedProfile: { type: "Safety_Limited", target_speed: "250 mm/s" },
            Constraints: { max_force: "150 N", power_limit: "80 W" },
            Objective: "SafetyFirst"
        },
        Actual_Trajectory: {
            Waypoints: addNoise(run2_Waypoints),
            Speed_Accel_Profile: { avg_speed: "245 mm/s", avg_accel: "500 mm/s²", max_force_detected: "45 N" },
            Timestamp_UTC: "2026-02-06T10:30:00Z",
            Source: "REAL_ROBOT"
        },
        Trajectory_Validation_Events: [
            {
                Violation_ID: "VIO-COB-01",
                Event_Timestamp_UTC: "2026-02-06T10:30:10Z",
                Violation_Type: "speed_limit_zone",
                Severity: "CRITICAL",
                Location_Ref: "WP-15",
                Rule_Desc: "Speed > Limit in Human Zone",
                Metric_Value: "speed: 260 mm/s",
                Collision_Risk: true
            }
        ],
        Run_Meta_Status: {
            Start_Time: "2026-02-06T10:30:00Z",
            End_Time: "2026-02-06T10:31:00Z",
            State: "fail",
            Error_Code: "SAFETY_STOP",
            Error_Message: "Safety violation triggered.",
            Artifact_URI: "minio://tpt-runs/run-002/safety_log.zip"
        },
        Map_Context: { Map_ID: "Assembly-Area-B", Traffic_Context: "Human_Worker_Present" }
    },
    // Run 4: Simulated (Digital Twin)
    {
        TPT_Context: {
            DT_ID: "DT-Spot-Weld-Sim",
            Asset_ID: "DT-FANUC-R-2000iD",
            Vehicle_ID: "VH-PICKUP-002",
            Run_ID: "SIM-PCK-002",
            Algorithm_Version: "v1.1.4-patch", // Newer version in sim
            Param_Set_ID: "P-Set-Alloy-02",
            Role_Permission: "Sim_Engineer"
        },
        Target_Trajectory: {
            Waypoints: run2_Waypoints,
            Segment_Info: [],
            TimeWindow_SpeedProfile: { type: "Safety_Limited", target_speed: "250 mm/s" },
            Constraints: { max_force: "150 N", power_limit: "80 W" },
            Objective: "SafetyFirst"
        },
        Actual_Trajectory: {
            Waypoints: run2_Waypoints,
            Speed_Accel_Profile: { avg_speed: "250 mm/s", avg_accel: "480 mm/s²", max_force_detected: "0 N" },
            Timestamp_UTC: "2026-02-06T10:30:00Z",
            Source: "DIGITAL_TWIN"
        },
        Trajectory_Validation_Events: [],
        Run_Meta_Status: {
            Start_Time: "2026-02-06T10:30:00Z",
            End_Time: "2026-02-06T10:30:58Z",
            State: "pass",
            Error_Code: null,
            Error_Message: null,
            Artifact_URI: "minio://tpt-runs/sim-002/data.json"
        },
        Map_Context: { Map_ID: "Assembly-Area-B", Traffic_Context: "Virtual" }
    }
];

// Adapter to match the existing UI Component expectations
export const tptSessions = tptRawData.map(run => {
    return {
        // UI Key -> Mapped Technical Key
        id: run.TPT_Context.Run_ID,
        componentName: run.TPT_Context.DT_ID.replace(/_/g, ' '),
        version: run.TPT_Context.Algorithm_Version,
        parameterSet: run.TPT_Context.Param_Set_ID,
        mode: run.Actual_Trajectory.Source, // REAL vs SIM as mode
        date: run.Run_Meta_Status.Start_Time.split('T')[0], // Extract date
        status: run.Run_Meta_Status.State,
        stage: run.Run_Meta_Status.State === 'running' ? 'execution' : 'completed',
        startTime: run.Run_Meta_Status.Start_Time,
        endTime: run.Run_Meta_Status.End_Time,
        errorCode: run.Run_Meta_Status.Error_Code,
        errorMessage: run.Run_Meta_Status.Error_Message,

        // Inferring a validation score if not explicitly present, 
        // derived from severity of violations for mock purposes
        verificationScore: run.Trajectory_Validation_Events.length === 0 ? 100 :
            Math.max(0, 100 - run.Trajectory_Validation_Events.reduce((acc, v) => acc + (v.Severity === 'CRITICAL' ? 50 : 10), 0)),

        // Complex Objects mapping
        testPlan: run.TPT_Context.Asset_ID, // Mapping Asset to TestPlan slot for visibility
        vehicleId: run.TPT_Context.Vehicle_ID,
        requirementRef: run.TPT_Context.Role_Permission, // Mapping Role to Requirement slot
        acceptanceCriteria: run.Target_Trajectory.Objective, // Mapping Objective to criteria

        // Trajectory Validation Events -> Violations
        violations: run.Trajectory_Validation_Events.map(v => ({
            id: v.Violation_ID,
            time: v.Event_Timestamp_UTC ? v.Event_Timestamp_UTC.split('T')[1].replace('Z', '') : '',
            rule: v.Rule_Desc,
            deviation: v.Metric_Value,
            severity: v.Severity,
            collision: typeof v.Collision_Risk === 'boolean' ? v.Collision_Risk : false
        })),

        // Mapping Trajectory Targets & Constraints for details
        targetWaypoints: run.Target_Trajectory.Waypoints,
        constraints: run.Target_Trajectory.Constraints,

        // Monitoring/Actuals
        monitoringDetails: {
            source: run.Actual_Trajectory.Source,
            mapId: run.Map_Context.Map_ID,
            trafficContext: run.Map_Context.Traffic_Context,
            speedProfile: run.Actual_Trajectory.Speed_Accel_Profile
        },

        // Evidence
        evidenceMetadata: {
            uri: run.Run_Meta_Status.Artifact_URI
        },

        // Pass the raw object including Trajectories
        raw: run
    };
});

export default tptSessions;
