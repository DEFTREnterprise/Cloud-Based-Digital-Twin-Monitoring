import React, { useMemo } from 'react';
import { Clock, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Panel } from '../shared';

const Timeline = ({ session }) => {
    const {
        durationMs,
        events,
        waypoints,
        segments
    } = useMemo(() => {
        if (!session || !session.raw) return {};

        const meta = session.raw.Run_Meta_Status || {};
        const start = new Date(meta.Start_Time).getTime();

        // Safely get last waypoint time
        const waypointsArr = session.raw.Target_Trajectory?.Waypoints || [];
        const lastWpTime = waypointsArr.length > 0 ? waypointsArr[waypointsArr.length - 1].t : 60;

        // Use End_Time if available, otherwise estimate from waypoints or current time (for running)
        const end = meta.End_Time ? new Date(meta.End_Time).getTime() : start + (lastWpTime * 1000);

        // Safety check for duration
        const dur = Math.max(end - start, 1000);

        const evts = (session.raw.Trajectory_Validation_Events || []).map(e => ({
            ...e,
            offset: Math.max(0, Math.min(100, ((new Date(e.Event_Timestamp_UTC).getTime() - start) / dur) * 100))
        }));

        const wps = (session.raw.Target_Trajectory?.Waypoints || []).filter(wp => wp.t !== undefined).map(wp => ({
            ...wp,
            offset: Math.max(0, Math.min(100, ((wp.t * 1000) / dur) * 100))
        }));

        // Generate Segments
        // If we have explicit segment info, we might use it, but usually we just want to visualize the path between waypoints.
        // Let's create logical segments between waypoints.
        const segs = [];
        const sortedWps = [...wps].sort((a, b) => a.t - b.t);

        // Ensure we cover from 0 to end.
        // If first waypoint is not at 0, add a virtual start? Usually t=0 is start.

        // Colors palette for segments - Using MATISSE palette approximations
        const colors = [
            "bg-primary-400",
            "bg-secondary-400",
            "bg-info-500",
            "bg-sky-500",
            "bg-primary-500",
            "bg-secondary-500"
        ];

        for (let i = 0; i < sortedWps.length - 1; i++) {
            const startWp = sortedWps[i];
            const endWp = sortedWps[i + 1];

            const startPct = startWp.offset;
            const widthPct = endWp.offset - startWp.offset;

            // Basic cycle for colors
            const colorClass = colors[i % colors.length];

            // Try to find a name from Segment_Info if it matches, otherwise generate one
            // Try to find a name from Segment_Info if it matches, otherwise generate one
            let name = `Segment ${i + 1}`;

            // If the raw data has Segment_Info that matches these waypoints
            const segInfoRaw = session.raw.Target_Trajectory?.Segment_Info;
            if (segInfoRaw) {
                if (Array.isArray(segInfoRaw)) {
                    // Check if any segment in the array matches this hop
                    const match = segInfoRaw.find(s => s.Start === startWp.id && s.End === endWp.id);
                    if (match) name = match.Segment_ID;
                } else if (segInfoRaw.Start === startWp.id && segInfoRaw.End === endWp.id) {
                    // Legacy object support
                    name = segInfoRaw.Segment_ID;
                }
            } else {
                name = `${startWp.id || 'WP' + i} ➝ ${endWp.id || 'WP' + (i + 1)}`;
            }

            segs.push({
                left: startPct,
                width: widthPct,
                color: colorClass,
                name: name,
                startId: startWp.id,
                endId: endWp.id
            });
        }

        // Handle case where run might continue past last waypoint (e.g. landing) or just fill to 100% if needed?
        // Usually timeline is scaled to 'end', effectively determined by duration. 
        // If duration > last waypoint, we add a final segment.
        const lastWp = sortedWps[sortedWps.length - 1];
        if (lastWp && lastWp.offset < 100) {
            segs.push({
                left: lastWp.offset,
                width: 100 - lastWp.offset,
                color: colors[sortedWps.length % colors.length],
                name: "Final Approach / End",
                startId: lastWp.id,
                endId: "End"
            });
        }

        return {
            durationMs: dur,
            events: evts,
            waypoints: wps,
            segments: segs
        };
    }, [session]);

    if (!session) return (
        <Panel padding="md">
            <div className="flex items-center gap-2 mb-4">
                <Clock size={16} className="text-neutral-500" />
                <h3 className="font-bold text-neutral-700 text-sm uppercase tracking-wider">Session Timeline</h3>
            </div>
            <div className="flex items-center justify-center py-8 text-neutral-400 text-sm italic">
                Click Analyze to view the session timeline.
            </div>
        </Panel>
    );

    const getEventIcon = (severity) => {
        switch (severity) {
            case 'CRITICAL': return <AlertCircle size={14} className="text-white fill-error-600" />;
            case 'WARN': return <AlertTriangle size={14} className="text-white fill-warning-500" />;
            default: return <Info size={14} className="text-white fill-primary-500" />;
        }
    };

    return (
        <Panel padding="md" className="relative overflow-visible">
            <div className="flex items-center gap-2 mb-6">
                <Clock size={16} className="text-neutral-500" />
                <h3 className="font-bold text-neutral-700 text-sm uppercase tracking-wider">Session Timeline</h3>
            </div>

            <div className="relative h-12 mx-4 select-none group/timeline">
                {/* Background Track */}
                <div className="absolute top-1/2 left-0 right-0 h-2 bg-neutral-100 rounded-full select-none -translate-y-1/2"></div>

                {/* Segmented Bar */}
                {segments && segments.map((seg, idx) => (
                    <div
                        key={idx}
                        className={`absolute top-1/2 h-2 ${seg.color} -translate-y-1/2 cursor-pointer transition-all hover:h-4 hover:rounded shadow-sm opacity-80 hover:opacity-100 z-0 hover:z-10`}
                        style={{ left: `${seg.left}%`, width: `${seg.width}%` }}
                    // Add rounded corners to start/end of the whole bar
                    // But individual segments might look blocky adjacent to each other. 
                    // Let's rely on high-level rounded background or just simple blocks.
                    >
                        {/* Tooltip on Hover */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden hover:block group-hover:block opacity-0 hover:opacity-100 transition-opacity z-50 whitespace-nowrap pointer-events-none">
                            <div className="bg-neutral-800 text-white text-xs px-2 py-1 rounded shadow-lg">
                                {seg.name}
                            </div>
                            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-neutral-800 mx-auto"></div>
                        </div>
                    </div>
                ))}

                {/* Start Marker */}
                <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-none">
                    <div className="w-3 h-3 rounded-full bg-neutral-800 border-2 border-white shadow-sm"></div>
                    <div className="absolute top-4 opacity-100 pt-1">
                        <span className="text-[10px] font-mono font-medium text-neutral-500 bg-neutral-50 px-1 rounded border border-neutral-200">0s</span>
                    </div>
                </div>

                {/* End Marker */}
                <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-none">
                    <div className="w-3 h-3 rounded-full bg-neutral-800 border-2 border-white shadow-sm"></div>
                    <div className="absolute top-4 opacity-100 pt-1">
                        <span className="text-[10px] font-mono font-medium text-neutral-500 bg-neutral-50 px-1 rounded border border-neutral-200">
                            {Math.round(durationMs / 1000)}s
                        </span>
                    </div>
                </div>

                {/* Waypoints (Dots on top of segments) */}
                {waypoints.map((wp, i) => (
                    <div
                        key={`wp-${i}`}
                        className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white border-2 border-neutral-400 z-20 transition-all hover:w-3 hover:h-3 hover:border-neutral-600 cursor-pointer"
                        style={{ left: `${wp.offset}%` }}
                    >
                        {/* Waypoint Label */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 hover:opacity-100 bg-neutral-700 text-white text-[10px] px-2 py-1 rounded pointer-events-none transition-opacity whitespace-nowrap z-50">
                            {wp.id} (T+{wp.t}s)
                        </div>
                    </div>
                ))}

                {/* Events / Violations */}
                {events.map((evt, i) => (
                    <div
                        key={`evt-${i}`}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-30 cursor-pointer transition-transform hover:scale-125 focus:scale-125"
                        style={{ left: `${evt.offset}%` }}
                    >
                        {/* Pin Line */}
                        <div className={`absolute bottom-full left-1/2 w-0.5 h-3 -translate-x-1/2 mb-[-2px] ${evt.Severity === 'CRITICAL' ? 'bg-error-500' : evt.Severity === 'WARN' ? 'bg-warning-500' : 'bg-primary-500'
                            }`}></div>

                        {/* Icon */}
                        <div className="relative group">
                            {getEventIcon(evt.Severity)}

                            {/* Tooltip for Event */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 min-w-[150px]">
                                <div className="bg-white text-neutral-800 text-xs p-2 rounded-lg shadow-xl border border-neutral-200 flex flex-col gap-1">
                                    <span className={`font-bold ${evt.Severity === 'CRITICAL' ? 'text-error-600' : evt.Severity === 'WARN' ? 'text-warning-600' : 'text-primary-600'}`}>
                                        {evt.Severity}
                                    </span>
                                    <span className="font-medium">{evt.Violation_Type}</span>
                                    <span className="text-[10px] text-neutral-500">{evt.Rule_Desc}</span>
                                    <div className="mt-1 pt-1 border-t border-neutral-100 flex justify-between">
                                        <span className="font-mono text-[10px]">{Math.round((evt.offset / 100) * (durationMs / 1000))}s</span>
                                        <span className="font-mono text-[10px]">{new Date(evt.Event_Timestamp_UTC).toLocaleTimeString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Legend for Segments? Optional but good for context */}
            <div className="mt-8 flex items-center gap-4 text-xs text-neutral-400">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-white border-2 border-neutral-400"></div>
                    <span>Waypoint</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-1.5 rounded bg-primary-400"></div>
                    <span>Segment</span>
                </div>
                <div className="flex items-center gap-1">
                    <AlertCircle size={12} className="text-error-600" />
                    <span>Critical Event</span>
                </div>
            </div>
        </Panel>
    );
};

export default Timeline;
