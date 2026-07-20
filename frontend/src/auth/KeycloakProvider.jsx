import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import axios from 'axios';

import { keycloak, KEYCLOAK_INIT_OPTIONS } from './keycloakConfig';
import { API_BASE_URL } from '../utils/api';
import {
  authStarted,
  authSucceeded,
  authFailed,
  authCleared,
  tokenRefreshed,
} from '../store/slices/authSlice';

/**
 * KeycloakProvider — Uygulama basladiginda Keycloak'i init eder, login
 * sonrasi backend /me'yi cagirir, sonucu Redux'a yazar, token refresh
 * timer'ini yonetir.
 *
 * Sarma stratejisi: main.jsx'de <Provider store={store}> ICINE konur,
 * cocuklarindan biri App.jsx'dir. Bu sayede dispatch mumkun.
 *
 * Neden Provider adiyla context expose etmiyoruz: keycloak instance'ini
 * cocuklar dogrudan store'dan (auth.token) okuyor; keycloak API'sine
 * (login/logout) ihtiyac duyanlar useKeycloak() hook'unu kullaniyor.
 */
export default function KeycloakProvider({ children }) {
  const dispatch = useDispatch();
  const initialized = useRef(false);
  const refreshTimer = useRef(null);

  useEffect(() => {
    // React 18 StrictMode dev'de effect'i iki kez calistirir; keycloak.init()
    // ikinci cagriya "already initialized" atar. Ref ile onluyoruz.
    if (initialized.current) return;
    initialized.current = true;

    dispatch(authStarted());

    keycloak
      .init(KEYCLOAK_INIT_OPTIONS)
      .then((authenticated) => {
        if (authenticated) {
          handleAuthenticated();
        } else {
          // check-sso: token yok, kullanici login butonuna basacak
          dispatch(authCleared());
        }
      })
      .catch((err) => {
        console.error('[Keycloak] init failed', err);
        dispatch(authFailed('Keycloak baglanti hatasi'));
      });

    // Keycloak-js event kancalari
    keycloak.onTokenExpired = () => {
      // 30 sn tolerans ile refresh; keycloak-js kendisi -1 gecerken
      // "expired" olur. updateToken(60) = "60 sn'den az kaldiysa yenile,
      // kaldiysa mevcut token'i dondur".
      keycloak
        .updateToken(60)
        .then((refreshed) => {
          if (refreshed) {
            dispatch(tokenRefreshed({
              token: keycloak.token,
              tokenExp: keycloak.tokenParsed?.exp ?? null,
            }));
          }
        })
        .catch(() => {
          console.warn('[Keycloak] token refresh failed -> logout');
          dispatch(authCleared());
          keycloak.login(); // refresh token da bitti, tekrar giris istensin
        });
    };

    keycloak.onAuthLogout = () => {
      clearRefreshTimer();
      dispatch(authCleared());
    };

    return clearRefreshTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Login basarili: /me'yi cagir, Redux'a birlesik profil yaz, refresh
   * timer'i baslat.
   */
  async function handleAuthenticated() {
    try {
      const meResp = await axios.get(`${API_BASE_URL}/api/v1/me`, {
        headers: { Authorization: `Bearer ${keycloak.token}` },
      });
      const me = meResp.data;

      // Token payload'undan tamamlayici bilgiler
      const parsed = keycloak.tokenParsed || {};

      dispatch(authSucceeded({
        token: keycloak.token,
        tokenExp: parsed.exp ?? null,
        user: {
          username: me.username ?? parsed.preferred_username ?? null,
          email: me.email ?? parsed.email ?? null,
          fullName: parsed.name ?? null,
          tenantCode: me.tenant_code ?? parsed.tenant_code ?? null,
          roles: me.roles ?? parsed.realm_access?.roles ?? [],
          allowedModules: me.allowed_modules ?? [],
        },
      }));

      startRefreshTimer();
    } catch (err) {
      console.error('[Keycloak] /me failed', err);
      const msg = err.response?.status === 401
        ? 'Token gecersiz'
        : 'Kullanici bilgisi alinamadi';
      dispatch(authFailed(msg));
    }
  }

  function startRefreshTimer() {
    clearRefreshTimer();
    // 30 sn'de bir kontrol: token'in 60 sn'den az omru kaldiysa yenile.
    refreshTimer.current = setInterval(() => {
      keycloak
        .updateToken(60)
        .then((refreshed) => {
          if (refreshed) {
            dispatch(tokenRefreshed({
              token: keycloak.token,
              tokenExp: keycloak.tokenParsed?.exp ?? null,
            }));
          }
        })
        .catch(() => {
          console.warn('[Keycloak] periodic refresh failed');
          clearRefreshTimer();
          dispatch(authCleared());
        });
    }, 30_000);
  }

  function clearRefreshTimer() {
    if (refreshTimer.current) {
      clearInterval(refreshTimer.current);
      refreshTimer.current = null;
    }
  }

  return children;
}