import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Panel, EmptyState } from '../shared';

const PdmAlarmSummaryPanel = ({ pdmSummary }) => {
  return (
    <Panel title="PdM Alarm Summary" icon={AlertTriangle}>
      {pdmSummary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-neutral-700">
          <div className="flex flex-col">
            <span className="text-[11px] text-neutral-500 uppercase tracking-wider">Open Alarms</span>
            <span className="mt-0.5 font-mono text-sm font-semibold">
              {pdmSummary.openAlarms} (critical: {pdmSummary.criticalOpen}, warn: {pdmSummary.warnOpen})
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-neutral-500 uppercase tracking-wider">Assets Monitored</span>
            <span className="mt-0.5 font-mono text-sm font-semibold">
              {pdmSummary.assetsMonitored}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-neutral-500 uppercase tracking-wider">Top Problem Component</span>
            <span className="mt-0.5 text-sm font-semibold text-neutral-800">
              {pdmSummary.topProblemComponent} ({pdmSummary.topProblemCount})
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-neutral-500 uppercase tracking-wider">Model Version</span>
            <span className="mt-0.5 font-mono text-xs font-semibold">
              {pdmSummary.modelVersion}
            </span>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No PdM Data"
          description="Predictive Maintenance summary is not available."
          className="py-6"
        />
      )}
    </Panel>
  );
};

export default PdmAlarmSummaryPanel;

