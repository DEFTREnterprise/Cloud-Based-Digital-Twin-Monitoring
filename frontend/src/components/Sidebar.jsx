import React, { useMemo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Eye, Settings, Route, Workflow, Activity, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { selectAllowedModules, selectUser, selectPrimaryRole } from '../store/slices/authSlice';

/**
 * Sidebar — Backend /me.allowed_modules'e gore modul listesi.
 *
 * Faz 2.4.1 P0.9: mock USERS silindi, tenant string prop'una gore filter
 * kaldirildi. Backend authz.py MODULE_ROLES (id'ler frontend id'lerine
 * hizali: live/platform/tpt/esogu/pdm/settings) tek dogruluk kaynagi.
 */

const ALL_MENU_ITEMS = [
    { id: 'live',     label: 'Live Monitoring',     icon: Eye },
    { id: 'platform', label: 'Platform Management', icon: Shield },
    { id: 'tpt',      label: 'TPT Module',          icon: Route },
    { id: 'esogu',    label: 'ESOGU DT Tool',       icon: Workflow },
    { id: 'pdm',      label: 'PdM Module',          icon: Activity },
    { id: 'settings', label: 'System Options',      icon: Settings },
];

const Sidebar = ({ activeMenu, setActiveMenu, isCollapsed, setIsCollapsed }) => {
    const allowedModules = useSelector(selectAllowedModules);
    const user = useSelector(selectUser);
    const primaryRole = useSelector(selectPrimaryRole);

    // /me'den gelen id listesini menude filtre olarak kullan.
    // Sira ALL_MENU_ITEMS sirasidir (menu duzeni stabil).
    const filteredItems = useMemo(
        () => ALL_MENU_ITEMS.filter(item => allowedModules.includes(item.id)),
        [allowedModules]
    );

    // Aktif menu kullaniciya kapaliysa ilk erisilebilir module dus.
    useEffect(() => {
        const isCurrentActive = filteredItems.some(item => item.id === activeMenu);
        if (!isCurrentActive && filteredItems.length > 0) {
            setActiveMenu(filteredItems[0].id);
        }
    }, [filteredItems, activeMenu, setActiveMenu]);

    // Header'da gorunecek etiket: tenant_code varsa OTOKAR/ESOGU/DEFTR,
    // yoksa "-" (nadir, /me hatasi durumunda).
    const tenantLabel = user?.tenantCode ?? '-';
    const isAdmin = (user?.roles ?? []).includes('DEFTR_Admin');

    return (
        <div
            className={`bg-gray-900 text-white h-screen fixed left-0 top-0 flex flex-col z-50 shadow-xl transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'
                }`}
        >
            <div className={`p-6 border-b border-gray-700 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
                    <div className="h-8 w-8 min-w-[2rem] bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg shrink-0">
                        M
                    </div>
                    <div className={`transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                        <h1 className="text-lg font-bold tracking-tight">CB-MDTMv2</h1>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5 ml-0.5">
                            TENANT: <span className={isAdmin ? 'text-red-400 font-bold' : 'text-blue-400 font-bold'}>{tenantLabel}</span>
                        </div>
                    </div>
                </div>
            </div>
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-20 bg-blue-600 rounded-full p-1 shadow-lg hover:bg-blue-700 transition-colors z-50 text-white"
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
            <nav className="flex-1 p-4 overflow-y-auto overflow-x-hidden">
                <ul className="space-y-2">
                    {filteredItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <li key={item.id}>
                                <button
                                    onClick={() => setActiveMenu(item.id)}
                                    title={isCollapsed ? item.label : ''}
                                    className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 group relative ${activeMenu === item.id
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                        } ${isCollapsed ? 'justify-center gap-0' : 'gap-3'}`}
                                >
                                    <Icon
                                        size={20}
                                        className={`transition-colors shrink-0 ${activeMenu === item.id ? 'text-white' : 'text-gray-500 group-hover:text-white'
                                            }`}
                                    />
                                    <span className={`font-medium text-sm whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'
                                        }`}>
                                        {item.label}
                                    </span>
                                    {activeMenu === item.id && !isCollapsed && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-300 shadow-[0_0_8px_rgba(147,197,253,0.5)] shrink-0"></div>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>
            {/* Footer User Info */}
            <div className="p-4 border-t border-gray-800 overflow-hidden">
                <div className={`flex items-center gap-3 px-2 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50 transition-all duration-300 ${isCollapsed ? 'justify-center' : ''}`}>
                    <div className="h-8 w-8 min-w-[2rem] rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 border border-gray-500 flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">
                        {(user?.username ?? '?').substring(0, 2).toUpperCase()}
                    </div>
                    <div className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>
                        <p className="text-xs font-medium text-gray-300 truncate">{user?.username ?? 'Unknown'}</p>
                        <p className="text-[10px] text-gray-500 truncate">
    {tenantLabel} · {primaryRole ?? '-'}
</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;