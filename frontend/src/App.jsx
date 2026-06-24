import React, { useState, useCallback } from 'react';
import DashboardLayout from './components/DashboardLayout';
import ESOGUDTTool from './components/ESOGUDTTool/ESOGUDTTool';
import TPTModule from './components/TPTModule/TPTModule';
import LiveMonitoring from './components/LiveMonitoring/LiveMonitoring';
import SystemSettings from './components/SystemSettings/SystemSettings';
import PdmModule from './components/PdmModule/PdmModule';
import PlatformModule from './components/PlatformModule/PlatformModule';
import LoginPage from './components/LoginPage';

function App() {
  const [activeMenu, setActiveMenu] = useState('live');
  const [user, setUser] = useState(null); // { username, role, displayName }
  const [liveDrillContext, setLiveDrillContext] = useState(null); // { assetId, componentId, windowStartUtc, windowEndUtc, alarmId }

  const handleLogin = useCallback((userData) => {
    setUser(userData);
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    setActiveMenu('live');
    setLiveDrillContext(null);
  }, []);

  const handleDrillThroughToLive = useCallback((payload) => {
    setLiveDrillContext(payload || null);
    setActiveMenu('live');
  }, []);

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
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
