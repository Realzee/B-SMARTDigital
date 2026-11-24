import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  X,
  Check,
  Shield,
  Zap,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Users,
  Film,
  MessageSquare,
  BarChart3,
  Palette,
  CreditCard,
  Phone,
  Mail,
  User,
  Globe,
  MapPin,
  Clock,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import {
  Company,
  BusinessCategory,
  ManagementMode,
  CompanyModules,
  CompanySubscription,
  SubscriptionTier,
  BillingCycle,
} from '../types';
import { useTheme } from '../context/ThemeContext';
import { BSmartLogo } from './BSmartLogo';

interface CompanySignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompanyRegistered: (newCompany: Company, adminContact: { name: string; email: string; phone: string }) => void;
}

const CATEGORY_OPTIONS: { id: BusinessCategory; label: string }[] = [
  { id: 'professional', label: 'Corporate, Legal & Financial Advisory' },
  { id: 'security', label: 'Security & Armed Response' },
  { id: 'restaurant', label: 'Restaurant, Cafe & Hospitality' },
  { id: 'real_estate', label: 'Real Estate & Property Development' },
  { id: 'trades', label: 'Trades, Automotive & Engineering' },
  { id: 'medical', label: 'Medical, Health & Clinical Care' },
  { id: 'beauty', label: 'Beauty, Salon & Wellness' },
  { id: 'retail', label: 'Retail, Boutique & E-Commerce' },
  { id: 'freelance', label: 'Design, Media & Creative Services' },
  { id: 'custom', label: 'Custom Enterprise / Organization' },
];

const PRICING_PLANS = [
  {
    id: 'starter' as SubscriptionTier,
    name: 'Starter',
    subtitle: 'For solo practitioners & boutique teams',
    monthlyPrice: 199,
    annualPrice: 1990,
    features: [
      'Up to 3 Digital Smart Cards',
      'NFC Tap & Dynamic QR Sharing',
      'Instant 1-Click vCard Save',
      'Basic Click & View Analytics',
      'Standard Email & In-App Support',
    ],
    recommended: false,
  },
  {
    id: 'professional' as SubscriptionTier,
    name: 'Professional',
    subtitle: 'For growing teams & established practices',
    monthlyPrice: 499,
    annualPrice: 4990,
    features: [
      'Up to 15 Team Member Cards',
      'Central Company Directory',
      'Inquiries & Lead Capture Module',
      'Multimedia Video & Showcase',
      'Operating Hours & Schedules',
      'Priority WhatsApp Support',
    ],
    recommended: true,
  },
  {
    id: 'enterprise' as SubscriptionTier,
    name: 'Enterprise',
    subtitle: 'For corporate fleets & multi-branch groups',
    monthlyPrice: 999,
    annualPrice: 9990,
    features: [
      'Unlimited Digital Smart Cards',
      'Full B-SMART™ Concierge Service',
      'Dedicated Account Manager',
      'Custom Corporate Branding & Colors',
      'Corporate Bulk Card Issuance',
      'VIP 24/7 Concierge Hotline',
    ],
    recommended: false,
  },
];

export const CompanySignUpModal: React.FC<CompanySignUpModalProps> = ({
  isOpen,
  onClose,
  onCompanyRegistered,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Step 1: Company Profile & Contact Info
  const [companyName, setCompanyName] = useState('');
  const [category, setCategory] = useState<BusinessCategory>('professional');
  const [tagline, setTagline] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Step 2: Management Mode & Module Selection
  const [managementMode, setManagementMode] = useState<ManagementMode>('self_managed');
  const [modules, setModules] = useState<CompanyModules>({
    cards: true,
    teamDirectory: true,
    multimedia: true,
    leads: true,
    analytics: true,
    customBranding: true,
  });

  // Step 3: Pricing & Billing
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionTier>('professional');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [paymentPreference, setPaymentPreference] = useState('EFT / Bank Transfer');
  const [registrationNotes, setRegistrationNotes] = useState('');

  if (!isOpen) return null;

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (currentStep === 1) {
      if (!companyName.trim()) {
        setErrorMessage('Company / Organization Name is required.');
        return;
      }
      if (!contactName.trim()) {
        setErrorMessage('Contact person name is required.');
        return;
      }
      if (!contactEmail.trim() || !contactEmail.includes('@')) {
        setErrorMessage('A valid email address is required.');
        return;
      }
      if (!contactPhone.trim()) {
        setErrorMessage('A contact phone number / WhatsApp is required.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handleSubmitRegistration = () => {
    const matchedCategory = CATEGORY_OPTIONS.find((c) => c.id === category);
    const selectedPlan = PRICING_PLANS.find((p) => p.id === selectedPlanId) || PRICING_PLANS[1];
    const amountZAR = billingCycle === 'annual' ? selectedPlan.annualPrice : selectedPlan.monthlyPrice;

    const newCompanyId = `comp-${Date.now()}`;
    const nextBillDate = new Date();
    if (billingCycle === 'annual') {
      nextBillDate.setFullYear(nextBillDate.getFullYear() + 1);
    } else {
      nextBillDate.setMonth(nextBillDate.getMonth() + 1);
    }

    const companyData: Company = {
      id: newCompanyId,
      name: companyName.trim(),
      tagline: tagline.trim() || `${companyName.trim()} · Digital Smart Profile`,
      category,
      categoryLabel: matchedCategory ? matchedCategory.label : 'Corporate & Professional',
      logoUrl: '',
      theme: {
        primaryColor: '#0284c7',
        secondaryColor: '#f59e0b',
        bgType: 'dark',
        darkOverlayOpacity: 75,
        glassmorphism: true,
      },
      aboutText: `${companyName.trim()} is registered on the B-SMART™ digital business platform.`,
      operatingHours: 'Mon - Fri: 08:00 - 17:00',
      website: website.trim() || undefined,
      phone: contactPhone.trim(),
      email: contactEmail.trim(),
      address: address.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      // Governance: INACTIVE UNTIL APPROVED
      status: 'pending_approval',
      managementMode,
      modules,
      subscription: {
        planId: selectedPlanId,
        planName: selectedPlan.name,
        billingCycle,
        amountZAR,
        billingStatus: 'trial',
        nextBillingDate: nextBillDate.toISOString().split('T')[0],
        paymentMethod: paymentPreference,
        reminderCount: 0,
        notes: `Registered via portal on ${new Date().toLocaleDateString()}. Payment pref: ${paymentPreference}. Pricing concluded on evaluation.`,
      },

      contactPersonName: contactName.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      registrationNotes: registrationNotes.trim() || undefined,
    };

    onCompanyRegistered(companyData, {
      name: contactName.trim(),
      email: contactEmail.trim(),
      phone: contactPhone.trim(),
    });

    setIsSubmitted(true);
    setCurrentStep(4);
  };

  const handleWhatsAppFastTrack = () => {
    const text = encodeURIComponent(
      `Hello B-SMART™ Team! We have just submitted a company registration for "${companyName}" (${category}) on the ${selectedPlanId.toUpperCase()} plan (${managementMode === 'bsmart_managed' ? 'Managed by B-SMART™' : 'Self-Managed'}). Contact: ${contactName} (${contactPhone}). Please review and activate our account.`
    );
    window.open(`https://wa.me/27834915468?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        className={`relative w-full max-w-2xl ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
        } border rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col`}
      >
        {/* Top Header */}
        <div className={`p-4 sm:p-5 border-b ${isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50'} flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-base sm:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Company Registration
                </h3>
                <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  b-Smart
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Sign up your organization, configure modules, and choose your digital fleet plan.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'} transition-colors`}
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar (Hidden once submitted) */}
        {!isSubmitted && (
          <div className={`px-5 py-2.5 border-b ${isDark ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-200/80 bg-slate-100/60'} flex items-center justify-between text-xs`}>
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${currentStep >= 1 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                1
              </span>
              <span className={`font-semibold ${currentStep === 1 ? (isDark ? 'text-white' : 'text-slate-900') : 'text-slate-400'}`}>
                Company
              </span>
              <span className="text-slate-500">/</span>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${currentStep >= 2 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                2
              </span>
              <span className={`font-semibold ${currentStep === 2 ? (isDark ? 'text-white' : 'text-slate-900') : 'text-slate-400'}`}>
                Modules
              </span>
              <span className="text-slate-500">/</span>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${currentStep >= 3 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                3
              </span>
              <span className={`font-semibold ${currentStep === 3 ? (isDark ? 'text-white' : 'text-slate-900') : 'text-slate-400'}`}>
                Plan & Pricing
              </span>
            </div>

            <div className="text-[11px] font-mono text-amber-500 font-bold hidden sm:block">
              {currentStep === 1 && 'Step 1 of 3'}
              {currentStep === 2 && 'Step 2 of 3'}
              {currentStep === 3 && 'Final Step'}
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 1: COMPANY PROFILE & CONTACT DETAILS */}
          {/* ========================================================= */}
          {currentStep === 1 && (
            <form id="step-1-form" onSubmit={handleNextStep} className="space-y-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
                <Shield className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <p className="leading-relaxed">
                  <strong>Important Notice:</strong> Newly registered companies remain <strong>Inactive</strong> until approved by the B-SMART™ administrator. Once verified, your digital fleet access will be activated immediately.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1`}>
                    Company / Organization Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Security Solutions (Pty) Ltd"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    } border text-xs font-bold focus:outline-none focus:border-amber-500`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1`}>
                    Industry / Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as BusinessCategory)}
                    className={`w-full px-3.5 py-2.5 rounded-xl ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    } border text-xs font-medium focus:outline-none focus:border-amber-500`}
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1`}>
                    Tagline / One-Liner
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Professional Security & Armed Response · Sandton"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    } border text-xs focus:outline-none focus:border-amber-500`}
                  />
                </div>
              </div>

              {/* Contact Personnel Info */}
              <div className={`pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'} space-y-3`}>
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>Primary Representative / Account Manager</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={`block text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'} mb-1`}>
                      Contact Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Thabo Mokoena"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      } border text-xs focus:outline-none focus:border-amber-500`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'} mb-1`}>
                      Contact Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="thabo@company.co.za"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      } border text-xs focus:outline-none focus:border-amber-500`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'} mb-1`}>
                      Phone / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+27 82 123 4567"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      } border text-xs focus:outline-none focus:border-amber-500`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className={`block text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'} mb-1`}>
                      Website (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://company.co.za"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      } border text-xs focus:outline-none focus:border-amber-500`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'} mb-1`}>
                      Head Office Address (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Johannesburg, South Africa"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      } border text-xs focus:outline-none focus:border-amber-500`}
                    />
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* STEP 2: MANAGEMENT MODE & MODULE ACCESS */}
          {/* ========================================================= */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-500 mb-1">
                  Select Management Mode
                </h4>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} mb-3`}>
                  How would you prefer your company cards and branding to be managed?
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option A: Managed by B-Smart */}
                  <div
                    onClick={() => setManagementMode('bsmart_managed')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      managementMode === 'bsmart_managed'
                        ? 'border-sky-500 bg-sky-500/10 shadow-lg shadow-sky-500/10'
                        : isDark
                        ? 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-xl bg-sky-500/20 text-sky-400">
                          <Shield className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold">Managed by B-SMART™</span>
                      </div>
                      {managementMode === 'bsmart_managed' && (
                        <div className="w-5 h-5 rounded-full bg-sky-500 text-slate-950 flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
                      <strong>Hands-off Concierge:</strong> B-SMART™ handles card design, updates, corporate branding, and staff additions. Ideal for executives and busy businesses.
                    </p>
                  </div>

                  {/* Option B: Self-Managed */}
                  <div
                    onClick={() => setManagementMode('self_managed')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      managementMode === 'self_managed'
                        ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                        : isDark
                        ? 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400">
                          <Zap className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold">Self-Managed (Manage Own Cards)</span>
                      </div>
                      {managementMode === 'self_managed' && (
                        <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
                      <strong>Full Platform Control:</strong> Your designated internal administrator can create, edit, issue cards, modify banner slides, and manage company settings directly.
                    </p>
                  </div>
                </div>
              </div>

              {/* Module Access Checkboxes */}
              <div className={`pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-500 mb-1">
                  Requested Modules & Capabilities
                </h4>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} mb-3`}>
                  Choose the features you want active on your organization's digital portal:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      key: 'cards' as keyof CompanyModules,
                      title: 'Smart Business Cards & NFC',
                      desc: 'Tap-to-share, dynamic QR codes, and instant contact saving.',
                      icon: <Zap className="w-4 h-4 text-amber-400" />,
                    },
                    {
                      key: 'teamDirectory' as keyof CompanyModules,
                      title: 'Multi-Employee Team Directory',
                      desc: 'Central staff directory with individual card links.',
                      icon: <Users className="w-4 h-4 text-sky-400" />,
                    },
                    {
                      key: 'leads' as keyof CompanyModules,
                      title: 'Inquiries & Lead Capture',
                      desc: 'Direct callback requests and inquiries with follow-up tracking.',
                      icon: <MessageSquare className="w-4 h-4 text-emerald-400" />,
                    },
                    {
                      key: 'multimedia' as keyof CompanyModules,
                      title: 'Multimedia & Video Showcase',
                      desc: 'Host YouTube videos, MP4s, podcasts, and portfolios.',
                      icon: <Film className="w-4 h-4 text-purple-400" />,
                    },
                    {
                      key: 'analytics' as keyof CompanyModules,
                      title: 'Interaction Analytics',
                      desc: 'Track views, shares, calls, WhatsApp clicks, and vCard saves.',
                      icon: <BarChart3 className="w-4 h-4 text-blue-400" />,
                    },
                    {
                      key: 'customBranding' as keyof CompanyModules,
                      title: 'Corporate Branding & Schedules',
                      desc: 'Custom colors, operating hours, and master templates.',
                      icon: <Palette className="w-4 h-4 text-pink-400" />,
                    },
                  ].map((m) => {
                    const isChecked = modules[m.key];
                    return (
                      <div
                        key={m.key}
                        onClick={() => setModules({ ...modules, [m.key]: !isChecked })}
                        className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                          isChecked
                            ? isDark
                              ? 'bg-slate-950 border-amber-500/40 text-white'
                              : 'bg-amber-50/50 border-amber-300 text-slate-900'
                            : isDark
                            ? 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60'
                            : 'bg-slate-100/60 border-slate-200 text-slate-400 opacity-60'
                        }`}
                      >
                        <div className="mt-0.5">{m.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">{m.title}</span>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="rounded accent-amber-500"
                            />
                          </div>
                          <p className="text-[10px] leading-tight text-slate-400 mt-0.5">{m.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 3: PRICING OPTIONS & BILLING */}
          {/* ========================================================= */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-500 mb-0.5">
                    Select Your B-SMART™ Subscription Plan
                  </h4>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Choose the scale of digital cards needed for your company fleet.
                  </p>
                </div>

                {/* Billing Cycle Toggle */}
                <div className={`p-1 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'} flex items-center text-xs`}>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      billingCycle === 'monthly' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('annual')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                      billingCycle === 'annual' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400'
                    }`}
                  >
                    <span>Annual</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500 text-slate-950 font-black">
                      Tailored
                    </span>
                  </button>
                </div>
              </div>

              {/* Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {PRICING_PLANS.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`relative p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/10 shadow-xl shadow-amber-500/10 ring-1 ring-amber-400/50'
                          : isDark
                          ? 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      {plan.recommended && (
                        <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-[9px] uppercase tracking-wider shadow">
                          Most Popular
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h5 className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h5>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'} mb-2 leading-tight`}>{plan.subtitle}</p>

                        <div className="mb-3">
                          <span className="text-xs font-black text-amber-500 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 block text-center">
                            Concluded on Evaluation
                          </span>
                        </div>

                        <ul className={`space-y-1.5 text-[10px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          {plan.features.map((f, fIdx) => (
                            <li key={fIdx} className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-center font-bold">
                        <span className={isSelected ? 'text-amber-400' : 'text-slate-400'}>
                          {isSelected ? 'Selected Plan' : 'Select'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Payment Method Preference */}
              <div className={`pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'} grid grid-cols-1 sm:grid-cols-2 gap-3`}>
                <div>
                  <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1`}>
                    Preferred Payment Method
                  </label>
                  <select
                    value={paymentPreference}
                    onChange={(e) => setPaymentPreference(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    } border text-xs focus:outline-none focus:border-amber-500`}
                  >
                    <option value="EFT / Bank Transfer">EFT / Bank Direct Deposit</option>
                    <option value="Debit Order">Monthly Debit Order</option>
                    <option value="Card / Ozow">Instant EFT / Card (Ozow / PayFast)</option>
                    <option value="Cash / Invoice">Corporate Invoice (30 Days)</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1`}>
                    Special Requests / Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Need urgent cards for 5 security officers before Friday"
                    value={registrationNotes}
                    onChange={(e) => setRegistrationNotes(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    } border text-xs focus:outline-none focus:border-amber-500`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 4: SUBMITTED - INACTIVE PENDING APPROVAL CONFIRMATION */}
          {/* ========================================================= */}
          {isSubmitted && (
            <div className="py-4 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-500/50 text-amber-400 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/10">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-1.5 max-w-md mx-auto">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold">
                  Status: Inactive · Pending B-SMART™ Approval
                </span>
                <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Company Registration Received!
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
                  Thank you for signing up <strong>{companyName}</strong>. Your profile has been created and will remain <strong>inactive</strong> until verified and authorized by our administrative team.
                </p>
              </div>

              {/* Registration Summary Card */}
              <div className={`p-4 rounded-2xl border text-left text-xs space-y-2 max-w-md mx-auto ${
                isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between pb-1 border-b border-slate-800">
                  <span className="text-slate-400">Plan:</span>
                  <span className="font-bold text-white capitalize">{selectedPlanId} ({billingCycle})</span>
                </div>
                <div className="flex justify-between pb-1 border-b border-slate-800">
                  <span className="text-slate-400">Management:</span>
                  <span className="font-bold text-white">
                    {managementMode === 'bsmart_managed' ? 'Managed by B-SMART™' : 'Self-Managed (Own Cards)'}
                  </span>
                </div>
                <div className="flex justify-between pb-1 border-b border-slate-800">
                  <span className="text-slate-400">Representative:</span>
                  <span className="font-bold text-white">{contactName} ({contactEmail})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pricing:</span>
                  <span className="font-bold text-amber-400">
                    Concluded on Evaluation
                  </span>
                </div>
              </div>

              {/* Fast-track Concierge CTA */}
              <div className="space-y-2 max-w-md mx-auto pt-2">
                <button
                  type="button"
                  onClick={handleWhatsAppFastTrack}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Fast-Track Approval on WhatsApp (+27 83 491 5468)</span>
                </button>

                <p className="text-[11px] text-slate-500">
                  B-SMART™ onboarding staff typically verifies and activates accounts within 1–3 business hours.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className={`p-4 sm:p-5 border-t ${isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50'} flex items-center justify-between shrink-0`}>
          {!isSubmitted ? (
            <>
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                  className={`px-4 py-2 rounded-xl ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  } text-xs font-semibold flex items-center gap-1.5 transition-colors`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-4 py-2 rounded-xl ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  } text-xs font-semibold transition-colors`}
                >
                  Cancel
                </button>
              )}

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmitRegistration}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-950/40 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Submit Company Sign Up</span>
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
            >
              Done & Return to B-SMART™
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
