import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const DashboardLayout = ({ children, activeMenu, setActiveMenu, user, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Header ve child modullere gecirilecek tekli rol (drill-through gibi
  // yerlerde kullaniliyorsa). Yeni sema: user.roles bir array; ilk role'i
  // aliyoruz (ornekler: 'OTOKAR_Viewer', 'ESOGU_Operator', 'DEFTR_Admin').
  const currentRole = user?.roles?.[0] ?? null;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
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
                currentRole,
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