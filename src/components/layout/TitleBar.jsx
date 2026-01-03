import { useState, useEffect } from 'react';
import { Minus, Square, X, Maximize2, Terminal, Cloud, CloudOff, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

export function TitleBar() {
    const [time, setTime] = useState(new Date());
    const [syncStatus, setSyncStatus] = useState({ status: 'idle', details: null });

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const handleStatusChange = (data) => {
            console.log('Sync Status:', data);
            setSyncStatus(data || { status: 'idle' });
        };

        if (window.electronAPI?.sync) {
            const unsubscribe = window.electronAPI.sync.onStatusChange(handleStatusChange);
            return () => unsubscribe();
        }
    }, []);

    const handleMinimize = () => window.electronAPI?.minimize();
    const handleMaximize = () => window.electronAPI?.maximize();
    const handleClose = () => window.electronAPI?.close();

    const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    };

    const getSyncIcon = () => {
        const currentStatus = syncStatus?.status || 'idle';
        switch (currentStatus) {
            case 'syncing':
                return <RefreshCw size={14} className="text-blue-400 animate-spin" />;
            case 'error':
                return <AlertCircle size={14} className="text-red-400" title={syncStatus?.details?.error} />;
            case 'offline':
                return <CloudOff size={14} className="text-zinc-500" />;
            case 'idle':
            default:
                // Check if we have synced recently? 
                // For now just show CloudCheck or Cloud
                return <Cloud size={14} className="text-green-400" />;
        }
    };

    return (
        <div className="h-10 bg-dark-secondary border-b border-dark-border flex items-center justify-between px-4 titlebar-drag">
            {/* Logo */}
            <div className="flex items-center gap-3 titlebar-no-drag">
                <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center">
                    <Terminal size={14} className="text-black" />
                </div>
                <span className="font-semibold text-sm">POSbyCirvex</span>
            </div>

            {/* Center - Date/Time & Sync */}
            <div className="flex items-center gap-4 text-sm text-zinc-400">
                <div className="flex items-center gap-2 px-3 py-1 bg-dark-tertiary rounded-full" title={`Sync Status: ${syncStatus?.status || 'unknown'}`}>
                    {getSyncIcon()}
                    <span className="text-xs uppercase tracking-wider font-medium">
                        {syncStatus?.status === 'idle' ? 'Synced' : (syncStatus?.status || 'Unknown')}
                    </span>
                </div>
                <div className="w-px h-4 bg-dark-border mx-2"></div>
                <span>{formatDate(time)}</span>
                <span className="font-mono">{formatTime(time)}</span>
            </div>

            {/* Window controls */}
            <div className="flex items-center titlebar-no-drag">
                <button
                    onClick={handleMinimize}
                    className="p-2 hover:bg-dark-tertiary rounded transition-colors"
                >
                    <Minus className="w-4 h-4 text-zinc-400" />
                </button>
                <button
                    onClick={handleMaximize}
                    className="p-2 hover:bg-dark-tertiary rounded transition-colors"
                >
                    <Maximize2 className="w-4 h-4 text-zinc-400" />
                </button>
                <button
                    onClick={handleClose}
                    className="p-2 hover:bg-red-500 rounded transition-colors group"
                >
                    <X className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                </button>
            </div>
        </div>
    );
}
