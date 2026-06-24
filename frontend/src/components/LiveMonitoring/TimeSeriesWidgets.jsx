import React, { useState, useMemo } from 'react';
import { TrendingUp, RefreshCw, Grid, List, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import TimeRangeControl from './TimeRangeControl';
import { EmptyState } from '../shared';
import {
    fetchSignalStream,
    calculateDiffMetrics,
    generateSparklinePoints,
    fetchSimulationSummary
} from '../../services/liveMonitoringBackend';

/**
 * TIME SERIES WIDGETS BİLEŞENİ
 * Canlı sinyal zaman serisi gösterimi.
 * 
 * Bu bileşen sadece "Görünüm" (View) katmanıdır.
 * Veri ve hesaplamalar 'liveMonitoringBackend' üzerinden gelir.
 */
const TimeSeriesWidgets = ({ selectedDT, showSimulation, timeRange, onTimeRangeChange, isStreaming }) => {
    const [viewMode, setViewMode] = useState('grid');
    const [streamError, setStreamError] = useState(null);

    // Backend'den sinyal verilerini al
    const allSignals = useMemo(() => fetchSignalStream(selectedDT?.dt, selectedDT?.signalSet), [selectedDT?.dt, selectedDT?.signalSet]);

    // Backend'den simülasyon özet metriklerini al
    const simSummary = useMemo(() => fetchSimulationSummary(selectedDT?.dt), [selectedDT?.dt]);

    // Compact Signal Row - minimal style
    const CompactSignalRow = ({ signal }) => {
        const realData = generateSparklinePoints(signal.currentValue, Math.abs(signal.currentValue) * 0.05);
        const simData = generateSparklinePoints(signal.simValue, Math.abs(signal.simValue) * 0.03);
        const diffMetrics = calculateDiffMetrics(signal.currentValue, signal.simValue);
        const hasThreshold = signal.thresholds;
        const isWarning = hasThreshold && signal.currentValue >= signal.thresholds.warning;
        const isCritical = hasThreshold && signal.currentValue >= signal.thresholds.critical;

        const width = 80;
        const height = 24;
        const min = Math.min(...realData);
        const max = Math.max(...realData);
        const range = max - min || 1;

        const createPath = (pts) => pts.map((val, i) => {
            const x = (i / (pts.length - 1)) * width;
            const y = height - ((val - min) / range) * height;
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');

        return (
            <div className={`flex items-center gap-3 px-3 py-2 border-b border-slate-100 hover:bg-slate-50 ${isCritical ? 'bg-rose-50' : isWarning ? 'bg-amber-50' : ''}`}>
                <div className="w-32 flex-shrink-0">
                    <span className="text-xs font-medium text-slate-700 truncate block">{signal.title}</span>
                </div>
                <svg width={width} height={height} className="flex-shrink-0">
                    {showSimulation && simData && (
                        <path d={createPath(simData)} fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2,2" />
                    )}
                    <path d={createPath(realData)} fill="none" stroke="#6366f1" strokeWidth="1.5" />
                </svg>
                <div className="w-20 text-right">
                    <span className="text-sm font-bold text-slate-800">{signal.currentValue}</span>
                    <span className="text-[10px] text-slate-400 ml-0.5">{signal.unit}</span>
                </div>
                {showSimulation && (
                    <>
                        <div className="w-16 text-right text-xs text-slate-500">
                            <span className="text-slate-400">Sim:</span> {signal.simValue}
                        </div>
                        <div className="w-16 text-right">
                            <span className={`text-xs font-medium ${Math.abs(parseFloat(diffMetrics.delta)) > 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                                Δ{diffMetrics.delta}
                            </span>
                        </div>
                    </>
                )}
                {hasThreshold && (
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${isCritical ? 'bg-rose-100 text-rose-700' : isWarning ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                        {isCritical ? 'CRIT' : isWarning ? 'WARN' : 'OK'}
                    </span>
                )}
            </div>
        );
    };

    const ErrorBanner = () => (
        <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle size={14} className="text-amber-600" />
            <span className="text-xs font-medium text-amber-800">
                Live stream interrupted. Showing historical data (fallback mode).
            </span>
            <button className="ml-auto text-xs text-amber-700 hover:text-amber-900 font-semibold">
                Retry Connection
            </button>
        </div>
    );

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-lg shadow-sm shadow-indigo-200">
                        <TrendingUp size={16} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">Live Time Series</h3>
                        <span className="text-xs text-slate-500">{allSignals.length} signals • {selectedDT?.signalSet}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Time Range Control (Integrated) */}
                    {onTimeRangeChange && (
                        <TimeRangeControl
                            timeRange={timeRange}
                            onChange={onTimeRangeChange}
                            variant="inline"
                        />
                    )}
                    {/* View Mode Toggle */}
                    <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400'}`}
                        >
                            <Grid size={14} />
                        </button>
                        <button
                            onClick={() => setViewMode('compact')}
                            className={`p-1.5 rounded ${viewMode === 'compact' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400'}`}
                        >
                            <List size={14} />
                        </button>
                    </div>
                    <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200">
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {!isStreaming ? (
                <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 min-h-[200px]">
                    <EmptyState
                        icon={TrendingUp}
                        title="Live Stream Inactive"
                        description="Start the data stream from the DT Selector panel to visualize time series data."
                    />
                </div>
            ) : (
                <>
                    {streamError && <ErrorBanner />}

                    {/* RMSE Summary when simulation overlay is enabled */}
                    {showSimulation && simSummary && (
                        <div className="mb-3 flex items-center gap-4 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Real vs Sim</span>
                            <div className="flex items-center gap-4 text-xs text-slate-600">
                                <span>Avg Δ: <span className="font-bold text-slate-800">{simSummary.avgDelta}</span></span>
                                <span>RMSE: <span className="font-bold text-indigo-600">{simSummary.rmse}</span></span>
                                <span>Max Dev: <span className="font-bold text-amber-600">{simSummary.maxDev}</span></span>
                            </div>
                        </div>
                    )}

                    {/* Compact View */}
                    {viewMode === 'compact' ? (
                        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="max-h-[400px] overflow-y-auto">
                                {allSignals.map(signal => (
                                    <CompactSignalRow key={signal.id} signal={signal} />
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Grid View - Recharts Implementation */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                            {allSignals.slice(0, 8).map((signal, index) => {
                                const realData = generateSparklinePoints(signal.currentValue, Math.abs(signal.currentValue) * 0.1);
                                const simData = generateSparklinePoints(signal.simValue, Math.abs(signal.simValue) * 0.08);
                                const diffMetrics = calculateDiffMetrics(signal.currentValue, signal.simValue);

                                // Format data for Recharts with fake timestamps for X-axis
                                const chartData = realData.map((val, i) => ({
                                    time: i,
                                    real: val,
                                    sim: simData ? simData[i] : null
                                }));

                                return (
                                    <div key={signal.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 h-[320px] flex flex-col">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                                <span className="text-sm font-bold text-slate-700 uppercase tracking-wide truncate max-w-[150px]">{signal.title}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-right">
                                                    <span className="block text-xl font-bold text-slate-800 leading-none">{signal.currentValue}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium">{signal.unit}</span>
                                                </div>
                                                {showSimulation && (
                                                    <div className="text-right pl-3 border-l border-slate-100">
                                                        <span className="block text-xs font-medium text-slate-400">RMSE</span>
                                                        <span className="block text-sm font-bold text-indigo-600 leading-none">{diffMetrics.rmse}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex-1 min-h-0 bg-slate-50/30 rounded-lg p-2 border border-slate-50">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                    <XAxis
                                                        dataKey="time"
                                                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                                                        axisLine={false}
                                                        tickLine={false}
                                                        minTickGap={20}
                                                    />
                                                    <YAxis
                                                        domain={['auto', 'auto']}
                                                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                                                        axisLine={false}
                                                        tickLine={false}
                                                        width={30}
                                                    />
                                                    <Tooltip
                                                        itemStyle={{ fontSize: 12 }}
                                                        contentStyle={{
                                                            borderRadius: '8px',
                                                            border: 'none',
                                                            background: 'rgba(255, 255, 255, 0.95)',
                                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                                        }}
                                                        labelFormatter={(label) => `T-${chartData.length - label}s`}
                                                    />
                                                    <Legend
                                                        iconSize={10}
                                                        wrapperStyle={{ fontSize: '12px', paddingTop: '5px' }}
                                                    />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="real"
                                                        stroke="#6366f1"
                                                        strokeWidth={2}
                                                        dot={false}
                                                        name="Real Data"
                                                        isAnimationActive={true}
                                                    />
                                                    {showSimulation && (
                                                        <Line
                                                            type="monotone"
                                                            dataKey="sim"
                                                            stroke="#94a3b8"
                                                            strokeDasharray="4 4"
                                                            strokeWidth={2}
                                                            dot={false}
                                                            name="Simulation"
                                                            isAnimationActive={true}
                                                        />
                                                    )}
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default TimeSeriesWidgets;
