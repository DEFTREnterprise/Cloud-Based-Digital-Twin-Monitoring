import React from 'react';
import { Settings } from 'lucide-react';
import { Panel, StatusBadge } from '../shared';

const ConfigOverviewPanel = ({ configOverview }) => {
  const registry = configOverview.DT_Registry || {};
  const connections = configOverview.Connection_Tests || [];
  const adapters = configOverview.Adapter_Health || [];
  const policies = configOverview.Retention_Policies || [];

  return (
    <Panel title="Configuration Overview" icon={Settings} padding="none">
      {/* Summary bar — DT counts + adapter statuses inline */}
      <div className="px-5 py-2.5 bg-neutral-50/80 border-b border-neutral-200 flex items-center gap-5 flex-wrap text-[11px] text-neutral-600">
        {/* DT Registry counts */}
        <div className="flex items-center gap-1.5">
          <span className="uppercase tracking-wider font-medium">DT Registry</span>
          <span className="font-mono font-semibold text-neutral-800">
            {registry.Total_DT_Count ?? '—'}
          </span>
          <span>total</span>
          <span className="text-emerald-600 font-semibold">{registry.Active_DT_Count} active</span>
          <span className="text-neutral-400">{registry.Inactive_DT_Count} inactive</span>
        </div>

        <div className="w-px h-3.5 bg-neutral-300" />

        {/* Adapter statuses inline */}
        <div className="flex items-center gap-3">
          <span className="uppercase tracking-wider font-medium">Adapters</span>
          {adapters.map((a) => (
            <span key={a.Adapter_ID} className="inline-flex items-center gap-1">
              <span className="text-neutral-700">{a.Adapter_ID.replace('adapter_', '')}</span>
              <StatusBadge
                status={a.Status === 'healthy' ? 'success' : 'warning'}
                label={a.Status === 'healthy' ? '✓' : '!'}
                size="xs"
              />
            </span>
          ))}
        </div>
      </div>

      {/* Unified table: connections + retention */}
      <table className="w-full">
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-200">
            <th className="px-5 py-2 text-left text-[10px] font-medium text-neutral-500 uppercase tracking-wider w-[100px]">
              Category
            </th>
            <th className="px-5 py-2 text-left text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
              Target / Scope
            </th>
            <th className="px-5 py-2 text-left text-[10px] font-medium text-neutral-500 uppercase tracking-wider w-[100px]">
              Status
            </th>
            <th className="px-5 py-2 text-right text-[10px] font-medium text-neutral-500 uppercase tracking-wider w-[160px]">
              Detail
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 bg-white text-xs">
          {/* Connection Test rows */}
          {connections.map((c, i) => (
            <tr key={c.Connection_ID} className="hover:bg-neutral-50/60 transition-colors">
              {i === 0 && (
                <td
                  className="px-5 py-2 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider align-top"
                  rowSpan={connections.length}
                >
                  Connections
                </td>
              )}
              <td className="px-5 py-2 text-neutral-800 font-medium">{c.Target}</td>
              <td className="px-5 py-2">
                <StatusBadge
                  status={c.Last_Status === 'success' ? 'success' : 'critical'}
                  label={c.Last_Status.toUpperCase()}
                  size="xs"
                />
              </td>
              <td className="px-5 py-2 text-right font-mono text-neutral-600">
                {c.Latency_ms != null ? `${c.Latency_ms} ms` : '—'}
              </td>
            </tr>
          ))}

          {/* Separator */}
          <tr>
            <td colSpan="4" className="h-0 border-t-2 border-neutral-200" />
          </tr>

          {/* Retention Policy rows */}
          {policies.map((p, i) => (
            <tr key={p.Policy_ID} className="hover:bg-neutral-50/60 transition-colors">
              {i === 0 && (
                <td
                  className="px-5 py-2 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider align-top"
                  rowSpan={policies.length}
                >
                  Retention
                </td>
              )}
              <td className="px-5 py-2 text-neutral-800 font-medium">{p.Scope}</td>
              <td className="px-5 py-2">
                <span className="text-[11px] font-mono text-neutral-700">
                  {p.Retention_Days}d
                </span>
              </td>
              <td className="px-5 py-2 text-right font-mono text-[11px] text-neutral-500">
                {p.Downsample_Strategy}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
};

export default ConfigOverviewPanel;
