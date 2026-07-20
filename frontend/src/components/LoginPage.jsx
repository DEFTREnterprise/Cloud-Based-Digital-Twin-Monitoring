import React from 'react';
import { AlertCircle, ChevronRight, Shield } from 'lucide-react';
import { useKeycloak } from '../auth/useKeycloak';
import './LoginPage.css';

/**
 * LoginPage — Keycloak entegre versiyonu (Faz 2.4.1 P0.8).
 *
 * Mock USERS listesi ve local form kaldirildi. Tek buton: "Sign in with
 * Keycloak" — tikladiginda keycloak.login() PKCE redirect baslatir. Basarili
 * donuste KeycloakProvider yakalar, Redux'a yazar, App.jsx dashboard'a gecer.
 *
 * error prop'u App.jsx'ten geliyor (Keycloak init fail veya /me fail).
 */
const LoginPage = () => {
    const { login, status, error } = useKeycloak();
    const isLoading = status === 'authenticating';

    return (
        <div className="login-page">
            <div className="login-card">
                {/* Left decorative panel */}
                <div className="login-card-left">
                    <div className="login-brand-bg"></div>
                    <div className="login-brand-content">
                        <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center font-bold text-2xl text-white backdrop-blur-sm border border-white/10">
                            M
                        </div>
                        <h2 className="text-white text-xl font-bold mt-4 tracking-tight">CB-MDTMv2</h2>
                        <p className="text-blue-200/70 text-sm mt-1">Digital Twin Management Platform</p>
                        <div className="mt-8 space-y-3">
                            <div className="flex items-center gap-2 text-blue-100/60 text-xs">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                <span>Real-time Monitoring</span>
                            </div>
                            <div className="flex items-center gap-2 text-blue-100/60 text-xs">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                <span>Test Planning & Tracking</span>
                            </div>
                            <div className="flex items-center gap-2 text-blue-100/60 text-xs">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                <span>System Settings & Configuration</span>
                            </div>
                        </div>
                    </div>
                    <div className="login-brand-footer">
                        <p className="text-blue-300/40 text-[10px] tracking-wider uppercase">MATISSE Project</p>
                    </div>
                </div>

                {/* Right auth panel */}
                <div className="login-card-right">
                    <div className="login-form-container">
                        <div className="mb-8">
                            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Welcome back</h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Sign in via Keycloak to access your dashboard
                            </p>
                        </div>

                        {/* Error banner (Keycloak init / /me failure) */}
                        {error && (
                            <div className="flex items-center gap-2 px-3 py-2.5 mb-5 bg-red-50 border border-red-200/80 rounded-lg text-red-600 text-sm login-fade-in">
                                <AlertCircle size={15} className="shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={login}
                            disabled={isLoading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-white text-sm font-semibold transition-all duration-200 shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <span className="login-spinner" />
                            ) : (
                                <>
                                    <Shield size={16} />
                                    Sign in with Keycloak
                                    <ChevronRight size={16} />
                                </>
                            )}
                        </button>

                        <p className="text-[11px] text-gray-400 mt-4 text-center">
                            You will be redirected to the CB-MDTM identity provider.
                        </p>
                    </div>

                    <div className="text-center mt-8">
                        <p className="text-[11px] text-gray-400">
                            &copy; {new Date().getFullYear()} MATISSE &mdash; All rights reserved
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;