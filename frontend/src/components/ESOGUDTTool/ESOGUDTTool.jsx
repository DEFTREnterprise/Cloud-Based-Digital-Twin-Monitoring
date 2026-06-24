import React, { useState } from 'react';
import {
  LayoutDashboard, List, GitBranch,
  AlertTriangle, Workflow, Lock
} from 'lucide-react';

// Sub-panels
import ApiStatusBar from './ApiStatusBar';
import SessionDashboard from './SessionDashboard';
import SessionManager from './SessionManager';
import STLCIntegrationPanel from './STLCIntegrationPanel';

// ─── Tab Definitions ─────────────────────────────────────────────────
const TABS = [
  { id: 'dashboard',    label: 'Dashboard',         icon: LayoutDashboard },
  { id: 'sessions',     label: 'STLC Sessions',     icon: List },
  { id: 'stlc',         label: 'STLC Integration',  icon: GitBranch },
];

// ─── Main Component ──────────────────────────────────────────────────
const ESOGUDTTool = ({ currentRole = 'ADMIN' }) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const permissions = {
    canWrite: ['ADMIN', 'ESOGU (Admin)', 'ESOGU (Operator)'],
    canRead: ['ADMIN', 'ESOGU (Admin)', 'ESOGU (Viewer)', 'ESOGU (Operator)'],
  };
  const hasWritePermission = permissions.canWrite.includes(currentRole);

  const renderPanel = () => {
    switch (activeTab) {
      case 'dashboard':
        return <SessionDashboard />;
      case 'sessions':
        return <SessionManager />;
      case 'stlc':
        return <STLCIntegrationPanel />;
      default:
        return <SessionDashboard />;
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto space-y-6 p-6 bg-gray-50/50">
      {/* ─── Module Header ─── */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-soft p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-primary-500 to-secondary-400 rounded-lg shadow-sm">
              <Workflow size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-neutral-800">ESOGU DT Tool</h1>
              <p className="text-xs text-neutral-500 mt-0.5">STLC Integration & Orchestration Layer</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Role Badge */}
            <div className="flex items-center gap-2 bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200">
              <Lock size={12} className="text-neutral-400" />
              <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Role:</span>
              <span className={`text-xs font-mono font-semibold ${hasWritePermission ? 'text-primary-600' : 'text-warning-600'}`}>
                {currentRole}
              </span>
            </div>

            {/* API Status (compact) */}
            <ApiStatusBar />
          </div>
        </div>

        {/* Read-Only Warning */}
        {!hasWritePermission && (
          <div className="mt-4 bg-warning-50 border border-warning-200 text-warning-700 p-3 rounded-lg flex items-center gap-3">
            <AlertTriangle size={16} className="text-warning-500 shrink-0" />
            <span className="text-xs font-medium">
              <strong>Read-Only Mode:</strong> You are viewing as <strong>{currentRole}</strong>. You do not have permission to make changes.
            </span>
          </div>
        )}
      </div>

      {/* ─── Tab Navigation ─── */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-soft">
        <div className="flex items-center gap-1 p-1.5 overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 shadow-sm border border-primary-200'
                    : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-primary-500' : 'text-neutral-400'} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Panel Content ─── */}
      {renderPanel()}
    </div>
  );
};

export default ESOGUDTTool;
