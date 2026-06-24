import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const DashboardLayout = ({ children, activeMenu, setActiveMenu, user, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // user.role artık tenant yerine kullanılıyor
  const tenant = user?.role || 'ADMIN';

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        tenant={tenant}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />
      <div className={`flex-1 min-w-0 overflow-hidden transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
        <Header
          user={user}
          onLogout={onLogout}
          isCollapsed={isCollapsed}
        />
        <main className="mt-14 h-[calc(100vh-3.5rem)] overflow-hidden">
          {React.Children.map(children, child => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child, {
                currentRole: tenant,
                onNavigateModule: setActiveMenu,
              });
            }
            return child;
          })}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
