import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, CheckCircle2, Clock, GitBranch,
  Layers, Database, WifiOff, RefreshCw
} from 'lucide-react';
import KPICard from '../shared/KPICard';
import { Panel, StatusBadge, EmptyState } from '../shared';
import {
  getSTLCSessions,
  getConnectionStatus,
  onConnectionChange,
  checkHealth,
} from '../../services/api/stlcManagerApi';

// ─── Process label helper ────────────────────────────────────────────
const PROCESS_LABELS = {
  code_review: 'Code Review',
  requirement_analysis: 'Requirement Analysis',
  test_planning: 'Test Planning',
  test_scenario_generation: 'Test Scenario Gen.',
  environment_setup: 'Environment Setup',
  test_code_generation: 'Test Code Gen.',
  test_execution: 'Test Execution',
  test_reporting: 'Test Reporting',
  test_closure: 'Test Closure',
};

const processLabel = (key) => PROCESS_LABELS[key] || key.replace(/_/g, ' ');

// ─── Component ──────────────────────────────────────────────────────
const SessionDashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(getConnectionStatus() === 'connected');

  // ─── Fetch sessions from API ─────────
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const health = await checkHealth();
      if (health.status !== 'connected') {
        setConnected(false);
        setSessions([]);
        setLoading(false);
        return;
      }
      setConnected(true);
      const data = await getSTLCSessions();
      setSessions(data.sessions || []);
    } catch (err) {
      setConnected(false);
      setError(err.message);
      setSessions([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSessions();
    const unsub = onConnectionChange((status) => setConnected(status === 'connected'));
    return () => unsub();
  }, [fetchSessions]);

  // ─── Derived KPIs from real session data ─────────
  const totalSessions = sessions.length;

  const allProcesses = sessions.flatMap(s => {
    const p = s.processes || s.process_names || [];
    return Array.isArray(p) ? p : Object.keys(p);
  });
  const uniqueProcessTypes = [...new Set(allProcesses)].length;
  const totalProcessRuns = allProcesses.length;

  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.timestamp || b.created_at || 0) - new Date(a.timestamp || a.created_at || 0))
    .slice(0, 8);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Primary KPI Cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total STLC Sessions"
          value={connected ? totalSessions : '—'}
          icon={Database}
          status={connected ? 'normal' : 'inactive'}
          subtitle={connected ? 'From STLC Manager' : 'API disconnected'}
        />
        <KPICard
          title="Process Types"
          value={connected ? uniqueProcessTypes : '—'}
          icon={GitBranch}
          status={connected ? 'success' : 'inactive'}
          subtitle={connected ? 'Unique STLC phases used' : 'API disconnected'}
        />
        <KPICard
          title="Total Process Runs"
          value={connected ? totalProcessRuns : '—'}
          icon={Layers}
          status={connected ? 'normal' : 'inactive'}
          subtitle={connected ? 'Across all sessions' : 'API disconnected'}
        />
        <KPICard
          title="API Status"
          value={connected ? 'Online' : 'Offline'}
          icon={connected ? CheckCircle2 : WifiOff}
          status={connected ? 'success' : 'critical'}
          subtitle={connected ? 'STLC Manager connected' : 'Start Docker container'}
        />
      </div>

      {/* ─── Recent STLC Sessions Table ─── */}
      <Panel
        title="Recent STLC Sessions"
        icon={Activity}
        padding="none"
        headerAction={
          <button
            onClick={fetchSessions}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      >
        {!connected ? (
          <EmptyState
            icon={WifiOff}
            title="STLC Manager Disconnected"
            description="Start the STLC Manager Docker container or configure the cloud URL to see session data."
            className="py-12"
          />
        ) : loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-neutral-400">
            <RefreshCw size={16} className="animate-spin" />
            <span className="text-sm">Loading sessions...</span>
          </div>
        ) : error ? (
          <EmptyState
            icon={Activity}
            title="Failed to Load Sessions"
            description={error}
            className="py-12"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Session ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Processes</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-neutral-700 uppercase tracking-wider">Process Count</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {recentSessions.length > 0 ? (
                  recentSessions.map((session, idx) => {
                    const processes = session.processes || session.process_names || [];
                    const processList = Array.isArray(processes) ? processes : Object.keys(processes);
                    const sessionId = session.session_id || session._id || `session-${idx}`;
                    const date = session.timestamp || session.created_at;

                    return (
                      <tr key={sessionId} className="hover:bg-primary-50/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-xs font-semibold text-primary-600">
                            {typeof sessionId === 'string' && sessionId.length > 20
                              ? `${sessionId.slice(0, 8)}...${sessionId.slice(-6)}`
                              : sessionId}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {processList.slice(0, 4).map(p => (
                              <StatusBadge
                                key={p}
                                status="info"
                                label={processLabel(p)}
                                size="sm"
                                showIcon={false}
                              />
                            ))}
                            {processList.length > 4 && (
                              <span className="text-[10px] text-neutral-400 self-center">
                                +{processList.length - 4} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-bold text-neutral-700">
                            {session.process_count || processList.length}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-neutral-500">
                          {formatDate(date)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4">
                      <EmptyState
                        icon={Activity}
                        title="No STLC Sessions Found"
                        description="No STLC process sessions have been recorded yet. Run an STLC process (code review, test planning, etc.) to create a session."
                        className="py-12"
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
};

export default SessionDashboard;
