/**
 * Shared API Client Factory
 * ─────────────────────────
 * Creates reusable API clients for external Docker/Cloud services.
 * Each service (STLC Manager, PDM, TPT, etc.) can use this factory
 * to create its own client with a specific base URL.
 *
 * Usage:
 *   import { createApiClient } from './apiClient';
 *   const client = createApiClient('http://localhost:8000');
 *   const data = await client.get('/api/sessions');
 */

// ─── Connection State Manager ────────────────────────────────────────
const createConnectionManager = (serviceId) => {
  let _status = 'disconnected'; // 'connected' | 'disconnected' | 'checking'
  let _lastCheck = null;
  const _listeners = new Set();

  return {
    get status() { return _status; },
    get lastCheck() { return _lastCheck; },

    notify(newStatus) {
      _status = newStatus;
      _lastCheck = new Date();
      _listeners.forEach(fn => fn(newStatus, serviceId));
    },

    subscribe(listener) {
      _listeners.add(listener);
      return () => _listeners.delete(listener);
    },
  };
};

// ─── API Client Factory ──────────────────────────────────────────────
export const createApiClient = (baseUrl, serviceId = 'unknown') => {
  const connection = createConnectionManager(serviceId);

  const request = async (endpoint, options = {}) => {
    const url = `${baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      connection.notify('connected');
      return await response.json();
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        connection.notify('disconnected');
        throw new Error(`Could not connect to ${serviceId}. Is the service running?`);
      }
      throw error;
    }
  };

  const healthCheck = async (path = '/') => {
    connection.notify('checking');
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        connection.notify('connected');
        return { status: 'connected', url: baseUrl, timestamp: new Date() };
      }
      connection.notify('disconnected');
      return { status: 'disconnected', url: baseUrl, error: 'Unexpected response' };
    } catch (err) {
      connection.notify('disconnected');
      return { status: 'disconnected', url: baseUrl, error: err.message };
    }
  };

  return {
    serviceId,
    baseUrl,
    connection,
    request,
    healthCheck,

    // Convenience methods
    get: (endpoint) => request(endpoint, { method: 'GET' }),
    post: (endpoint, body) => request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    postForm: (endpoint, formData) =>
      fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' },
      }).then(r => r.json()),
  };
};

export default createApiClient;
