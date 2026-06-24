import React, { useState } from 'react';
import {
    Settings, Box, Wifi, Sliders, Shield, History,
    Lock, AlertTriangle, ChevronRight
} from 'lucide-react';

// Category Panels
import DTInventoryPanel from './DTInventoryPanel';
import ConnectivityPanel from './ConnectivityPanel';
import AdapterConfigPanel from './AdapterConfigPanel';
import PoliciesRetentionPanel from './PoliciesRetentionPanel';
import AuditLogsPanel from './AuditLogsPanel';

const CATEGORIES = [
    {
        id: 'dt-inventory',
        label: 'Digital Twins & Assets',
        description: 'Digital Twin and Asset records',
        icon: Box,
        color: 'blue',
        roles: ['ADMIN', 'OTOKAR (Admin)', 'OTOKAR (Viewer)', 'ESOGU (Admin)', 'ESOGU (Viewer)', 'DEFTR (Admin)', 'DEFTR (Viewer)'],
    },
    {
        id: 'connectivity',
        label: 'Connectivity',
        description: 'MQTT Broker and API connections',
        icon: Wifi,
        color: 'emerald',
        roles: ['ADMIN', 'OTOKAR (Admin)', 'OTOKAR (Viewer)', 'ESOGU (Admin)', 'ESOGU (Viewer)', 'DEFTR (Admin)', 'DEFTR (Viewer)'],
    },
    {
        id: 'adapter-config',
        label: 'Adapter Config',
        description: 'PdM, TPT & ESOGU mappings',
        icon: Sliders,
        color: 'amber',
        roles: ['ADMIN', 'OTOKAR (Admin)', 'OTOKAR (Viewer)', 'ESOGU (Admin)', 'ESOGU (Viewer)', 'DEFTR (Admin)', 'DEFTR (Viewer)'],
    },
    {
        id: 'policies-retention',
        label: 'Policies & Retention',
        description: 'Limits and data retention',
        icon: Shield,
        color: 'violet',
        roles: ['ADMIN', 'OTOKAR (Admin)', 'OTOKAR (Viewer)', 'ESOGU (Admin)', 'ESOGU (Viewer)', 'DEFTR (Admin)', 'DEFTR (Viewer)'],
    },
    {
        id: 'audit-logs',
        label: 'Audit Logs',
        description: 'System change history',
        icon: History,
        color: 'neutral',
        roles: ['ADMIN', 'OTOKAR (Admin)', 'OTOKAR (Viewer)', 'ESOGU (Admin)', 'ESOGU (Viewer)', 'DEFTR (Admin)', 'DEFTR (Viewer)'],
    },
];

const COLOR_CLASSES = {
    blue: {
        activeBg: 'bg-blue-50',
        activeBorder: 'border-blue-500',
        activeIcon: 'text-blue-600',
        activeText: 'text-blue-800',
        hoverBg: 'hover:bg-blue-50/50',
        iconBg: 'bg-blue-100',
    },
    emerald: {
        activeBg: 'bg-emerald-50',
        activeBorder: 'border-emerald-500',
        activeIcon: 'text-emerald-600',
        activeText: 'text-emerald-800',
        hoverBg: 'hover:bg-emerald-50/50',
        iconBg: 'bg-emerald-100',
    },
    amber: {
        activeBg: 'bg-amber-50',
        activeBorder: 'border-amber-500',
        activeIcon: 'text-amber-600',
        activeText: 'text-amber-800',
        hoverBg: 'hover:bg-amber-50/50',
        iconBg: 'bg-amber-100',
    },
    violet: {
        activeBg: 'bg-violet-50',
        activeBorder: 'border-violet-500',
        activeIcon: 'text-violet-600',
        activeText: 'text-violet-800',
        hoverBg: 'hover:bg-violet-50/50',
        iconBg: 'bg-violet-100',
    },
    neutral: {
        activeBg: 'bg-neutral-100',
        activeBorder: 'border-neutral-500',
        activeIcon: 'text-neutral-600',
        activeText: 'text-neutral-800',
        hoverBg: 'hover:bg-neutral-50',
        iconBg: 'bg-neutral-200',
    },
};

const SystemSettings = ({ currentRole = 'ADMIN' }) => {
    const role = currentRole;

    // Filter categories by role
    const visibleCategories = CATEGORIES.filter(cat => cat.roles.includes(role));

    const [activeCategory, setActiveCategory] = useState(() => {
        return visibleCategories.length > 0 ? visibleCategories[0].id : 'dt-inventory';
    });

    const permissions = {
        canWrite: ['ADMIN', 'OTOKAR (Admin)', 'DEFTR (Admin)', 'ESOGU (Admin)'],
        canRead: ['ADMIN', 'OTOKAR (Admin)', 'OTOKAR (Viewer)', 'DEFTR (Admin)', 'DEFTR (Viewer)', 'ESOGU (Admin)', 'ESOGU (Viewer)'],
    };

    const hasWritePermission = permissions.canWrite.includes(role);

    const readOnly = !hasWritePermission;

    const renderPanel = () => {
        switch (activeCategory) {
            case 'dt-inventory':
                return <DTInventoryPanel readOnly={readOnly} />;
            case 'connectivity':
                return <ConnectivityPanel readOnly={readOnly} currentRole={role} />;
            case 'adapter-config':
                return <AdapterConfigPanel readOnly={readOnly} currentRole={role} />;
            case 'policies-retention':
                return <PoliciesRetentionPanel readOnly={readOnly} />;
            case 'audit-logs':
                return <AuditLogsPanel readOnly={readOnly} />;
            default:
                return <DTInventoryPanel readOnly={readOnly} />;
        }
    };

    const activeConfig = CATEGORIES.find(c => c.id === activeCategory);
    const activeColors = COLOR_CLASSES[activeConfig?.color || 'blue'];

    return (
        <div className="h-full flex flex-col min-h-0 bg-slate-50 overflow-hidden">
            {/* Access Control Warning */}
            {!hasWritePermission && (
                <div className="mx-6 mt-4 bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl flex items-center gap-3 shrink-0">
                    <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                    <span className="text-xs font-medium">
                        <strong>Read-Only Mode:</strong> You are viewing settings as <strong>{role}</strong>. You do not have permission to save changes.
                    </span>
                </div>
            )}

            {/* Main Content: Sidebar + Panel */}
            <div className="flex flex-1 min-h-0 p-6 gap-6">
                {/* Left Sidebar Navigation */}
                <div className="w-64 shrink-0 flex flex-col">
                    {/* Sidebar Header */}
                    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600 rounded-lg shadow-sm">
                                <Settings size={18} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-neutral-800">System Settings</h2>
                                <p className="text-[10px] text-neutral-400 mt-0.5">
                                    Global configuration & management
                                </p>
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center gap-2">
                            <Lock size={12} className="text-neutral-400" />
                            <span className="text-[10px] text-neutral-400">
                                Role: <strong className={hasWritePermission ? 'text-blue-600' : 'text-amber-600'}>{role}</strong>
                            </span>
                        </div>
                    </div>

                    {/* Category List */}
                    <nav className="bg-white rounded-xl border border-neutral-200 shadow-sm flex-1 overflow-y-auto">
                        <div className="p-2 space-y-1">
                            {visibleCategories.map(category => {
                                const isActive = activeCategory === category.id;
                                const colors = COLOR_CLASSES[category.color];
                                const Icon = category.icon;

                                return (
                                    <button
                                        key={category.id}
                                        onClick={() => setActiveCategory(category.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200 group
                                            ${isActive
                                                ? `${colors.activeBg} border-l-[3px] ${colors.activeBorder}`
                                                : `border-l-[3px] border-transparent ${colors.hoverBg}`
                                            }`}
                                    >
                                        <div className={`p-2 rounded-lg transition-colors shrink-0
                                            ${isActive ? colors.iconBg : 'bg-neutral-100 group-hover:bg-neutral-200'}`}>
                                            <Icon
                                                size={16}
                                                className={`transition-colors ${isActive ? colors.activeIcon : 'text-neutral-400 group-hover:text-neutral-600'}`}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-sm font-semibold transition-colors
                                                ${isActive ? colors.activeText : 'text-neutral-700 group-hover:text-neutral-900'}`}>
                                                {category.label}
                                            </div>
                                            <div className={`text-[10px] mt-0.5 transition-colors truncate
                                                ${isActive ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                                {category.description}
                                            </div>
                                        </div>
                                        <ChevronRight
                                            size={14}
                                            className={`shrink-0 transition-all
                                                ${isActive ? `${colors.activeIcon} translate-x-0.5` : 'text-neutral-300 group-hover:text-neutral-400'}`}
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    </nav>

                    {/* Version Info */}
                    <div className="mt-4 px-3 py-2 text-center">
                        <p className="text-[10px] text-neutral-400">
                            CB-MDTMv2 • Settings v2.1.0
                        </p>
                    </div>
                </div>

                {/* Right Content Panel */}
                <div className="flex-1 min-w-0 overflow-y-auto scrollbar-thin">
                    {/* Panel Header */}
                    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5 mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {activeConfig && (
                                    <>
                                        <div className={`p-2.5 rounded-lg ${COLOR_CLASSES[activeConfig.color].iconBg}`}>
                                            <activeConfig.icon size={20} className={COLOR_CLASSES[activeConfig.color].activeIcon} />
                                        </div>
                                        <div>
                                            <h1 className="text-lg font-bold text-neutral-800">{activeConfig.label}</h1>
                                            <p className="text-xs text-neutral-500 mt-0.5">{activeConfig.description}</p>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="flex items-center gap-2 bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200">
                                <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Current Role:</span>
                                <span className="text-xs font-mono font-semibold text-blue-600">{role}</span>
                            </div>
                        </div>
                    </div>

                    {/* Dynamic Panel Content */}
                    {renderPanel()}
                </div>
            </div>
        </div>
    );
};

export default SystemSettings;
