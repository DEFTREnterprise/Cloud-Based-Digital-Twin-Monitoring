import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, Clock, Hash, ChevronDown, ChevronUp,
  RefreshCw, WifiOff, Filter, GitBranch, Layers
} from 'lucide-react';
import { Panel, StatusBadge, EmptyState } from '../shared';
import {
  getSTLCSessions,
  getConnectionStatus,
  onConnectionChange,
  checkHealth,
} from '../../services/api/stlcManagerApi';

// ─── Process display helpers ─────────────────────────────────────────
const PROCESS_LABELS = {
  code_review: 'Code Review',
  requirement_analysis: 'Requirement Analysis',
  test_planning: 'Test Planning',
  test_scenario_generation: 'Test Scenario Gen.',
  test_case_generation: 'Test Case Gen.',
  environment_setup: 'Environment Setup',
  test_code_generation: 'Test Code Gen.',
  test_execution: 'Test Execution',
  test_reporting: 'Test Reporting',
  test_closure: 'Test Closure',
};

const PROCESS_COLORS = {
  code_review: 'info',
  requirement_analysis: 'success',
  test_planning: 'warning',
  test_scenario_generation: 'info',
  test_case_generation: 'info',
  environment_setup: 'success',
  test_code_generation: 'warning',
  test_execution: 'running',
  test_reporting: 'success',
  test_closure: 'inactive',
};

const processLabel = (key) => PROCESS_LABELS[key] || key.replace(/_/g, ' ');

// ─── Component ──────────────────────────────────────────────────────
const SessionManager = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(getConnectionStatus() === 'connected');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProcess, setFilterProcess] = useState('all');
  const [expandedSession, setExpandedSession] = useState(null);

  // ─── Fetch from API ─────────
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

      const filters = {};
      if (filterProcess !== 'all') {
        filters.processNames = [filterProcess];
      }
      const data = await getSTLCSessions(filters);
      setSessions(data.sessions || []);
    } catch (err) {
      setConnected(false);
      setError(err.message);
      setSessions([]);
    }
    setLoading(false);
  }, [filterProcess]);

  useEffect(() => {
    fetchSessions();
    const unsub = onConnectionChange((status) => setConnected(status === 'connected'));
    return () => unsub();
  }, [fetchSessions]);

  // ─── Available process types from fetched data ─────────
  const availableProcessTypes = useMemo(() => {
    const types = new Set();
    sessions.forEach(s => {
      const p = s.processes || s.process_names || [];
      const list = Array.isArray(p) ? p : Object.keys(p);
      list.forEach(t => types.add(t));
    });
    return [...types].sort();
  }, [sessions]);

  // ─── Filtered & sorted sessions ─────────
  const filteredSessions = useMemo(() => {
    return sessions
      .filter(s => {
        if (!searchTerm) return true;
        const sid = (s.session_id || '').toLowerCase();
        const processes = s.processes || s.process_names || [];
        const processList = Array.isArray(processes) ? processes : Object.keys(processes);
        const matchProcess = processList.some(p => processLabel(p).toLowerCase().includes(searchTerm.toLowerCase()));
        return sid.includes(searchTerm.toLowerCase()) || matchProcess;
      })
      .sort((a, b) => new Date(b.timestamp || b.created_at || 0) - new Date(a.timestamp || a.created_at || 0));
  }, [sessions, searchTerm]);

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

  const truncateId = (id) => {
    if (!id) return '—';
    if (typeof id === 'string' && id.length > 24) {
      return `${id.slice(0, 8)}...${id.slice(-6)}`;
    }
    return id;
  };

  // ─── Disconnected state ─────────
  if (!connected) {
    return (
      <Panel padding="none">
        <EmptyState
          icon={WifiOff}
          title="STLC Manager Disconnected"
          description="Start the STLC Manager Docker container or configure the cloud URL to see STLC process sessions."
          className="py-16"
        />
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header + Filters ─── */}
      <Panel padding="md">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search sessions (ID, process type)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
              <Filter size={12} />
              <span className="font-medium">Process:</span>
            </div>
            <select
              value={filterProcess}
              onChange={(e) => setFilterProcess(e.target.value)}
              className="appearance-none text-xs border border-neutral-300 rounded-lg px-3 py-2 bg-white text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
            >
              <option value="all">All Process Types</option>
              {availableProcessTypes.map(p => (
                <option key={p} value={p}>{processLabel(p)}</option>
              ))}
            </select>

            <button
              onClick={fetchSessions}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </Panel>

      {/* ─── Session Cards ─── */}
      {loading ? (
        <Panel padding="none">
          <div className="flex items-center justify-center py-16 gap-2 text-neutral-400">
            <RefreshCw size={16} className="animate-spin" />
            <span className="text-sm">Loading STLC sessions...</span>
          </div>
        </Panel>
      ) : error ? (
        <Panel padding="none">
          <EmptyState
            icon={GitBranch}
            title="Failed to Load Sessions"
            description={error}
            className="py-12"
          />
        </Panel>
      ) : filteredSessions.length === 0 ? (
        <Panel padding="none">
          <EmptyState
            icon={Search}
            title="No Matching Sessions"
            description={searchTerm
              ? 'No sessions found matching your search criteria.'
              : 'No STLC process sessions have been recorded yet. Run an STLC process to create a session.'
            }
            className="py-12"
          />
        </Panel>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((session, idx) => {
            const sessionId = session.session_id || session._id || `session-${idx}`;
            const processes = session.processes || session.process_names || [];
            const processList = Array.isArray(processes) ? processes : Object.keys(processes);
            const date = session.timestamp || session.created_at;
            const isExpanded = expandedSession === sessionId;
            const processCount = session.process_count || processList.length;

            return (
              <Panel
                key={sessionId}
                padding="none"
                className="hover:shadow-soft-md transition-all"
              >
                <button
                  onClick={() => setExpandedSession(isExpanded ? null : sessionId)}
                  className="w-full p-5 text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Session Info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2 bg-primary-50 rounded-lg shrink-0">
                        <Layers size={16} className="text-primary-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-bold text-neutral-800">
                            {truncateId(sessionId)}
                          </span>
                          <StatusBadge
                            status="success"
                            label={`${processCount} process${processCount > 1 ? 'es' : ''}`}
                            size="sm"
                            showIcon={false}
                          />
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {processList.slice(0, 5).map(p => (
                            <StatusBadge
                              key={p}
                              status={PROCESS_COLORS[p] || 'info'}
                              label={processLabel(p)}
                              size="sm"
                              showIcon={false}
                            />
                          ))}
                          {processList.length > 5 && (
                            <span className="text-[10px] text-neutral-400 self-center">
                              +{processList.length - 5} more
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-neutral-400">
                          <span className="flex items-center gap-1"><Clock size={10} />{formatDate(date)}</span>
                          <span className="flex items-center gap-1"><Hash size={10} />{processCount} STLC phases</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Expand indicator */}
                    <div className="shrink-0">
                      {isExpanded
                        ? <ChevronUp size={16} className="text-neutral-400" />
                        : <ChevronDown size={16} className="text-neutral-400" />
                      }
                    </div>
                  </div>
                </button>

                {/* Expanded: Process details */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-0 border-t border-neutral-100">
                    <div className="mt-4">
                      <h5 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
                        STLC Processes in this Session
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {processList.map(p => (
                          <div
                            key={p}
                            className="flex items-center gap-2 p-2.5 bg-neutral-50 rounded-lg border border-neutral-100"
                          >
                            <GitBranch size={12} className="text-primary-500 shrink-0" />
                            <span className="text-xs font-medium text-neutral-700">{processLabel(p)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-neutral-100 text-[10px] text-neutral-400">
                      <span className="font-mono">Full ID: {sessionId}</span>
                    </div>
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SessionManager;
