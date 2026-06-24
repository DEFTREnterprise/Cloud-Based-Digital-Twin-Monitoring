import React, { useCallback } from 'react';
import { Activity, Search } from 'lucide-react';
import { Panel, StatusBadge, EmptyState } from '../shared';

const CriticalEventsPanel = ({ eventsFeed, onNavigateModule }) => {
  const handleModuleDrill = useCallback(
    (targetId) => {
      if (typeof onNavigateModule === 'function') {
        onNavigateModule(targetId);
      }
    },
    [onNavigateModule]
  );

  const renderActionLink = (link) => {
    if (!link) return null;
    let label = 'Open link';
    if (link.Type === 'module' && link.Target === 'esogu_dt_tool') label = 'Go to ESOGÜ Module';
    else if (link.Type === 'grafana') label = 'Open in Grafana';
    else if (link.Type === 'logs') label = 'Open in Logs';
    return (
      <button
        className="text-[11px] text-primary-600 hover:text-primary-700 font-medium hover:underline transition-colors"
        onClick={() => {
          if (link?.Type === 'module' && link.Target === 'esogu_dt_tool') {
            handleModuleDrill('esogu');
          }
        }}
      >
        {label} →
      </button>
    );
  };

  return (
    <Panel title="Critical Events" icon={Activity} padding="none">
      {/* Top bar: error type badges + Search Logs shortcut */}
      <div className="px-5 py-2.5 bg-neutral-50/80 border-b border-neutral-200 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mr-1">
            Top Errors
          </span>
          {eventsFeed.topErrorTypes?.map((err) => (
            <span
              key={err.Error_Type}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-neutral-200 text-[11px] text-neutral-700"
            >
              <span className="font-medium">{err.Error_Type}</span>
              <span className="font-mono font-semibold text-neutral-900">{err.Count}</span>
            </span>
          ))}
        </div>
        <button
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-[11px] font-medium text-neutral-700 hover:text-primary-600 hover:border-primary-300 hover:bg-primary-50 transition-colors"
          title="Search Logs in OpenSearch"
        >
          <Search size={12} />
          Search Logs
        </button>
      </div>

      {/* Event timeline list */}
      <div className="divide-y divide-neutral-100">
        {eventsFeed.events?.length ? (
          eventsFeed.events.map((evt) => (
            <div
              key={evt.Event_ID}
              className="px-5 py-3 flex items-start gap-4 hover:bg-neutral-50/60 transition-colors"
            >
              {/* Left: timestamp + severity */}
              <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0 w-[100px]">
                <StatusBadge
                  status={evt.Severity === 'CRITICAL' ? 'critical' : 'warning'}
                  label={evt.Severity}
                  size="xs"
                />
                <span className="font-mono text-[10px] text-neutral-400 text-center leading-tight">
                  {evt.Time_UTC.replace('T', ' ').replace('Z', '')}
                </span>
              </div>

              {/* Center: source, message */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-neutral-800">
                  {evt.Source} · {evt.Type}
                </div>
                <div className="text-[11px] text-neutral-600 mt-0.5 leading-relaxed">
                  {evt.Message}
                </div>
              </div>

              {/* Right: action link */}
              <div className="shrink-0 pt-0.5">{renderActionLink(evt.Link)}</div>
            </div>
          ))
        ) : (
          <EmptyState
            title="No Critical Events"
            description="There are no critical platform events in the last 24 hours."
            className="py-10"
          />
        )}
      </div>

      {/* Audit Events footer */}
      {eventsFeed.auditEvents?.length > 0 && (
        <div className="border-t border-neutral-200 bg-neutral-50/80">
          <div className="px-5 py-2 flex items-center gap-2">
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
              Recent Audit
            </span>
          </div>
          <div className="divide-y divide-neutral-100">
            {eventsFeed.auditEvents.map((aud) => (
              <div
                key={aud.Audit_ID}
                className="px-5 py-2 flex items-center gap-4 text-[11px]"
              >
                <span className="font-mono text-[10px] text-neutral-400 shrink-0 w-[100px] text-center">
                  {aud.Time_UTC.replace('T', ' ').replace('Z', '')}
                </span>
                <span className="text-neutral-500 shrink-0">{aud.Actor}</span>
                <span className="font-semibold text-neutral-800">{aud.Action}</span>
                <span className="text-neutral-600 truncate">{aud.Summary}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
};

export default CriticalEventsPanel;
