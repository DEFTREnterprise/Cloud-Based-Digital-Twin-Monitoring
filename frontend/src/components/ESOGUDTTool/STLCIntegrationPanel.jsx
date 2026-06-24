import React, { useState, useEffect } from 'react';
import {
  Link2, GitBranch, FileCheck, ClipboardList, Target, CheckCircle2,
  AlertCircle, RefreshCw, ArrowRight, Database, Layers,
  FileText, Zap, Code, BarChart, UploadCloud, Play, PlayCircle, Loader2
} from 'lucide-react';
import { Panel, StatusBadge, EmptyState } from '../shared';
import API, { checkHealth, checkPromptsHealth, getConnectionStatus } from '../../services/api/stlcManagerApi';

const STLC_PHASES = [
  { id: 'code_review', label: '1. Code Review', icon: FileCheck, description: 'Static analysis, security assessment, performance evaluation' },
  { id: 'requirement_analysis', label: '2. Requirement Analysis', icon: ClipboardList, description: 'Requirement validation, gap analysis, compliance verification' },
  { id: 'test_planning', label: '3. Test Planning', icon: Target, description: 'Resource allocation, timeline management, Gantt chart generation' },
  { id: 'environment_setup', label: '4. Environment Setup', icon: Database, description: 'Configuration management' },
  { id: 'test_scenario_generation', label: '5. Test Scenario Generation', icon: GitBranch, description: 'Comprehensive test scenario generation' },
  { id: 'test_case_generation', label: '6. Test Case Generation', icon: FileText, description: 'Detailed test case specification, step-by-step procedures' },
  { id: 'test_case_optimization', label: '7. Test Case Optimization', icon: Zap, description: 'Smart selection for generated test cases' },
  { id: 'test_code_generation', label: '8. Test Code Generation', icon: Code, description: 'Automated test script generation' },
  { id: 'test_execution', label: '9. Test Execution', icon: Layers, description: 'Automated test running using the MCP Server' },
  { id: 'test_reporting', label: '10. Test Reporting', icon: BarChart, description: 'Comprehensive reporting, stakeholder communication' },
  { id: 'test_closure', label: '11. Test Closure', icon: CheckCircle2, description: 'Process completion analysis' },
];

const STLCIntegrationPanel = () => {
  const [connectionStatus, setConnectionStatus] = useState(getConnectionStatus());
  const [promptsStatus, setPromptsStatus] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState(null);

  // Global Context State
  const [selectedFile, setSelectedFile] = useState(null);

  // Phase Specific State
  const [customPrompt, setCustomPrompt] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const health = await checkHealth();
      setConnectionStatus(health.status);
      if (health.status === 'connected') {
        try {
          const prompts = await checkPromptsHealth();
          setPromptsStatus(prompts);
        } catch {
          setPromptsStatus(null);
        }
      }
    } catch {
      setConnectionStatus('disconnected');
    }
    setIsChecking(false);
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handlePhaseSelect = (id) => {
    setSelectedPhase(selectedPhase === id ? null : id);
    setExecutionResult(null);
    setCustomPrompt('');
    // Notice: We don't clear selectedFile anymore! It persists across phase selections.
  };

  const executePhase = async () => {
    if (!selectedPhase) return;
    setIsExecuting(true);
    setExecutionResult(null);

    try {
      let response;

      if (selectedPhase === 'test_execution') {
        // test_execution commonly takes JSON, handled specially if needed.
        // Leaving previous fallback implementation for compatibility.
        response = await API.executeTests({
          files: selectedFile ? [selectedFile.name] : [],
          options: { custom_prompt: customPrompt, model: "llama3.2:3b" }
        });
      } else {
        const formData = new FormData();

        // FastApi `files: List[UploadFile]` requires the file, or it throws 400!
        if (selectedFile) {
          formData.append('files', selectedFile);
        } else if (['code_review', 'requirement_analysis', 'test_planning', 'environment_setup', 'test_code_generation'].includes(selectedPhase)) {
          // Try to append empty string just to satisfy FastApi signature, but some strictly check len(files)>0
          throw new Error(`This STLC phase strictly requires you to attach a source file in the Global Context panel.`);
        }

        const promptValue = customPrompt || "Execute standard analysis for this phase based on the provided context.";
        formData.append('custom_prompt', promptValue);
        formData.append('model', 'llama3.2:3b'); // Forcing LM Studio model
        formData.append('session_id', 'CB_MDTMv2_SESSION');

        // Injecting required backend validation fields for each phase so FastApi accepts it
        switch (selectedPhase) {
          case 'environment_setup':
            formData.append('types', 'frontend');
            formData.append('environment_name', 'MDTMv2-Env');
            break;
          case 'test_scenario_generation':
            formData.append('final_prompt', promptValue);
            formData.append('process_title', 'MDTMv2_Test_Scenario_Run');
            formData.append('test_category', 'general');
            formData.append('test_type', 'functional');
            break;
          case 'test_case_generation':
            formData.append('process_prompt', promptValue);
            // Backend router expects `selected_scenarios`, etc. but this will bypass initial FastApi Form 422
            break;
          case 'test_case_optimization':
            formData.append('process_title', 'MDTMv2_Optimization_Run');
            break;
          case 'test_code_generation':
            formData.append('process_title', 'MDTMv2_Code_Gen_Run');
            formData.append('environment_session_id', 'ENV_1234');
            formData.append('environment_name', 'MDTMv2_Automated_Tests');
            break;
        }

        switch (selectedPhase) {
          case 'code_review': response = await API.runCodeReview(formData); break;
          case 'requirement_analysis': response = await API.runRequirementAnalysis(formData); break;
          case 'test_planning': response = await API.runTestPlanning(formData); break;
          case 'environment_setup': response = await API.runEnvironmentSetup(formData); break;
          case 'test_scenario_generation': response = await API.runTestScenarioGeneration(formData); break;
          case 'test_case_generation': response = await API.runTestCaseGeneration(formData); break;
          case 'test_case_optimization': response = await API.runTestCaseOptimization(formData); break;
          case 'test_code_generation': response = await API.runTestCodeGeneration(formData); break;
          case 'test_reporting': response = await API.runTestReporting(formData); break;
          case 'test_closure': response = await API.runTestClosure(formData); break;
          default: throw new Error("Phase action not mapped!");
        }
      }

      setExecutionResult({ type: 'success', data: response });
    } catch (err) {
      setExecutionResult({ type: 'error', message: err.message || 'Execution Failed. Make sure the backend accepts this request format.' });
    }
    setIsExecuting(false);
  };

  return (
    <div className="space-y-6">
      {/* ─── Connection Status Card ─── */}
      <Panel
        padding="lg"
        className={connectionStatus === 'connected' ? 'border-l-4 border-l-success-500' : 'border-l-4 border-l-error-500'}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${connectionStatus === 'connected' ? 'bg-success-50' : 'bg-neutral-100'}`}>
              <Link2 size={20} className={connectionStatus === 'connected' ? 'text-success-600' : 'text-neutral-400'} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-wider">STLC Manager API Connection</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                {connectionStatus === 'connected'
                  ? 'Cloud/Docker service is active and responding'
                  : 'Service connection failed — start Docker container or configure cloud URL'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge
              status={connectionStatus === 'connected' ? 'success' : 'critical'}
              label={connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
              size="md"
            />
            <button
              onClick={checkConnection}
              disabled={isChecking}
              className="p-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={`text-neutral-500 ${isChecking ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </Panel>

      {/* ─── Global Context / File Upload Panel ─── */}
      <Panel title="Global Project Context" icon={UploadCloud} padding="lg" className="border border-neutral-200 bg-white">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="flex-1 space-y-2 w-full">
            <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider">Source Files (Optional context for AI models)</label>
            <div className="border-2 border-dashed border-neutral-200 hover:border-primary-400 rounded-xl p-6 text-center transition-colors bg-neutral-50 hover:bg-white cursor-pointer group flex flex-col items-center justify-center relative">
              <UploadCloud size={28} className="text-neutral-400 group-hover:text-primary-500 mb-2 transition-colors" />
              <div className="text-sm font-medium text-neutral-700">Drop project files here or click to browse</div>
              <div className="text-xs text-neutral-400 mt-1">Accepts .zip, .java, .js, .pdf to be parsed by STLC steps</div>
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
              />
            </div>
            {selectedFile && (
              <div className="mt-3 text-sm text-primary-700 font-medium flex items-center justify-between bg-primary-50 border border-primary-200 px-4 py-3 rounded-xl shadow-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-primary-600" />
                  <span>Attached: <strong className="font-bold ml-1">{selectedFile.name}</strong></span>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-xs text-error-600 hover:text-error-800 font-bold uppercase tracking-wider px-2 py-1 rounded hover:bg-error-50 transition-colors"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          <div className="md:w-1/3 w-full bg-primary-50/50 p-5 rounded-xl border border-primary-100 flex flex-col h-full justify-center">
            <h4 className="text-xs font-bold text-primary-800 mb-2 flex items-center gap-2 uppercase tracking-wider">
              <Database size={14} /> Shared Context
            </h4>
            <p className="text-xs text-primary-700/90 leading-relaxed">
              Files uploaded here remain <strong>persistent</strong> across all STLC phase tests.
              You only need to upload your source code or requirements document once, and it will be attached globally to any action you run below.
            </p>
          </div>
        </div>
      </Panel>

      {/* ─── STLC Phases ─── */}
      <Panel title="STLC Lifecycle Phases" icon={GitBranch} padding="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {STLC_PHASES.map((phase) => {
            const Icon = phase.icon;
            const isSelected = selectedPhase === phase.id;

            return (
              <button
                key={phase.id}
                onClick={() => handlePhaseSelect(phase.id)}
                className={`text-left rounded-xl border p-4 transition-all duration-300 hover:shadow-soft-md ${isSelected
                  ? 'bg-primary-50 border-primary-400 shadow-soft-md transform scale-[1.02]'
                  : 'bg-white border-neutral-200 hover:border-primary-200'
                  }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg transition-colors ${isSelected ? 'bg-primary-500 shadow-md text-white' : 'bg-neutral-100 text-neutral-500'} shrink-0`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-sm font-bold ${isSelected ? 'text-primary-800' : 'text-neutral-700'}`}>{phase.label}</div>
                    <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">{phase.description}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <StatusBadge
                    status={connectionStatus === 'connected' ? "success" : "critical"}
                    label={connectionStatus === 'connected' ? "Ready" : "Offline"}
                    size="sm"
                    showIcon={false}
                  />
                  <ArrowRight size={14} className={`transition-transform duration-300 ${isSelected ? 'translate-x-1 text-primary-600' : 'text-neutral-300'}`} />
                </div>
              </button>
            );
          })}
        </div>
      </Panel>

      {/* ─── Selected Phase Configuration & Execution Panel ─── */}
      {selectedPhase && (
        <Panel title={`Execute: ${STLC_PHASES.find(p => p.id === selectedPhase)?.label}`} icon={PlayCircle} padding="lg" className="border border-primary-300 shadow-md animate-in slide-in-from-bottom-2 fade-in duration-300 bg-white">
          <div className="space-y-4">
            {/* Prompt Input Section */}
            <div className="space-y-2 flex flex-col">
              <label className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider">Custom Guidance / Prompt (Optional)</label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={`E.g., Any specific instructions or constraints for the ${STLC_PHASES.find(p => p.id === selectedPhase)?.label} phase...`}
                className="w-full flex-1 min-h-[100px] p-4 text-sm border border-neutral-200 rounded-xl bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all resize-none shadow-inner"
              />
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-neutral-100 mt-2">
              <div className="text-[10px] text-neutral-500 font-mono w-full sm:w-auto text-center sm:text-left">
                POST /api/processes/{selectedPhase.replace(/_/g, '-')}/run
                {!selectedFile && (
                  <div className="mt-1.5 text-warning-600 flex items-center justify-center sm:justify-start gap-1 font-sans font-medium">
                    <AlertCircle size={12} /> No file selected in global context. Running empty.
                  </div>
                )}
              </div>

              <button
                className="flex items-center justify-center w-full sm:w-auto gap-2 px-8 py-3 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-primary-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
                onClick={executePhase}
                disabled={isExecuting || connectionStatus !== 'connected'}
              >
                {isExecuting ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
                {isExecuting ? 'Running Process...' : 'Run This Phase'}
              </button>
            </div>

            {/* Execution Result */}
            {executionResult && (
              <div className={`mt-4 p-4 rounded-xl text-sm border shadow-sm ${executionResult.type === 'success' ? 'bg-success-50/50 border-success-200' : 'bg-error-50 border-error-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  {executionResult.type === 'success' ? (
                    <CheckCircle2 size={18} className="text-success-600" />
                  ) : (
                    <AlertCircle size={18} className="text-error-600" />
                  )}
                  <strong className={`font-bold uppercase tracking-wider text-xs ${executionResult.type === 'success' ? "text-success-800" : "text-error-800"}`}>
                    {executionResult.type === 'success' ? 'STLC Manager Response Detail' : 'Request Failed'}
                  </strong>
                </div>

                {executionResult.type === 'success' ? (
                  <div className="space-y-3">
                    <p className="text-xs text-success-800 font-medium bg-success-100/50 p-2 rounded-lg border border-success-200/50">
                      Phase executed successfully on the backend! You can also track this in the STLC Sessions table.
                    </p>
                    <div className="bg-white rounded-lg text-xs leading-relaxed text-neutral-800 font-mono overflow-auto max-h-[350px] border border-success-200 p-4 shadow-inner custom-scrollbar relative">
                      <span className="absolute top-2 right-3 text-[10px] text-success-400 font-bold uppercase tracking-widest bg-success-50 px-2 py-0.5 rounded pointer-events-none">RAW JSON API RESPONSE</span>
                      <pre className="mt-4">{JSON.stringify(executionResult.data, null, 2)}</pre>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/70 p-4 rounded-lg text-xs text-error-800 font-mono mt-2 overflow-x-auto whitespace-pre-wrap border border-error-100 shadow-inner">
                    <strong className="block mb-1 text-error-900 font-sans">Error Details:</strong>
                    {executionResult.message}
                  </div>
                )}
              </div>
            )}

          </div>
        </Panel>
      )}

      {/* ─── Architecture Info ─── */}
      <Panel title="Architecture Overview" icon={Layers} padding="lg">
        <div className="text-xs text-neutral-600 space-y-2 leading-relaxed">
          <p>
            STLC Manager runs as an independent microservice in a Docker container or cloud environment.
            The CB-MDTM tool orchestrates all 11 steps of the software testing life cycle by communicating with this service exclusively via REST API.
          </p>
          <div className="flex items-center gap-2 text-[11px] font-mono bg-neutral-50 border border-neutral-200 rounded-lg p-3 mt-2 overflow-hidden shadow-inner">
            <span className="text-primary-600 font-bold px-2 py-1 bg-white rounded shadow-sm">CB-MDTM</span>
            <ArrowRight size={12} className="text-neutral-400" />
            <span className="text-neutral-500 font-medium">REST API</span>
            <ArrowRight size={12} className="text-neutral-400" />
            <span className="text-success-600 font-bold px-2 py-1 bg-white rounded shadow-sm">STLC Manager Microservice</span>
            <ArrowRight size={12} className="text-neutral-400" />
            <span className="text-warning-600 font-bold px-2 py-1 bg-white rounded shadow-sm">MongoDB Core Storage</span>
          </div>
        </div>
      </Panel>
    </div>
  );
};

export default STLCIntegrationPanel;

