import React, { useEffect, useState } from 'react';
import {
  WifiOff,
  RefreshCw,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Trash2,
  CloudUpload,
  AlertCircle,
  X,
  HardDrive,
  Server,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { OfflineSyncOperation, SyncEntityType } from '../utils/offlineSync';
import {
  getNativePlatformLabel,
  getRemoteServerUrl,
  isNativeRuntime,
  resetRemoteServerUrl,
  setRemoteServerUrl,
} from '../utils/nativeRuntime';

interface OfflineSyncIndicatorProps {
  isOnline: boolean;
  isChecking: boolean;
  queue: OfflineSyncOperation[];
  isSyncing: boolean;
  onSyncNow: () => void;
  onCheckConnection: () => void;
  onDiscardOperation?: (opId: string) => void;
}

const ENTITY_LABELS: Record<SyncEntityType, string> = {
  company: 'Company',
  card: 'Card / Template',
  user: 'Team Member',
  lead: 'Enquiry',
};

export const OfflineSyncIndicator: React.FC<OfflineSyncIndicatorProps> = ({
  isOnline,
  isChecking,
  queue,
  isSyncing,
  onSyncNow,
  onCheckConnection,
  onDiscardOperation,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [offlineReadyBanner, setOfflineReadyBanner] = useState(false);
  const [updateReadyBanner, setUpdateReadyBanner] = useState(false);
  const isNative = isNativeRuntime();
  const [showServerConfig, setShowServerConfig] = useState(isNative);
  const [serverUrlInput, setServerUrlInput] = useState(() => getRemoteServerUrl());
  const [serverUrlFeedback, setServerUrlFeedback] = useState<string | null>(null);

  useEffect(() => {
    const handleOfflineReady = () => {
      setOfflineReadyBanner(true);
      setTimeout(() => setOfflineReadyBanner(false), 6000);
    };
    const handleUpdateReady = () => {
      setUpdateReadyBanner(true);
    };
    window.addEventListener('bsmart-pwa-offline-ready', handleOfflineReady);
    window.addEventListener('bsmart-pwa-update-ready', handleUpdateReady);
    return () => {
      window.removeEventListener('bsmart-pwa-offline-ready', handleOfflineReady);
      window.removeEventListener('bsmart-pwa-update-ready', handleUpdateReady);
    };
  }, []);

  const pendingCount = queue.length;
  const shouldShow = isNative || !isOnline || pendingCount > 0 || offlineReadyBanner || updateReadyBanner;

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="fixed bottom-[74px] sm:bottom-5 right-3 sm:right-5 z-40 flex flex-col items-end gap-2 max-w-[calc(100vw-24px)]">
      {/* Expandable Pending Changes Queue Drawer */}
      {drawerOpen && (
        <div
          className={`w-[340px] max-w-[calc(100vw-24px)] rounded-2xl border shadow-2xl overflow-hidden ${
            isDark
              ? 'bg-slate-900/95 border-slate-700 text-slate-100'
              : 'bg-white/95 border-slate-200 text-slate-900'
          } backdrop-blur-md`}
        >
          <div
            className={`px-4 py-3 border-b flex items-center justify-between gap-2 ${
              isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div className="min-w-0">
              <div className="text-xs font-extrabold flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <span>Offline Sync Outbox</span>
                <span className="tabular-nums px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-500 text-[10px] font-black">
                  {pendingCount}
                </span>
              </div>
              <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'} truncate`}>
                {isOnline
                  ? 'Connection restored. Tap Sync Now to review & upload.'
                  : 'Changes saved locally in IndexedDB until you reconnect.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
              }`}
              aria-label="Close sync queue"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/40">
            {pendingCount === 0 ? (
              <div className={`p-4 text-center text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                No pending offline edits. All local changes are synchronized.
              </div>
            ) : (
              queue.map((op) => (
                <div
                  key={op.id}
                  className={`px-3.5 py-2.5 flex items-start justify-between gap-2 ${
                    isDark ? 'hover:bg-slate-800/40 border-slate-800' : 'hover:bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          op.operation === 'delete'
                            ? 'bg-red-500/15 text-red-400'
                            : isDark
                              ? 'bg-sky-500/15 text-sky-400'
                              : 'bg-sky-50 text-sky-700'
                        }`}
                      >
                        {op.operation === 'delete' ? 'Delete' : 'Edit'} · {ENTITY_LABELS[op.entityType]}
                      </span>
                      <span className={`text-[10px] tabular-nums ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {new Date(op.queuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-xs font-bold truncate mt-0.5">{op.label}</div>
                    {op.lastError && (
                      <div className="text-[10px] text-amber-400 flex items-center gap-1 mt-0.5">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span className="truncate">{op.lastError}</span>
                      </div>
                    )}
                  </div>
                  {onDiscardOperation && (
                    <button
                      type="button"
                      onClick={() => onDiscardOperation(op.id)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                        isDark
                          ? 'text-slate-500 hover:text-red-400 hover:bg-red-950/40'
                          : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                      }`}
                      title="Discard this queued offline change"
                      aria-label={`Discard queued edit for ${op.label}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Remote Server URL config for native .exe / .apk bundles */}
          {(isNative || showServerConfig) && (
            <div
              className={`px-3.5 py-2.5 border-t space-y-2 ${
                isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/70'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                  <Server className="w-3 h-3" />
                  <span>{isNative ? `${getNativePlatformLabel()} Sync Server` : 'Remote Sync Server'}</span>
                </div>
                {isNative && (
                  <button
                    type="button"
                    onClick={() => {
                      const reset = resetRemoteServerUrl();
                      setServerUrlInput(reset);
                      setServerUrlFeedback('Reset to default server.');
                      setTimeout(() => setServerUrlFeedback(null), 2500);
                      onCheckConnection();
                    }}
                    className="text-[10px] text-slate-400 hover:text-sky-400 cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="url"
                  value={serverUrlInput}
                  onChange={(e) => setServerUrlInput(e.target.value)}
                  placeholder="https://b-smart-online.co.za/app"
                  className={`flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border text-[11px] outline-none ${
                    isDark
                      ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-sky-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-sky-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    const saved = setRemoteServerUrl(serverUrlInput);
                    if (!saved) {
                      setServerUrlFeedback('Enter a valid http:// or https:// URL');
                      return;
                    }
                    setServerUrlInput(saved);
                    setServerUrlFeedback('Saved & testing...');
                    onCheckConnection();
                    setTimeout(() => setServerUrlFeedback(null), 3000);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold cursor-pointer shrink-0"
                >
                  Save
                </button>
              </div>
              {serverUrlFeedback && (
                <div className="text-[10px] text-sky-400">{serverUrlFeedback}</div>
              )}
            </div>
          )}

          <div
            className={`p-3 border-t flex items-center justify-between gap-2 ${
              isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <button
              type="button"
              onClick={onCheckConnection}
              disabled={isChecking}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                isDark
                  ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Checking...' : 'Check Status'}</span>
            </button>

            {pendingCount > 0 && (
              <button
                type="button"
                onClick={onSyncNow}
                disabled={!isOnline || isSyncing}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer whitespace-nowrap"
              >
                <CloudUpload className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : `Sync Now (${pendingCount})`}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Offline Ready / App Update Ready Optional Toast */}
      {(offlineReadyBanner || updateReadyBanner) && isOnline && pendingCount === 0 && (
        <div
          className={`px-3.5 py-2.5 rounded-xl border shadow-xl flex items-center gap-2.5 text-xs ${
            isDark
              ? 'bg-slate-900/95 border-emerald-500/40 text-emerald-300'
              : 'bg-white/95 border-emerald-300 text-emerald-800'
          } backdrop-blur-md`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="font-semibold">
            {updateReadyBanner
              ? 'App update cached — reload when ready.'
              : 'Ready for offline use on this device.'}
          </span>
          {updateReadyBanner && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold cursor-pointer whitespace-nowrap"
            >
              Reload
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setOfflineReadyBanner(false);
              setUpdateReadyBanner(false);
            }}
            className="p-1 rounded hover:bg-slate-800/40 cursor-pointer"
            aria-label="Dismiss status message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Floating Status Bar (Offline, Pending Sync, or Native Desktop/Mobile Runtime) */}
      {(isNative || !isOnline || pendingCount > 0) && (
        <div
          className={`rounded-2xl border shadow-2xl px-3 py-2 flex items-center gap-2 backdrop-blur-md ${
            !isOnline
              ? isDark
                ? 'bg-slate-900/95 border-amber-500/50 text-amber-200'
                : 'bg-amber-50/95 border-amber-300 text-amber-950'
              : isDark
                ? 'bg-slate-900/95 border-emerald-500/50 text-slate-100'
                : 'bg-white/95 border-emerald-300 text-slate-900'
          }`}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="min-h-[40px] flex items-center gap-2 text-left cursor-pointer pr-1"
            title="View pending offline changes & sync settings"
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                !isOnline
                  ? 'bg-amber-500/20 text-amber-500'
                  : 'bg-emerald-500/20 text-emerald-500'
              }`}
            >
              {!isOnline ? (
                <WifiOff className="w-4 h-4" />
              ) : (
                <CloudUpload className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black leading-tight whitespace-nowrap flex items-center gap-1.5">
                <span>
                  {!isOnline
                    ? 'Offline Mode'
                    : pendingCount > 0
                      ? 'Back Online'
                      : 'Server Connected'}
                </span>
                {pendingCount > 0 && (
                  <span className="tabular-nums opacity-85">
                    · {pendingCount} Pending
                  </span>
                )}
              </div>
              <div className={`text-[10px] leading-tight whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {!isOnline
                  ? 'Edits saved locally until online'
                  : pendingCount > 0
                    ? 'Tap Sync Now to upload changes'
                    : 'All offline data synced'}
              </div>
            </div>
            {drawerOpen ? (
              <ChevronDown className="w-3.5 h-3.5 opacity-70 shrink-0" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 opacity-70 shrink-0" />
            )}
          </button>

          {isOnline && pendingCount > 0 && (
            <button
              type="button"
              onClick={onSyncNow}
              disabled={isSyncing}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
