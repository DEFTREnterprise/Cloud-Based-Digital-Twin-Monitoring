/**
 * STLC Manager API Service
 * ─────────────────────────
 * Connects to the STLC Manager running in Docker/Cloud.
 * Uses the shared apiClient factory for consistent error handling.
 *
 * Docker:      http://localhost:8000
 * Production:  https://stlc-manager.cloud.example.com
 *
 * ── Data Strategy ──
 * • API-backed data   → show "—" when disconnected, real data when connected
 * • Static/structural → always shown (STLC phase list, architecture info, etc.)
 */

import { createApiClient } from './apiClient';

const STLC_MANAGER_URL = import.meta.env.VITE_STLC_MANAGER_URL || 'http://localhost:8000';
const API_PREFIX = '/api';

// ─── Create client instance ──────────────────────────────────────────
const client = createApiClient(STLC_MANAGER_URL, 'stlc-manager');

// ─── Connection helpers (re-export for components) ───────────────────
export const checkHealth = () => client.healthCheck('/');

export const checkPromptsHealth = () => client.request(`${API_PREFIX}/health/prompts`);

export const onConnectionChange = (listener) => client.connection.subscribe(listener);

export const getConnectionStatus = () => client.connection.status;

// ─── STLC Process Sessions ──────────────────────────────────────────
export const getSTLCSessions = (filters = {}) =>
  client.post(`${API_PREFIX}/test-reporting/sessions`, {
    process_names: filters.processNames || null,
    date_from: filters.dateFrom || null,
    date_to: filters.dateTo || null,
  });

export const getClosureSessions = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.append('date_from', filters.dateFrom);
  if (filters.dateTo) params.append('date_to', filters.dateTo);
  const query = params.toString() ? `?${params.toString()}` : '';
  return client.get(`${API_PREFIX}/test-closure/available-sessions${query}`);
};

export const getTestReportSessions = (filters = {}) =>
  client.post(`${API_PREFIX}/test-reporting/sessions/test-reports`, {
    process_names: filters.processNames || null,
    date_from: filters.dateFrom || null,
    date_to: filters.dateTo || null,
  });

// ─── STLC Lifecycle Processes ────────────────────────────────────────
export const runCodeReview = (formData) =>
  client.postForm(`${API_PREFIX}/processes/code-review/run`, formData);

export const runRequirementAnalysis = (formData) =>
  client.postForm(`${API_PREFIX}/processes/requirement_analysis/run`, formData);

export const runTestPlanning = (formData) =>
  client.postForm(`${API_PREFIX}/processes/test-planning/run`, formData);

export const runTestScenarioGeneration = (formData) =>
  client.postForm(`${API_PREFIX}/processes/test-scenario-generation/run`, formData);

export const runEnvironmentSetup = (formData) =>
  client.postForm(`${API_PREFIX}/processes/environment-setup/run`, formData);

export const runTestCodeGeneration = (formData) =>
  client.postForm(`${API_PREFIX}/processes/test-code-generation/run`, formData);

export const runTestCaseGeneration = (formData) =>
  client.postForm(`${API_PREFIX}/processes/test-case-generation/run`, formData);

export const runTestCaseOptimization = (formData) =>
  client.postForm(`${API_PREFIX}/processes/test-case-optimization/run`, formData);

export const runTestReporting = (formData) =>
  client.postForm(`${API_PREFIX}/processes/test-reporting/run`, formData);

export const runTestClosure = (formData) =>
  client.postForm(`${API_PREFIX}/processes/test-closure/run`, formData);

// ─── Models ──────────────────────────────────────────────────────────
export const getAvailableModels = () =>
  client.get(`${API_PREFIX}/models`);

// ─── Test Execution ──────────────────────────────────────────────────
export const getExecutionProcessNames = () =>
  client.get(`${API_PREFIX}/test-execution/process-names`);

export const executeTests = (request) =>
  client.post(`${API_PREFIX}/test-execution/execute`, request);

// ─── Test Closure ────────────────────────────────────────────────────
export const getClosureMetrics = (sessionFilter) =>
  client.post(`${API_PREFIX}/test-closure/metrics`, sessionFilter);

// ─── Default Export ──────────────────────────────────────────────────
export default {
  checkHealth,
  checkPromptsHealth,
  getSTLCSessions,
  getClosureSessions,
  getTestReportSessions,
  runCodeReview,
  runRequirementAnalysis,
  runTestPlanning,
  runTestScenarioGeneration,
  runEnvironmentSetup,
  runTestCodeGeneration,
  runTestCaseGeneration,
  runTestCaseOptimization,
  runTestReporting,
  runTestClosure,
  getAvailableModels,
  getExecutionProcessNames,
  executeTests,
  getClosureMetrics,
  onConnectionChange,
  getConnectionStatus,
};
