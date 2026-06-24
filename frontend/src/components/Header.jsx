import React, { useState } from 'react';
import { User, ChevronDown, LogOut, Shield } from 'lucide-react';

const Header = ({ user, onLogout, isCollapsed }) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  return (
    <header className={`h-14 border-b border-gray-200/50 fixed top-0 right-0 transition-all duration-300 z-40 flex items-center justify-between px-6 bg-white/70 backdrop-blur-md ${isCollapsed ? 'left-20' : 'left-64'}`}>
      <div className="flex-1"></div>

      <div className="flex items-center gap-4">
        {/* Role Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200/60 rounded-lg">
          <Shield size={14} className="text-blue-600" />
          <span className="text-xs font-semibold text-blue-700 tracking-wide">
            {user?.role || 'N/A'}
          </span>
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <User size={18} className="text-white" />
            </div>
            <div className="text-left">
              <span className="font-medium text-sm block leading-tight">
                {user?.displayName || 'User'}
              </span>
              <span className="text-[10px] text-gray-500 block leading-tight">
                @{user?.username || 'unknown'}
              </span>
            </div>
            <ChevronDown size={18} />
          </button>

          {showUserDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserDropdown(false)}
              ></div>
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                {/* User info section */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-800">
                    {user?.displayName}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    @{user?.username}
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 rounded text-[11px] font-medium text-blue-700">
                    <Shield size={11} />
                    {user?.role}
                  </div>
                </div>
                {/* Logout */}
                <div className="py-2">
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onLogout();
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-red-50 transition-colors text-red-600 flex items-center gap-2 text-sm"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
