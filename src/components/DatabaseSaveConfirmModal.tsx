import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Database,
  HardDrive,
  CloudUpload,
  ShieldCheck,
  X,
  CreditCard,
  Building2,
  User,
  CheckCircle,
  Lock,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export interface DatabaseSaveConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveLocally: () => void | Promise<void>;
  onSaveAndSyncImmediately: () => void | Promise<void>;
  title?: string;
  entityName: string;
  entityType?: 'card' | 'company' | 'member' | 'lead' | 'employee';
  actionType?: 'create' | 'update';
  detailsSummary?: string;
  isLoading?: boolean;
}

export const DatabaseSaveConfirmModal: React.FC<DatabaseSaveConfirmModalProps> = ({
  isOpen,
  onClose,
  onSaveLocally,
  onSaveAndSyncImmediately,
  title,
  entityName,
  entityType = 'card',
  actionType = 'update',
  detailsSummary,
  isLoading = false,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  const entityConfig = {
    card: {
      icon: CreditCard,
      label: 'Digital Smart Card',
      badgeColor: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
    },
    company: {
      icon: Building2,
      label: 'Company Profile',
      badgeColor: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
    },
    member: {
      icon: User,
      label: 'Team Member Profile',
      badgeColor: 'bg-purple-500/15 border-purple-500/30 text-purple-400',
    },
    employee: {
      icon: User,
      label: 'Employee Smart Card',
      badgeColor: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    },
    lead: {
      icon: Database,
      label: 'Lead Inquiry',
      badgeColor: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400',
    },
  }[entityType];

  const EntityIcon = entityConfig.icon;
  const defaultTitle = `Confirm Database Action: ${actionType === 'create' ? 'Create' : 'Save'} ${entityConfig.label}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div key="db-save-confirm-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop */}
          <motion.div
            key="db-save-confirm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isLoading && onClose()}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="db-save-confirm-title"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full max-w-xl rounded-3xl ${
              isDark
                ? 'bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl shadow-amber-950/20'
                : 'bg-white border border-slate-200 text-slate-900 shadow-2xl'
            } p-5 sm:p-7 z-10 space-y-5`}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              disabled={isLoading}
              aria-label="Close modal"
              className={`absolute top-4 right-4 p-1.5 rounded-xl ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              } transition-colors cursor-pointer`}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
                <Database className="w-6 h-6" />
              </div>
              <div className="flex-1 pr-6 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${entityConfig.badgeColor}`}>
                    <EntityIcon className="w-3 h-3" />
                    <span>{entityConfig.label}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    No Auto-Sync Policy
                  </span>
                </div>
                <h3 id="db-save-confirm-title" className={`text-base sm:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} leading-tight`}>
                  {title || defaultTitle}
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-1 leading-relaxed`}>
                  Confirm database change action. Choose whether to save locally only or sync immediately to the production server.
                </p>
              </div>
            </div>

            {/* Target Highlight Box */}
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
              isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 border border-amber-500/30">
                  <EntityIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {entityName}
                  </p>
                  <p className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {detailsSummary || `Action: ${actionType === 'create' ? 'Create new record' : 'Update existing record'}`}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-amber-400 border border-slate-700 shrink-0">
                Action Pending
              </span>
            </div>

            {/* Options Description */}
            <div className="space-y-3">
              <p className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Please select how you would like to proceed with this database action:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* OPTION 1: Save Locally Only */}
                <div
                  onClick={() => !isLoading && onSaveLocally()}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between ${
                    isDark
                      ? 'bg-slate-950/50 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700 text-slate-200'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-slate-300 text-slate-800'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 group-hover:text-white transition-colors">
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                        1. Save Locally Only
                      </h4>
                      <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-1 leading-relaxed`}>
                        Saves immediately to local device cache and IndexedDB. Central server database is not modified.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isLoading) onSaveLocally();
                    }}
                    disabled={isLoading}
                    className={`mt-3 w-full py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      isDark
                        ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                        : 'bg-white hover:bg-slate-200 border-slate-300 text-slate-800'
                    }`}
                  >
                    Save Locally
                  </button>
                </div>

                {/* OPTION 2: Save & Sync to cPanel Immediately */}
                <div
                  onClick={() => !isLoading && onSaveAndSyncImmediately()}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between ${
                    isDark
                      ? 'bg-gradient-to-b from-amber-500/10 to-amber-600/5 hover:from-amber-500/20 hover:to-amber-600/10 border-amber-500/40 hover:border-amber-500/70 text-slate-100'
                      : 'bg-amber-50/70 hover:bg-amber-100/70 border-amber-300 text-slate-900'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                      <CloudUpload className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-black text-amber-400">
                          2. Save & Sync Immediately
                        </h4>
                        <Lock className="w-3 h-3 text-amber-400" />
                      </div>
                      <p className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-600'} mt-1 leading-relaxed`}>
                        Saves locally and authorizes an immediate sync to the live production database with your admin password.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isLoading) onSaveAndSyncImmediately();
                    }}
                    disabled={isLoading}
                    className="mt-3 w-full py-2 px-3 rounded-xl text-xs font-bold transition-all bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-950/20 flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Sync to Server</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Cancel Button */}
            <div className="flex items-center justify-end pt-2 border-t border-slate-800/80 dark:border-slate-800/80 border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className={`min-h-[40px] px-5 py-2 rounded-xl text-xs font-semibold ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                } transition-colors cursor-pointer`}
              >
                Cancel Action
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
