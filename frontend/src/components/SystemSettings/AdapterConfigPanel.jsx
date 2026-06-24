import React, { useState } from 'react';
import {
    Settings2, Sliders, ChevronDown, ChevronRight, Save, RotateCcw,
    CheckCircle2, Code2, ArrowRightLeft, FileCode2, Cpu, Wrench
} from 'lucide-react';
import { Panel, StatusBadge } from '../shared';
import { MOCK_ADAPTERS } from '../../data/mockSystemSettingsData';

// Icon mapping — icons are React components, so they stay in the UI layer
const ADAPTER_ICONS = { pdm: Cpu, tpt: Sliders, esogu: Code2 };

const COLOR_MAP = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', iconBg: 'bg-blue-100', badge: 'bg-blue-100 text-blue-700' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', iconBg: 'bg-amber-100', badge: 'bg-amber-100 text-amber-700' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', iconBg: 'bg-emerald-100', badge: 'bg-emerald-100 text-emerald-700' },
};

const AdapterConfigPanel = ({ readOnly = false, currentRole = 'ADMIN' }) => {
    const [expandedAdapter, setExpandedAdapter] = useState(null);
    const [editingMapping, setEditingMapping] = useState(null);

    // Role-based adapter visibility
    // PdM → OTOKAR
    // TPT → OTOKAR, DEFTR
    // ESOGU → ESOGU
    // ADMIN → all
    const ADAPTER_ROLE_MAP = {
        pdm: ['ADMIN', 'OTOKAR (Admin)', 'OTOKAR (Viewer)'],
        tpt: ['ADMIN', 'OTOKAR (Admin)', 'OTOKAR (Viewer)', 'DEFTR (Admin)', 'DEFTR (Viewer)'],
        esogu: ['ADMIN', 'ESOGU (Admin)', 'ESOGU (Viewer)'],
    };

    const filteredAdapterEntries = Object.entries(MOCK_ADAPTERS).filter(([key]) => {
        const allowedRoles = ADAPTER_ROLE_MAP[key];
        return !allowedRoles || allowedRoles.includes(currentRole);
    });

    // Auto-expand first adapter if none expanded
    const effectiveExpanded = expandedAdapter && filteredAdapterEntries.some(([key]) => key === expandedAdapter)
        ? expandedAdapter
        : (filteredAdapterEntries.length > 0 ? filteredAdapterEntries[0][0] : null);

    return (
        <div className="space-y-6">
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <Settings2 size={18} className="text-blue-600 mt-0.5 shrink-0" />
                <div>
                    <h4 className="text-sm font-semibold text-blue-800">Adapter Mapping Configuration</h4>
                    <p className="text-xs text-blue-600 mt-0.5">
                        Configure how raw data signals from PLCs and sensors are mapped, transformed, and routed
                        to each module's internal data model. Changes to mappings require a service restart to take effect.
                    </p>
                </div>
            </div>

            {/* Adapter Accordion */}
            <div className="space-y-3">
                {filteredAdapterEntries.map(([key, adapter]) => {
                    const isExpanded = effectiveExpanded === key;
                    const Icon = ADAPTER_ICONS[key];
                    const colors = COLOR_MAP[adapter.color];

                    return (
                        <Panel key={key}>
                            {/* Adapter Header */}
                            <button
                                onClick={() => setExpandedAdapter(isExpanded ? null : key)}
                                className="w-full flex items-center justify-between p-4 hover:bg-neutral-50/50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-2.5 rounded-lg ${colors.iconBg}`}>
                                        <Icon size={20} className={colors.text} />
                                    </div>
                                    <div className="text-left">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-bold text-neutral-800">{adapter.name}</h4>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colors.badge}`}>
                                                {adapter.mappings.length} mappings
                                            </span>
                                            <StatusBadge status="success" label="Active" size="sm" />
                                        </div>
                                        <p className="text-xs text-neutral-500 mt-0.5">{adapter.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-neutral-400">
                                        Modified: {new Date(adapter.lastModified).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                    {isExpanded ? <ChevronDown size={18} className="text-neutral-400" /> : <ChevronRight size={18} className="text-neutral-400" />}
                                </div>
                            </button>

                            {/* Mapping Table */}
                            {isExpanded && (
                                <div className="border-t border-neutral-100">
                                    <div className="px-4 py-3 bg-neutral-50/60 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs text-neutral-500">
                                            <ArrowRightLeft size={14} />
                                            <span className="font-medium">Signal Mappings</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                disabled={readOnly}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg transition-all
                                                    ${readOnly
                                                        ? 'text-neutral-400 bg-neutral-100 border-neutral-200 cursor-not-allowed'
                                                        : 'text-neutral-600 bg-white border-neutral-200 hover:bg-neutral-50'
                                                    }`}
                                            >
                                                <RotateCcw size={12} />
                                                Reset Defaults
                                            </button>
                                            <button
                                                disabled={readOnly}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all shadow-sm
                                                    ${readOnly
                                                        ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                                    }`}
                                            >
                                                <Save size={12} />
                                                Save Changes
                                            </button>
                                        </div>
                                    </div>

                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-neutral-50/40 border-b border-neutral-100">
                                                <th className="text-left px-4 py-2.5 text-[11px] font-bold text-neutral-500 uppercase tracking-wider w-8">On</th>
                                                <th className="text-left px-4 py-2.5 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Source Signal</th>
                                                <th className="text-center px-2 py-2.5 text-[11px] font-bold text-neutral-500 uppercase tracking-wider w-8"></th>
                                                <th className="text-left px-4 py-2.5 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Target Field</th>
                                                <th className="text-left px-4 py-2.5 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Transform</th>
                                                <th className="text-right px-4 py-2.5 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-50">
                                            {adapter.mappings.map((mapping, idx) => (
                                                <tr key={idx} className={`hover:bg-blue-50/20 transition-colors ${!mapping.enabled ? 'opacity-50' : ''}`}>
                                                    <td className="px-4 py-3">
                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                defaultChecked={mapping.enabled}
                                                                disabled={readOnly}
                                                                className="sr-only peer"
                                                            />
                                                            <div className={`w-8 h-4 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600 ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                                                        </label>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="font-mono text-xs text-neutral-700 bg-neutral-100 px-2 py-1 rounded">{mapping.source}</span>
                                                    </td>
                                                    <td className="px-2 py-3 text-center">
                                                        <ArrowRightLeft size={14} className="text-neutral-300 mx-auto" />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`font-mono text-xs px-2 py-1 rounded ${colors.bg} ${colors.text}`}>{mapping.target}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="flex items-center gap-1 text-xs text-neutral-600">
                                                            <Wrench size={11} className="text-neutral-400" />
                                                            <code className="bg-neutral-50 px-1.5 py-0.5 rounded text-[11px]">{mapping.transform}</code>
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            disabled={readOnly}
                                                            className={`p-1.5 rounded-lg transition-all ${readOnly ? 'text-neutral-300 cursor-not-allowed' : 'text-neutral-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                                            title={readOnly ? 'Read-only mode' : 'Edit Mapping'}
                                                        >
                                                            <FileCode2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {/* Add Mapping Button */}
                                    <div className="px-4 py-3 bg-neutral-50/30 border-t border-neutral-100">
                                        <button
                                            disabled={readOnly}
                                            className={`flex items-center gap-2 text-xs font-medium transition-colors
                                                ${readOnly ? 'text-neutral-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-700'}`}
                                        >
                                            <span className={`p-0.5 rounded ${readOnly ? 'bg-neutral-200' : 'bg-blue-100'}`}>
                                                <span className={`block w-3 h-3 leading-3 text-center font-bold ${readOnly ? 'text-neutral-400' : 'text-blue-600'}`}>+</span>
                                            </span>
                                            Add New Mapping
                                        </button>
                                    </div>
                                </div>
                            )}
                        </Panel>
                    );
                })}
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
                {filteredAdapterEntries.map(([key, adapter]) => {
                    const enabledCount = adapter.mappings.filter(m => m.enabled).length;
                    return (
                        <Panel key={key} padding="md">
                            <div className="text-xs text-neutral-400 font-medium uppercase tracking-wider mb-1">{adapter.name}</div>
                            <div className="text-2xl font-bold text-neutral-800">{enabledCount}/{adapter.mappings.length}</div>
                            <div className="text-xs text-neutral-500 mt-1">Active mappings</div>
                        </Panel>
                    );
                })}
            </div>
        </div>
    );
};

export default AdapterConfigPanel;
