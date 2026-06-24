import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Maximize2, RotateCcw, Wifi, WifiOff, Loader2, RefreshCw } from 'lucide-react';

/**
 * DIGITAL TWIN VIEWER PANELİ
 * ===========================
 * Unreal Engine Pixel Streaming 2 ile bağlanır.
 * Gerçek 3D fabrika simülasyonunu interaktif olarak gösterir.
 * 
 * Başlatma sırası:
 *   1. start.bat          → Signaling Server (port 80)
 *   2. denemeProje.bat    → Unreal Engine
 *   3. npm run dev        → React
 */

const TRAME_URL = 'http://localhost:80';
const HEALTH_CHECK_INTERVAL = 5000; // 5 saniyede bir bağlantı kontrolü

const DigitalTwinViewer = () => {
    const [connectionStatus, setConnectionStatus] = useState('checking'); // 'checking' | 'connected' | 'disconnected'
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [iframeKey, setIframeKey] = useState(0); // iframe yeniden yükleme için
    const containerRef = useRef(null);
    const iframeRef = useRef(null);

    // ── Trame sunucu bağlantı kontrolü ──
    const checkConnection = useCallback(async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            await fetch(TRAME_URL, {
                mode: 'no-cors',
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            setConnectionStatus('connected');
        } catch {
            setConnectionStatus('disconnected');
        }
    }, []);

    useEffect(() => {
        checkConnection();
        const interval = setInterval(checkConnection, HEALTH_CHECK_INTERVAL);
        return () => clearInterval(interval);
    }, [checkConnection]);

    // ── Fullscreen toggle ──
    const toggleFullscreen = useCallback(() => {
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen?.();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.();
            setIsFullscreen(false);
        }
    }, []);

    useEffect(() => {
        const handler = () => {
            if (!document.fullscreenElement) setIsFullscreen(false);
        };
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    // ── iframe yeniden yükle ──
    const reloadIframe = useCallback(() => {
        setIframeKey(prev => prev + 1);
        setConnectionStatus('checking');
        setTimeout(checkConnection, 1500);
    }, [checkConnection]);

    // ── Status badge ──
    const statusConfig = {
        checking: {
            icon: <Loader2 size={10} className="animate-spin" />,
            text: 'BAĞLANIYOR',
            bgClass: 'bg-amber-600/20 border-amber-500/30',
            textClass: 'text-amber-400',
            dotClass: 'bg-amber-400',
        },
        connected: {
            icon: <Wifi size={10} />,
            text: 'SYNCED',
            bgClass: 'bg-cyan-600/20 border-cyan-500/30',
            textClass: 'text-cyan-400',
            dotClass: 'bg-cyan-400',
        },
        disconnected: {
            icon: <WifiOff size={10} />,
            text: 'OFFLINE',
            bgClass: 'bg-red-600/20 border-red-500/30',
            textClass: 'text-red-400',
            dotClass: 'bg-red-400',
        },
    };

    const status = statusConfig[connectionStatus];

    return (
        <div
            ref={containerRef}
            className="h-full flex flex-col bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-700/50"
        >
            {/* ═══ Header ═══ */}
            <div className="flex-none flex items-center justify-between px-4 py-3 bg-neutral-800/80 backdrop-blur-sm border-b border-neutral-700/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-600/20 rounded-lg">
                        <Box size={16} className="text-cyan-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Digital Twin</h3>
                        <p className="text-[10px] text-neutral-500">Unreal Engine / Pixel Streaming</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Connection Status Badge */}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 border rounded-full ${status.bgClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass} ${connectionStatus === 'connected' ? 'animate-pulse' : ''}`} />
                        <span className={`text-[10px] font-bold tracking-wider ${status.textClass}`}>
                            {status.text}
                        </span>
                    </div>

                    {/* Reload */}
                    <button
                        onClick={reloadIframe}
                        className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors"
                        title="Yeniden Yükle"
                    >
                        <RefreshCw size={14} />
                    </button>

                    {/* Fullscreen */}
                    <button
                        onClick={toggleFullscreen}
                        className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors"
                        title="Tam Ekran"
                    >
                        <Maximize2 size={14} />
                    </button>
                </div>
            </div>

            {/* ═══ 3D Viewer Area ═══ */}
            <div className="flex-1 relative flex items-center justify-center bg-[#1a1a1a]">
                {connectionStatus === 'connected' ? (
                    /* ── Trame iframe ── */
                    <iframe
                        key={iframeKey}
                        ref={iframeRef}
                        src={TRAME_URL}
                        className="w-full h-full border-0"
                        title="Digital Twin - Unreal Engine"
                        allow="autoplay; fullscreen; camera; microphone"
                        style={{ background: '#1a1a1a' }}
                    />
                ) : (
                    /* ── Offline / Loading State ── */
                    <div className="flex flex-col items-center justify-center gap-4 text-center px-8">
                        {connectionStatus === 'checking' ? (
                            <>
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                                        <Loader2 size={28} className="text-cyan-400 animate-spin" />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-neutral-300">Unreal Engine'e Bağlanıyor...</p>
                                    <p className="text-xs text-neutral-500 mt-1">
                                        Pixel Streaming başlatılıyor
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-2xl bg-neutral-800 border border-red-900/50 flex items-center justify-center">
                                        <WifiOff size={28} className="text-red-400" />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-neutral-300">Unreal Engine Bağlantısı Yok</p>
                                    <p className="text-xs text-neutral-500 mt-1 max-w-xs leading-relaxed">
                                        Digital Twin için şu sırayla başlatın:
                                    </p>
                                    <div className="mt-3 bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-left">
                                        <code className="text-[11px] text-cyan-400 font-mono leading-relaxed">
                                            1. start.bat (Signaling Server)<br />
                                            2. denemeProje.bat (Unreal Engine)
                                        </code>
                                    </div>
                                </div>
                                <button
                                    onClick={reloadIframe}
                                    className="mt-2 px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 rounded-lg text-cyan-400 text-xs font-semibold transition-colors flex items-center gap-2"
                                >
                                    <RotateCcw size={12} />
                                    Tekrar Dene
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DigitalTwinViewer;
