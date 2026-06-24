/**
 * External API Services Registry
 * ───────────────────────────────
 * Central registry for all Docker/Cloud service API clients.
 * Add new services here as they are containerized.
 *
 * Currently registered:
 *   - STLC Manager (Docker: localhost:8000)
 *
 * Future services:
 *   - PDM Service
 *   - TPT Service
 *   - etc.
 */

// ─── Service API Clients ─────────────────────────────────────────────
export * as stlcManager from './stlcManagerApi';

// ─── Shared Utilities ────────────────────────────────────────────────
export { createApiClient } from './apiClient';

/**
 * Service Registry
 * Maps service IDs to their modules for dynamic access.
 * Example: services['stlc-manager'].checkHealth()
 */
import * as stlcManagerApi from './stlcManagerApi';

export const services = {
  'stlc-manager': stlcManagerApi,
  // Future: 'pdm': pdmApi,
  // Future: 'tpt': tptApi,
};

/**
 * Check health of all registered services
 */
export const checkAllServicesHealth = async () => {
  const results = {};
  for (const [id, service] of Object.entries(services)) {
    try {
      results[id] = await service.checkHealth();
    } catch (err) {
      results[id] = { status: 'disconnected', error: err.message };
    }
  }
  return results;
};
