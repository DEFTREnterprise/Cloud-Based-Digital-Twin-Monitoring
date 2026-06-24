import React, { useState, useMemo, useEffect } from 'react';
import { Play, GitCompareArrows, RotateCcw, Truck } from 'lucide-react';
import { Panel, Dropdown } from '../shared'; // Using shared Dropdown
import { fetchVehicles, fetchFilteredRuns } from '../../services/runSelectionBackend';

/**
 * RUN SELECTION BİLEŞENİ
 * 
 * Uses shared Dropdown component for consistent UI.
 */
const RunSelection = ({
    sessions,
    selectedRunId,
    comparisonRunId,
    onAnalyze,
    onReset,
    actualRunId,
    setActualRunId,
    simulatedRunId,
    setSimulatedRunId,
}) => {
    const initialRun = sessions.find(s => s.id === selectedRunId);

    // ORTAK ARAÇ SEÇİMİ
    const [selectedVehicle, setSelectedVehicle] = useState(initialRun ? initialRun.vehicleId : '');

    // FİLTRE STATE'LERİ
    const [actualStatusFilter, setActualStatusFilter] = useState('ALL');
    const [actualDateFilter, setActualDateFilter] = useState('ALL');
    const [simulatedStatusFilter, setSimulatedStatusFilter] = useState('ALL');
    const [simulatedDateFilter, setSimulatedDateFilter] = useState('ALL');

    const vehicles = useMemo(() => fetchVehicles(sessions), [sessions]);

    // Format options for Dropdown
    const vehicleOptions = useMemo(() => vehicles.map(v => ({ value: v, label: v })), [vehicles]);

    const statusOptions = [
        { value: 'ALL', label: 'All Status' },
        { value: 'SUCCESS', label: 'Success' },
        { value: 'FAIL', label: 'Fail' }
    ];

    const dateOptions = [
        { value: 'ALL', label: 'All Time' },
        { value: '24H', label: 'Last 24h' }
    ];

    // Initial load logic
    useEffect(() => {
        if (!selectedVehicle && vehicles.length > 0) {
            setSelectedVehicle(vehicles[0]);
        }
    }, [vehicles, selectedVehicle]);

    // External prop update logic
    useEffect(() => {
        if (selectedRunId) {
            setActualRunId(selectedRunId);
            const run = sessions.find(s => s.id === selectedRunId);
            if (run && run.vehicleId !== selectedVehicle) {
                setSelectedVehicle(run.vehicleId);
            }
        }
    }, [selectedRunId, sessions]);

    // Reset selections on vehicle change
    useEffect(() => {
        const actRun = sessions.find(s => s.id === actualRunId);
        if (actRun && actRun.vehicleId !== selectedVehicle) {
            setActualRunId('');
        }
        const simRun = sessions.find(s => s.id === simulatedRunId);
        if (simRun && simRun.vehicleId !== selectedVehicle) {
            setSimulatedRunId('');
        }
    }, [selectedVehicle, sessions, actualRunId, simulatedRunId]);

    // Reset All logic
    useEffect(() => {
        if (!actualRunId && !simulatedRunId && !selectedRunId) {
            setActualStatusFilter('ALL');
            setActualDateFilter('ALL');
            setSimulatedStatusFilter('ALL');
            setSimulatedDateFilter('ALL');
        }
    }, [actualRunId, simulatedRunId, selectedRunId, selectedVehicle]);

    // Filter runs
    const filteredActualRuns = useMemo(() =>
        fetchFilteredRuns(sessions, selectedVehicle, actualStatusFilter, actualDateFilter),
        [sessions, selectedVehicle, actualStatusFilter, actualDateFilter]
    );
    const filteredSimulatedRuns = useMemo(() =>
        fetchFilteredRuns(sessions, selectedVehicle, simulatedStatusFilter, simulatedDateFilter),
        [sessions, selectedVehicle, simulatedStatusFilter, simulatedDateFilter]
    );

    // Prepare options for Run Dropdowns
    const actualRunOptions = useMemo(() => filteredActualRuns.map(r => ({
        value: r.id,
        label: `${r.id} • ${r.date} • ${r.componentName || r.testPlan}`
    })), [filteredActualRuns]);

    const simulatedRunOptions = useMemo(() => filteredSimulatedRuns
        .filter(r => r.id !== actualRunId)
        .map(r => ({
            value: r.id,
            label: `${r.id} • ${r.date} • ${r.componentName || r.testPlan}`
        })),
        [filteredSimulatedRuns, actualRunId]
    );

    const handleAnalyze = () => {
        if (actualRunId && simulatedRunId) {
            onAnalyze(actualRunId, simulatedRunId);
        }
    };

    return (
        <Panel padding="lg" className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-neutral-100 flex-none">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg shadow-sm">
                        <GitCompareArrows size={18} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-neutral-800">Run Selection</h3>
                        <p className="text-xs text-neutral-500">Select actual & simulated runs to compare</p>
                    </div>
                </div>

                <button
                    onClick={onReset}
                    title="Reset all selections"
                    className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                    <RotateCcw size={16} />
                </button>
            </div>

            <div className="space-y-6">

                {/* ── COMMON VEHICLE SELECTION ── */}
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                        <Truck size={14} className="text-gray-500" />
                        Selected Vehicle (Chassis)
                    </label>
                    <Dropdown
                        value={selectedVehicle}
                        onChange={setSelectedVehicle}
                        options={vehicleOptions}
                        placeholder="Select Vehicle..."
                        className="w-full"
                    />
                    <p className="text-[10px] text-gray-400 mt-1 pl-1">
                        Select the vehicle chassis type to filter available runs.
                    </p>
                </div>


                {/* ── Actual Run Group ── */}
                <div className="space-y-3 p-4 rounded-r-lg border-l-4 border-l-blue-600 border-y border-r border-gray-100 bg-white relative shadow-sm">
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-blue-50 text-[10px] font-bold text-blue-600 rounded">REAL</div>
                    <div className="flex justify-between items-center mb-1">
                        <div className="text-xs font-bold text-gray-800 uppercase tracking-wider">Actual Run</div>
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <Dropdown
                            value={actualStatusFilter}
                            onChange={setActualStatusFilter}
                            options={statusOptions}
                            placeholder="Status"
                            className="w-full text-xs"
                        />
                        <Dropdown
                            value={actualDateFilter}
                            onChange={setActualDateFilter}
                            options={dateOptions}
                            placeholder="Date"
                            className="w-full text-xs"
                        />
                    </div>

                    <div>
                        <Dropdown
                            value={actualRunId}
                            onChange={setActualRunId}
                            options={actualRunOptions}
                            placeholder="Select Actual Run..."
                            className="w-full"
                        />
                    </div>
                </div>

                {/* ── Simulated Run Group ── */}
                <div className="space-y-3 p-4 rounded-r-lg border-l-4 border-l-amber-500 border-y border-r border-gray-100 bg-white relative shadow-sm">
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-amber-50 text-[10px] font-bold text-amber-600 rounded">DIGITAL TWIN</div>
                    <div className="flex justify-between items-center mb-1">
                        <div className="text-xs font-bold text-gray-800 uppercase tracking-wider">Simulated Run</div>
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <Dropdown
                            value={simulatedStatusFilter}
                            onChange={setSimulatedStatusFilter}
                            options={statusOptions}
                            placeholder="Status"
                            className="w-full text-xs"
                        />
                        <Dropdown
                            value={simulatedDateFilter}
                            onChange={setSimulatedDateFilter}
                            options={dateOptions}
                            placeholder="Date"
                            className="w-full text-xs"
                        />
                    </div>

                    <div>
                        <Dropdown
                            value={simulatedRunId}
                            onChange={setSimulatedRunId}
                            options={simulatedRunOptions}
                            placeholder={actualRunId ? "Select Simulated Run..." : "Select Actual Run First"}
                            disabled={!actualRunId && filteredSimulatedRuns.length > 0}
                            className="w-full"
                        />
                    </div>
                </div>

                {/* Analyze Button */}
                <button
                    onClick={handleAnalyze}
                    disabled={!actualRunId || !simulatedRunId}
                    className="w-full flex justify-center items-center gap-2 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-3 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                    <Play size={16} fill="currentColor" />
                    Analyze Comparison
                </button>
            </div>
        </Panel>
    );
};

export default RunSelection;
