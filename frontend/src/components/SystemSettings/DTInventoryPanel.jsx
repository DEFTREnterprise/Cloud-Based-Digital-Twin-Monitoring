import React, { useState } from 'react';
import {
    Box, Plus, Search, Edit3, Trash2, ChevronDown, ChevronUp,
    Cpu, Server, Activity
} from 'lucide-react';
import { Panel, StatusBadge, EmptyState } from '../shared';
import { MOCK_TWINS, MOCK_ASSETS } from '../../data/mockSystemSettingsData';

const ConditionBadge = ({ condition }) => {
    const config = {
        Good: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        Fair: 'bg-amber-50 text-amber-700 border-amber-200',
        Replace: 'bg-red-50 text-red-700 border-red-200',
    };
    return (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${config[condition] || config.Good}`}>
            {condition}
        </span>
    );
};

// Status mapping from data → shared StatusBadge
const STATUS_MAP = {
    active: 'success',
    inactive: 'inactive',
    warning: 'warning',
};

const DTInventoryPanel = ({ readOnly = false }) => {
    const [activeSubTab, setActiveSubTab] = useState('twins');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedRow, setExpandedRow] = useState(null);

    const subTabs = [
        { id: 'twins', label: 'Digital Twins', icon: Cpu, count: MOCK_TWINS.length },
        { id: 'assets', label: 'Asset Registry', icon: Server, count: MOCK_ASSETS.length },
    ];

    const filteredTwins = MOCK_TWINS.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredAssets = MOCK_ASSETS.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Sub-tabs */}
            <div className="flex items-center gap-2 border-b border-neutral-200 pb-0">
                {subTabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveSubTab(tab.id); setSearchTerm(''); }}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-[1px]
                                ${activeSubTab === tab.id
                                    ? 'border-blue-600 text-blue-700'
                                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                                }`}
                        >
                            <Icon size={15} />
                            {tab.label}
                            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold
                                ${activeSubTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-neutral-100 text-neutral-500'}`}>
                                {tab.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Search + Add Button */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={activeSubTab === 'twins' ? 'Search twins by name or ID...' : 'Search assets by name or ID...'}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    />
                </div>
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
                    {activeSubTab === 'twins' ? 'Register Twin' : 'Add Asset'}
                </button>
            </div>

            {/* Digital Twins Table */}
            {activeSubTab === 'twins' && (
                <Panel>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-neutral-50/80 border-b border-neutral-100">
                                <th className="text-left px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">ID</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Name</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Type</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Status</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Signals</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Tenant</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Last Synced</th>
                                <th className="text-right px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {filteredTwins.map(twin => (
                                <React.Fragment key={twin.id}>
                                    <tr
                                        className="hover:bg-blue-50/30 transition-colors cursor-pointer"
                                        onClick={() => setExpandedRow(expandedRow === twin.id ? null : twin.id)}
                                    >
                                        <td className="px-4 py-3 font-mono text-xs text-blue-600 font-semibold">{twin.id}</td>
                                        <td className="px-4 py-3 font-medium text-neutral-800">{twin.name}</td>
                                        <td className="px-4 py-3 text-neutral-600">{twin.type}</td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={STATUS_MAP[twin.status] || 'inactive'} label={twin.status} size="sm" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-1 text-neutral-600">
                                                <Activity size={12} className="text-blue-500" />
                                                {twin.signals}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-0.5 bg-neutral-100 rounded text-xs font-medium text-neutral-600">
                                                {twin.tenant}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-neutral-500 text-xs">
                                            {new Date(twin.lastSync).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    disabled={readOnly}
                                                    className={`p-1.5 rounded-lg transition-all ${readOnly ? 'text-neutral-300 cursor-not-allowed' : 'text-neutral-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                                    title={readOnly ? 'Read-only mode' : 'Edit'}
                                                >
                                                    <Edit3 size={14} />
                                                </button>
                                                <button
                                                    disabled={readOnly}
                                                    className={`p-1.5 rounded-lg transition-all ${readOnly ? 'text-neutral-300 cursor-not-allowed' : 'text-neutral-400 hover:text-red-600 hover:bg-red-50'}`}
                                                    title={readOnly ? 'Read-only mode' : 'Delete'}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                                <button className="p-1.5 text-neutral-400 hover:text-neutral-600 rounded-lg transition-all">
                                                    {expandedRow === twin.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedRow === twin.id && (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-4 bg-neutral-50/50">
                                                <div className="grid grid-cols-3 gap-4 text-xs">
                                                    <div className="bg-white p-3 rounded-lg border border-neutral-100">
                                                        <div className="text-neutral-400 font-medium mb-1 uppercase tracking-wider">Configuration</div>
                                                        <div className="text-neutral-700">Protocol: MQTT / OPC-UA</div>
                                                        <div className="text-neutral-700">Update Rate: 100ms</div>
                                                    </div>
                                                    <div className="bg-white p-3 rounded-lg border border-neutral-100">
                                                        <div className="text-neutral-400 font-medium mb-1 uppercase tracking-wider">Linked Assets</div>
                                                        <div className="text-neutral-700">{MOCK_ASSETS.filter(a => a.linkedTwin === twin.id).length} assets registered</div>
                                                    </div>
                                                    <div className="bg-white p-3 rounded-lg border border-neutral-100">
                                                        <div className="text-neutral-400 font-medium mb-1 uppercase tracking-wider">Health Score</div>
                                                        <div className="text-emerald-600 font-bold text-lg">96%</div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                    {filteredTwins.length === 0 && (
                        <EmptyState
                            icon={Cpu}
                            title="No twins found"
                            description="No digital twins found matching your search."
                            className="py-10"
                        />
                    )}
                </Panel>
            )}

            {/* Asset Registry Table */}
            {activeSubTab === 'assets' && (
                <Panel>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-neutral-50/80 border-b border-neutral-100">
                                <th className="text-left px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">ID</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Asset Name</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Linked Twin</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Category</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Condition</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Last Maintenance</th>
                                <th className="text-right px-4 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {filteredAssets.map(asset => (
                                <tr key={asset.id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="px-4 py-3 font-mono text-xs text-blue-600 font-semibold">{asset.id}</td>
                                    <td className="px-4 py-3 font-medium text-neutral-800">{asset.name}</td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">{asset.linkedTwin}</span>
                                    </td>
                                    <td className="px-4 py-3 text-neutral-600">{asset.category}</td>
                                    <td className="px-4 py-3"><ConditionBadge condition={asset.condition} /></td>
                                    <td className="px-4 py-3 text-neutral-500 text-xs">{asset.lastMaintenance}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                disabled={readOnly}
                                                className={`p-1.5 rounded-lg transition-all ${readOnly ? 'text-neutral-300 cursor-not-allowed' : 'text-neutral-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                                title={readOnly ? 'Read-only mode' : 'Edit'}
                                            >
                                                <Edit3 size={14} />
                                            </button>
                                            <button
                                                disabled={readOnly}
                                                className={`p-1.5 rounded-lg transition-all ${readOnly ? 'text-neutral-300 cursor-not-allowed' : 'text-neutral-400 hover:text-red-600 hover:bg-red-50'}`}
                                                title={readOnly ? 'Read-only mode' : 'Delete'}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredAssets.length === 0 && (
                        <EmptyState
                            icon={Server}
                            title="No assets found"
                            description="No assets found matching your search."
                            className="py-10"
                        />
                    )}
                </Panel>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
                <Panel padding="md">
                    <div className="text-xs text-neutral-400 font-medium uppercase tracking-wider mb-1">Total Twins</div>
                    <div className="text-2xl font-bold text-neutral-800">{MOCK_TWINS.length}</div>
                    <div className="text-xs text-emerald-600 mt-1">
                        {MOCK_TWINS.filter(t => t.status === 'active').length} active
                    </div>
                </Panel>
                <Panel padding="md">
                    <div className="text-xs text-neutral-400 font-medium uppercase tracking-wider mb-1">Total Assets</div>
                    <div className="text-2xl font-bold text-neutral-800">{MOCK_ASSETS.length}</div>
                    <div className="text-xs text-blue-600 mt-1">Across {MOCK_TWINS.length} twins</div>
                </Panel>
                <Panel padding="md">
                    <div className="text-xs text-neutral-400 font-medium uppercase tracking-wider mb-1">Total Signals</div>
                    <div className="text-2xl font-bold text-neutral-800">{MOCK_TWINS.reduce((a, t) => a + t.signals, 0)}</div>
                    <div className="text-xs text-neutral-500 mt-1">Monitored points</div>
                </Panel>
                <Panel padding="md">
                    <div className="text-xs text-neutral-400 font-medium uppercase tracking-wider mb-1">Maintenance Due</div>
                    <div className="text-2xl font-bold text-amber-600">{MOCK_ASSETS.filter(a => a.condition !== 'Good').length}</div>
                    <div className="text-xs text-amber-600 mt-1">Assets need attention</div>
                </Panel>
            </div>
        </div>
    );
};

export default DTInventoryPanel;
