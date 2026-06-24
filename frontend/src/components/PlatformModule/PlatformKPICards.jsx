import React from 'react';
import { Activity } from 'lucide-react';
import { KPICard } from '../shared';

const PlatformKPICards = ({ healthSummary }) => {
  const uptime = healthSummary.uptime7dPercent ?? 0;
  const apiLatency = healthSummary.apiStatus?.latencyMs ?? null;
  const degradedStreams = healthSummary.ingestStatus?.degradedStreams ?? 0;
  const dbConnErrRate = healthSummary.dbStatus?.connectionErrorRate ?? 0;
  const logErrRate = healthSummary.errorLogsRate ?? 0;
  const crit24h = healthSummary.criticalEventsLast24h ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
      <KPICard
        title="Uptime (7d)"
        value={uptime ? uptime.toFixed(2) : '—'}
        unit="%"
        status={uptime >= 99 ? 'success' : uptime >= 97 ? 'warning' : 'critical'}
        subtitle="Service availability (last 7 days)"
      />
      <KPICard
        title="API p95 Latency"
        value={apiLatency ?? '—'}
        unit="ms"
        status={apiLatency != null && apiLatency <= 200 ? 'normal' : apiLatency != null && apiLatency <= 400 ? 'warning' : 'critical'}
        subtitle="API gateway response time"
      />
      <KPICard
        title="Ingest Lagged Streams"
        value={degradedStreams}
        status={degradedStreams === 0 ? 'success' : 'warning'}
        subtitle="Realtime ingest status"
      />
      <KPICard
        title="DB Conn Error Rate"
        value={dbConnErrRate * 100}
        unit="%"
        status={dbConnErrRate < 0.01 ? 'normal' : 'warning'}
        subtitle="Last 24h connection failures"
      />
      <KPICard
        title="Log Error Rate"
        value={logErrRate * 100}
        unit="%"
        status={logErrRate < 0.05 ? 'normal' : 'warning'}
        subtitle="Error logs / total logs"
      />
      <KPICard
        title="Critical Events (24h)"
        value={crit24h}
        status={crit24h === 0 ? 'success' : 'critical'}
        icon={Activity}
        subtitle="Last 24h critical incidents"
      />
    </div>
  );
};

export default PlatformKPICards;

