import React, { useState, useMemo } from 'react';
import { Search, Filter, X, CheckSquare } from 'lucide-react';
import { StatusBadge, Panel, EmptyState } from '../shared';

/**
 * VIOLATION TABLE BİLEŞENİ
 * İhlalleri listeleyen tablo bileşeni.
 * StatusBadge ortak bileşenini kullanır.
 */
const ViolationTable = ({ violations = [], selectedViolationId, onViolationSelect }) => {
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique violation types for the dropdown
  const violationTypes = useMemo(() => {
    return [...new Set(violations.map(v => v.type || 'Generic'))].sort();
  }, [violations]);

  const filteredViolations = useMemo(() => {
    return violations.filter(v => {
      // Severity Filter
      if (severityFilter !== 'ALL') {
        const vSev = v.severity?.toUpperCase();
        const fSev = severityFilter.toUpperCase();
        if (fSev === 'CRITICAL' && vSev !== 'CRITICAL') return false;
        if (fSev === 'WARN' && vSev !== 'WARN' && vSev !== 'WARNING') return false;
      }

      // Type Filter
      if (typeFilter !== 'ALL') {
        if ((v.type || 'Generic') !== typeFilter) return false;
      }

      // Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const ruleMatch = v.rule?.toLowerCase().includes(query);
        const idMatch = v.id?.toLowerCase().includes(query);
        const typeMatch = v.type?.toLowerCase().includes(query);
        if (!ruleMatch && !idMatch && !typeMatch) return false;
      }

      return true;
    });
  }, [violations, severityFilter, typeFilter, searchQuery]);

  // Severity -> StatusBadge status mapping
  const getStatusType = (severity) => {
    if (severity === 'Critical' || severity === 'CRITICAL') return 'critical';
    if (severity === 'Warning' || severity === 'WARN') return 'warning';
    return 'inactive';
  };

  // Row background styles
  const getSeverityRowStyles = (severity) => {
    if (severity === 'Critical' || severity === 'CRITICAL') return 'bg-error-50 border-error-200';
    if (severity === 'Warning' || severity === 'WARN') return 'bg-warning-50 border-warning-200';
    return 'bg-white border-neutral-200';
  };

  // Collision label helper
  const getCollisionLabel = (violation) => {
    if (typeof violation.collision === 'boolean') {
      return violation.collision ? 'Yes' : 'No';
    }
    return '—';
  };

  return (
    <Panel padding="none" fullHeight>
      {/* Header & Toolbar */}
      <div className="px-6 py-4 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-neutral-900">Violation Table</h3>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input
              type="text"
              placeholder="Search violations..."
              className="pl-9 pr-3 py-1.5 text-sm border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-48 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Severity Filter */}
          <div className="flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200">
            {['ALL', 'CRITICAL', 'WARN'].map(filter => (
              <button
                key={filter}
                onClick={() => setSeverityFilter(filter)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${severityFilter === filter
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
                  }`}
              >
                {filter === 'WARN' ? 'Warning' : filter.charAt(0) + filter.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          {violationTypes.length > 1 && (
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 text-sm border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500 bg-white"
              >
                <option value="ALL">All Types</option>
                {violationTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" size={14} />
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider w-32">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                Violation Type / Rule
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider w-32">
                Severity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider w-40">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider w-28">
                Collision
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 bg-white">
            {filteredViolations.length > 0 ? (
              filteredViolations.map((violation) => {
                const isSelected = selectedViolationId === violation.id;
                return (
                  <tr
                    key={violation.id}
                    onClick={() => onViolationSelect && onViolationSelect(isSelected ? null : violation.id)}
                    className={`border-b cursor-pointer transition-all ${getSeverityRowStyles(violation.severity)} ${isSelected ? 'ring-2 ring-primary-500 shadow-lg scale-[1.005] z-10 relative' : 'hover:opacity-90'}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                      {violation.time || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-700">
                      <div className="font-medium text-neutral-900">
                        {violation.type ? violation.type.replace(/_/g, ' ') : 'Violation'}
                      </div>
                      <div className="text-neutral-500 text-xs mt-0.5">{violation.rule}</div>
                      {violation.deviation && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-white/60 border border-neutral-200 rounded text-xs text-neutral-500 font-mono">
                          {violation.deviation}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge
                        status={getStatusType(violation.severity)}
                        label={violation.severity}
                        size="sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {violation.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">
                      {getCollisionLabel(violation)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="4">
                  <EmptyState
                    icon={Filter}
                    title="No Matching Violations"
                    description="No violations found matching your current filters."
                    action={
                      (searchQuery || severityFilter !== 'ALL' || typeFilter !== 'ALL') && (
                        <button
                          onClick={() => { setSearchQuery(''); setSeverityFilter('ALL'); setTypeFilter('ALL'); }}
                          className="text-sm font-medium text-primary-600 hover:text-primary-700 underline"
                        >
                          Clear all filters
                        </button>
                      )
                    }
                    className="py-12"
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

export default ViolationTable;
