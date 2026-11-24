import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  Lock,
  Database,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  X,
  Server,
  RefreshCw,
} from 'lucide-react';
import { User } from '../types';
import { useTheme } from '../context/ThemeContext';

export interface DatabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSync: (adminPassword: string) => Promise<boolean | void> | boolean | void;
  title?: string;
  description?: string;
  targetDetails?: string;
  currentUser: User | null;
  adminUsers?: User[];
  isLoading?: boolean;
}

export const DatabaseSyncModal: React.FC<DatabaseSyncModalProps> = ({
  isOpen,
  onClose,
  onConfirmSync,
  title = 'Authorize Production Database Sync',
  description = 'Confirm saving data and syncing changes directly to the production server database.',
  targetDetails,
  currentUser,
  adminUsers = [],
  isLoading = false,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Reset form whenever modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setIsSubmitting(false);
      setIsSuccess(false);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, isSubmitting, onClose]);

  // Validate admin password
  const verifyAdminPassword = (entered: string): boolean => {
    const trimmed = entered.trim();
    if (!trimmed) return false;

    // 1. Check against current logged in admin
    if (currentUser?.password && currentUser.password === trimmed) {
      return true;
    }

    // 2. Check against any admin in the system
    const matchedAdmin = adminUsers.find(
      (u) => u.role === 'admin' && (u.password === trimmed || (!u.password && trimmed === 'password123'))
    );
    if (matchedAdmin) {
      return true;
    }

    // 3. Fallback default system administrator password
    if (trimmed === 'password123') {
      return true;
    }

    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('Please enter your administrator password to authorize the database sync.');
      return;
    }

    const isValid = verifyAdminPassword(password);
    if (!isValid) {
      setError('Incorrect administrator password. Database synchronization unauthorized.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onConfirmSync(password.trim());
      // If the callback explicitly returns false, do not treat as success
      if (result === false) {
        setError('Database sync failed or was rejected by the production server.');
        setIsSubmitting(false);
        return;
      }
      setIsSuccess(true);
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Database sync authorization error:', err);
      setError(err?.message || 'Error occurred while connecting to the production database.');
      setIsSubmitting(false);
    }
  };

  const activeLoading = isLoading || isSubmitting;
  const adminDisplayName = currentUser?.name || 'Administrator';
  const adminEmail = currentUser?.email || 'Admin Account';

  return (
    <AnimatePresence>
      {isOpen && (
        <div key="db-sync-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop */}
          <motion.div
            key="db-sync-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !activeLoading && onClose()}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="db-sync-title"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full max-w-lg rounded-3xl ${
              isDark
                ? 'bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl shadow-amber-950/20'
                : 'bg-white border border-slate-200 text-slate-900 shadow-2xl'
            } p-5 sm:p-7 z-10 space-y-5`}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              disabled={activeLoading}
              aria-label="Close modal"
              className={`absolute top-4 right-4 p-1.5 rounded-xl ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              } transition-colors cursor-pointer`}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header with Badges */}
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-600/10 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
                <Database className="w-6 h-6" />
              </div>
              <div className="flex-1 pr-6 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <Server className="w-3 h-3" />
                    <span>Production Cloud Database</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    Admin Password Guard
                  </span>
                </div>
                <h3 id="db-sync-title" className={`text-base sm:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'} leading-tight`}>
                  {title}
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-1 leading-relaxed`}>
                  {description}
                </p>
              </div>
            </div>

            {/* Target Details (if provided) */}
            {targetDetails && (
              <div className={`p-3 rounded-2xl border text-xs font-medium flex items-center gap-2.5 ${
                isDark ? 'bg-slate-950/80 border-slate-800 text-amber-300' : 'bg-amber-50/70 border-amber-200 text-amber-900'
              }`}>
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                  <KeyRound className="w-3.5 h-3.5" />
                </div>
                <span className="truncate">{targetDetails}</span>
              </div>
            )}

            {/* Current Admin Identification Card */}
            <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
              isDark ? 'bg-slate-950/50 border-slate-800/80' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 border border-amber-500/30 text-xs">
                  {adminDisplayName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {adminDisplayName}
                  </p>
                  <p className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {adminEmail} · System Administrator
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                Authorized Admin
              </span>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{error}</p>
              </motion.div>
            )}

            {/* Success State */}
            {isSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <p className="font-bold">Admin verified! Syncing data to production database...</p>
              </motion.div>
            )}

            {/* Password Authorization Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1.5 flex items-center justify-between`}>
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Enter Admin Password to Authorize Database Sync</span>
                  </span>
                  <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'} font-normal`}>
                    Default: password123
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    disabled={activeLoading || isSuccess}
                    placeholder="Enter your administrator password..."
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                    className={`w-full px-3.5 py-2.5 pr-10 rounded-xl text-xs ${
                      isDark
                        ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-amber-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500'
                    } border focus:outline-none transition-colors font-medium`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800/80 dark:border-slate-800/80 border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={activeLoading}
                  className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                  } transition-colors cursor-pointer`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={activeLoading || isSuccess}
                  className={`min-h-[42px] px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-950/30 cursor-pointer ${
                    activeLoading ? 'opacity-70 cursor-wait' : ''
                  }`}
                >
                  {activeLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Authorizing & Syncing...</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Authorize & Sync</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
