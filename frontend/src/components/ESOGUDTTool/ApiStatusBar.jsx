import React, { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, Loader2, RefreshCw, Server } from 'lucide-react';
import { checkHealth, onConnectionChange, getConnectionStatus } from '../../services/api/stlcManagerApi';

const ApiStatusBar = () => {
  const [status, setStatus] = useState(getConnectionStatus());
  const [healthData, setHealthData] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  const doCheck = useCallback(async () => {
    setIsChecking(true);
    try {
      const result = await checkHealth();
      setHealthData(result);
    } catch {
      // handled by service
    }
    setIsChecking(false);
  }, []);

  useEffect(() => {
    const unsub = onConnectionChange(setStatus);
    doCheck();
    const interval = setInterval(doCheck, 30000);
    return () => { unsub(); clearInterval(interval); };
  }, [doCheck]);

  const statusConfig = {
    connected: {
      bg: 'bg-success-50',
      border: 'border-success-200',
      icon: <Wifi size={12} className="text-success-600" />,
      dot: 'bg-success-500',
      text: 'text-success-700',
      label: 'API Connected',
    },
    disconnected: {
      bg: 'bg-error-50',
      border: 'border-error-200',
      icon: <WifiOff size={12} className="text-error-500" />,
      dot: 'bg-error-500',
      text: 'text-error-700',
      label: 'Disconnected',
    },
    checking: {
      bg: 'bg-warning-50',
      border: 'border-warning-200',
      icon: <Loader2 size={12} className="text-warning-600 animate-spin" />,
      dot: 'bg-warning-500 animate-pulse',
      text: 'text-warning-700',
      label: 'Checking...',
    },
  };

  const cfg = statusConfig[status] || statusConfig.disconnected;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${cfg.bg} ${cfg.border} transition-all duration-300`}>
      {cfg.icon}
      <div className={`flex items-center gap-1.5 ${cfg.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        <span className="text-[10px] font-semibold">{cfg.label}</span>
      </div>

      {healthData?.url && status === 'connected' && (
        <div className="flex items-center gap-1 text-[9px] text-success-600 bg-success-100 px-1.5 py-0.5 rounded-full">
          <Server size={8} />
          <span className="font-mono">{healthData.url}</span>
        </div>
      )}

      {status === 'disconnected' && (
        <span className="text-[9px] text-error-500">
          Offline
        </span>
      )}

      <button
        onClick={doCheck}
        disabled={isChecking}
        className="ml-auto p-1 rounded hover:bg-black/5 transition-colors disabled:opacity-50"
        title="Recheck connection"
      >
        <RefreshCw size={10} className={`text-neutral-500 ${isChecking ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
};

export default ApiStatusBar;
