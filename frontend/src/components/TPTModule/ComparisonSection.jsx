import React, { useMemo } from 'react';
import { BarChart3, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { Panel, EmptyState } from '../shared';
import { fetchComparisonData } from '../../services/comparisonBackend';

/**
 * COMPARISON SECTION BİLEŞENİ
 * 
 * Updated Style:
 * - Removed column backgrounds.
 * - Metric values: Monospace, Normal Weight, Dark Gray.
 * - Delta: Small colored badges.
 * - Units: Moved to Metric Label column.
 */
const ComparisonSection = ({ sessions, actualRunId, simulatedRunId }) => {

    const { actual: actualMetrics, simulated: simulatedMetrics, validationStatus } = useMemo(
        () => actualRunId ? fetchComparisonData(sessions, actualRunId, simulatedRunId) : { actual: null, simulated: null, validationStatus: null },
        [sessions, actualRunId, simulatedRunId]
    );

    if (!actualRunId) {
        return (
            <Panel padding="lg" className="h-full flex flex-col">
                <div className="flex items-center gap-3 mb-5 pb-3 border-b border-neutral-100 flex-none">
                    <div className="p-2 bg-amber-600 rounded-lg shadow-sm">
                        <BarChart3 size={18} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-neutral-800">Comparison Section</h3>
                        <p className="text-xs text-neutral-500">Actual (Real Robot) vs. Simulated (Digital Twin)</p>
                    </div>
                </div>
                <EmptyState
                    icon={BarChart3}
                    title="No Analysis Yet"
                    description="Select runs from the left panel and click Analyze to view comparison metrics."
                    className="flex-1 min-h-[200px] flex flex-col justify-center"
                />
            </Panel>
        );
    }

    const parseUnitVal = (str) => {
        if (!str || typeof str !== 'string') return 0;
        return parseFloat(str.split(' ')[0]) || 0;
    };

    const formatDiff = (d) => {
        if (Math.abs(d) < 0.01) return '0';
        return d.toFixed(2);
    };

    // ── Delta Hücresi (Badge Stili) ──
    const renderDiffCell = (actualObj, simObj, row) => {
        const valA = actualObj ? actualObj[row.keyActual] : undefined;
        const valB = simObj ? simObj[row.keySimulated] : undefined;

        if (row.type === 'date-time' || row.type === 'text') {
            return <span className="text-gray-300">-</span>;
        }

        if (valA === undefined || valB === undefined || valB === null) return <span className="text-gray-300">-</span>;

        let diff = 0;
        let diffDisplay = '';
        let badgeClass = "bg-gray-100 text-gray-500 border-gray-200"; // Neutral Default

        // 1. Calculate Diff Value & Text
        if (row.type === 'number-percent') {
            const numA = actualObj.processedWaypointsRaw || 0;
            const numB = simObj.processedWaypointsRaw || 0;
            diff = numB - numA;
            if (numA === 0) diffDisplay = diff > 0 ? '+Inf%' : '0%';
            else {
                const pct = ((diff / numA) * 100).toFixed(1);
                diffDisplay = `${diff > 0 ? '+' : ''}${pct}%`;
            }
        }
        else if (row.type === 'duration') {
            const rawA = actualObj.durationMs || 0;
            const rawB = simObj.durationMs || 0;
            diff = rawB - rawA;
            const absMs = Math.abs(diff);
            const min = Math.floor(absMs / 60000);
            const sec = ((absMs % 60000) / 1000).toFixed(1);
            const sign = diff > 0 ? '+' : (diff < 0 ? '-' : '');

            if (min > 0) diffDisplay = `${sign}${min}m ${sec}s`;
            else diffDisplay = `${sign}${sec}s`;
        }
        else if (row.type === 'unit-val') {
            const numA = parseUnitVal(valA);
            const numB = parseUnitVal(valB);
            diff = numB - numA;
            // Unit removed from display
            diffDisplay = `${diff > 0 ? '+' : ''}${formatDiff(diff)}`;
        }
        else if (row.type === 'number') {
            diff = valB - valA;
            diffDisplay = `${diff > 0 ? '+' : ''}${diff}`;
        }

        // 2. Determine Badge Color
        // Duration: Negative is Green (Faster), Positive is Red (Slower)
        if (row.type === 'duration') {
            if (diff < -100) badgeClass = "bg-emerald-100 text-emerald-700 border-emerald-200";
            else if (diff > 100) badgeClass = "bg-red-100 text-red-700 border-red-200";
        }
        else {
            if (diff > 0) badgeClass = "bg-blue-50 text-blue-700 border-blue-200";
            else if (diff < 0) badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
        }

        if (row.type !== 'duration' && Math.abs(diff) < 0.001) {
            diffDisplay = "0";
            badgeClass = "bg-gray-50 text-gray-400 border-gray-100";
        }

        return (
            <div className="flex justify-end">
                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-medium border ${badgeClass} min-w-[40px]`}>
                    {diffDisplay}
                </span>
            </div>
        );
    };

    // Tablo Satır Tanımları (Units Moved Here)
    const metricRows = [
        { label: 'Start - End Time', keyActual: 'timeRange', keySimulated: 'timeRange', type: 'date-time' },
        { label: 'Operation Time', keyActual: 'operationTime', keySimulated: 'operationTime', type: 'duration' }, // Unit handled by formatting (m s)
        { label: 'Avg Speed (mm/s)', keyActual: 'avgSpeed', keySimulated: 'avgSpeed', type: 'unit-val' }, // Unit explicitly added
        { label: 'Avg Acceleration (mm/s²)', keyActual: 'avgAccel', keySimulated: 'avgAccel', type: 'unit-val' }, // Unit explicitly added
        { label: 'Processed Waypoints', keyActual: 'processedWaypoints', keySimulated: 'processedWaypoints', type: 'number-percent' },
    ];

    const renderStatusBadgeHeader = () => {
        if (!validationStatus || !simulatedMetrics) return null;

        let icon = null;
        let text = '';
        let style = '';

        if (validationStatus === 'SUCCESS') {
            icon = <CheckCircle2 size={16} className="mr-1.5" />;
            text = 'Success';
            style = 'bg-emerald-100 text-emerald-700 border-emerald-200';
        } else if (validationStatus === 'FAIL') {
            icon = <XCircle size={16} className="mr-1.5" />;
            text = 'Fail';
            style = 'bg-red-100 text-red-700 border-red-200';
        } else if (validationStatus === 'RUNNING') {
            icon = <Clock size={16} className="mr-1.5 animate-pulse" />;
            text = 'Running';
            style = 'bg-blue-100 text-blue-700 border-blue-200';
        } else if (validationStatus === 'CANCELLED') {
            icon = <AlertCircle size={16} className="mr-1.5" />;
            text = 'Cancelled';
            style = 'bg-gray-100 text-gray-700 border-gray-200';
        }

        return (
            <div className={`flex items-center px-3 py-1 rounded-md text-xs font-bold border ml-auto ${style}`}>
                {icon}
                {text.toUpperCase()}
            </div>
        );
    };

    const formatValue = (val, row) => {
        if (val === undefined || val === null) return '-';
        if (row.format) return row.format(val);

        // Date-Time Özel Formatlama
        if (row.type === 'date-time') {
            if (typeof val === 'object' && val.time) {
                return (
                    <div className="flex flex-col items-end leading-tight">
                        <span className="font-medium text-gray-900 text-sm">{val.time}</span> {/* Normal weight */}
                        <span className="text-[10px] text-neutral-400 mt-0.5">{val.date}</span>
                    </div>
                );
            }
            return '-';
        }

        // Unit Removal Logic: If it's number-like string with unit, strip it.
        // But wait, 'operationTime' comes as 'Xm Ys', we keep that.
        // 'avgSpeed' comes as '50 mm/s', we want just '50'.
        if (row.type === 'unit-val' && typeof val === 'string') {
            return parseFloat(val.split(' ')[0]) || val;
        }

        return val;
    };

    return (
        <Panel padding="lg" className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-neutral-100 flex-none">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-600 rounded-lg shadow-sm">
                        <BarChart3 size={18} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-neutral-800">Comparison Section</h3>
                        <p className="text-xs text-neutral-500">Actual (Real Robot) vs. Simulated (Digital Twin)</p>
                    </div>
                </div>

                {renderStatusBadgeHeader()}
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto rounded-lg border border-gray-200 flex-1">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th scope="col" className="px-6 py-4 text-left font-semibold">Metric</th>
                            {/* Colors Removed */}
                            <th scope="col" className="px-6 py-4 text-right font-semibold border-l border-gray-100">Actual (Real)</th>
                            <th scope="col" className="px-6 py-4 text-right font-semibold border-l border-gray-100">Simulated (DT)</th>
                            <th scope="col" className="px-6 py-4 text-right font-semibold border-l border-gray-100">Delta</th>
                        </tr>
                    </thead>
                    <tbody>
                        {metricRows.map((row, idx) => (
                            <tr key={row.label} className={`bg-white border-b hover:bg-gray-50 ${idx === metricRows.length - 1 ? 'border-b-0' : ''}`}>
                                <td className="px-6 py-4 font-medium text-gray-900 border-r border-gray-100 text-left text-sm whitespace-nowrap">
                                    {row.label}
                                </td>
                                {/* Values: Monospace, Normal, Dark Gray */}
                                <td className="px-6 py-4 font-mono tabular-nums text-right text-gray-700 text-sm align-middle border-r border-gray-100">
                                    {formatValue(actualMetrics ? actualMetrics[row.keyActual] : undefined, row)}
                                </td>
                                <td className="px-6 py-4 font-mono tabular-nums text-right text-gray-700 text-sm align-middle border-r border-gray-100">
                                    {formatValue(simulatedMetrics ? simulatedMetrics[row.keySimulated] : undefined, row)}
                                </td>
                                <td className="px-6 py-4 text-right align-middle text-sm"> {/* Delta Badge */}
                                    {renderDiffCell(actualMetrics, simulatedMetrics, row)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {!simulatedMetrics && (
                <div className="py-4 flex-none">
                    <p className="text-xs text-center text-neutral-400 italic">
                        * Select a Simulated Run to see comparison
                    </p>
                </div>
            )}
        </Panel>
    );
};

export default ComparisonSection;
