import React, { useMemo } from 'react';
import {
  fetchPlatformHealthSummary,
  fetchPlatformResourceUsage,
  fetchServiceHealth,
  fetchIngestPanelData,
  fetchRecentRuns,
  fetchCriticalEventsFeed,
  fetchPlatformConfigOverview,
} from '../../services/platformBackend';
import { fetchPdmSummary } from '../../services/pdmBackend';
import PlatformKPICards from './PlatformKPICards';
import ServiceHealthPanel from './ServiceHealthPanel';
import IngestHealthPanel from './IngestHealthPanel';
import RecentRunsPanel from './RecentRunsPanel';
import CriticalEventsPanel from './CriticalEventsPanel';
import ConfigOverviewPanel from './ConfigOverviewPanel';

const PlatformModule = ({ onNavigateModule }) => {
  const healthSummary = useMemo(() => fetchPlatformHealthSummary(), []);
  const resourceUsage = useMemo(() => fetchPlatformResourceUsage(), []);
  const serviceHealth = useMemo(() => fetchServiceHealth(), []);
  const ingestData = useMemo(() => fetchIngestPanelData(), []);
  const recentRuns = useMemo(() => fetchRecentRuns(), []);
  const eventsFeed = useMemo(() => fetchCriticalEventsFeed(), []);
  const configOverview = useMemo(() => fetchPlatformConfigOverview(), []);
  const pdmSummary = useMemo(() => fetchPdmSummary(), []);

  return (
    <div className="h-full w-full overflow-y-auto space-y-6 p-6 bg-gray-50/50">
      {/* ── Katman 1: KPI + Service Health / Ingest Health ── */}
      <PlatformKPICards healthSummary={healthSummary} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 flex flex-col">
          <ServiceHealthPanel serviceHealth={serviceHealth} resourceUsage={resourceUsage} />
        </div>
        <div className="lg:col-span-5 flex flex-col">
          <IngestHealthPanel ingestData={ingestData} pdmSummary={pdmSummary} />
        </div>
      </div>

      {/* ── Katman 2: Recent Runs + Critical Events ── */}
      <RecentRunsPanel recentRuns={recentRuns} />
      <CriticalEventsPanel eventsFeed={eventsFeed} onNavigateModule={onNavigateModule} />

      {/* ── Katman 3: Configuration Overview ── */}
      <ConfigOverviewPanel configOverview={configOverview} />
    </div>
  );
};

export default PlatformModule;
