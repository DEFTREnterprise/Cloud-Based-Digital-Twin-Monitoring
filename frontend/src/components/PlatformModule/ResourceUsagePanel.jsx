import React from 'react';
import { Cpu } from 'lucide-react';
import { Panel } from '../shared';

const ResourceUsagePanel = ({ resourceUsage }) => {
  return (
    <Panel title="Resource Usage" icon={Cpu}>
      <div className="space-y-3 text-sm text-neutral-700">
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500 uppercase tracking-wider">CPU</span>
          <span className="font-mono font-semibold">{resourceUsage.cpu_percent}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500 uppercase tracking-wider">RAM</span>
          <span className="font-mono font-semibold">
            {resourceUsage.ram_used_gb} / {resourceUsage.ram_total_gb} GB
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500 uppercase tracking-wider">Disk</span>
          <span className="font-mono font-semibold">
            {resourceUsage.disk_used_gb} / {resourceUsage.disk_total_gb} GB
          </span>
        </div>
      </div>
    </Panel>
  );
};

export default ResourceUsagePanel;

