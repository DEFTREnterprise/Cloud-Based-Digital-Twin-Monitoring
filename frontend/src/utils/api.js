// Create axios instance with base configuration
import axios from 'axios';

import { store } from '../store';
import { authCleared, selectToken } from '../store/slices/authSlice';
import { keycloak } from '../auth/keycloakConfig';

// API Configuration - Vite uses import.meta.env instead of process.env
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 0, // No timeout - let operations complete regardless of duration
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---------------------------------------------------------------------------
// REQUEST INTERCEPTOR — her istege Redux'taki access token'i Authorization
// header'i olarak ekler. Token yoksa header eklemez (backend 401 dondurur).
// ---------------------------------------------------------------------------
api.interceptors.request.use(
  (config) => {
    // getState -> selector: component'lerin okumasi ile ayni kaynak
    const token = selectToken(store.getState());
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`,
      config.data || config.params);
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// RESPONSE INTERCEPTOR — 401 = token gecersiz/expired.
// Refresh timer normalde 60 sn kala yenilemis olur; buraya duserse
// refresh de bitmis demektir. Redux temizlenir, Keycloak login'e
// yonlendirilir. Cift-yonlendirme olmasin diye tek istekte tek kez
// tetiklenir (loop kirici).
// ---------------------------------------------------------------------------
let redirectingToLogin = false;

api.interceptors.response.use(
  (response) => {
    console.log(`[API] Response from ${response.config.url}:`, response.data);
    return response;
  },
  (error) => {
    if (error.response?.status === 401 && !redirectingToLogin) {
      redirectingToLogin = true;
      console.warn('[API] 401 -> auth cleared, redirecting to Keycloak login');
      store.dispatch(authCleared());
      // Kucuk gecikme: Redux state guncellensin, sonra Keycloak'a git
      setTimeout(() => {
        keycloak.login();
      }, 100);
    }
    console.error('[API] Response error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;