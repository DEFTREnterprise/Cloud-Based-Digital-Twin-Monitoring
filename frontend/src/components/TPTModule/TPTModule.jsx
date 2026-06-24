import React, { useState, useCallback, Suspense, Component } from 'react';
import RunSelection from './RunSelection';
import ComparisonSection from './ComparisonSection';
import Canvas3D from './Canvas3D';
import ViolationTable from './ViolationTable';
import KPISummary from './KPISummary';
import Timeline from './Timeline';
import { tptSessions } from '../../data/mockTPTData';

// Error Boundary for Canvas3D
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Canvas3D Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full bg-slate-900 flex items-center justify-center text-red-400">
          <div className="text-center">
            <p className="text-lg font-bold mb-2">3D Canvas Yüklenemedi</p>
            <p className="text-sm text-slate-400">{this.state.error?.message || 'Bilinmeyen hata'}</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const TPTModule = () => {
  /**
   * isAnalyzed: Analyze butonuna basılıp basılmadığını kontrol eden kapı (gate).
   * false → Modül ilk açıldığında hiçbir bileşende veri gösterilmez.
   * true  → Analyze'a tıklanınca tüm bileşenler veriyle dolar.
   */
  const [isAnalyzed, setIsAnalyzed] = useState(false);

  // Seçili session (Visualization ve KPI için kullanılan ana session)
  // Başlangıçta null (veri yok)
  const [selectedSession, setSelectedSession] = useState(null);

  // Detay görünümü için violation seçimi
  const [selectedViolationId, setSelectedViolationId] = useState(null);

  // ── ACTUAL vs SIMULATED RUN STATE ──
  // localRunA -> actualRunId (Gerçek Robot)
  // localRunB -> simulatedRunId (Dijital İkiz)
  const [actualRunId, setActualRunId] = useState('');
  const [simulatedRunId, setSimulatedRunId] = useState('');

  // Analyze butonu → veriyi aktif et
  const handleAnalyze = useCallback((actId, simId) => {
    const session = tptSessions.find(s => s.id === actId);
    if (session) {
      setSelectedSession(session); // Visualization varsayılan olarak Actual Run gösterir
      setSimulatedRunId(simId || '');
      setIsAnalyzed(true);
      setSelectedViolationId(null);
    }
  }, []);

  // Refresh butonu → her şeyi sıfırla (ilk açılış gibi)
  const handleReset = useCallback(() => {
    setIsAnalyzed(false);
    setSelectedSession(null);
    setSimulatedRunId('');
    setActualRunId('');
    setSelectedViolationId(null);
  }, []);

  // Visualization içinden run değiştirilirse
  const handleRunSelect = (runId) => {
    const session = tptSessions.find(s => s.id === runId);
    if (session) {
      setSelectedSession(session);
      // Eğer seçilen run Actual ise onu da güncelle
      setActualRunId(runId);
      if (runId === simulatedRunId) setSimulatedRunId('');
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto space-y-6 p-6 bg-gray-50/50">
      {/* Run Selection (Sol) + Comparison Section (Sağ) — Yan yana */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Sol: Run Selection — 1/3 genişlik */}
        <div className="lg:col-span-1">
          <RunSelection
            sessions={tptSessions}
            selectedRunId={selectedSession?.id || ''}
            comparisonRunId={simulatedRunId}
            onAnalyze={handleAnalyze}
            onReset={handleReset}
            actualRunId={actualRunId}
            setActualRunId={setActualRunId}
            simulatedRunId={simulatedRunId}
            setSimulatedRunId={setSimulatedRunId}
          />
        </div>

        {/* Sağ: Comparison Section — 2/3 genişlik */}
        <div className="lg:col-span-2">
          <ComparisonSection
            sessions={tptSessions}
            actualRunId={isAnalyzed ? actualRunId : null}
            simulatedRunId={isAnalyzed ? simulatedRunId : null}
          />
        </div>
      </div>

      <div className="mb-2">
        <KPISummary selectedRun={isAnalyzed ? selectedSession : null} />
      </div>

      {/* Middle Section: Main 3D Visualization & Violations */}
      <div className="flex flex-col gap-6">
        {/* 3D Canvas Visualization - Full Width */}
        <Suspense fallback={<div className="w-full h-[600px] bg-slate-900 flex items-center justify-center text-slate-400">3D Canvas yükleniyor...</div>}>
          <ErrorBoundary>
            <Canvas3D
              selectedRunId={isAnalyzed ? selectedSession?.id : null}
              selectedViolationId={selectedViolationId}
              onViolationSelect={setSelectedViolationId}
            />
          </ErrorBoundary>
        </Suspense>

        {/* Timeline - Full Width */}
        <div className="w-full">
          <Timeline session={isAnalyzed ? selectedSession : null} />
        </div>

        {/* Violation List - Full Width below */}
        <div className="w-full">
          <ViolationTable
            violations={isAnalyzed ? (selectedSession?.violations || []) : []}
            selectedViolationId={selectedViolationId}
            onViolationSelect={setSelectedViolationId}
          />
        </div>
      </div>
    </div>
  );
};

export default TPTModule;
