/**
 * PLATFORM BACKEND — General Platform Management (System Overview)
 *
 * Thin mock service layer that wraps `mockPlatformData` helpers,
 * similar to other *Backend.js files in the project.
 */

import {
  Platform_Identity_Context,
  Platform_Service_Health,
  Platform_App_Metrics,
  Platform_Resource_Usage,
  getPlatformHealthSummary,
  getIngestPanelData,
  getRecentRuns,
  getCriticalEventsFeed,
  getPlatformConfigOverview,
} from '../data/mockPlatformData';

export const fetchPlatformIdentity = () => {
  return Platform_Identity_Context;
};

export const fetchPlatformHealthSummary = () => {
  return getPlatformHealthSummary();
};

export const fetchPlatformResourceUsage = () => {
  return Platform_Resource_Usage;
};

export const fetchServiceHealth = () => {
  return Platform_Service_Health;
};

export const fetchAppMetrics = () => {
  return Platform_App_Metrics;
};

export const fetchIngestPanelData = () => {
  return getIngestPanelData();
};

export const fetchRecentRuns = () => {
  return getRecentRuns();
};

export const fetchCriticalEventsFeed = () => {
  return getCriticalEventsFeed();
};

export const fetchPlatformConfigOverview = () => {
  return getPlatformConfigOverview();
};

