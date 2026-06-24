import React, { useMemo, useState } from 'react';
import { Filter, AlertTriangle, AlertCircle, Info, CheckCircle, Clock, X, Server, Bot, Cog, Radio } from 'lucide-react';
import { Panel, EmptyState, Dropdown } from '../shared';

const SEVERITY_CONFIG = {
    CRITICAL: { color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle, dot: 'bg-red-500' },
    WARN: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertCircle, dot: 'bg-amber-500' },
    INFO: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Info, dot: 'bg-blue-500' },
};

const STATE_CONFIG = {
    open: { color: 'bg-red-50 text-red-600 border-red-200', label: 'Open' },
    ack: { color: 'bg-amber-50 text-amber-600 border-amber-200', label: 'Acknowledged' },
    closed: { color: 'bg-neutral-100 text-neutral-500 border-neutral-200', label: 'Closed' },
};

const AlarmWall = ({ alarms, filters, onFiltersChange, selectedAlarmId, onAlarmSelect }) => {
    const [showFilters, setShowFilters] = useState(true);

    const items = alarms?.items || [];
    const pagination = alarms?.pagination || { page: 1, total: 0, totalPages: 1 };

    // Asset options for filter
    const assetOptions = [
        { value: '', label: 'All Assets' },
        { value: 'ROKOS-1', label: 'ROKOS-1 (Left Line)' },
        { value: 'ROKOS-2', label: 'ROKOS-2 (Right Line)' },
    ];

    const severityOptions = [
        { value: '', label: 'All Severities' },
        { value: 'CRITICAL', label: 'Critical' },
        { value: 'WARN', label: 'Warning' },
        { value: 'INFO', label: 'Info' },
    ];

    const stateOptions = [
        { value: '', label: 'All States' },
        { value: 'open', label: 'Open' },
        { value: 'ack', label: 'Acknowledged' },
        { value: 'closed', label: 'Closed' },
    ];

    const alarmTypeOptions = [
        { value: '', label: 'All Types' },
        { value: 'anomaly_score', label: 'Anomaly Score' },
        { value: 'vibration', label: 'Vibration' },
        { value: 'overheat', label: 'Overheat' },
    ];

    const componentOptions = useMemo(() => {
        // Derive from current list (good enough for mock UI)
        const uniq = new Map();
        items.forEach(a => {
            if (a?.componentId && !uniq.has(a.componentId)) {
                uniq.set(a.componentId, a.componentName || a.componentId);
            }
        });
        return [{ value: '', label: 'All Components' }, ...Array.from(uniq.entries()).map(([value, label]) => ({ value, label }))];
    }, [items]);

    const handleFilterChange = (key, value) => {
        onFiltersChange({ ...filters, [key]: value || null, page: 1 });
    };

    const handleDateChange = (key, value) => {
        onFiltersChange({ ...filters, [key]: value || null, page: 1 });
    };

    const clearFilters = () => {
        onFiltersChange({
            assetId: null,
            severity: null,
            state: null,
            alarmType: null,
            componentId: null,
            startDate: null,
            endDate: null,
            page: 1,
            pageSize: 20,
        });
    };

    const activeFilterCount = useMemo(() => {
        return [filters.assetId, filters.severity, filters.state, filters.alarmType, filters.componentId, filters.startDate, filters.endDate]
            .filter(Boolean).length;
    }, [filters]);

    const formatTimestamp = (ts) => {
        const d = new Date(ts);
        const now = new Date();
        const diffMs = now - d;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHr = Math.floor(diffMin / 60);

        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHr < 24) return `${diffHr}h ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <Panel
            title="Alarm Wall"
            icon={AlertTriangle}
            badge={(
                <span className="text-xs text-neutral-500 bg-white border border-neutral-200 px-2 py-0.5 rounded-full">
                    {pagination.total}
                </span>
            )}
            headerAction={(
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        showFilters || activeFilterCount > 0
                            ? 'bg-primary-50 text-primary-700 border border-primary-200'
                            : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
                    }`}
                >
                    <Filter size={12} />
                    Filters
                    {activeFilterCount > 0 && (
                        <span className="bg-primary-500 text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none">
                            {activeFilterCount}
                        </span>
                    )}
                </button>
            )}
            fullHeight
        >

            {/* Filter Row */}
            {showFilters && (
                <div className="mb-4 flex flex-wrap gap-3 items-end">
                    <div className="min-w-[160px]">
                        <Dropdown
                            label="Asset"
                            icon={Server}
                            value={filters.assetId || ''}
                            options={assetOptions}
                            onChange={(val) => handleFilterChange('assetId', val || '')}
                            placeholder="All Assets"
                            variant="default"
                        />
                    </div>
                    <div className="min-w-[160px]">
                        <Dropdown
                            label="Severity"
                            icon={AlertCircle}
                            value={filters.severity || ''}
                            options={severityOptions}
                            onChange={(val) => handleFilterChange('severity', val || '')}
                            placeholder="All Severities"
                            variant="default"
                        />
                    </div>
                    <div className="min-w-[160px]">
                        <Dropdown
                            label="State"
                            icon={Info}
                            value={filters.state || ''}
                            options={stateOptions}
                            onChange={(val) => handleFilterChange('state', val || '')}
                            placeholder="All States"
                            variant="default"
                        />
                    </div>
                    <div className="min-w-[180px]">
                        <Dropdown
                            label="Component"
                            icon={Cog}
                            value={filters.componentId || ''}
                            options={componentOptions}
                            onChange={(val) => handleFilterChange('componentId', val || '')}
                            placeholder="All Components"
                            variant="default"
                        />
                    </div>
                    <div className="min-w-[160px]">
                        <Dropdown
                            label="Alarm Type"
                            icon={Radio}
                            value={filters.alarmType || ''}
                            options={alarmTypeOptions}
                            onChange={(val) => handleFilterChange('alarmType', val || '')}
                            placeholder="All Types"
                            variant="default"
                        />
                    </div>

                    {/* Date range filter */}
                    <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                            <span className="text-[11px] text-neutral-500 mb-1">Start</span>
                            <input
                                type="datetime-local"
                                value={filters.startDate || ''}
                                onChange={(e) => handleDateChange('startDate', e.target.value)}
                                className="text-xs border border-neutral-200 rounded-lg px-3 py-2 bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
                                aria-label="Start date"
                            />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[11px] text-neutral-500 mb-1">End</span>
                            <input
                                type="datetime-local"
                                value={filters.endDate || ''}
                                onChange={(e) => handleDateChange('endDate', e.target.value)}
                                className="text-xs border border-neutral-200 rounded-lg px-3 py-2 bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
                                aria-label="End date"
                            />
                        </div>
                    </div>

                    {activeFilterCount > 0 && (
                        <button
                            onClick={clearFilters}
                            className="text-xs text-neutral-400 hover:text-neutral-600 flex items-center gap-1 transition-colors"
                        >
                            <X size={12} />
                            Clear
                        </button>
                    )}
                </div>
            )}

            {/* Alarm List */}
            <div className="flex-1 overflow-y-auto min-h-0">
                {items.length === 0 ? (
                    <EmptyState
                        icon={CheckCircle}
                        title="No alarms found"
                        description="Adjust filters or check back later."
                        className="min-h-[260px]"
                    />
                ) : (
                    <div className="divide-y divide-neutral-100">
                        {items.map(alarm => {
                            const sevConfig = SEVERITY_CONFIG[alarm.severity] || SEVERITY_CONFIG.INFO;
                            const stateConf = STATE_CONFIG[alarm.state] || STATE_CONFIG.open;
                            const SevIcon = sevConfig.icon;
                            const isSelected = selectedAlarmId === alarm.id;

                            return (
                                <button
                                    key={alarm.id}
                                    onClick={() => onAlarmSelect(isSelected ? null : alarm.id)}
                                    className={`w-full text-left px-4 py-3 hover:bg-neutral-50 transition-colors ${
                                        isSelected ? 'bg-blue-50/70 border-l-[3px] border-l-blue-500' : 'border-l-[3px] border-l-transparent'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Severity dot */}
                                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${sevConfig.dot}`} />

                                        <div className="flex-1 min-w-0">
                                            {/* Top row: component + badges */}
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-semibold text-neutral-800 truncate">
                                                    {alarm.componentName}
                                                </span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${sevConfig.color}`}>
                                                    {alarm.severity}
                                                </span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${stateConf.color}`}>
                                                    {stateConf.label}
                                                </span>
                                            </div>

                                            {/* Message */}
                                            <p className="text-xs text-neutral-600 line-clamp-1">
                                                {alarm.ruleDesc}
                                            </p>

                                            {/* Bottom row: asset + time */}
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <span className="text-[10px] text-neutral-400 font-mono">
                                                    {alarm.assetId}
                                                </span>
                                                <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                                                    <Clock size={10} />
                                                    {formatTimestamp(alarm.timestamp)}
                                                </span>
                                                <span className="text-[10px] text-neutral-300 font-mono">
                                                    {alarm.id}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Pagination */}
            <Panel.Footer className="-mx-4">
                <div className="text-[10px] text-neutral-500">
                    Page <span className="font-bold text-neutral-700">{pagination.page}</span> of{' '}
                    <span className="font-bold text-neutral-700">{pagination.totalPages || 1}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onFiltersChange({ ...filters, page: Math.max(1, (filters.page || 1) - 1) })}
                        disabled={(pagination.page || 1) <= 1}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-neutral-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50"
                    >
                        Prev
                    </button>
                    <button
                        onClick={() => onFiltersChange({ ...filters, page: Math.min(pagination.totalPages || 1, (filters.page || 1) + 1) })}
                        disabled={(pagination.page || 1) >= (pagination.totalPages || 1)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-neutral-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50"
                    >
                        Next
                    </button>
                    <select
                        value={filters.pageSize || 20}
                        onChange={(e) => onFiltersChange({ ...filters, pageSize: Number(e.target.value), page: 1 })}
                        className="text-xs border border-neutral-200 rounded-lg px-2 py-1.5 bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
                        aria-label="Page size"
                    >
                        {[10, 20, 50].map(sz => (
                            <option key={sz} value={sz}>{sz}/page</option>
                        ))}
                    </select>
                </div>
            </Panel.Footer>
        </Panel>
    );
};

export default AlarmWall;
