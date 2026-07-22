import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import Sidebar from './Sidebar';
import Header from './Header';
import { selectPrimaryRole } from '../store/slices/authSlice';

const DashboardLayout = ({ children, activeMenu, setActiveMenu, user, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Child modullere gecirilecek anlamli rol. Keycloak teknik rollerini
  // (default-roles-*, offline_access, uma_authorization) atlar; ilk anlamli
  // realm rolunu doner (ornek: OTOKAR_Viewer, ESOGU_Operator, DEFTR_Admin).
  const currentRole = useSelector(selectPrimaryRole);

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