import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { Panel, Dropdown } from '../shared';

/**
 * CONTROL BAR BİLEŞENİ
 * Senaryo ve run seçimi için kontrol paneli.
 * Panel ve Dropdown ortak bileşenlerini kullanır.
 */
const ControlBar = () => {
  const [scenario, setScenario] = useState('Scenario 1');
  const [runA, setRunA] = useState('Run A-001');
  const [runB, setRunB] = useState('Run B-002');

  const scenarios = ['Scenario 1', 'Scenario 2', 'Scenario 3', 'Scenario 4'];
  const runs = ['Run A-001', 'Run A-002', 'Run A-003', 'Run B-001', 'Run B-002', 'Run B-003'];

  const runAOptions = runs.filter(run => run.startsWith('Run A'));
  const runBOptions = runs.filter(run => run.startsWith('Run B'));

  const handleAnalyze = () => {
    console.log('Starting analysis...', { scenario, runA, runB });
  };

  return (
    <Panel padding="md">
      <div className="flex items-center gap-4">
        {/* Scenario Selection */}
        <Dropdown
          label="Scenario Selection"
          value={scenario}
          options={scenarios}
          onChange={setScenario}
          minWidth="150px"
        />

        {/* Run A vs Run B */}
        <div className="flex items-end gap-2">
          <Dropdown
            label="Run A"
            value={runA}
            options={runAOptions}
            onChange={setRunA}
            minWidth="120px"
          />

          <span className="text-neutral-500 mb-2">vs</span>

          <Dropdown
            label="Run B"
            value={runB}
            options={runBOptions}
            onChange={setRunB}
            minWidth="120px"
          />
        </div>

        {/* Analyze Button */}
        <div className="ml-auto">
          <button
            onClick={handleAnalyze}
            className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-sm"
          >
            <Play size={18} />
            Analyze
          </button>
        </div>
      </div>
    </Panel>
  );
};

export default ControlBar;
