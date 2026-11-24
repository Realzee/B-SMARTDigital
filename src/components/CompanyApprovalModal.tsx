import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  X,
  Check,
  Zap,
  Users,
  Film,
  MessageSquare,
  BarChart3,
  Palette,
  CreditCard,
  Phone,
  Mail,
  User,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import {
  Company,
  CompanyStatus,
  ManagementMode,
  CompanyModules,
  CompanySubscription,
  SubscriptionTier,
} from '../types';
import { useTheme } from '../context/ThemeContext';

interface CompanyApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
  onSaveCompany: (updatedCompany: Company) => void;
  currentAdminName: string;
}

export const CompanyApprovalModal: React.FC<CompanyApprovalModalProps> = ({
  isOpen,
  onClose,
  company,
  onSaveCompany,
  currentAdminName,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [status, setStatus] = useState<CompanyStatus>('pending_approval');
  const [managementMode, setManagementMode] = useState<ManagementMode>('self_managed');
  const [modules, setModules] = useState<CompanyModules>({
    cards: true,
    teamDirectory: true,
    multimedia: true,
    leads: true,
    analytics: true,
    customBranding: true,
  });
  const [planId, setPlanId] = useState<SubscriptionTier>('professional');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [amountZAR, setAmountZAR] = useState<number | ''>(499);
  const [billingStatus, setBillingStatus] = useState<'paid' | 'payment_due' | 'trial' | 'overdue'>('trial');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (company) {
      setStatus(company.status || 'active');
      setManagementMode(company.managementMode || 'self_managed');
      setModules(
        company.modules || {
          cards: true,
          teamDirectory: true,
          multimedia: true,
          leads: true,
          analytics: true,
          customBranding: true,
        }
      );
      if (company.subscription) {
        setPlanId(company.subscription.planId || 'professional');
        setBillingCycle(company.subscription.billingCycle || 'monthly');
        setBillingStatus(company.subscription.billingStatus || 'trial');
        setAmountZAR(
          company.subscription.amountZAR !== undefined && company.subscription.amountZAR !== null
            ? company.subscription.amountZAR
            : 499
        );
        setNotes(company.subscription.notes || '');
      } else {
        setPlanId('professional');
        setBillingCycle('monthly');
        setBillingStatus('trial');
        setAmountZAR(499);
        setNotes('');
      }
    }
  }, [company, isOpen]);

  if (!isOpen || !company) return null;

  const resolvePlanName = (tier: SubscriptionTier) => {
    if (tier === 'enterprise') return 'Enterprise Plan';
    if (tier === 'starter') return 'Starter Plan';
    if (tier === 'custom') return 'Custom Evaluated Package';
    return 'Professional Plan';
  };

  const handleQuickApprove = () => {
    const numericAmount = typeof amountZAR === 'number' ? amountZAR : parseFloat(String(amountZAR)) || 0;
    const planName = resolvePlanName(planId);

    const updated: Company = {
      ...company,
      status: 'active',
      managementMode,
      modules,
      subscription: {
        ...(company.subscription || {}),
        planId,
        planName,
        billingCycle,
        amountZAR: numericAmount,
        billingStatus: billingStatus === 'trial' ? 'paid' : billingStatus,
        notes,
      },
      approvedAt: new Date().toISOString(),
      approvedBy: currentAdminName || 'Super Admin',
      updatedAt: new Date().toISOString(),
    };
    onSaveCompany(updated);
    onClose();
  };

  const handleSaveGovernance = () => {
    const numericAmount = typeof amountZAR === 'number' ? amountZAR : parseFloat(String(amountZAR)) || 0;
    const planName = resolvePlanName(planId);

    const updated: Company = {
      ...company,
      status,
      managementMode,
      modules,
      subscription: {
        ...(company.subscription || {}),
        planId,
        planName,
        billingCycle,
        amountZAR: numericAmount,
        billingStatus,
        notes,
      },
      approvedAt: status === 'active' && !company.approvedAt ? new Date().toISOString() : company.approvedAt,
      approvedBy: status === 'active' && !company.approvedBy ? currentAdminName : company.approvedBy,
      updatedAt: new Date().toISOString(),
    };
    onSaveCompany(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        className={`relative w-full max-w-xl ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
        } border rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col`}
      >
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b ${isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50'} flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Company Approval & Access Control
                </h3>
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                  company.status === 'active'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : company.status === 'pending_approval'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse'
                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                }`}>
                  {company.status === 'pending_approval' ? 'Pending Approval' : company.status || 'Active'}
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {company.name} · {company.categoryLabel || company.category}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'} transition-colors`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Quick Details Bar */}
          <div className={`p-3.5 rounded-2xl border text-xs grid grid-cols-2 sm:grid-cols-3 gap-2.5 ${
            isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <span className="text-[10px] text-slate-400 block">Contact Person:</span>
              <span className="font-bold text-white truncate block">
                {company.contactPersonName || company.name}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Email:</span>
              <span className="font-mono text-white truncate block">
                {company.contactEmail || company.email || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Phone / WA:</span>
              <span className="font-mono text-white truncate block">
                {company.contactPhone || company.phone || 'N/A'}
              </span>
            </div>
            {company.registrationNotes && (
              <div className="col-span-2 sm:col-span-3 pt-1 border-t border-slate-800/60">
                <span className="text-[10px] text-amber-400 font-bold block">Registration Notes:</span>
                <p className="text-[11px] text-slate-300 italic">{company.registrationNotes}</p>
              </div>
            )}
          </div>

          {/* Quick 1-Click Approve Banner if pending */}
          {company.status !== 'active' && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-transparent border border-emerald-500/30 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ready for Activation?</span>
                </span>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Approve this company registration to immediately grant access to digital card features.
                </p>
              </div>
              <button
                type="button"
                onClick={handleQuickApprove}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md shrink-0 transition-all cursor-pointer"
              >
                1-Click Approve & Activate
              </button>
            </div>
          )}

          {/* Status Selection */}
          <div>
            <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>
              Company Operational Status
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { id: 'active', label: 'Active & Approved', icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" /> },
                { id: 'pending_approval', label: 'Pending Approval', icon: <Clock className="w-4 h-4 text-amber-400" /> },
                { id: 'inactive', label: 'Inactive / Suspended', icon: <XCircle className="w-4 h-4 text-red-400" /> },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStatus(s.id as CompanyStatus)}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-center font-bold transition-all ${
                    status === s.id
                      ? 'bg-amber-500/15 border-amber-500 text-white'
                      : isDark
                      ? 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  {s.icon}
                  <span className="text-[11px]">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Management Mode Selector */}
          <div>
            <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>
              Management Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div
                onClick={() => setManagementMode('self_managed')}
                className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between ${
                  managementMode === 'self_managed'
                    ? 'border-amber-500 bg-amber-500/10 text-white'
                    : isDark
                    ? 'border-slate-800 bg-slate-950 text-slate-400'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <div>
                  <span className="font-bold block text-xs">Self-Managed (Own Cards)</span>
                  <span className="text-[10px] text-slate-400">Company admin edits cards & team</span>
                </div>
                {managementMode === 'self_managed' && <Check className="w-4 h-4 text-amber-400" />}
              </div>

              <div
                onClick={() => setManagementMode('bsmart_managed')}
                className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between ${
                  managementMode === 'bsmart_managed'
                    ? 'border-sky-500 bg-sky-500/10 text-white'
                    : isDark
                    ? 'border-slate-800 bg-slate-950 text-slate-400'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <div>
                  <span className="font-bold block text-xs">Managed by B-SMART™</span>
                  <span className="text-[10px] text-slate-400">B-SMART™ concierge handles changes</span>
                </div>
                {managementMode === 'bsmart_managed' && <Check className="w-4 h-4 text-sky-400" />}
              </div>
            </div>
          </div>

          {/* Module Access Rights */}
          <div>
            <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1.5`}>
              Module Permissions
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { key: 'cards' as keyof CompanyModules, label: 'Cards & NFC' },
                { key: 'teamDirectory' as keyof CompanyModules, label: 'Team Directory' },
                { key: 'leads' as keyof CompanyModules, label: 'Inquiries & Leads' },
                { key: 'multimedia' as keyof CompanyModules, label: 'Multimedia & Video' },
                { key: 'analytics' as keyof CompanyModules, label: 'Analytics Tracking' },
                { key: 'customBranding' as keyof CompanyModules, label: 'Branding & Themes' },
              ].map((m) => {
                const active = modules[m.key];
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setModules({ ...modules, [m.key]: !active })}
                    className={`p-2 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                      active
                        ? isDark
                          ? 'bg-slate-950 border-amber-500/50 text-white'
                          : 'bg-amber-50 border-amber-300 text-slate-900'
                        : isDark
                        ? 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-50'
                        : 'bg-slate-100 border-slate-200 text-slate-400 opacity-50'
                    }`}
                  >
                    <span className="text-[11px]">{m.label}</span>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => {}}
                      className="rounded accent-amber-500 pointer-events-none"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Plan & Agreed Subscription Amount Section */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className={`block text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'} uppercase tracking-wider flex items-center gap-1.5`}>
                <CreditCard className="w-4 h-4" />
                <span>Subscription Plan & Agreed Amount</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Concluded on Evaluation</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`block text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1`}>
                  Subscription Tier / Package
                </label>
                <select
                  value={planId}
                  onChange={(e) => {
                    const newPlan = e.target.value as SubscriptionTier;
                    setPlanId(newPlan);
                    if (newPlan === 'starter' && (!amountZAR || amountZAR === 499 || amountZAR === 999)) setAmountZAR(199);
                    if (newPlan === 'professional' && (!amountZAR || amountZAR === 199 || amountZAR === 999)) setAmountZAR(499);
                    if (newPlan === 'enterprise' && (!amountZAR || amountZAR === 199 || amountZAR === 499)) setAmountZAR(999);
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-medium ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  } border focus:outline-none focus:border-amber-500`}
                >
                  <option value="starter">Starter Plan (Solo / Boutique)</option>
                  <option value="professional">Professional Plan (Growing Teams)</option>
                  <option value="enterprise">Enterprise Plan (Corporate Directory)</option>
                  <option value="custom">Custom / Evaluated Package</option>
                </select>
              </div>

              <div>
                <label className={`block text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1`}>
                  Billing Cycle
                </label>
                <select
                  value={billingCycle}
                  onChange={(e) => setBillingCycle(e.target.value as 'monthly' | 'annual')}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-medium ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  } border focus:outline-none focus:border-amber-500`}
                >
                  <option value="monthly">Monthly Billing</option>
                  <option value="annual">Annual Billing</option>
                </select>
              </div>
            </div>

            {/* Agreed Custom Amount Input & Quick Chips */}
            <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-2`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className={`block text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  Agreed Amount (ZAR / Rand) *
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400">Quick Presets:</span>
                  {[199, 499, 999, 1499, 2499, 4990].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmountZAR(preset)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono border transition-all ${
                        amountZAR === preset
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                          : isDark
                          ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          : 'bg-white border-slate-300 text-slate-600'
                      }`}
                    >
                      R {preset.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-black text-amber-500 font-mono">R</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 499 (Enter agreed evaluation amount)"
                  value={amountZAR}
                  onChange={(e) => setAmountZAR(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                  className={`w-full pl-8 pr-3.5 py-2 rounded-xl text-xs font-bold font-mono ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-600' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                  } border focus:outline-none focus:border-amber-500`}
                />
              </div>
              <p className="text-[10px] text-slate-400">
                This agreed amount will be reflected on client invoices, WhatsApp payment reminders, and billing receipts.
              </p>
            </div>

            {/* Payment Status Dropdown */}
            <div>
              <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1`}>
                Billing & Payment Status
              </label>
              <select
                value={billingStatus}
                onChange={(e) => setBillingStatus(e.target.value as any)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-medium ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                } border focus:outline-none focus:border-amber-500`}
              >
                <option value="paid">Paid (Up to date)</option>
                <option value="payment_due">Payment Due</option>
                <option value="trial">Trial / Pending First Payment</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 sm:p-5 border-t ${isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50'} flex items-center justify-between shrink-0`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            } text-xs font-semibold transition-colors`}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveGovernance}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Save Governance & Access</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
