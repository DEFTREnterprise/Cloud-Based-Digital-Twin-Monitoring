/**
 * keycloakConfig.js — Keycloak-js init parametreleri.
 *
 * Env'den okur, prod'da Ankara ayarlari .env.production'a yazilir. Client
 * public + PKCE (Faz 2 ADIM 18 karari).
 */
import Keycloak from 'keycloak-js';

export const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080';
export const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM || 'cbmdtm';
export const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'cbmdtm-frontend';

// Not: Keycloak sinifi HMR'de birden fazla instance yaratmasin diye
// modul-seviyesinde singleton olarak tutuyoruz. Provider'da .init() sadece
// bir kez cagirilir (initialized bayragi ile).
export const keycloak = new Keycloak({
  url: KEYCLOAK_URL,
  realm: KEYCLOAK_REALM,
  clientId: KEYCLOAK_CLIENT_ID,
});

// keycloak-js init secenekleri — bkz. https://www.keycloak.org/docs/latest/securing_apps/
export const KEYCLOAK_INIT_OPTIONS = {
  // check-sso: token varsa sessiz alir; yoksa login sayfasina YONLENDIRMEZ.
  // Login butonuna tiklamayi biz yonetiriz (LoginPage -> keycloak.login()).
  onLoad: 'check-sso',
  // Silent SSO icin ayri bir sayfa acmaya gerek yok (router olmadigi icin
  // silentCheckSsoRedirectUri kullanmiyoruz — check-sso zaten iframe ile
  // sessiz calisiyor).
  pkceMethod: 'S256',
  // Login sonrasi tarayici URL'sindeki auth parametrelerini keycloak-js
  // temizler (History API); router olmadigi icin bu sart.
  checkLoginIframe: false, // 3rd party cookie sorunlarindan kacinmak icin
  enableLogging: import.meta.env.DEV, // dev'de keycloak-js kendi loglarini yazsin
};