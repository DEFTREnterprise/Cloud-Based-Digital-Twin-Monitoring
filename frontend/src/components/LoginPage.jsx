import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, AlertCircle, Shield, ChevronRight } from 'lucide-react';
import './LoginPage.css';

// Username -> password & role mapping
export const USERS = {
    admin: { password: 'admin', role: 'ADMIN', displayName: 'Administrator' },
    otokaradmin: { password: 'otokaradmin', role: 'OTOKAR (Admin)', displayName: 'Otokar Admin' },
    otokarviewer: { password: 'otokarviewer', role: 'OTOKAR (Viewer)', displayName: 'Otokar Viewer' },
    esoguadmin: { password: 'esoguadmin', role: 'ESOGU (Admin)', displayName: 'ESOGU Admin' },
    esoguview: { password: 'esoguview', role: 'ESOGU (Viewer)', displayName: 'ESOGU Viewer' },
    deftradmin: { password: 'deftradmin', role: 'DEFTR (Admin)', displayName: 'DEFTR Admin' },
    deftrviewer: { password: 'deftrviewer', role: 'DEFTR (Viewer)', displayName: 'DEFTR Viewer' },
};

const LoginPage = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [shake, setShake] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        await new Promise((r) => setTimeout(r, 500));

        const user = USERS[username.toLowerCase().trim()];
        if (user && user.password === password) {
            onLogin({
                username: username.toLowerCase().trim(),
                role: user.role,
                displayName: user.displayName,
            });
        } else {
            setError('Invalid username or password');
            setShake(true);
            setTimeout(() => setShake(false), 600);
        }
        setIsLoading(false);
    };

    return (
        <div className="login-page">
            <div className={`login-card ${shake ? 'login-card--shake' : ''}`}>
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

                {/* Right form panel */}
                <div className="login-card-right">
                    <div className="login-form-container">
                        <div className="mb-8">
                            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Welcome back</h1>
                            <p className="text-sm text-gray-500 mt-1">Sign in to access your dashboard</p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-center gap-2 px-3 py-2.5 mb-5 bg-red-50 border border-red-200/80 rounded-lg text-red-600 text-sm login-fade-in">
                                <AlertCircle size={15} className="shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label htmlFor="login-username" className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
                                    Username
                                </label>
                                <div className="relative">
                                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    <input
                                        id="login-username"
                                        type="text"
                                        placeholder="Enter your username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                        autoComplete="username"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="login-password" className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    <input
                                        id="login-password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !username || !password}
                                className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-white text-sm font-semibold transition-all duration-200 shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <span className="login-spinner" />
                                ) : (
                                    <>
                                        Sign In
                                        <ChevronRight size={16} />
                                    </>
                                )}
                            </button>
                        </form>
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
