import { createSlice } from '@reduxjs/toolkit';

/**
 * authSlice — Frontend auth state'inin tek dogruluk kaynagi.
 *
 * KeycloakProvider (P0.4) buraya token/user/roles/allowedModules yazar.
 * Sidebar (P0.9), App (P0.7), api.js (P0.6) buradan okur. Component'ler
 * state'e dogrudan degil, alttaki selector'lar uzerinden erisir.
 *
 * Backend hizalamasi:
 *   - roles: Keycloak realm_access.roles (ornekler:
 *     ["OTOKAR_Viewer"], ["ESOGU_Operator"], ["DEFTR_Admin"])
 *   - allowedModules: /api/v1/me -> allowed_modules (backend authz.py,
 *     ornekler: ["live","pdm","settings"] / ["live","esogu","settings"])
 *   - tenantCode: token'daki tenant_code mapper cikti (OTOKAR/ESOGU/DEFTR)
 */

const initialState = {
  // Auth akis durumu (Sidebar/loading/error UI icin)
  status: 'idle', // 'idle' | 'authenticating' | 'authenticated' | 'unauthenticated' | 'error'

  // Keycloak access token (Bearer olarak API'ye eklenecek)
  token: null,
  tokenExp: null, // epoch seconds — token refresh timing icin

  // Kullanici profili (backend /me + Keycloak token birlesimi)
  user: null,
  // sekli: {
  //   username: string,
  //   email: string | null,
  //   fullName: string | null,
  //   tenantCode: string | null,   // OTOKAR / ESOGU / DEFTR
  //   roles: string[],             // realm rolleri
  //   allowedModules: string[],    // backend /me'den
  // }

  error: null, // insan-okur hata mesaji (login fail, /me fail, refresh fail)
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** Keycloak init/login basladi. */
    authStarted: (state) => {
      state.status = 'authenticating';
      state.error = null;
    },

    /**
     * Login basarili + /me cevabi geldi.
     * payload: { token, tokenExp, user }
     */
    authSucceeded: (state, action) => {
      const { token, tokenExp, user } = action.payload;
      state.status = 'authenticated';
      state.token = token;
      state.tokenExp = tokenExp;
      state.user = user;
      state.error = null;
    },

    /**
     * Login/init/refresh basarisiz.
     * payload: string (hata mesaji)
     */
    authFailed: (state, action) => {
      state.status = 'error';
      state.token = null;
      state.tokenExp = null;
      state.user = null;
      state.error = action.payload || 'Kimlik dogrulama basarisiz';
    },

    /** Logout ya da token expired — state tamamen temizlenir. */
    authCleared: (state) => {
      state.status = 'unauthenticated';
      state.token = null;
      state.tokenExp = null;
      state.user = null;
      state.error = null;
    },

    /**
     * Keycloak sessizce refresh etti — user aynen kalir, token guncellenir.
     * payload: { token, tokenExp }
     */
    tokenRefreshed: (state, action) => {
      const { token, tokenExp } = action.payload;
      state.token = token;
      state.tokenExp = tokenExp;
    },
  },
});

export const {
  authStarted,
  authSucceeded,
  authFailed,
  authCleared,
  tokenRefreshed,
} = authSlice.actions;

// ---------------------------------------------------------------------------
// SELECTORS  —  component'ler state'e dogrudan degil buradan erisir
// ---------------------------------------------------------------------------

export const selectAuthStatus = (state) => state.auth.status;
export const selectToken = (state) => state.auth.token;
export const selectTokenExp = (state) => state.auth.tokenExp;
export const selectAuthError = (state) => state.auth.error;

export const selectUser = (state) => state.auth.user;
export const selectUsername = (state) => state.auth.user?.username ?? null;
export const selectTenantCode = (state) => state.auth.user?.tenantCode ?? null;
// Referans stabil bos array'ler — her cagrida yeni [] uretmemek icin.
// React-Redux'in default equality'si (referans) sonsuz re-render tetiklerdi.
const EMPTY_ROLES = Object.freeze([]);
const EMPTY_MODULES = Object.freeze([]);

export const selectRoles = (state) => state.auth.user?.roles ?? EMPTY_ROLES;
export const selectAllowedModules = (state) =>
  state.auth.user?.allowedModules ?? EMPTY_MODULES;

export const selectIsAuthenticated = (state) =>
  state.auth.status === 'authenticated' && !!state.auth.token;

/**
 * Sidebar'in P0.9'da kullanacagi anahtar selector.
 * moduleId frontend Sidebar item.id ile ayni ('live','platform','tpt',
 * 'esogu','pdm','settings'). Backend authz.py bu id'lere hizalidir.
 */
export const selectHasModule = (moduleId) => (state) =>
  (state.auth.user?.allowedModules ?? []).includes(moduleId);

// ---------------------------------------------------------------------------
// PRIMARY ROLE — Keycloak default rollerini atlayarak anlamli rolu doner.
// Neden gerekli: Keycloak realm rolleri arasinda otomatik olarak
//   'default-roles-<realm>', 'offline_access', 'uma_authorization' gibi
// teknik roller de gelir. Bunlar UI'da bilgi tasimaz; ilk anlamli rolu
// (ornekler: OTOKAR_Viewer, ESOGU_Operator, DEFTR_Admin) gostermek isteriz.
// ---------------------------------------------------------------------------
const TECHNICAL_ROLE_PATTERNS = [
    /^default-roles-/,
    /^offline_access$/,
    /^uma_authorization$/,
];

export const selectPrimaryRole = (state) => {
    const roles = state.auth.user?.roles;
    if (!Array.isArray(roles) || roles.length === 0) return null;
    const meaningful = roles.find(
        r => !TECHNICAL_ROLE_PATTERNS.some(pat => pat.test(r))
    );
    return meaningful ?? roles[0];
};

export default authSlice.reducer;