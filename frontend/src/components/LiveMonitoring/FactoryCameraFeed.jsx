import React, { useEffect, useState } from 'react';
import { Camera, Activity } from 'lucide-react';

/**
 * FACTORY CAMERA FEED
 * Endüstriyel CCTV / Güvenlik kamerası görünümü.
 */
const FactoryCameraFeed = () => {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const formatDateTime = (date) => {
        const pad = (v) => v.toString().padStart(2, '0');
        const day = pad(date.getDate());
        const month = pad(date.getMonth() + 1);
        const year = date.getFullYear();
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        const seconds = pad(date.getSeconds());
        return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
    };

    return (
        <div className="h-full w-full flex flex-col bg-black rounded-2xl overflow-hidden border border-neutral-800">
            {/* Header / CCTV frame */}
            <div className="flex-none flex items-center justify-between px-4 py-2.5 bg-neutral-950/95 border-b border-neutral-800">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-neutral-800/70 border border-neutral-700">
                        <Camera size={14} className="text-neutral-200" />
                    </div>
                    <div className="flex flex-col leading-tight">
                        <span className="text-[11px] font-semibold tracking-[0.16em] text-neutral-400 uppercase">
                            Factory
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-red-500/60 bg-red-500/15">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-500/50 bg-emerald-500/10">
                        <Activity size={12} className="text-emerald-400" />

                    </div>
                </div>
            </div>

            {/* Video + overlay area */}
            <div className="relative flex-1 bg-black">
                {/* Video */}
                <video
                    className="absolute inset-0 w-full h-full object-contain bg-black pointer-events-none"
                    src="/videos/factory-feed.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                />

                {/* Scanline overlay */}
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-soft-light"
                    style={{
                        backgroundImage:
                            'repeating-linear-gradient(to bottom, rgba(255,255,255,0.28) 0px, rgba(255,255,255,0.28) 1px, transparent 1px, transparent 3px)',
                    }}
                />

                {/* Fine noise overlay */}
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay"
                    style={{
                        backgroundImage:
                            'radial-gradient(circle at 0 0, rgba(255,255,255,0.15) 0, transparent 40%), radial-gradient(circle at 100% 100%, rgba(0,0,0,0.25) 0, transparent 55%)',
                    }}
                />

                {/* Bottom-left datetime */}
                <div className="pointer-events-none absolute bottom-3 left-3 px-2 py-1 rounded bg-black/55 border border-white/10 text-[11px] font-mono text-neutral-100 tracking-widest drop-shadow-[0_0_6px_rgba(0,0,0,0.9)]">
                    {formatDateTime(now)}
                </div>

                {/* Thin frame border inside */}
                <div className="pointer-events-none absolute inset-1 rounded-[6px] border border-white/5" />
            </div>
        </div>
    );
};

export default FactoryCameraFeed;
