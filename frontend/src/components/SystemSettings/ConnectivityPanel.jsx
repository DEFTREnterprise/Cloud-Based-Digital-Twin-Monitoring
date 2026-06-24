import React, { useState } from 'react';
import {
    Wifi, Radio, Globe, CheckCircle2, XCircle, RefreshCw,
    Eye, EyeOff, Copy, Plus, Trash2, Edit3, Zap, Server, Shield
} from 'lucide-react';
import { Panel, StatusBadge } from '../shared';
import { MOCK_BROKERS, MOCK_ENDPOINTS } from '../../data/mockSystemSettingsData';

// Status mapping from data → shared StatusBadge
const CONNECTION_STATUS_MAP = {
    connected: { status: 'success', label: 'Connected' },
    disconnected: { status: 'critical', label: 'Disconnected' },
    healthy: { status: 'success', label: 'Healthy' },
    degraded: { status: 'warning', label: 'Degraded' },
};

const ConnectivityPanel = ({ readOnly = false, currentRole = 'ADMIN' }) => {
    const [activeSubTab, setActiveSubTab] = useState('brokers');
    const [showPasswords, setShowPasswords] = useState({});

    // ── Role-based filtering ──
    const isAdmin = currentRole === 'ADMIN';
    const isOtokar = currentRole.startsWith('OTOKAR');
    const isEsogu = currentRole.startsWith('ESOGU');
    const isDeftr = currentRole.startsWith('DEFTR');

    // MQTT Brokers: only OTOKAR and ADMIN can see
    const filteredBrokers = isAdmin ? MOCK_BROKERS : isOtokar ? MOCK_BROKERS : [];

    // API Endpoints: filter by service relevance
    // STLC (API-002) → ESOGU
    // OPC-UA (API-003) → OTOKAR
    // MATISSE REST API (API-001) → everyone
    // InfluxDB (API-004) → everyone
    const ENDPOINT_ROLE_MAP = {
        'API-001': ['ADMIN', 'OTOKAR (Admin)', 'OTOKAR (Viewer)', 'ESOGU (Admin)', 'ESOGU (Viewer)', 'DEFTR (Admin)', 'DEFTR (Viewer)'],
        'API-002': ['ADMIN', 'ESOGU (Admin)', 'ESOGU (Viewer)'],  // STLC→ESOGU
        'API-003': ['ADMIN', 'OTOKAR (Admin)', 'OTOKAR (Viewer)'], // OPC-UA→OTOKAR
        'API-004': ['ADMIN', 'OTOKAR (Admin)', 'OTOKAR (Viewer)', 'ESOGU (Admin)', 'ESOGU (Viewer)', 'DEFTR (Admin)', 'DEFTR (Viewer)'],
    };
    const filteredEndpoints = MOCK_ENDPOINTS.filter(ep => {
        const allowedRoles = ENDPOINT_ROLE_MAP[ep.id];
        return !allowedRoles || allowedRoles.includes(currentRole);
    });

    // Determine which sub-tabs are visible
    const showBrokersTab = filteredBrokers.length > 0;
    const showEndpointsTab = filteredEndpoints.length > 0;

    const togglePassword = (id) => {
        setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const subTabs = [
        ...(showBrokersTab ? [{ id: 'brokers', label: 'MQTT Brokers', icon: Radio, count: filteredBrokers.length }] : []),
        ...(showEndpointsTab ? [{ id: 'endpoints', label: 'API Endpoints', icon: Globe, count: filteredEndpoints.length }] : []),
    ];

    // If current sub-tab is not visible, switch to first available
    const effectiveSubTab = subTabs.find(t => t.id === activeSubTab) ? activeSubTab : (subTabs[0]?.id || 'brokers');

    // Reusable disabled button style helper
    const actionBtnClass = (variant = 'default') => {
        if (readOnly) return 'p-1.5 text-neutral-300 cursor-not-allowed rounded-lg';
        const map = {
            default: 'p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-all',
            edit: 'p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all',
            delete: 'p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all',
        };
        return map[variant] || map.default;
    };

    return (
        <div className="space-y-6">
            {/* Sub-tabs */}
            <div className="flex items-center gap-2 border-b border-neutral-200 pb-0">
                {subTabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSubTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-[1px]
                                ${effectiveSubTab === tab.id
                                    ? 'border-blue-600 text-blue-700'
                                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                                }`}
                        >
                            <Icon size={15} />
                            {tab.label}
                            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold
                                ${effectiveSubTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-neutral-100 text-neutral-500'}`}>
                                {tab.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-neutral-500">
                        <Wifi size={16} className="text-blue-500" />
                        <span>
                            {effectiveSubTab === 'brokers'
                                ? `${filteredBrokers.filter(b => b.status === 'connected').length}/${filteredBrokers.length} connected`
                                : `${filteredEndpoints.filter(e => e.status === 'healthy').length}/${filteredEndpoints.length} healthy`
                            }
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-all">
                        <RefreshCw size={14} />
                        Test All
                    </button>
                    <button
                        disabled={readOnly}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all shadow-sm
                            ${readOnly
                                ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                            }`}
                        title={readOnly ? 'Read-only mode' : undefined}
                    >
                        <Plus size={16} />
                        {effectiveSubTab === 'brokers' ? 'Add Broker' : 'Add Endpoint'}
                    </button>
                </div>
            </div>

            {/* MQTT Brokers */}
            {effectiveSubTab === 'brokers' && (
                <div className="space-y-4">
                    {filteredBrokers.map(broker => {
                        const statusCfg = CONNECTION_STATUS_MAP[broker.status] || CONNECTION_STATUS_MAP.disconnected;
                        return (
                            <Panel key={broker.id}>
                                <div className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2.5 rounded-lg ${broker.status === 'connected' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                                            <Radio size={20} className={broker.status === 'connected' ? 'text-emerald-600' : 'text-red-500'} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-bold text-neutral-800">{broker.name}</h4>
                                                <span className="px-1.5 py-0.5 bg-neutral-100 text-[10px] font-mono text-neutral-500 rounded">{broker.id}</span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                                                <span className="font-mono">{broker.host}:{broker.port}</span>
                                                <span className="w-1 h-1 bg-neutral-300 rounded-full"></span>
                                                <span>{broker.protocol}</span>
                                                <span className="w-1 h-1 bg-neutral-300 rounded-full"></span>
                                                <span className="flex items-center gap-1">
                                                    {broker.tls ? <Shield size={11} className="text-emerald-500" /> : <XCircle size={11} className="text-red-400" />}
                                                    TLS {broker.tls ? 'Enabled' : 'Disabled'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right mr-4">
                                            <div className="text-xs text-neutral-400 uppercase tracking-wider">Topics</div>
                                            <div className="text-sm font-bold text-neutral-700">{broker.topics}</div>
                                        </div>
                                        <div className="text-right mr-4">
                                            <div className="text-xs text-neutral-400 uppercase tracking-wider">Tenant</div>
                                            <div className="text-xs font-medium text-neutral-600">{broker.tenant}</div>
                                        </div>
                                        <StatusBadge status={statusCfg.status} label={statusCfg.label} size="sm" />
                                        <div className="flex items-center gap-1 ml-2">
                                            <button disabled={readOnly} className={actionBtnClass('edit')} title={readOnly ? 'Read-only mode' : 'Edit'}>
                                                <Edit3 size={14} />
                                            </button>
                                            <button className={actionBtnClass('default')} title="Test Connection">
                                                <RefreshCw size={14} />
                                            </button>
                                            <button disabled={readOnly} className={actionBtnClass('delete')} title={readOnly ? 'Read-only mode' : 'Delete'}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Panel>
                        );
                    })}
                </div>
            )}

            {/* API Endpoints */}
            {effectiveSubTab === 'endpoints' && (
                <Panel>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-neutral-50/80 border-b border-neutral-100">
                                <th className="text-left px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Service</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">URL</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Protocol</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Auth</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Status</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Latency</th>
                                <th className="text-right px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {filteredEndpoints.map(endpoint => {
                                const statusCfg = CONNECTION_STATUS_MAP[endpoint.status] || CONNECTION_STATUS_MAP.disconnected;
                                return (
                                    <tr key={endpoint.id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-neutral-800">{endpoint.name}</div>
                                            <div className="text-[10px] font-mono text-neutral-400 mt-0.5">{endpoint.id}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs text-neutral-600 max-w-[280px] truncate block">
                                                    {showPasswords[endpoint.id] ? endpoint.url : endpoint.url.replace(/\/\/.*@/, '//***@')}
                                                </span>
                                                <button
                                                    onClick={() => togglePassword(endpoint.id)}
                                                    className="p-1 text-neutral-400 hover:text-neutral-600 transition-colors"
                                                >
                                                    {showPasswords[endpoint.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                                                </button>
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(endpoint.url)}
                                                    className="p-1 text-neutral-400 hover:text-blue-600 transition-colors"
                                                    title="Copy URL"
                                                >
                                                    <Copy size={12} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-0.5 bg-neutral-100 rounded text-xs font-medium text-neutral-600">{endpoint.method}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="flex items-center gap-1 text-xs text-neutral-600">
                                                <Shield size={12} className="text-neutral-400" />
                                                {endpoint.auth}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={statusCfg.status} label={statusCfg.label} size="sm" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-mono font-semibold ${parseInt(endpoint.latency) < 50 ? 'text-emerald-600' :
                                                parseInt(endpoint.latency) < 100 ? 'text-amber-600' : 'text-red-600'
                                                }`}>
                                                {endpoint.latency}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button className={actionBtnClass('default')} title="Test">
                                                    <RefreshCw size={14} />
                                                </button>
                                                <button disabled={readOnly} className={actionBtnClass('edit')} title={readOnly ? 'Read-only mode' : 'Edit'}>
                                                    <Edit3 size={14} />
                                                </button>
                                                <button disabled={readOnly} className={actionBtnClass('delete')} title={readOnly ? 'Read-only mode' : 'Delete'}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </Panel>
            )}

            {/* Connection Health Summary */}
            <div className="grid grid-cols-3 gap-4">
                <Panel padding="md">
                    <div className="flex items-center gap-2 mb-2">
                        <Server size={16} className="text-blue-500" />
                        <span className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Total Connections</span>
                    </div>
                    <div className="text-2xl font-bold text-neutral-800">{filteredBrokers.length + filteredEndpoints.length}</div>
                </Panel>
                <Panel padding="md">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <span className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Healthy</span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-600">
                        {filteredBrokers.filter(b => b.status === 'connected').length + filteredEndpoints.filter(e => e.status === 'healthy').length}
                    </div>
                </Panel>
                <Panel padding="md">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap size={16} className="text-amber-500" />
                        <span className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Avg Latency</span>
                    </div>
                    <div className="text-2xl font-bold text-neutral-800">49ms</div>
                </Panel>
            </div>
        </div>
    );
};

export default ConnectivityPanel;
