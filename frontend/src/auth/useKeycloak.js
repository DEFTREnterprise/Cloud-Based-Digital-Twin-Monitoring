import { useSelector } from 'react-redux';
import { keycloak } from './keycloakConfig';
import {
  selectAuthStatus,
  selectIsAuthenticated,
  selectUser,
  selectToken,
  selectAllowedModules,
  selectAuthError,
} from '../store/slices/authSlice';

/**
 * useKeycloak — component'lerin login/logout icin cagrilacak API'si.
 *
 * State okumalari Redux uzerinden yapilir (selector'lar); actionlar
 * (login/logout) keycloak-js singleton'una delege edilir.
 */
export function useKeycloak() {
  const status = useSelector(selectAuthStatus);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const token = useSelector(selectToken);
  const allowedModules = useSelector(selectAllowedModules);
  const error = useSelector(selectAuthError);

  return {
    // Durum
    status,           // 'idle' | 'authenticating' | 'authenticated' | ...
    isAuthenticated,
    user,             // { username, tenantCode, roles, allowedModules, ... } | null
    token,
    allowedModules,
    error,

    // Actionlar — keycloak-js redirect yapar; sonuc handleAuthenticated'da
    // yakalanip Redux'a yazilir.
    login: () => keycloak.login(),
    logout: () => keycloak.logout({ redirectUri: window.location.origin }),
    register: () => keycloak.register(),
  };
}