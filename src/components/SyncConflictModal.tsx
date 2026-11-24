import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Cloud,
  HardDrive,
  RefreshCw,
  X,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
  ConflictChoice,
  SyncConflictItem,
  SyncEntityType,
} from '../utils/offlineSync';

interface SyncConflictModalProps {
  isOpen: boolean;
  conflicts: SyncConflictItem[];
  readyCount: number;
  isApplying: boolean;
  onResolve: (choices: Record<string, ConflictChoice>) => void;
  onCancel: () => void;
}

const ENTITY_LABELS: Record<SyncEntityType, string> = {
  company: 'Company',
  card: 'Card / Template',
  user: 'Team Member',
  lead: 'Enquiry',
};

export const SyncConflictModal: React.FC<SyncConflictModalProps> = ({
  isOpen,
  conflicts,
  readyCount,
  isApplying,
  onResolve,
  onCancel,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [choices, setChoices] = useState<Record<string, ConflictChoice>>({});

  useEffect(() => {
    if (isOpen && conflicts.length > 0) {
      const initial: Record<string, ConflictChoice> = {};
      for (const c of conflicts) {
        initial[c.queueItem.id] = 'keep_local';
      }
      setChoices(initial);
    }
  }, [isOpen, conflicts]);

  if (!isOpen || conflicts.length === 0) return null;

  const setAll = (choice: ConflictChoice) => {
    const next: Record<string, ConflictChoice> = {};
    for (const c of conflicts) {
      next[c.queueItem.id] = choice;
    }
    setChoices(next);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4">
      <div
        className={`w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b flex items-start justify-between gap-3 ${
            isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                Resolve Sync Conflicts ({conflicts.length})
              </h3>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                These records were modified both offline on this device and on the server. Choose which version to keep for each item
                {readyCount > 0 ? ` (${readyCount} non-conflicting item${readyCount === 1 ? '' : 's'} will sync automatically).` : '.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isApplying}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
            }`}
            aria-label="Cancel conflict resolution"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Bulk Shortcuts */}
        <div
          className={`px-5 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 text-xs ${
            isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
          }`}
        >
          <span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Quick select for all {conflicts.length} conflict{conflicts.length === 1 ? '' : 's'}:
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAll('keep_local')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                isDark
                  ? 'border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20'
                  : 'border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Keep All Offline</span>
            </button>
            <button
              type="button"
              onClick={() => setAll('use_server')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                isDark
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                  : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Use All Server</span>
            </button>
          </div>
        </div>

        {/* Scrollable Conflict Cards */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {conflicts.map((conflict) => {
            const op = conflict.queueItem;
            const selected = choices[op.id] || 'keep_local';

            return (
              <div
                key={op.id}
                className={`rounded-xl border overflow-hidden ${
                  isDark ? 'border-slate-700 bg-slate-950/60' : 'border-slate-200 bg-slate-50/70'
                }`}
              >
                <div
                  className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${
                    isDark ? 'border-slate-800 bg-slate-900/70' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-500">
                        {ENTITY_LABELS[op.entityType]}
                      </span>
                      <span className="text-sm font-black">{op.label}</span>
                    </div>
                    <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {conflict.conflictReason}
                    </p>
                  </div>
                </div>

                {/* Diff Comparison Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className={isDark ? 'bg-slate-900/50 text-slate-400' : 'bg-slate-100 text-slate-600'}>
                        <th className="px-3.5 py-2 font-bold border-b border-slate-800/30 w-1/4">Field</th>
                        <th className="px-3.5 py-2 font-bold border-b border-slate-800/30 w-[37.5%]">
                          Your Offline Edit
                        </th>
                        <th className="px-3.5 py-2 font-bold border-b border-slate-800/30 w-[37.5%]">
                          Server Version
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {conflict.changedFields.slice(0, 12).map((diff) => (
                        <tr
                          key={diff.field}
                          className={`border-b last:border-b-0 ${
                            isDark ? 'border-slate-800/60' : 'border-slate-200'
                          }`}
                        >
                          <td className={`px-3.5 py-2 font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            {diff.label}
                          </td>
                          <td
                            className={`px-3.5 py-2 font-mono text-[11px] break-words ${
                              selected === 'keep_local'
                                ? isDark
                                  ? 'text-sky-300 bg-sky-500/10'
                                  : 'text-sky-900 bg-sky-50'
                                : isDark
                                  ? 'text-slate-400'
                                  : 'text-slate-500'
                            }`}
                          >
                            {diff.localValue}
                          </td>
                          <td
                            className={`px-3.5 py-2 font-mono text-[11px] break-words ${
                              selected === 'use_server'
                                ? isDark
                                  ? 'text-amber-300 bg-amber-500/10'
                                  : 'text-amber-900 bg-amber-50'
                                : isDark
                                  ? 'text-slate-400'
                                  : 'text-slate-500'
                            }`}
                          >
                            {diff.serverValue}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Decision Buttons */}
                <div
                  className={`p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t ${
                    isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setChoices((prev) => ({ ...prev, [op.id]: 'keep_local' }))}
                    className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      selected === 'keep_local'
                        ? 'bg-sky-600 border-sky-500 text-white shadow-md'
                        : isDark
                          ? 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                          : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {selected === 'keep_local' ? (
                      <Check className="w-4 h-4 shrink-0" />
                    ) : (
                      <HardDrive className="w-4 h-4 shrink-0" />
                    )}
                    <span>Keep My Offline Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChoices((prev) => ({ ...prev, [op.id]: 'use_server' }))}
                    className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      selected === 'use_server'
                        ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md'
                        : isDark
                          ? 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                          : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {selected === 'use_server' ? (
                      <Check className="w-4 h-4 shrink-0" />
                    ) : (
                      <Cloud className="w-4 h-4 shrink-0" />
                    )}
                    <span>Use Server Version</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3.5 border-t flex flex-wrap items-center justify-end gap-2.5 ${
            isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={isApplying}
            className={`min-h-[44px] px-4 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
              isDark
                ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            Cancel &amp; Keep in Queue
          </button>
          <button
            type="button"
            onClick={() => onResolve(choices)}
            disabled={isApplying}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-black flex items-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isApplying ? 'animate-spin' : ''}`} />
            <span>{isApplying ? 'Applying & Syncing...' : 'Apply & Sync Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
