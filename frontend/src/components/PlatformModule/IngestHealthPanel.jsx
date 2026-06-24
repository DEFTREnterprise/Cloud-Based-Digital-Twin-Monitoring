import React from 'react';
import { Activity, AlertTriangle } from 'lucide-react';
import { Panel, StatusBadge, EmptyState } from '../shared';

const IngestHealthPanel = ({ ingestData, pdmSummary }) => {
  return (
    <Panel title="Ingest Health" icon={Activity} padding="none" className="flex-1">
      <div className="p-4 space-y-4">
        {/* Realtime Streams */}
        <h4 className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider">
          Realtime Streams
        </h4>
        <div className="space-y-2">
          {ingestData.realtime?.length ? (
            ingestData.realtime.map((s) => (
              <div
                key={s.Stream_ID}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-xs"
              >
                <div>
                  <div className="font-semibold text-neutral-800">{s.Description}</div>
                  <div className="text-neutral-500 mt-0.5">
                    {s.messages_per_sec} msg/s · lag {s.ingest_lag_seconds}s · gaps {s.gap_count}
                  </div>
                </div>
                <StatusBadge
                  status={
                    s.Status === 'normal'
                      ? 'success'
                      : s.Status === 'degraded'
                        ? 'warning'
                        : 'critical'
                  }
                  label={s.Status.toUpperCase()}
                  size="sm"
                />
              </div>
            ))
          ) : (
            <EmptyState
              title="No Realtime Streams"
              description="Realtime ingest configuration is not available."
              className="py-6"
            />
          )}
        </div>

        {/* Batch Jobs */}
        <h4 className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider pt-2">
          Batch Jobs
        </h4>
        <div className="space-y-2">
          {ingestData.batch?.length ? (
            ingestData.batch.map((job) => (
              <div
                key={job.Job_ID}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-xs"
              >
                <div>
                  <div className="font-semibold text-neutral-800">{job.Description}</div>
                  <div className="text-neutral-500 mt-0.5">
                    Last run: {job.Last_Run_Start_UTC || '—'} → {job.Last_Run_End_UTC || '—'}
                  </div>
                </div>
                <StatusBadge
                  status={
                    job.Status === 'success'
                      ? 'success'
                      : job.Status === 'running'
                        ? 'normal'
                        : 'critical'
                  }
                  label={job.Status.toUpperCase()}
                  size="sm"
                />
              </div>
            ))
          ) : (
            <EmptyState
              title="No Batch Jobs"
              description="No ingest batch jobs are configured."
              className="py-6"
            />
          )}
        </div>
      </div>

      {/* PdM Alarm Summary footer bar */}
      {pdmSummary && (
        <div className="border-t border-neutral-200 bg-neutral-50/80 px-5 py-2.5 flex items-center gap-5 text-[11px] text-neutral-600">
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={12} className="text-amber-500" />
            <span className="uppercase tracking-wider font-medium">PdM</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-semibold text-neutral-800">
              {pdmSummary.openAlarms}
            </span>
            <span>open</span>
            {pdmSummary.criticalOpen > 0 && (
              <span className="text-red-600 font-semibold">
                ({pdmSummary.criticalOpen} critical)
              </span>
            )}
          </div>
          <div className="w-px h-3.5 bg-neutral-300" />
          <div className="flex items-center gap-1.5">
            <span className="font-medium">Top:</span>
            <span className="font-semibold text-neutral-800">
              {pdmSummary.topProblemComponent}
            </span>
          </div>
          <div className="w-px h-3.5 bg-neutral-300" />
          <div className="flex items-center gap-1.5">
            <span className="font-medium">Model</span>
            <span className="font-mono font-semibold text-neutral-800">
              {pdmSummary.modelVersion}
            </span>
          </div>
        </div>
      )}
    </Panel>
  );
};

export default IngestHealthPanel;
