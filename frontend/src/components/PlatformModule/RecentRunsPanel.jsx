import React from 'react';
import { Activity } from 'lucide-react';
import { Panel, StatusBadge, EmptyState } from '../shared';

const RecentRunsPanel = ({ recentRuns }) => {
  return (
    <Panel title="Recent Runs & Sessions" icon={Activity} padding="none">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                Duration
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 bg-white">
            {recentRuns.length ? (
              recentRuns.map((run) => (
                <tr key={run.Run_ID} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-3 text-xs font-mono text-neutral-700">{run.Run_ID}</td>
                  <td className="px-6 py-3 text-xs text-neutral-700">{run.Type}</td>
                  <td className="px-6 py-3">
                    <StatusBadge
                      status={run.Status === 'success' ? 'success' : run.Status === 'running' ? 'normal' : 'critical'}
                      label={run.Status.toUpperCase()}
                      size="sm"
                    />
                  </td>
                  <td className="px-6 py-3 text-xs text-neutral-700">{run.Duration_sec}s</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4">
                  <EmptyState
                    title="No Recent Runs"
                    description="No TPT or ESOGÜ runs have been recorded recently."
                    className="py-10"
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
};

export default RecentRunsPanel;

