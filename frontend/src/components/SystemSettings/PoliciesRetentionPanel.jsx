import React, { useState } from 'react';
import {
    Shield, Clock, Save, AlertTriangle, RotateCcw,
    Database, Timer, Gauge, HardDrive, Info, CheckCircle2
} from 'lucide-react';
import { Panel } from '../shared';

const POLICY_SECTIONS = [
    {
        id: 'execution',
        title: 'Execution Limits',
        icon: Gauge,
        description: 'Configure maximum concurrent executions and process timeouts',
        settings: [
            { id: 'max_concurrent_pipelines', label: 'Max Concurrent Pipelines', type: 'number', value: 5, unit: 'pipelines', hint: 'Maximum number of pipelines that can run simultaneously per tenant.' },
            { id: 'max_api_calls_per_minute', label: 'API Rate Limit', type: 'number', value: 120, unit: 'req/min', hint: 'Maximum API calls per minute per tenant.' },
            { id: 'process_timeout_minutes', label: 'Process Timeout', type: 'number', value: 30, unit: 'minutes', hint: 'Maximum execution time before a process is forcefully terminated.' },
            { id: 'max_file_upload_size', label: 'Max Upload Size', type: 'number', value: 50, unit: 'MB', hint: 'Maximum file upload size for all modules.' },
            { id: 'max_batch_size', label: 'Max Batch Size', type: 'number', value: 100, unit: 'items', hint: 'Maximum items in a single batch operation.' },
        ],
    },
    {
        id: 'retention',
        title: 'Data Retention',
        icon: Database,
        description: 'Define how long data is stored before automatic cleanup',
        settings: [
            { id: 'telemetry_retention', label: 'Telemetry Data', type: 'select', value: '90', options: ['30', '60', '90', '180', '365'], unit: 'days', hint: 'Raw sensor/signal telemetry data retention period.' },
            { id: 'log_retention', label: 'System Logs', type: 'select', value: '30', options: ['7', '14', '30', '60', '90'], unit: 'days', hint: 'Application and system log retention period.' },
            { id: 'audit_retention', label: 'Audit Logs', type: 'select', value: '365', options: ['90', '180', '365', '730'], unit: 'days', hint: 'Audit trail and change history retention (compliance requirement).' },
            { id: 'report_retention', label: 'Generated Reports', type: 'select', value: '180', options: ['30', '60', '90', '180', '365'], unit: 'days', hint: 'Auto-generated reports and analysis results.' },
            { id: 'session_retention', label: 'Test Sessions', type: 'select', value: '90', options: ['30', '60', '90', '180', '365'], unit: 'days', hint: 'TPT and ESOGU test session data retention.' },
        ],
    },
    {
        id: 'scheduling',
        title: 'Scheduling & Maintenance',
        icon: Timer,
        description: 'Automated cleanup and maintenance schedules',
        settings: [
            { id: 'cleanup_schedule', label: 'Cleanup Schedule', type: 'select', value: 'daily_02', options: ['daily_02', 'daily_04', 'weekly_sun', 'monthly_1'], optionLabels: ['Daily at 02:00', 'Daily at 04:00', 'Weekly (Sunday)', 'Monthly (1st)'], hint: 'When the automated data cleanup job runs.' },
            { id: 'backup_schedule', label: 'Backup Schedule', type: 'select', value: 'daily_03', options: ['daily_03', 'daily_06', 'weekly_sat', 'monthly_1'], optionLabels: ['Daily at 03:00', 'Daily at 06:00', 'Weekly (Saturday)', 'Monthly (1st)'], hint: 'When automated backups are created.' },
            { id: 'health_check_interval', label: 'Health Check Interval', type: 'number', value: 5, unit: 'minutes', hint: 'How often system health checks run for all connections.' },
            { id: 'auto_restart_failed', label: 'Auto-Restart Failed Processes', type: 'toggle', value: true, hint: 'Automatically restart processes that fail due to transient errors.' },
        ],
    },
    {
        id: 'storage',
        title: 'Storage Quotas',
        icon: HardDrive,
        description: 'Storage allocation and quota settings per tenant',
        settings: [
            { id: 'tenant_storage_quota', label: 'Tenant Storage Quota', type: 'number', value: 500, unit: 'GB', hint: 'Maximum storage allocation per tenant.' },
            { id: 'warn_threshold', label: 'Warning Threshold', type: 'number', value: 80, unit: '%', hint: 'Send notification when storage usage exceeds this percentage.' },
            { id: 'critical_threshold', label: 'Critical Threshold', type: 'number', value: 95, unit: '%', hint: 'Block new data ingestion when storage exceeds this percentage.' },
        ],
    },
];

const PoliciesRetentionPanel = ({ readOnly = false }) => {
    const [formValues, setFormValues] = useState(() => {
        const initial = {};
        POLICY_SECTIONS.forEach(section => {
            section.settings.forEach(setting => {
                initial[setting.id] = setting.value;
            });
        });
        return initial;
    });
    const [hasChanges, setHasChanges] = useState(false);
    const [savedMessage, setSavedMessage] = useState(false);

    const handleChange = (id, value) => {
        if (readOnly) return;
        setFormValues(prev => ({ ...prev, [id]: value }));
        setHasChanges(true);
        setSavedMessage(false);
    };

    const handleSave = () => {
        if (readOnly) return;
        setHasChanges(false);
        setSavedMessage(true);
        setTimeout(() => setSavedMessage(false), 3000);
    };

    const handleReset = () => {
        if (readOnly) return;
        const initial = {};
        POLICY_SECTIONS.forEach(section => {
            section.settings.forEach(setting => {
                initial[setting.id] = setting.value;
            });
        });
        setFormValues(initial);
        setHasChanges(false);
    };

    const canSave = hasChanges && !readOnly;

    return (
        <div className="space-y-6">
            {/* Top Action Bar */}
            <Panel padding="md">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Shield size={18} className="text-blue-600" />
                        <div>
                            <h4 className="text-sm font-bold text-neutral-800">Global Policies & Retention</h4>
                            <p className="text-xs text-neutral-500">Execution limits, data retention periods, and maintenance schedules</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {savedMessage && (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium animate-pulse">
                                <CheckCircle2 size={14} />
                                Settings saved successfully
                            </div>
                        )}
                        {hasChanges && (
                            <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                                <AlertTriangle size={14} />
                                Unsaved changes
                            </div>
                        )}
                        <button
                            onClick={handleReset}
                            disabled={readOnly}
                            className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg transition-all
                                ${readOnly
                                    ? 'text-neutral-400 bg-neutral-100 cursor-not-allowed'
                                    : 'text-neutral-600 bg-neutral-100 hover:bg-neutral-200'
                                }`}
                        >
                            <RotateCcw size={12} />
                            Reset
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!canSave}
                            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-all shadow-sm
                                ${canSave
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                                    : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                                }`}
                        >
                            <Save size={12} />
                            Save Changes
                        </button>
                    </div>
                </div>
            </Panel>

            {/* Policy Sections */}
            {POLICY_SECTIONS.map(section => {
                const Icon = section.icon;
                return (
                    <Panel key={section.id}>
                        <div className="flex items-center gap-3 px-5 py-4 bg-neutral-50/80 border-b border-neutral-100">
                            <div className="p-2 bg-white rounded-lg border border-neutral-200 shadow-sm">
                                <Icon size={16} className="text-blue-600" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-neutral-800">{section.title}</h4>
                                <p className="text-[11px] text-neutral-500">{section.description}</p>
                            </div>
                        </div>

                        <div className="divide-y divide-neutral-50">
                            {section.settings.map(setting => (
                                <div key={setting.id} className="flex items-center justify-between px-5 py-4 hover:bg-blue-50/20 transition-colors">
                                    <div className="flex-1 mr-6">
                                        <label htmlFor={setting.id} className="text-sm font-medium text-neutral-700">{setting.label}</label>
                                        <p className="text-[11px] text-neutral-400 mt-0.5 flex items-start gap-1">
                                            <Info size={11} className="text-neutral-300 mt-0.5 shrink-0" />
                                            {setting.hint}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {setting.type === 'number' && (
                                            <>
                                                <input
                                                    id={setting.id}
                                                    type="number"
                                                    value={formValues[setting.id]}
                                                    onChange={(e) => handleChange(setting.id, parseInt(e.target.value) || 0)}
                                                    disabled={readOnly}
                                                    className={`w-24 px-3 py-1.5 text-sm text-right font-mono border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all
                                                        ${readOnly ? 'opacity-60 cursor-not-allowed bg-neutral-50' : ''}`}
                                                />
                                                <span className="text-xs text-neutral-400 font-medium min-w-[50px]">{setting.unit}</span>
                                            </>
                                        )}
                                        {setting.type === 'select' && (
                                            <>
                                                <select
                                                    id={setting.id}
                                                    value={formValues[setting.id]}
                                                    onChange={(e) => handleChange(setting.id, e.target.value)}
                                                    disabled={readOnly}
                                                    className={`px-3 py-1.5 text-sm border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all
                                                        ${readOnly ? 'opacity-60 cursor-not-allowed bg-neutral-50' : ''}`}
                                                >
                                                    {setting.options.map((opt, idx) => (
                                                        <option key={opt} value={opt}>
                                                            {setting.optionLabels ? setting.optionLabels[idx] : `${opt} ${setting.unit || ''}`}
                                                        </option>
                                                    ))}
                                                </select>
                                            </>
                                        )}
                                        {setting.type === 'toggle' && (
                                            <label className={`relative inline-flex items-center ${readOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={formValues[setting.id]}
                                                    onChange={(e) => handleChange(setting.id, e.target.checked)}
                                                    disabled={readOnly}
                                                    className="sr-only peer"
                                                />
                                                <div className={`w-10 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[3px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 ${readOnly ? 'opacity-50' : ''}`}></div>
                                            </label>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Panel>
                );
            })}

            {/* Storage Usage Preview */}
            <Panel padding="lg">
                <h4 className="text-sm font-bold text-neutral-700 mb-4 flex items-center gap-2">
                    <HardDrive size={16} className="text-blue-600" />
                    Current Storage Usage
                </h4>
                <div className="space-y-3">
                    {[
                        { label: 'Telemetry Data', used: 156, total: 500, color: 'bg-blue-500' },
                        { label: 'System Logs', used: 23, total: 500, color: 'bg-amber-500' },
                        { label: 'Reports & Sessions', used: 45, total: 500, color: 'bg-emerald-500' },
                    ].map(item => (
                        <div key={item.label}>
                            <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-neutral-600 font-medium">{item.label}</span>
                                <span className="text-neutral-500">{item.used} GB / {item.total} GB</span>
                            </div>
                            <div className="w-full bg-neutral-100 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full ${item.color} transition-all`}
                                    style={{ width: `${(item.used / item.total) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>
            </Panel>
        </div>
    );
};

export default PoliciesRetentionPanel;
