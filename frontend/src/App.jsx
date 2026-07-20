import React, { useState, useCallback } from 'react';
import DashboardLayout from './components/DashboardLayout';
import ESOGUDTTool from './components/ESOGUDTTool/ESOGUDTTool';
import TPTModule from './components/TPTModule/TPTModule';
import LiveMonitoring from './components/LiveMonitoring/LiveMonitoring';
import SystemSettings from './components/SystemSettings/SystemSettings';
import PdmModule from './components/PdmModule/PdmModule';
import PlatformModule from './components/PlatformModule/PlatformModule';
import LoginPage from './components/LoginPage';
import { useKeycloak } from './auth/useKeycloak';

function App() {
  const [activeMenu, setActiveMenu] = useState('live');
  const [liveDrillContext, setLiveDrillContext] = useState(null);

  // Auth state — mock 'user' useState'i yerine Redux'tan gelir
  const { status, isAuthenticated, user, logout, error } = useKeycloak();

  const handleLogout = useCallback(() => {
    setActiveMenu('live');
    setLiveDrillContext(null);
    logout(); // keycloak.logout() -> onAuthLogout event -> Redux authCleared
  }, [logout]);

  const handleDrillThroughToLive = useCallback((payload) => {
    setLiveDrillContext(payload || null);
    setActiveMenu('live');
  }, []);

  // Auth henuz init edilmedi (Keycloak check-sso calisiyor) — bos ekran
  // Aksi halde LoginPage'i acar, arkadan authenticated=true gelirse iki
  // kez render + istenmeyen ekran zıplamasi olur.
  if (status === 'idle' || status === 'authenticating') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        <div className="text-sm">Kimlik dogrulaniyor…</div>
      </div>
    );
  }

  // Kimliksiz -> LoginPage. Su an mock; P0.8'de "Sign in with Keycloak"
  // butonuna dusurulecek.
  if (!isAuthenticated) {
    return <LoginPage error={error} />;
  }

  const renderContent = () => {
    switch (activeMenu) {
      case 'esogu':
        return <ESOGUDTTool />;
      case 'tpt':
        return <TPTModule />;
      case 'live':
        return <LiveMonitoring drillContext={liveDrillContext} />;
      case 'settings':
        return <SystemSettings />;
      case 'pdm':
        return <PdmModule onDrillThroughToLive={handleDrillThroughToLive} />;
      case 'platform':
        return <PlatformModule />;
      default:
        return <LiveMonitoring drillContext={liveDrillContext} />;
    }
  };

  return (
    <DashboardLayout
      activeMenu={activeMenu}
      setActiveMenu={setActiveMenu}
      user={user}
      onLogout={handleLogout}
    >
      {renderContent()}
    </DashboardLayout>
  );
}

export default App;