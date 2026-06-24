import React, { useMemo, useState } from 'react';
import { Clock, Calendar, Play, SkipBack, SkipForward, History, Radio } from 'lucide-react';
import { Panel } from '../shared';

/**
 * TIME RANGE CONTROL BİLEŞENİ
 * Zaman aralığı kontrolü için panel.
 * Panel ortak bileşenini kullanır.
 */
const TimeRangeControl = ({ timeRange, onChange, variant = 'panel' }) => {
    const [isHistoryMode, setIsHistoryMode] = useState(timeRange.mode === 'history');

    const liveWindows = [
        { label: '5m', value: '5m' },
        { label: '15m', value: '15m' },
        { label: '30m', value: '30m' },
        { label: '1h', value: '1h' }
    ];

    const handleModeToggle = (mode) => {
        setIsHistoryMode(mode === 'history');
        onChange({ ...timeRange, mode });
    };

    const handleWindowChange = (window) => {
        onChange({ ...timeRange, window });
    };

    // Live/History Toggle Button
    const ModeToggle = (
        <div className="flex items-center p-0.5 bg-neutral-100 rounded-lg border border-neutral-200">
            <button
                onClick={() => handleModeToggle('live')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${!isHistoryMode
                    ? 'bg-white text-neutral-800 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-700'
                    }`}
            >
                <Radio size={12} className={!isHistoryMode ? 'text-success-500' : ''} />
                Live
            </button>
            <button
                onClick={() => handleModeToggle('history')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${isHistoryMode
                    ? 'bg-white text-neutral-800 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-700'
                    }`}
            >
                <History size={12} className={isHistoryMode ? 'text-primary-500' : ''} />
                History
            </button>
        </div>
    );

    const LiveControls = (
        <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 font-medium">Window:</span>
            <div className="flex items-center gap-1">
                {liveWindows.map((w) => (
                    <button
                        key={w.value}
                        onClick={() => handleWindowChange(w.value)}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${timeRange.window === w.value
                            ? 'bg-primary-100 text-primary-700 border border-primary-200'
                            : 'bg-white text-neutral-500 border border-neutral-200 hover:bg-neutral-50'
                            }`}
                    >
                        {w.label}
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-success-50 rounded border border-success-100 ml-2">
                <span className="w-1.5 h-1.5 bg-success-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-bold text-success-700 uppercase tracking-wide">Live</span>
            </div>
        </div>
    );

    const historyRangeLabel = useMemo(() => {
        const start = timeRange?.start ? new Date(timeRange.start) : null;
        const end = timeRange?.end ? new Date(timeRange.end) : null;
        if (start && end) return `${start.toLocaleString('en-US')} - ${end.toLocaleString('en-US')}`;
        return 'Select a time window';
    }, [timeRange?.start, timeRange?.end]);

    const HistoryControls = (
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-neutral-200">
                <Calendar size={12} className="text-neutral-400" />
                <span className="text-[10px] text-neutral-600">{historyRangeLabel}</span>
            </div>

            {/* Playback Mini Controls */}
            <div className="flex items-center gap-1">
                <button className="p-1 hover:bg-neutral-100 rounded text-neutral-500"><SkipBack size={12} /></button>
                <button className="p-1 bg-primary-600 hover:bg-primary-700 rounded text-white flex items-center justify-center w-6 h-6"><Play size={10} fill="currentColor" /></button>
                <button className="p-1 hover:bg-neutral-100 rounded text-neutral-500"><SkipForward size={12} /></button>
            </div>
        </div>
    );

    if (variant === 'inline') {
        return (
            <div className="flex items-center gap-4">
                {ModeToggle}
                <div className="h-6 w-px bg-neutral-200"></div>
                {!isHistoryMode ? LiveControls : HistoryControls}
            </div>
        );
    }

    return (
        <Panel
            title="Time Range"
            icon={Clock}
            headerAction={ModeToggle}
            fullHeight
        >
            {/* Live Mode */}
            {!isHistoryMode && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-500">Window:</span>
                        <div className="flex items-center gap-1">
                            {liveWindows.map((w) => (
                                <button
                                    key={w.value}
                                    onClick={() => handleWindowChange(w.value)}
                                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${timeRange.window === w.value
                                        ? 'bg-primary-100 text-primary-700 border border-primary-200'
                                        : 'bg-neutral-50 text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
                                        }`}
                                >
                                    {w.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* Status Indicator */}
                    <div className="flex items-center gap-2 p-2 bg-success-50 rounded-lg border border-success-100">
                        <span className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></span>
                        <span className="text-xs font-medium text-success-700">Receiving live data</span>
                    </div>
                </div>
            )}

            {/* History Mode */}
            {isHistoryMode && (
                <div className="space-y-3">
                    {/* Date Range & Controls as before but simplified for this view if needed */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-500">History Playback</span>
                    </div>
                    {HistoryControls}
                </div>
            )}
        </Panel>
    );
};

export default TimeRangeControl;
