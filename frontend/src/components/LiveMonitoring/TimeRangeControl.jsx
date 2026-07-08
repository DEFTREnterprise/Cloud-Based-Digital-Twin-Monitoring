import React, { useMemo } from 'react';
import { Clock, History, Radio } from 'lucide-react';
import { Panel } from '../shared';
import {
    LIVE_WINDOWS,
    HISTORY_PRESETS,
    DEFAULT_HISTORY_PRESET
} from '../../config/telemetryConfig';

/**
 * TIME RANGE CONTROL BİLEŞENİ — Kontrollü (controlled) zaman aralığı seçici.
 *
 * Tek doğruluk kaynağı `timeRange` prop'udur ({ mode, start, end, window, preset }).
 * Bileşen KENDİ kopya state'ini tutmaz; her değişiklik onChange ile yukarı
 * bildirilir. (Önceki sürümdeki yerel isHistoryMode state'i, dışarıdan gelen
 * mod değişikliklerinde — örn. PdM drill-through — senkron kaybına yol açıyordu.)
 *
 * History modu:
 *   - Preset butonları (Last 15m / 1h / 6h / 24h) → [now - ms, now] aralığı üretir
 *   - Custom datetime-local girişleri → serbest aralık
 *   - Moda ilk geçişte start/end boşsa DEFAULT_HISTORY_PRESET otomatik uygulanır,
 *     böylece kullanıcı hiçbir şey seçmese bile veri gelir.
 */

// ISO/Date → <input type="datetime-local"> değeri (yerel saat, YYYY-MM-DDTHH:mm)
const toLocalInputValue = (value) => {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Preset → { start, end } ISO aralığı
const presetToRange = (preset) => {
    const end = new Date();
    const start = new Date(end.getTime() - preset.ms);
    return { start: start.toISOString(), end: end.toISOString() };
};

const TimeRangeControl = ({ timeRange, onChange, variant = 'panel' }) => {
    const isHistoryMode = timeRange.mode === 'history';

    const handleModeToggle = (mode) => {
        if (mode === timeRange.mode) return;
        if (mode === 'history' && (!timeRange.start || !timeRange.end)) {
            // İlk geçişte varsayılan aralığı uygula → history hemen veri çeker
            const range = presetToRange(DEFAULT_HISTORY_PRESET);
            onChange({ ...timeRange, mode, preset: DEFAULT_HISTORY_PRESET.value, ...range });
            return;
        }
        onChange({ ...timeRange, mode });
    };

    const handleWindowChange = (window) => {
        onChange({ ...timeRange, window });
    };

    const handlePresetClick = (preset) => {
        const range = presetToRange(preset);
        onChange({ ...timeRange, mode: 'history', preset: preset.value, ...range });
    };

    const handleCustomChange = (field, localValue) => {
        if (!localValue) return;
        const iso = new Date(localValue).toISOString();
        onChange({ ...timeRange, mode: 'history', preset: null, [field]: iso });
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
                {LIVE_WINDOWS.map((w) => (
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

    const startInput = useMemo(() => toLocalInputValue(timeRange.start), [timeRange.start]);
    const endInput = useMemo(() => toLocalInputValue(timeRange.end), [timeRange.end]);

    const HistoryControls = (
        <div className="flex items-center gap-3 flex-wrap">
            {/* Hızlı seçim presetleri */}
            <div className="flex items-center gap-1">
                {HISTORY_PRESETS.map((p) => (
                    <button
                        key={p.value}
                        onClick={() => handlePresetClick(p)}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${timeRange.preset === p.value
                            ? 'bg-primary-100 text-primary-700 border border-primary-200'
                            : 'bg-white text-neutral-500 border border-neutral-200 hover:bg-neutral-50'
                            }`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            <div className="h-5 w-px bg-neutral-200"></div>

            {/* Custom aralık girişleri */}
            <div className="flex items-center gap-1.5">
                <input
                    type="datetime-local"
                    value={startInput}
                    max={endInput || undefined}
                    onChange={(e) => handleCustomChange('start', e.target.value)}
                    className="px-2 py-1 rounded-md border border-neutral-200 bg-white text-[10px] text-neutral-600 focus:outline-none focus:border-primary-300"
                />
                <span className="text-[10px] text-neutral-400 font-bold">→</span>
                <input
                    type="datetime-local"
                    value={endInput}
                    min={startInput || undefined}
                    onChange={(e) => handleCustomChange('end', e.target.value)}
                    className="px-2 py-1 rounded-md border border-neutral-200 bg-white text-[10px] text-neutral-600 focus:outline-none focus:border-primary-300"
                />
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
                    {LiveControls}
                    <div className="flex items-center gap-2 p-2 bg-success-50 rounded-lg border border-success-100">
                        <span className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></span>
                        <span className="text-xs font-medium text-success-700">Receiving live data</span>
                    </div>
                </div>
            )}

            {/* History Mode */}
            {isHistoryMode && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-500">Historical Range</span>
                    </div>
                    {HistoryControls}
                </div>
            )}
        </Panel>
    );
};

export default TimeRangeControl;
