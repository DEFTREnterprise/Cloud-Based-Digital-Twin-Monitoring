import React, { useState } from 'react';
import {
    History, Search, Filter, ChevronDown, ChevronRight,
    User, Settings, Database, Shield, Trash2, Edit3,
    Plus, Download, Clock, ArrowUpDown
} from 'lucide-react';
import { Panel, EmptyState, Dropdown } from '../shared';
import { MOCK_AUDIT_LOGS } from '../../data/mockSystemSettingsData';

const ACTION_COLORS = {
    CREATE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    UPDATE: 'bg-blue-100 text-blue-700 border-blue-200',
    DELETE: 'bg-red-100 text-red-700 border-red-200',
    SYSTEM: 'bg-neutral-100 text-neutral-600 border-neutral-200',
};

const ACTION_ICONS = {
    CREATE: Plus,
    UPDATE: Edit3,
    DELETE: Trash2,
    SYSTEM: Settings,
};

const SEVERITY_COLORS = {
    low: 'bg-emerald-50 text-emerald-600',
    medium: 'bg-amber-50 text-amber-600',
    high: 'bg-red-50 text-red-600',
    info: 'bg-blue-50 text-blue-600',
};

const AuditLogsPanel = ({ readOnly = false }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('ALL');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [expandedLog, setExpandedLog] = useState(null);
    const [sortOrder, setSortOrder] = useState('desc');

    const filteredLogs = MOCK_AUDIT_LOGS
        .filter(log => {
            const matchesSearch = !searchTerm ||
                log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.details.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
            const matchesCategory = categoryFilter === 'ALL' || log.category === categoryFilter;
            return matchesSearch && matchesAction && matchesCategory;
        })
        .sort((a, b) => {
            const dateA = new Date(a.timestamp);
            const dateB = new Date(b.timestamp);
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

    return (
        <div className="space-y-6">
            {/* Header Info */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex items-start gap-3">
                <History size={18} className="text-neutral-500 mt-0.5 shrink-0" />
                <div>
                    <h4 className="text-sm font-semibold text-neutral-700">Change History & Audit Trail</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">
                        Complete record of all configuration changes, system events, and administrative actions.
                        Audit logs are retained for {MOCK_AUDIT_LOGS.length > 0 ? '365' : '—'} days per retention policy.
                    </p>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by user, resource, or details..."
                        className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-neutral-400" />
                    <Dropdown
                        value={actionFilter}
                        onChange={setActionFilter}
                        options={[
                            { value: 'ALL', label: 'All Actions' },
                            { value: 'CREATE', label: 'Created' },
                            { value: 'UPDATE', label: 'Updated' },
                            { value: 'DELETE', label: 'Deleted' },
                            { value: 'SYSTEM', label: 'System' },
                        ]}
                        minWidth="130px"
                    />
                    <Dropdown
                        value={categoryFilter}
                        onChange={setCategoryFilter}
                        options={[
                            { value: 'ALL', label: 'All Categories' },
                            { value: 'settings', label: 'Settings' },
                            { value: 'twin', label: 'Digital Twin' },
                            { value: 'asset', label: 'Asset' },
                            { value: 'adapter', label: 'Adapter' },
                            { value: 'policy', label: 'Policy' },
                            { value: 'connection', label: 'Connection' },
                            { value: 'maintenance', label: 'Maintenance' },
                        ]}
                        minWidth="150px"
                    />
                    <button
                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                        className="flex items-center gap-1 px-3 py-2 text-xs text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-all"
                        title={sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
                    >
                        <ArrowUpDown size={14} />
                        {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-2 text-xs text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-all">
                        <Download size={14} />
                        Export
                    </button>
                </div>
            </div>

            {/* Logs Timeline */}
            <Panel>
                <div className="divide-y divide-neutral-100">
                    {filteredLogs.map(log => {
                        const ActionIcon = ACTION_ICONS[log.action] || Settings;
                        const isExpanded = expandedLog === log.id;

                        return (
                            <div key={log.id}>
                                <button
                                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-neutral-50/50 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        {/* Action Icon */}
                                        <div className={`p-2 rounded-lg shrink-0 ${ACTION_COLORS[log.action]?.replace('text-', 'bg-').split(' ')[0] || 'bg-neutral-100'}`}>
                                            <ActionIcon size={16} className={ACTION_COLORS[log.action]?.split(' ')[1] || 'text-neutral-500'} />
                                        </div>

                                        {/* Main Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${ACTION_COLORS[log.action]}`}>
                                                    {log.action}
                                                </span>
                                                <span className="text-sm font-medium text-neutral-800 truncate">{log.resource}</span>
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${SEVERITY_COLORS[log.severity]}`}>
                                                    {log.severity}
                                                </span>
                                                {log.result && (
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${log.result === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                        {log.result}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-400">
                                                <User size={11} />
                                                <span className="font-medium">{log.user}</span>
                                                <span className="w-1 h-1 bg-neutral-300 rounded-full"></span>
                                                <span>{log.role}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Timestamp */}
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="text-right">
                                            <div className="text-xs text-neutral-500 font-medium">
                                                {new Date(log.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </div>
                                            <div className="text-[11px] text-neutral-400">
                                                {new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </div>
                                        </div>
                                        {isExpanded ? <ChevronDown size={16} className="text-neutral-400" /> : <ChevronRight size={16} className="text-neutral-400" />}
                                    </div>
                                </button>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="px-5 pb-4 pt-0">
                                        <div className="ml-12 bg-neutral-50 border border-neutral-100 rounded-lg p-4 space-y-3">
                                            <div>
                                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Description</span>
                                                <p className="text-sm text-neutral-700 mt-1">{log.details}</p>
                                            </div>
                                            <div className="grid grid-cols-4 gap-4 text-xs">
                                                <div>
                                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Log ID</span>
                                                    <p className="font-mono text-neutral-600 mt-0.5">{log.id}</p>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Source IP</span>
                                                    <p className="font-mono text-neutral-600 mt-0.5">{log.ip}</p>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Category</span>
                                                    <p className="text-neutral-600 mt-0.5 capitalize">{log.category}</p>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Entity</span>
                                                    <p className="text-neutral-600 mt-0.5">{log.entityType || '—'} <span className="font-mono text-neutral-400">({log.entityId || '—'})</span></p>
                                                </div>
                                            </div>
                                            {log.changeRequestId && (
                                                <div>
                                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Change Request</span>
                                                    <p className="font-mono text-blue-600 mt-0.5">{log.changeRequestId}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {filteredLogs.length === 0 && (
                    <EmptyState
                        icon={History}
                        title="No logs found"
                        description="No audit logs found matching your filters."
                        className="py-12"
                    />
                )}
            </Panel>

            {/* Pagination / Summary */}
            <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>Showing {filteredLogs.length} of {MOCK_AUDIT_LOGS.length} log entries</span>
                <span>Retention: 365 days • Next cleanup: Feb 19, 2026 at 02:00</span>
            </div>
        </div>
    );
};

export default AuditLogsPanel;
