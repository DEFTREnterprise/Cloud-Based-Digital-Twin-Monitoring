import React from 'react';
import { Server, ExternalLink, FileText, Cpu, HardDrive, MemoryStick } from 'lucide-react';
import { Panel, StatusBadge, EmptyState } from '../shared';

const ServiceHealthPanel = ({ serviceHealth, resourceUsage }) => {
  return (
    <Panel title="Service Health" icon={Server} padding="none" className="flex-1">
      {/* Service table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="px-5 py-2.5 text-left text-[11px] font-medium text-neutral-600 uppercase tracking-wider">
                Service
              </th>
              <th className="px-5 py-2.5 text-left text-[11px] font-medium text-neutral-600 uppercase tracking-wider">
                State
              </th>
              <th className="px-5 py-2.5 text-left text-[11px] font-medium text-neutral-600 uppercase tracking-wider">
                Latency
              </th>
              <th className="px-5 py-2.5 text-right text-[11px] font-medium text-neutral-600 uppercase tracking-wider">
                &nbsp;
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white">
            {serviceHealth.length ? (
              serviceHealth.map((svc) => {
                const isDegraded = svc.State === 'degraded' || svc.State === 'down';
                return (
                  <tr key={svc.Service_ID} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="px-5 py-2.5 text-xs font-medium text-neutral-800">
                      {svc.Display_Name}
                    </td>
                    <td className="px-5 py-2.5">
                      <StatusBadge
                        status={
                          svc.State === 'up'
                            ? 'success'
                            : svc.State === 'degraded'
                              ? 'warning'
                              : 'critical'
                        }
                        label={svc.State.toUpperCase()}
                        size="sm"
                      />
                    </td>
                    <td className="px-5 py-2.5 text-xs font-mono text-neutral-600">
                      {svc.Latency_ms != null ? `${svc.Latency_ms} ms` : '—'}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-neutral-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          title="Open in Grafana"
                        >
                          <ExternalLink size={14} />
                        </button>
                        {isDegraded && (
                          <button
                            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-amber-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                            title="View Logs (OpenSearch)"
                          >
                            <FileText size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="4">
                  <EmptyState
                    title="No Services"
                    description="No platform services have been registered."
                    className="py-8"
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Resource Usage footer bar */}
      {resourceUsage && (
        <div className="border-t border-neutral-200 bg-neutral-50/80 px-5 py-2.5 flex items-center gap-6 text-[11px] text-neutral-600">
          <div className="flex items-center gap-1.5">
            <Cpu size={12} className="text-neutral-400" />
            <span className="uppercase tracking-wider font-medium">CPU</span>
            <span className="font-mono font-semibold text-neutral-800">
              {resourceUsage.cpu_percent}%
            </span>
          </div>
          <div className="w-px h-3.5 bg-neutral-300" />
          <div className="flex items-center gap-1.5">
            <MemoryStick size={12} className="text-neutral-400" />
            <span className="uppercase tracking-wider font-medium">RAM</span>
            <span className="font-mono font-semibold text-neutral-800">
              {resourceUsage.ram_used_gb}/{resourceUsage.ram_total_gb} GB
            </span>
          </div>
          <div className="w-px h-3.5 bg-neutral-300" />
          <div className="flex items-center gap-1.5">
            <HardDrive size={12} className="text-neutral-400" />
            <span className="uppercase tracking-wider font-medium">Disk</span>
            <span className="font-mono font-semibold text-neutral-800">
              {resourceUsage.disk_used_gb}/{resourceUsage.disk_total_gb} GB
            </span>
          </div>
        </div>
      )}
    </Panel>
  );
};

export default ServiceHealthPanel;
