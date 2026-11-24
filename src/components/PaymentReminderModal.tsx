import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  CreditCard,
  X,
  Check,
  Calendar,
  MessageSquare,
  Mail,
  Copy,
  Clock,
  AlertCircle,
  Building2,
  DollarSign,
  Send,
  CheckCircle2,
  Receipt,
} from 'lucide-react';
import { Company, CompanySubscription, BillingStatus, SubscriptionTier } from '../types';
import { useTheme } from '../context/ThemeContext';

interface PaymentReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
  onUpdateCompany: (updatedCompany: Company) => void;
}

export const PaymentReminderModal: React.FC<PaymentReminderModalProps> = ({
  isOpen,
  onClose,
  company,
  onUpdateCompany,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [copied, setCopied] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionTier>('professional');
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [agreedAmount, setAgreedAmount] = useState<number | ''>(499);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const sub = company?.subscription || {
    planId: 'professional',
    planName: 'B-SMART™ Professional',
    billingCycle: 'monthly',
    amountZAR: 499,
    billingStatus: 'payment_due' as BillingStatus,
    nextBillingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paymentMethod: 'EFT / Bank Transfer',
    reminderCount: 0,
  };

  useEffect(() => {
    if (company?.subscription) {
      setSelectedPlanId(company.subscription.planId || 'professional');
      setSelectedBillingCycle(company.subscription.billingCycle || 'monthly');
      if (company.subscription.amountZAR !== undefined && company.subscription.amountZAR !== null) {
        setAgreedAmount(company.subscription.amountZAR);
      } else {
        setAgreedAmount(499);
      }
    } else {
      setSelectedPlanId('professional');
      setSelectedBillingCycle('monthly');
      setAgreedAmount(499);
    }
  }, [company, isOpen]);

  if (!isOpen || !company) return null;

  const planNames: Record<string, string> = {
    starter: 'B-SMART™ Starter',
    professional: 'B-SMART™ Professional',
    enterprise: 'B-SMART™ Enterprise',
    custom: 'B-SMART™ Custom Evaluated',
  };

  const currentPlanDisplayName = planNames[selectedPlanId] || sub.planName || 'B-SMART™ Platform';
  const numericAmount = typeof agreedAmount === 'number' ? agreedAmount : parseFloat(String(agreedAmount)) || 0;
  const invoiceNumber = `BSM-${company.id.replace('comp-', '').substring(0, 6).toUpperCase()}-${new Date().getFullYear()}`;
  const dueDate = sub.nextBillingDate || new Date().toISOString().split('T')[0];

  const handleSaveSubscription = () => {
    const updatedSub: CompanySubscription = {
      ...sub,
      planId: selectedPlanId,
      planName: currentPlanDisplayName,
      billingCycle: selectedBillingCycle,
      amountZAR: numericAmount,
    };

    onUpdateCompany({
      ...company,
      subscription: updatedSub,
      updatedAt: new Date().toISOString(),
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const reminderMessageText = `Dear ${company.contactPersonName || company.name},

*B-SMART™ Digital Business Card Platform — Subscription Reminder*
Invoice Ref: ${invoiceNumber}
Company: ${company.name}
Plan: ${sub.planName || 'B-SMART™ Platform'} (${sub.billingCycle})
Amount Due: R ${numericAmount.toLocaleString()} ZAR
Due Date: ${dueDate}

*Banking Details for EFT:*
Bank: Standard Bank
Account Name: B-Smart Digital
Account Number: 271828182
Branch Code: 051001
Reference: ${invoiceNumber}

Once payment is made, kindly reply with proof of payment to activate/extend your smart digital business cards without interruption.

Thank you,
B-SMART™ Accounts & Client Care
https://b-smart-online.co.za/app`;

  const handleSendWhatsApp = () => {
    const phone = company.contactPhone || company.phone || '';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(reminderMessageText)}`;

    const updatedSub: CompanySubscription = {
      ...sub,
      amountZAR: numericAmount,
      lastReminderSentAt: new Date().toISOString(),
      reminderCount: (sub.reminderCount || 0) + 1,
    };

    onUpdateCompany({
      ...company,
      subscription: updatedSub,
      updatedAt: new Date().toISOString(),
    });

    window.open(url, '_blank');
  };

  const handleSendEmail = () => {
    const email = company.contactEmail || company.email || '';
    const subject = encodeURIComponent(`B-SMART™ Subscription Invoice & Payment Reminder - ${company.name} (${invoiceNumber})`);
    const body = encodeURIComponent(reminderMessageText);
    const url = `mailto:${email}?subject=${subject}&body=${body}`;

    const updatedSub: CompanySubscription = {
      ...sub,
      amountZAR: numericAmount,
      lastReminderSentAt: new Date().toISOString(),
      reminderCount: (sub.reminderCount || 0) + 1,
    };

    onUpdateCompany({
      ...company,
      subscription: updatedSub,
      updatedAt: new Date().toISOString(),
    });

    window.location.href = url;
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(reminderMessageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMarkAsPaid = () => {
    const currentDueDate = new Date(dueDate);
    if (sub.billingCycle === 'annual') {
      currentDueDate.setFullYear(currentDueDate.getFullYear() + 1);
    } else {
      currentDueDate.setMonth(currentDueDate.getMonth() + 1);
    }

    const updatedSub: CompanySubscription = {
      ...sub,
      billingStatus: 'paid',
      lastPaymentDate: new Date().toISOString().split('T')[0],
      nextBillingDate: currentDueDate.toISOString().split('T')[0],
      notes: `${sub.notes || ''} [Paid R${sub.amountZAR} on ${new Date().toLocaleDateString()}]`.trim(),
    };

    onUpdateCompany({
      ...company,
      subscription: updatedSub,
      status: 'active', // Ensure company is active if paid
      updatedAt: new Date().toISOString(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        className={`relative w-full max-w-lg ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
        } border rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col`}
      >
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b ${isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50'} flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Subscription & Payment Reminders
                </h3>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {company.name} · Ref: <span className="font-mono text-amber-500 font-bold">{invoiceNumber}</span>
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
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Status & Plan Overview Card */}
          <div className={`p-4 rounded-2xl border ${
            isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
          } space-y-3`}>
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'} uppercase font-mono block`}>Current Plan:</span>
                <span className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{sub.planName || 'B-SMART™ Corporate'}</span>
                <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} capitalize block`}>({sub.billingCycle} billing)</span>
              </div>

              <div className="text-right">
                <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'} uppercase font-mono block`}>Amount:</span>
                <span className="text-xl font-black text-amber-500">R {sub.amountZAR?.toLocaleString()}</span>
                <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'} block`}>ZAR</span>
              </div>
            </div>

            <div className={`grid grid-cols-2 gap-2 pt-2 border-t ${isDark ? 'border-slate-800/70' : 'border-slate-200'} text-xs`}>
              <div>
                <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'} block`}>Next Due Date:</span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'} font-mono flex items-center gap-1`}>
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  {dueDate}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block">Payment Status:</span>
                <span className={`inline-flex items-center gap-1 font-bold uppercase text-[10px] px-2 py-0.5 rounded-full ${
                  sub.billingStatus === 'paid'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : sub.billingStatus === 'overdue'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  <Clock className="w-3 h-3" />
                  {sub.billingStatus || 'Payment Due'}
                </span>
              </div>
            </div>

            {sub.lastReminderSentAt && (
              <div className="pt-2 border-t border-slate-800/70 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Last Reminder: {new Date(sub.lastReminderSentAt).toLocaleDateString()}</span>
                <span className="font-mono">Sent {sub.reminderCount || 1} time(s)</span>
              </div>
            )}
          </div>

          {/* Subscription Dropdown & Agreed Amount Editor */}
          <div className={`p-4 rounded-2xl border ${
            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
          } space-y-3`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'} flex items-center gap-1.5`}>
                <CreditCard className="w-4 h-4" />
                <span>Subscription Plan & Agreed Amount</span>
              </span>
              {saveSuccess && (
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 animate-pulse">
                  <Check className="w-3.5 h-3.5" />
                  Saved to Company!
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`block text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1`}>
                  Subscription Plan Dropdown
                </label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => {
                    const newPlan = e.target.value as SubscriptionTier;
                    setSelectedPlanId(newPlan);
                    if (newPlan === 'starter' && (!agreedAmount || agreedAmount === 499 || agreedAmount === 999)) setAgreedAmount(199);
                    if (newPlan === 'professional' && (!agreedAmount || agreedAmount === 199 || agreedAmount === 999)) setAgreedAmount(499);
                    if (newPlan === 'enterprise' && (!agreedAmount || agreedAmount === 199 || agreedAmount === 499)) setAgreedAmount(999);
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-medium ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
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
                  value={selectedBillingCycle}
                  onChange={(e) => setSelectedBillingCycle(e.target.value as 'monthly' | 'annual')}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-medium ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                  } border focus:outline-none focus:border-amber-500`}
                >
                  <option value="monthly">Monthly Billing</option>
                  <option value="annual">Annual Billing</option>
                </select>
              </div>
            </div>

            {/* Agreed Amount Input with Presets */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className={`block text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Agreed Amount (ZAR / Rand)
                </label>
                <div className="flex items-center gap-1 flex-wrap">
                  {[199, 499, 999, 1499, 2499, 4990].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAgreedAmount(preset)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono border transition-all ${
                        numericAmount === preset
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

              <div className="flex items-center gap-2">
                <div className="relative flex-1 flex items-center">
                  <span className="absolute left-3 text-xs font-black text-amber-500 font-mono">R</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Enter agreed amount..."
                    value={agreedAmount}
                    onChange={(e) => setAgreedAmount(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                    className={`w-full pl-8 pr-3 py-2 rounded-xl text-xs font-bold font-mono ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-600' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                    } border focus:outline-none focus:border-amber-500`}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveSubscription}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shrink-0 shadow-md transition-all cursor-pointer"
                >
                  Save Agreed Amount
                </button>
              </div>
            </div>
          </div>

          {/* Quick Mark as Paid Button */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Received Payment?</span>
              </span>
              <p className="text-[11px] text-slate-300">
                Mark invoice as paid and automatically advance next billing date by 1 cycle.
              </p>
            </div>
            <button
              type="button"
              onClick={handleMarkAsPaid}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shrink-0 shadow-md transition-all cursor-pointer"
            >
              Mark as Paid
            </button>
          </div>

          {/* Send Reminder Actions */}
          <div className="space-y-2 pt-1">
            <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Send Official Payment Reminder
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send WhatsApp Reminder</span>
              </button>

              <button
                type="button"
                onClick={handleSendEmail}
                className="py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow transition-all cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                <span>Send Email Invoice</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyMessage}
              className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Invoice Reminder Copied!' : 'Copy Formatted Invoice Text to Clipboard'}</span>
            </button>
          </div>

          {/* Preview of Reminder Text */}
          <div>
            <label className={`block text-[11px] font-semibold text-slate-400 mb-1`}>
              Message Preview:
            </label>
            <div className={`p-3 rounded-xl border font-mono text-[10px] leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              {reminderMessageText}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 sm:p-5 border-t ${isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50'} flex items-center justify-end shrink-0`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2 rounded-xl ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            } text-xs font-semibold transition-colors`}
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
