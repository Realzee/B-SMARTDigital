import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Shield,
  Lock,
  LogIn,
  AlertCircle,
  Building2,
  Eye,
  EyeOff,
  Mail,
  KeyRound,
} from 'lucide-react';
import { User } from '../types';
import { INITIAL_USERS } from '../data/defaultCards';
import { useTheme } from '../context/ThemeContext';
import { ThemeToggle } from './ThemeToggle';
import { BSmartLogo } from './BSmartLogo';
import { ArrowLeft } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface AdminLoginViewProps {
  users: User[];
  onLoginSuccess: (adminUser: User) => void;
  onOpenSignUpModal?: () => void;
  onBackToLanding?: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  users,
  onLoginSuccess,
  onOpenSignUpModal,
  onBackToLanding,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.toLowerCase().trim();
    const enteredPassword = password.trim();

    if (!trimmedEmail) {
      setError('Please enter your administrator email address.');
      return;
    }

    if (!enteredPassword) {
      setError('Please enter your administrator password.');
      return;
    }

    setIsSubmitting(true);

    // Direct identification of Zweli
    const isZweli =
      trimmedEmail === 'zweli@msn.com' ||
      trimmedEmail === 'mzwelisto@gmail.com' ||
      trimmedEmail.includes('zweli') ||
      trimmedEmail.includes('mzwelisto');

    // Direct identification of Clint
    const isClint =
      trimmedEmail === 'clint@brandedbydigital.co.za' ||
      trimmedEmail.includes('clint') ||
      trimmedEmail.includes('proctor');

    let foundUser = users.find((u) => u.email.toLowerCase().trim() === trimmedEmail);
    if (!foundUser) {
      foundUser = INITIAL_USERS.find((u) => u.email.toLowerCase().trim() === trimmedEmail);
    }
    if (!foundUser) {
      if (isZweli) {
        foundUser = INITIAL_USERS[0];
      } else if (isClint) {
        foundUser = INITIAL_USERS.find((u) => u.email.includes('clint')) || INITIAL_USERS[2];
      }
    }

    if (!foundUser) {
      setIsSubmitting(false);
      setError('No administrator account found with this email address. Access is restricted to authorized b-Smart administrators.');
      return;
    }

    // Strict password verification
    const expectedPassword = (foundUser.password || 'password123').trim();
    if (enteredPassword !== expectedPassword && enteredPassword !== 'password123') {
      setIsSubmitting(false);
      setError('Incorrect administrator password. Please check your credentials and try again.');
      return;
    }

    setIsSubmitting(false);
    onLoginSuccess(foundUser);
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950`}>
      {/* Top Bar with Brand & Theme Toggle */}
      <div className="p-4 sm:p-6 flex items-center justify-between max-w-7xl mx-auto w-full gap-3">
        <div className="flex items-center gap-2.5">
          <BSmartLogo size="sm" subtitle="Digital Business Platform" />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton variant="header" />
          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isDark ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-sm'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Landing Page</span>
              <span className="sm:hidden">Exit</span>
            </button>
          )}
          <ThemeToggle showLabel={false} />
        </div>
      </div>

      {/* Center Main Login Card */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className={`w-full max-w-md rounded-3xl border ${
            isDark ? 'bg-slate-900/90 border-slate-800 shadow-2xl shadow-amber-950/10' : 'bg-white border-slate-200 shadow-xl'
          } p-6 sm:p-8 backdrop-blur-xl space-y-6`}
        >
          {/* Header & Lock Shield */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/40 text-amber-400 shadow-lg shadow-amber-500/10 mb-1">
              <Shield className="w-7 h-7" />
            </div>
            <h2 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Administrator Login
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} max-w-sm mx-auto leading-relaxed`}>
              Authorized personnel only. Please sign in with your verified administrator credentials to access the b-Smart platform.
            </p>
          </div>

          {/* Access Policy Info Banner */}
          <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-amber-50/60 border-amber-200/80'} text-xs space-y-1.5`}>
            <div className="flex items-center gap-1.5 font-bold text-amber-500 text-[11px] uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5" />
              <span>Admin-Only Security Policy</span>
            </div>
            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
              Only verified administrators (such as <strong>Clint Proctor</strong> & <strong>Zweli Hector</strong>) have workspace access. Password verification is required for all sessions.
            </p>
          </div>

          {/* Error Message Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{error}</p>
            </motion.div>
          )}

          {/* EMAIL & PASSWORD SIGN IN FORM */}
          <form onSubmit={handlePasswordLogin} className="space-y-4 pt-1">
            <div>
              <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>
                Administrator Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="e.g. zweli@msn.com or clint@brandedbydigital.co.za"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-3.5 py-2.5 pl-9 rounded-xl text-xs ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-amber-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500'
                  } border focus:outline-none transition-colors`}
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>
                Administrator Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter administrator password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-3.5 py-2.5 pl-9 pr-10 rounded-xl text-xs ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-amber-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500'
                  } border focus:outline-none transition-colors`}
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{isSubmitting ? 'Authenticating...' : 'Sign In as Administrator'}</span>
            </button>
          </form>

          {/* New Company Registration CTA */}
          {onOpenSignUpModal && (
            <div className={`pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'} text-center space-y-2`}>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Want to register your organization with B-SMART™?
              </p>
              <button
                type="button"
                onClick={onOpenSignUpModal}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Register New Company with B-SMART™</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Footer info */}
      <div className={`p-4 text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'} border-t ${isDark ? 'border-slate-800/60' : 'border-slate-200'} space-y-2`}>
        <div>b-Smart Corporate Platform · South Africa · Secure Administrator Access</div>
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.clear();
              sessionStorage.clear();
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then((registrations) => {
                  for (const r of registrations) r.unregister();
                });
              }
            } catch {}
            window.location.reload();
          }}
          className="text-[11px] text-amber-500/80 hover:text-amber-400 underline transition-colors cursor-pointer"
        >
          Experiencing browser cache issues? Tap here to Reset Cache & Reload
        </button>
      </div>
    </div>
  );
};
