import React, { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ZAxis
} from 'recharts';
import { AlertCircle, CheckCircle, Info, Activity, Map as MapIcon, Share2 } from 'lucide-react';
import { Panel, StatusBadge, EmptyState } from '../shared';
import tptSessions from '../../data/mockTPTData';

const Visualization = ({ selectedRunId: propRunId, onRunSelect, selectedViolationId, onViolationSelect }) => {

  const selectedRun = useMemo(() =>
    propRunId ? tptSessions.find(s => s.id === propRunId) : null,
    [propRunId]);

  // Helper to normalize coordinates data for the chart and handle scaling
  const { targetData, actualData } = useMemo(() => {
    if (!selectedRun) return { targetData: [], actualData: [] };

    const processWaypoints = (waypoints) => {
      if (!waypoints || waypoints.length === 0) return [];
      return waypoints.map((wp, index) => {
        // Normalize: Prefer 'x'/'y' if available (Cartesian), fallback to 'lon'/'lat' (Geographic)
        // Note: For geographic data, we map Lon -> X, Lat -> Y
        const x = wp.x !== undefined ? wp.x : wp.lon;
        const y = wp.y !== undefined ? wp.y : wp.lat;
        return {
          ...wp,
          x,
          y,
          z: wp.alt || 0, // Altitude mapping
          id: wp.id || `WP-${index + 1}`
        };
      });
    };

    return {
      targetData: processWaypoints(selectedRun.raw.Target_Trajectory?.Waypoints),
      actualData: processWaypoints(selectedRun.raw.Actual_Trajectory?.Waypoints)
    };
  }, [selectedRun]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-sm p-3 border border-slate-200 shadow-xl rounded-lg text-sm font-sans z-50">
          <p className="font-bold text-slate-800 mb-1 border-b border-slate-100 pb-1">{data.id || 'Data Point'}</p>
          <div className="space-y-0.5 text-slate-600">
            <p className="flex justify-between gap-4"><span>X / Lon:</span> <span className="font-mono text-slate-900">{data.x.toFixed(4)}</span></p>
            <p className="flex justify-between gap-4"><span>Y / Lat:</span> <span className="font-mono text-slate-900">{data.y.toFixed(4)}</span></p>
            {data.alt !== undefined && (
              <p className="flex justify-between gap-4"><span>Alt:</span> <span className="font-mono text-slate-900">{data.alt}m</span></p>
            )}
            {data.t !== undefined && (
              <p className="flex justify-between gap-4"><span>Time:</span> <span className="font-mono text-slate-900">{data.t}s</span></p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // getSeverityStyles removed - using StatusBadge instead
  // getSeverityIcon removed - using StatusBadge instead

  if (!selectedRun) return (
    <Panel className="h-96">
      <EmptyState
        icon={Activity}
        title="No Run Data Available"
        description="Please check back later or check your network connection."
      />
    </Panel>
  );

  return (
    <Panel padding="lg" fullHeight className="flex flex-col gap-6 font-sans">

      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-5">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-indigo-600 shadow-sm shadow-indigo-200 rounded-lg">
            <Activity className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Trajectory Visualization</h2>
            <p className="text-sm text-slate-500 font-medium">Comparative Analysis: Target vs. Actual</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">SESSION:</span>
          <span className="text-sm font-medium text-slate-900">
            {selectedRun.id} • {selectedRun.componentName}
          </span>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left: Chart Area */}
        <div className="flex-[3] flex flex-col min-h-[500px] bg-slate-50/50 rounded-2xl border border-slate-200 p-1 relative overflow-hidden group">
          {/* Map Context Badge */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-slate-200 text-xs font-semibold text-slate-600 transition-opacity opacity-70 group-hover:opacity-100">
            <MapIcon size={14} className="text-indigo-500" />
            {selectedRun.raw.Map_Context?.Map_ID || 'Unknown Map'}
          </div>

          <div className="w-full h-full bg-white rounded-xl shadow-inner p-2">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 30, right: 30, bottom: 30, left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={true} horizontal={true} />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="X Axis"
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Y Axis"
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={{ stroke: '#e2e8f0' }}
                />
                <ZAxis type="number" dataKey="z" range={[60, 400]} name="Altitude" />
                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#cbd5e1' }} />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}
                />

                {/* Target Trajectory Line */}
                <Scatter
                  name="Target Path"
                  data={targetData}
                  fill="#6366f1"
                  line={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5 5' }}
                  shape="circle"
                />

                {/* Actual Trajectory Line */}
                <Scatter
                  name="Actual Path"
                  data={actualData}
                  fill="#10b981"
                  line={{ stroke: '#10b981', strokeWidth: 2 }}
                  shape="wye"
                />

                {/* Selected Violation Highlight */}
                {selectedViolationId && (
                  (() => {
                    // Find the event to get timestamp/location
                    const evt = selectedRun.raw.Trajectory_Validation_Events?.find(e => e.Violation_ID === selectedViolationId);
                    if (!evt) return null;

                    // Find closest data point in actualData based on timestamp or index
                    // Assuming evt.Event_Timestamp_UTC matches a point's time roughly
                    const evtTime = new Date(evt.Event_Timestamp_UTC).getTime();

                    // Find point with closest time
                    // Need start time to convert T if data uses relative T
                    const meta = selectedRun.raw.Run_Meta_Status || {};
                    const start = new Date(meta.Start_Time).getTime();

                    // If we have t in actualData (relative seconds)
                    const targetT = (evtTime - start) / 1000;

                    let matchPoint = actualData.find(p => Math.abs(p.t - targetT) < 2); // 2 sec tolerance window

                    // Fallback logic if time match fails: maybe try location matching?
                    if (!matchPoint) {
                      // Logic placeholder: just pick one for demo if exact time mismatch in mock data
                      if (actualData.length > 20) matchPoint = actualData[20];
                    }

                    if (matchPoint) {
                      return (
                        <Scatter
                          name="Selected Violation"
                          data={[matchPoint]}
                          fill="#ef4444"
                          shape={(props) => (
                            <g>
                              <circle cx={props.cx} cy={props.cy} r={10} fill="none" stroke="#ef4444" strokeWidth={3} className="animate-ping opacity-75" />
                              <circle cx={props.cx} cy={props.cy} r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />
                            </g>
                          )}
                          zAxisId={0}
                        />
                      );
                    }
                    return null;
                  })()
                )}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Validation Events Panel */}
        <div className="flex-1 min-w-[320px] max-w-sm flex flex-col gap-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              Validation Events
              <span className={`px-2 py-0.5 rounded-full text-xs ml-2 ${(selectedRun.raw.Trajectory_Validation_Events?.length || 0) > 0
                ? 'bg-rose-100 text-rose-700'
                : 'bg-emerald-100 text-emerald-700'
                }`}>
                {selectedRun.raw.Trajectory_Validation_Events?.length || 0} Issues
              </span>
            </h3>
          </div>

          {/* Events List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
            {selectedRun.raw.Trajectory_Validation_Events?.length > 0 ? (
              selectedRun.raw.Trajectory_Validation_Events.map((event, idx) => {
                const isSelected = selectedViolationId === event.Violation_ID;
                return (
                  <div
                    key={idx}
                    onClick={() => onViolationSelect && onViolationSelect(isSelected ? null : event.Violation_ID)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${isSelected ? 'ring-2 ring-indigo-500 shadow-lg scale-[1.02] z-10 bg-white border-indigo-200' : 'hover:shadow-md hover:scale-[1.01] bg-white border-neutral-100'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-bold text-sm capitalize ${event.Severity === 'CRITICAL' ? 'text-error-700' : event.Severity === 'WARN' ? 'text-warning-700' : 'text-primary-700'}`}>
                        {event.Violation_Type ? event.Violation_Type.replace(/_/g, ' ') : 'Violation'}
                      </span>
                      <StatusBadge
                        status={event.Severity === 'CRITICAL' ? 'critical' : event.Severity === 'WARN' ? 'warning' : 'info'}
                        label={event.Severity}
                        size="sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs text-neutral-600 leading-relaxed">
                        <span className="font-semibold text-neutral-800">Rule:</span> {event.Rule_Desc}
                      </p>
                      <div className="bg-neutral-50 rounded px-2 py-1 flex items-center justify-between border border-neutral-100">
                        <span className="text-xs font-mono text-neutral-600">{event.Metric_Value}</span>
                        <span className="text-[10px] text-neutral-400 font-medium">Metric</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-2 pt-2 border-t border-neutral-100">
                        <span>{event.Location_Ref || 'Global'}</span>
                        <span>{new Date(event.Event_Timestamp_UTC).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-emerald-50/50 rounded-xl border border-emerald-100 border-dashed h-full">
                <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                  <CheckCircle size={24} className="text-emerald-500" />
                </div>
                <h4 className="text-sm font-semibold text-emerald-900 mb-1">All Clear</h4>
                <p className="text-xs text-emerald-600/80">Trajectory validates against all active constraints.</p>
              </div>
            )}
          </div>

          {/* Constraints Summary */}
          <div className="bg-slate-800 text-slate-200 rounded-xl p-4 shadow-lg ring-1 ring-white/10">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
              <Share2 size={14} className="text-indigo-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Constraints</h4>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {selectedRun.raw.Target_Trajectory.Constraints ?
                Object.entries(selectedRun.raw.Target_Trajectory.Constraints).map(([key, val]) => (
                  <div key={key} className="bg-slate-700/50 px-2 py-1.5 rounded flex flex-col hover:bg-slate-700 transition-colors">
                    <span className="text-[10px] text-slate-400 capitalize mb-0.5">{key.replace(/_/g, ' ')}</span>
                    <span className="font-mono text-indigo-300 font-semibold">{val}</span>
                  </div>
                )) : <span className="text-slate-500 italic">No specific constraints</span>
              }
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
};

export default Visualization;
