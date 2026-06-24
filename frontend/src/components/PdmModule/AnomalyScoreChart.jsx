import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import { TrendingUp, ChevronDown } from 'lucide-react';
import { Panel } from '../shared';

const AnomalyScoreChart = ({ scoreHistory, componentOptions, selectedComponent, onComponentChange, thresholds, assetRisk, modelVersion }) => {
    // Transform data for Recharts
    const chartData = useMemo(() => {
        if (!scoreHistory || scoreHistory.length === 0) return [];

        return scoreHistory.map(point => ({
            timestamp: point.timestamp,
            time: new Date(point.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            score: point.value,
        }));
    }, [scoreHistory]);

    // Threshold values
    const thresholdValues = thresholds?.Thresholds?.anomaly_score || { Info: 0.2, Warn: 0.45, Critical: 0.7 };

    // Current score (last value)
    const currentScore = chartData.length > 0 ? chartData[chartData.length - 1].score : 0;
    const scoreColor = currentScore >= thresholdValues.Critical
        ? '#ef4444'
        : currentScore >= thresholdValues.Warn
            ? '#f59e0b'
            : '#10b981';

    // Custom tooltip
    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload || payload.length === 0) return null;
        const data = payload[0].payload;
        const value = data.score;
        const color = value >= thresholdValues.Critical ? '#ef4444'
            : value >= thresholdValues.Warn ? '#f59e0b' : '#10b981';

        return (
            <div className="bg-white border border-neutral-200 rounded-lg shadow-lg p-3 text-xs">
                <p className="text-neutral-500 mb-1">{new Date(data.timestamp).toLocaleString('en-US')}</p>
                <p className="font-bold" style={{ color }}>
                    Score: {value.toFixed(4)}
                </p>
            </div>
        );
    };

    const headerAction = (
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Current</span>
                <span className="text-sm font-bold" style={{ color: scoreColor }}>
                    {currentScore.toFixed(3)}
                </span>
            </div>
            {modelVersion && (
                <span className="text-[10px] font-mono bg-white border border-neutral-200 rounded-lg px-2 py-1 text-neutral-600">
                    {modelVersion}
                </span>
            )}
        </div>
    );

    return (
        <Panel title="Anomaly Score Trend" icon={TrendingUp} headerAction={headerAction} fullHeight>
            {/* Component selector */}
            <div className="relative mb-4">
                <select
                    value={selectedComponent || ''}
                    onChange={(e) => onComponentChange(e.target.value)}
                    className="w-full text-xs border border-neutral-200 rounded-lg px-3 py-2 bg-neutral-50 text-neutral-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
                >
                    <option value="" disabled>Select a component...</option>
                    {(componentOptions || []).map(opt => (
                        <option key={opt.value} value={opt.value}>
                            {opt.assetId} → {opt.label}
                        </option>
                    ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            </div>

            {/* Chart */}
            <div className="h-[280px]">
                {chartData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-neutral-400 text-xs">
                        Select a component to view anomaly score trend
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <defs>
                                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={scoreColor} stopOpacity={0.15} />
                                    <stop offset="95%" stopColor={scoreColor} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis
                                dataKey="time"
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                interval="preserveStartEnd"
                                tickCount={6}
                            />
                            <YAxis
                                domain={[0, 1]}
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                ticks={[0, 0.2, 0.45, 0.7, 1.0]}
                            />
                            <Tooltip content={<CustomTooltip />} />

                            {/* Threshold reference lines */}
                            <ReferenceLine
                                y={thresholdValues.Info}
                                stroke="#3b82f6"
                                strokeDasharray="4 4"
                                strokeOpacity={0.5}
                                label={{ value: 'Info', position: 'right', fontSize: 9, fill: '#3b82f6' }}
                            />
                            <ReferenceLine
                                y={thresholdValues.Warn}
                                stroke="#f59e0b"
                                strokeDasharray="4 4"
                                strokeOpacity={0.7}
                                label={{ value: 'Warn', position: 'right', fontSize: 9, fill: '#f59e0b' }}
                            />
                            <ReferenceLine
                                y={thresholdValues.Critical}
                                stroke="#ef4444"
                                strokeDasharray="4 4"
                                strokeOpacity={0.7}
                                label={{ value: 'Critical', position: 'right', fontSize: 9, fill: '#ef4444' }}
                            />

                            <Area
                                type="monotone"
                                dataKey="score"
                                fill="url(#scoreGradient)"
                                stroke="none"
                            />
                            <Line
                                type="monotone"
                                dataKey="score"
                                stroke={scoreColor}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4, fill: scoreColor }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Asset Risk Summary Cards */}
            {assetRisk && assetRisk.length > 0 && (
                <div className="border-t border-neutral-100 pt-4 mt-4">
                    <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold mb-2">Asset Risk Overview</p>
                    <div className="grid grid-cols-2 gap-2">
                        {assetRisk.map(asset => {
                            const riskBg = asset.riskLevel === 'critical' ? 'bg-red-50 border-red-200'
                                : asset.riskLevel === 'warning' ? 'bg-amber-50 border-amber-200'
                                    : 'bg-emerald-50 border-emerald-200';
                            const riskText = asset.riskLevel === 'critical' ? 'text-red-600'
                                : asset.riskLevel === 'warning' ? 'text-amber-600' : 'text-emerald-600';

                            return (
                                <div key={asset.assetId} className={`rounded-lg border p-2.5 ${riskBg}`}>
                                    <p className="text-[10px] font-bold text-neutral-700 truncate">{asset.assetId}</p>
                                    <p className={`text-sm font-bold ${riskText}`}>
                                        {asset.maxAnomalyScore.toFixed(3)}
                                    </p>
                                    <p className="text-[10px] text-neutral-400">
                                        {asset.activeAlarmCount} active alarm{asset.activeAlarmCount !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </Panel>
    );
};

export default AnomalyScoreChart;
