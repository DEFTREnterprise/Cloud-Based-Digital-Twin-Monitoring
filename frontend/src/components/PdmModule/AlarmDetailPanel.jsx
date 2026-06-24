import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { X, AlertTriangle, AlertCircle, Info, Shield, Cpu, FileText, User, Clock, Radio, ExternalLink } from 'lucide-react';
import { Panel } from '../shared';

const SEVERITY_BADGE = {
    CRITICAL: 'bg-red-100 text-red-700 border-red-200',
    WARN: 'bg-amber-100 text-amber-700 border-amber-200',
    INFO: 'bg-blue-100 text-blue-700 border-blue-200',
};

const STATE_BADGE = {
    open: 'bg-red-50 text-red-600 border-red-200',
    ack: 'bg-amber-50 text-amber-600 border-amber-200',
    closed: 'bg-neutral-100 text-neutral-500 border-neutral-200',
};

const SIGNAL_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];

const AlarmDetailPanel = ({ detail, onClose, onDrillThrough }) => {
    if (!detail) return null;

    // Prepare telemetry chart data
    const chartData = useMemo(() => {
        if (!detail.telemetryWindow) return [];

        // Get union of all timestamps
        const timestampMap = new Map();
        const signalIds = Object.keys(detail.telemetryWindow);

        signalIds.forEach(sigId => {
            const points = detail.telemetryWindow[sigId];
            points.forEach(p => {
                if (!timestampMap.has(p.Timestamp_UTC)) {
                    timestampMap.set(p.Timestamp_UTC, {
                        timestamp: p.Timestamp_UTC,
                        time: new Date(p.Timestamp_UTC).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                    });
                }
                timestampMap.get(p.Timestamp_UTC)[sigId] = p.Value;
            });
        });

        const base = Array.from(timestampMap.values()).sort(
            (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );

        // Overlay anomaly score (nearest-neighbor mapping)
        if (detail.anomalyScoreWindow && detail.anomalyScoreWindow.length > 0) {
            const scorePoints = detail.anomalyScoreWindow
                .map(p => ({ t: new Date(p.timestamp).getTime(), v: p.value }))
                .sort((a, b) => a.t - b.t);

            const nearestValue = (tsMs) => {
                // linear scan is fine for small mock arrays
                let best = null;
                for (const p of scorePoints) {
                    const d = Math.abs(p.t - tsMs);
                    if (!best || d < best.d) best = { d, v: p.v };
                }
                return best?.v ?? null;
            };

            return base.map(row => {
                const ms = new Date(row.timestamp).getTime();
                return { ...row, anomalyScore: nearestValue(ms) };
            });
        }

        return base;
    }, [detail.telemetryWindow]);

    const signalIds = detail.telemetryWindow ? Object.keys(detail.telemetryWindow) : [];

    // Get signal names for legend
    const signalNameMap = useMemo(() => {
        const map = {};
        detail.signals.forEach(sig => {
            map[sig.id] = `${sig.name} (${sig.unit})`;
        });
        return map;
    }, [detail.signals]);

    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload || payload.length === 0) return null;
        const data = payload[0].payload;

        return (
            <div className="bg-white border border-neutral-200 rounded-lg shadow-lg p-3 text-xs max-w-xs">
                <p className="text-neutral-500 mb-2 text-[10px]">
                    {new Date(data.timestamp).toLocaleString('en-US')}
                </p>
                {payload.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-0.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-neutral-600 truncate">
                            {p.dataKey === 'anomalyScore' ? 'Anomaly Score' : (signalNameMap[p.dataKey] || p.dataKey)}:
                        </span>
                        <span className="font-bold text-neutral-800">
                            {typeof p.value === 'number' ? p.value.toFixed(p.dataKey === 'anomalyScore' ? 3 : 3) : '-'}
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    const handleShowInLive = () => {
        if (typeof onDrillThrough !== 'function') return;
        onDrillThrough({
            alarmId: detail.id,
            assetId: detail.assetId,
            componentId: detail.componentId,
            windowStartUtc: detail.windowStartUtc || null,
            windowEndUtc: detail.windowEndUtc || null,
        });
    };

    return (
        <Panel
            title="Alarm Detail"
            icon={FileText}
            badge={<span className="text-[10px] font-mono text-neutral-500 bg-white border border-neutral-200 rounded-full px-2 py-0.5">{detail.id}</span>}
            headerAction={(
                <>
                    <button
                        onClick={handleShowInLive}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 transition-colors"
                        title="Open the same asset + time window in Live Monitoring"
                    >
                        <ExternalLink size={14} />
                        Show in Live Monitoring
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-500 hover:text-neutral-700"
                        title="Close"
                    >
                        <X size={16} />
                    </button>
                </>
            )}
            variant="elevated"
            className="animate-in slide-in-from-bottom-2"
        >
            <p className="text-xs text-neutral-500 mb-4">
                {detail.componentName} · {detail.assetName}
            </p>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left: Alarm Meta */}
                <div className="space-y-4">
                    {/* Severity + State */}
                    <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded border font-bold ${SEVERITY_BADGE[detail.severity] || SEVERITY_BADGE.INFO}`}>
                            {detail.severity}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded border font-medium ${STATE_BADGE[detail.state] || STATE_BADGE.open}`}>
                            {detail.state === 'ack' ? 'Acknowledged' : detail.state === 'closed' ? 'Closed' : 'Open'}
                        </span>
                    </div>

                    {/* Meta Details */}
                    <div className="space-y-2.5">
                        <div className="flex items-start gap-2">
                            <Clock size={12} className="text-neutral-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Timestamp</p>
                                <p className="text-xs text-neutral-700 font-medium">
                                    {new Date(detail.timestamp).toLocaleString('en-US')}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-2">
                            <Shield size={12} className="text-neutral-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Rule</p>
                                <p className="text-xs text-neutral-700">{detail.ruleDesc}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-2">
                            <Cpu size={12} className="text-neutral-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Generated By</p>
                                <p className="text-xs text-neutral-700">
                                    {detail.generatedBy} · <span className="font-mono">{detail.modelVersion}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-2">
                            <AlertTriangle size={12} className="text-neutral-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Type</p>
                                <p className="text-xs text-neutral-700 capitalize">{detail.alarmType?.replace(/_/g, ' ')}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-2">
                            <Radio size={12} className="text-neutral-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Related Signals</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {detail.signals.map((sig, idx) => (
                                        <span key={sig.id} className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                                            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: SIGNAL_COLORS[idx % SIGNAL_COLORS.length] }} />
                                            {sig.name} ({sig.unit})
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Ack Info */}
                    {detail.ackBy && (
                        <div className="bg-neutral-50 rounded-lg border border-neutral-200 p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <User size={12} className="text-neutral-400" />
                                <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold">Acknowledgement</span>
                            </div>
                            <p className="text-xs text-neutral-700">
                                <strong>{detail.ackBy}</strong> · {new Date(detail.ackTimestamp).toLocaleString('en-US')}
                            </p>
                            {detail.note && (
                                <p className="text-xs text-neutral-600 mt-2 bg-white rounded p-2 border border-neutral-200 italic">
                                    "{detail.note}"
                                </p>
                            )}
                        </div>
                    )}

                    {/* Message */}
                    <div className="bg-blue-50/50 rounded-lg border border-blue-100 p-3">
                        <p className="text-[10px] text-blue-400 uppercase tracking-wider font-bold mb-1">Message</p>
                        <p className="text-xs text-neutral-700 leading-relaxed">{detail.message}</p>
                    </div>
                </div>

                {/* Right: Signal Window Chart (2 cols) */}
                <div className="lg:col-span-2">
                    <div className="bg-neutral-50 rounded-lg border border-neutral-200 p-4 h-full">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h4 className="text-xs font-bold text-neutral-700">Signal Window (Pre/Post Event)</h4>
                                <p className="text-[10px] text-neutral-400 mt-0.5">
                                    {detail.windowConfig?.preMinutes}min before · {detail.windowConfig?.postMinutes}min after event
                                </p>
                            </div>
                        </div>

                        {chartData.length > 0 ? (
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis
                                            dataKey="time"
                                            tick={{ fontSize: 9, fill: '#94a3b8' }}
                                            interval="preserveStartEnd"
                                            tickCount={8}
                                        />
                                        <YAxis yAxisId="left" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                                        <YAxis
                                            yAxisId="right"
                                            orientation="right"
                                            domain={[0, 1]}
                                            tick={{ fontSize: 9, fill: '#94a3b8' }}
                                            ticks={[0, 0.2, 0.45, 0.7, 1.0]}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend
                                            formatter={(value) => (
                                                <span className="text-[10px] text-neutral-600">
                                                    {value === 'anomalyScore' ? 'Anomaly Score' : (signalNameMap[value] || value)}
                                                </span>
                                            )}
                                            iconSize={8}
                                        />

                                        {signalIds.map((sigId, idx) => (
                                            <Line
                                                key={sigId}
                                                type="monotone"
                                                dataKey={sigId}
                                                stroke={SIGNAL_COLORS[idx % SIGNAL_COLORS.length]}
                                                strokeWidth={1.5}
                                                dot={false}
                                                activeDot={{ r: 3 }}
                                                yAxisId="left"
                                            />
                                        ))}

                                        {/* Anomaly score overlay on 2nd axis */}
                                        {detail.anomalyScoreWindow && (
                                            <Line
                                                type="monotone"
                                                dataKey="anomalyScore"
                                                stroke="#8b5cf6"
                                                strokeWidth={2}
                                                dot={false}
                                                yAxisId="right"
                                                activeDot={{ r: 3 }}
                                            />
                                        )}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-[300px] text-neutral-400 text-xs">
                                No telemetry data available for this alarm
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Panel>
    );
};

export default AlarmDetailPanel;
