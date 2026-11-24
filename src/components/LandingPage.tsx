import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Smartphone,
  Share2,
  Users,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle,
  MessageSquare,
  QrCode,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Globe,
  Download,
  Building2,
  ChevronRight,
  TrendingUp,
  Check,
  Briefcase,
  Send,
  LogIn,
  Rocket,
  Compass,
  Star,
  Layers,
  CreditCard,
  Menu,
  X
} from 'lucide-react';
import { BSmartLogo } from './BSmartLogo';
import { BusinessCard } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface LandingPageProps {
  onLaunchApp: () => void;
  onOpenSignUpModal?: () => void;
  sampleCard?: BusinessCard;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchApp, onOpenSignUpModal }) => {
  const isDark = true;

  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const featurePillars = [
    {
      icon: <Zap className="w-6 h-6 text-amber-400 shrink-0" />,
      title: 'NFC Tap & Dynamic QR',
      description: 'Exchange your comprehensive business profile instantly with a simple smartphone tap or high-resolution dynamic QR code.',
    },
    {
      icon: <Users className="w-6 h-6 text-sky-400 shrink-0" />,
      title: 'Full Team Management',
      description: 'Manage entire corporate directories, issue unified employee cards, and preserve brand consistency across all company divisions.',
    },
    {
      icon: <MessageSquare className="w-6 h-6 text-emerald-400 shrink-0" />,
      title: 'Direct Lead Generation',
      description: 'Turn visitors into customers with integrated callback forms and inquiries delivered straight to your dashboard in real-time.',
    },
    {
      icon: <Download className="w-6 h-6 text-sky-400 shrink-0" />,
      title: 'Instant 1-Click vCard Save',
      description: 'Save contact details, critical contact numbers, and company address directly into Android & iOS address books in one click.',
    },
    {
      icon: <Shield className="w-6 h-6 text-amber-400 shrink-0" />,
      title: 'Private & Enterprise-Grade',
      description: 'Enterprise-grade encrypted cloud storage with zero third-party data tracking. You retain 100% data ownership.',
    },
    {
      icon: <Globe className="w-6 h-6 text-blue-400 shrink-0" />,
      title: 'Universal Zero-App Access',
      description: 'No app download required for recipients. Cards run seamlessly in any mobile browser on any device, anywhere in the world.',
    },
  ];

  const audienceCategories = [
    {
      icon: <Rocket className="w-6 h-6 text-sky-400 shrink-0" />,
      category: 'Start-ups',
      description: 'Make a powerful and professional first impression from day one with an agile digital profile that elevates your brand and scales with your team.',
      highlights: ['Instant brand authority', 'Zero print overhead', 'Live updates anytime'],
    },
    {
      icon: <Compass className="w-6 h-6 text-amber-400 shrink-0" />,
      category: 'Entrepreneurs',
      description: 'Showcase your vision, products, multimedia portfolios, and direct WhatsApp, MS Teams, or MS Outlook booking links in one sleek, portable presentation.',
      highlights: ['Interactive multimedia', 'MS Teams & Outlook booking', 'Portfolio showcase'],
    },
    {
      icon: <Star className="w-6 h-6 text-emerald-400 shrink-0" />,
      category: 'Professionals',
      description: 'Stand out with verified digital credentials, 1-click address book saving, and seamless appointment booking that keeps you connected.',
      highlights: ['1-click vCard download', 'Direct call & WhatsApp', 'Always up-to-date'],
    },
    {
      icon: <Building2 className="w-6 h-6 text-blue-400 shrink-0" />,
      category: 'Established Companies',
      description: 'Equip sales and executive teams with centralized corporate branding, directory management, and real-time prospect inquiry capture.',
      highlights: ['Multi-employee directory', 'Consistent corporate identity', 'Central lead tracking'],
    },
  ];

  const faqs = [
    {
      question: 'Do my customers need to install an app to view my B-SMART™ card?',
      answer: 'No app installation is required! When you tap your NFC card or share your QR code/link, your digital smart communicator opens instantly in their native mobile browser on iOS and Android.',
    },
    {
      question: 'How does B-SMART™ turn introductions into opportunities?',
      answer: 'Unlike paper business cards that end up lost or discarded, B-SMART™ allows prospects to instantly save your contact details to their phone, message you directly on WhatsApp, explore your multimedia services, or submit an immediate callback inquiry.',
    },
    {
      question: 'Can our company manage multiple team members and branches?',
      answer: 'Yes! B-SMART™ is specifically engineered for corporate multi-employee deployment. You can organize team members by company, allocate digital cards, and monitor interaction metrics from one central dashboard.',
    },
    {
      question: 'Can I update my phone number, address, or services after sharing?',
      answer: 'Absolutely. Any change you make in the B-SMART™ portal updates live instantly across all distributed cards without ever needing to reprint a single piece of paper.',
    },
  ];

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans selection:bg-amber-500 selection:text-slate-950 overflow-x-hidden`}>
      {/* Top Navbar */}
      <nav className={`sticky top-0 z-50 border-b ${isDark ? 'border-slate-800/80 bg-slate-950/85' : 'border-slate-200 bg-white/85'} backdrop-blur-md`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <BSmartLogo size="md" subtitle="Digital Business Card Platform" forceDark />
          </div>

          <div className="hidden lg:flex items-center gap-6 text-xs font-semibold">
            <a href="#why-b-smart" className={`${isDark ? 'text-slate-300 hover:text-sky-400' : 'text-slate-600 hover:text-sky-600'} transition-colors`}>
              Why B-SMART™
            </a>
            <a href="#features" className={`${isDark ? 'text-slate-300 hover:text-amber-400' : 'text-slate-600 hover:text-amber-600'} transition-colors`}>
              Features
            </a>
            <a href="#for-who" className={`${isDark ? 'text-slate-300 hover:text-sky-400' : 'text-slate-600 hover:text-sky-600'} transition-colors`}>
              Who It's For
            </a>
            <a href="#demo" className={`${isDark ? 'text-slate-300 hover:text-amber-400' : 'text-slate-600 hover:text-amber-600'} transition-colors`}>
              Live Demo
            </a>
            <a href="#pricing" className={`${isDark ? 'text-slate-300 hover:text-sky-400' : 'text-slate-600 hover:text-sky-600'} transition-colors`}>
              Pricing
            </a>
            <a href="#faq" className={`${isDark ? 'text-slate-300 hover:text-sky-400' : 'text-slate-600 hover:text-sky-600'} transition-colors`}>
              FAQ
            </a>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <PWAInstallButton variant="header" />

            {onOpenSignUpModal && (
              <button
                type="button"
                onClick={onOpenSignUpModal}
                className="hidden sm:inline-flex px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-500 font-bold text-xs items-center gap-1.5 transition-all cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Sign Up Company</span>
              </button>
            )}

            <button
              onClick={onLaunchApp}
              className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-amber-500 hover:from-sky-400 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-sky-600/20 cursor-pointer transition-all transform hover:-translate-y-0.5 active:translate-y-0 shrink-0"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-950" />
              <span>Login</span>
            </button>

            {/* Mobile Menu Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`lg:hidden p-2 rounded-xl border ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
              } transition-colors cursor-pointer shrink-0`}
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-down Navigation Panel */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className={`lg:hidden border-t ${
                isDark ? 'border-slate-800 bg-slate-950 text-slate-100' : 'border-slate-200 bg-white text-slate-900 shadow-xl'
              } px-4 py-4 space-y-3 overflow-hidden`}
            >
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                <a
                  href="#why-b-smart"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-xl ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-slate-100 text-slate-800'} flex items-center gap-2`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>Why B-SMART™</span>
                </a>
                <a
                  href="#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-xl ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-slate-100 text-slate-800'} flex items-center gap-2`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Features</span>
                </a>
                <a
                  href="#for-who"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-xl ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-slate-100 text-slate-800'} flex items-center gap-2`}
                >
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Who It's For</span>
                </a>
                <a
                  href="#demo"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-xl ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-slate-100 text-slate-800'} flex items-center gap-2`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                  <span>Live Demo</span>
                </a>
                <a
                  href="#pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-xl ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-slate-100 text-slate-800'} flex items-center gap-2`}
                >
                  <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                  <span>Plans & Pricing</span>
                </a>
                <a
                  href="#faq"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-xl ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-slate-100 text-slate-800'} flex items-center gap-2`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                  <span>FAQ</span>
                </a>
              </div>

              {onOpenSignUpModal && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenSignUpModal();
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <Building2 className="w-4 h-4 text-slate-950" />
                  <span>Sign Up Company with B-SMART™</span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-8 pb-16 sm:pt-20 sm:pb-28 overflow-hidden">
        {/* Ambient Brand Color Glows (Electric Blue & Amber Gold) */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-sky-500/15 to-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[350px] h-[350px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Headlines & Exact User Copy */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-6 text-center lg:text-left">
              {/* Official Brand Emblem Banner */}
              <div className="inline-flex items-center gap-2.5 sm:gap-3 p-1.5 pr-3 sm:pr-4 rounded-2xl bg-slate-900/90 border border-sky-500/30 shadow-lg shadow-sky-950/50 max-w-full">
                <div className="w-14 sm:w-16 h-10 sm:h-11 rounded-xl overflow-hidden border border-sky-400/60 shrink-0 bg-slate-950 shadow-md p-0.5 flex items-center justify-center">
                  <img
                    src="/assets/aistudio/IMG-20261030-WA0019_c157f32a.jpg"
                    alt="B-SMART™ Official Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-left min-w-0">
                  <span className="text-[9px] sm:text-[10px] font-mono text-sky-400 uppercase tracking-widest block font-bold">
                    Official Brand
                  </span>
                  <span className="text-[11px] sm:text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-sky-200 to-amber-300 line-clamp-1 sm:line-clamp-none">
                    B-SMART™ — The Business Card That Consistantly Works For Your Business
                  </span>
                </div>
              </div>

              {/* Exact Primary Headline */}
              <h1 className={`text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] ${isDark ? 'text-white' : 'text-slate-950'}`}>
                Your Business. Smarter.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-500 to-amber-400">
                  More Connected. Unlimited Opportunities.
                </span>
              </h1>

              {/* Exact Core Subheading */}
              <p className={`text-base sm:text-xl font-semibold ${isDark ? 'text-sky-300' : 'text-sky-700'} max-w-2xl mx-auto lg:mx-0 leading-snug`}>
                B-SMART™ is the next-generation Digital Smart Business Card designed to transform the way businesses connect with customers.
              </p>

              {/* Exact Capability Paragraph */}
              <p className={`text-sm sm:text-base ${isDark ? 'text-slate-300' : 'text-slate-600'} max-w-2xl mx-auto lg:mx-0 leading-relaxed`}>
                We transformed the traditional business card into an interactive digital business platform — Empowering you to showcase your business, promote your products and services, share multimedia content, connect with existing and potential new customers, all from one smart digital platform.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2 flex-wrap">
                {onOpenSignUpModal ? (
                  <button
                    type="button"
                    onClick={onOpenSignUpModal}
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-amber-500 hover:from-sky-400 hover:to-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-sky-600/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    <Building2 className="w-4 h-4 text-slate-950" />
                    <span>Sign Up Your Company</span>
                    <ArrowRight className="w-4 h-4 text-slate-950" />
                  </button>
                ) : (
                  <a
                    href="mailto:clint@brandedbydigital.co.za?subject=Get%20My%20B-SMART%E2%84%A2%20Digital%20Business%20Card"
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-amber-500 hover:from-sky-400 hover:to-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-sky-600/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>Get Your Digital Business Card</span>
                    <ArrowRight className="w-4 h-4 text-slate-950" />
                  </a>
                )}

                <a
                  href="#pricing"
                  className={`w-full sm:w-auto px-6 py-4 rounded-2xl border font-bold text-sm flex items-center justify-center gap-2 ${
                    isDark ? 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400' : 'border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-800'
                  } transition-colors`}
                >
                  <CreditCard className="w-4 h-4 text-amber-500" />
                  <span>View Plans & Pricing</span>
                </a>

                <a
                  href="#demo"
                  className={`w-full sm:w-auto px-6 py-4 rounded-2xl border font-bold text-sm flex items-center justify-center gap-2 ${
                    isDark ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-white' : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-800'
                  } transition-colors`}
                >
                  <Smartphone className="w-4 h-4 text-sky-400" />
                  <span>Live Demo</span>
                </a>
              </div>

              {/* Trust Badges */}
              <div className={`pt-6 border-t ${isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-500'} flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs font-semibold`}>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Interactive Digital Profile</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-sky-400" />
                  <span>Zero App Download Needed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-amber-400" />
                  <span>Every Share An Opportunity</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Phone Mockup Showcase */}
            <div id="demo" className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-[340px] sm:max-w-[380px]">
                {/* Decorative B-Smart blue/amber glow ring */}
                <div className="absolute -inset-1.5 bg-gradient-to-r from-sky-500 via-blue-600 to-amber-500 rounded-[44px] blur-xl opacity-45 animate-pulse" />

                {/* Device Frame */}
                <div className={`relative rounded-[38px] p-3 shadow-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-900 border-slate-700'}`}>
                  {/* Speaker notch */}
                  <div className="w-24 h-4 bg-slate-950 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-800 mr-2" />
                    <div className="w-8 h-1 rounded-full bg-slate-800" />
                  </div>

                  {/* Screen Content - B-SMART OFFICIAL SMART DIGITAL PROFILE */}
                  <div className="rounded-[28px] overflow-hidden bg-slate-950 text-white border border-slate-800 shadow-inner">
                    {/* Header Banner with B-Smart Theme */}
                    <div className="relative h-32 bg-gradient-to-r from-sky-950 via-blue-900 to-slate-950 p-3 flex flex-col justify-between overflow-hidden">
                      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
                      <div className="relative z-10 flex justify-between items-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-sky-500 to-amber-500 text-slate-950 uppercase tracking-wider shadow">
                          DIGITAL SMART PROFILE
                        </span>
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      </div>
                      <div className="relative z-10 text-right">
                        <span className="text-[10px] text-sky-300 font-mono">B-SMART™ ONLINE</span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 -mt-10 relative z-10 space-y-4">
                      {/* B-Smart Official Company Logo & Identity */}
                      <div className="flex items-end gap-3">
                        <div className="w-24 h-16 rounded-2xl bg-slate-950 border-2 border-sky-400 p-1 overflow-hidden shadow-2xl shrink-0 flex items-center justify-center">
                          <img
                            src="/assets/aistudio/IMG-20261030-WA0019_c157f32a.jpg"
                            alt="B-SMART™ Official Logo"
                            className="w-full h-full object-contain rounded-xl"
                          />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-black text-white truncate flex items-center gap-1.5">
                            <span>B-SMART™</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] uppercase font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Verified
                            </span>
                          </h3>
                          <p className="text-xs text-amber-400 font-bold truncate">Digital Business Partner</p>
                          <p className="text-[11px] text-slate-400 truncate">Smart Digital Profile</p>
                        </div>
                      </div>

                      {/* User's Exact Slogan Highlight */}
                      <p className="text-xs text-slate-300 bg-slate-900/90 p-3 rounded-xl border border-slate-800 leading-relaxed">
                        <strong className="text-sky-400 block mb-1">B-SMART™</strong>
                        The Business Card That Consistantly Works For Your Business.
                      </p>

                      {/* Quick Action Buttons */}
                      <div className="grid grid-cols-3 gap-2">
                        <a
                          href="tel:+27502004058"
                          className="py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-400 text-center flex flex-col items-center gap-1 text-[11px] font-bold text-sky-400 transition-colors"
                        >
                          <Phone className="w-4 h-4" />
                          <span>Call</span>
                        </a>
                        <a
                          href="https://wa.me/27502004058"
                          target="_blank"
                          rel="noreferrer"
                          className="py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-400 text-center flex flex-col items-center gap-1 text-[11px] font-bold text-emerald-400 transition-colors"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>WhatsApp</span>
                        </a>
                        <a
                          href="mailto:clint@brandedbydigital.co.za"
                          className="py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-amber-500 text-slate-950 text-center flex flex-col items-center gap-1 text-[11px] font-black transition-colors"
                        >
                          <Mail className="w-4 h-4" />
                          <span>Connect</span>
                        </a>
                      </div>

                      {/* Exact Capability Chips */}
                      <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/90 space-y-2">
                        <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">
                          Interactive Business Platform
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-[10px] text-slate-200 font-medium">Showcase Business</span>
                          <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-[10px] text-slate-200 font-medium">Promote Products & Services</span>
                          <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-[10px] text-slate-200 font-medium">Share Multimedia</span>
                          <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-[10px] text-slate-200 font-medium">NFC & Dynamic QR</span>
                        </div>
                      </div>

                      {/* Contact details mini card */}
                      <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1 text-[11px]">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>By Appointment</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Phone className="w-3 h-3 text-sky-400 shrink-0" />
                          <span className="font-mono">+27502004058</span>
                        </div>
                      </div>

                      {/* Interactive CTA button inside phone */}
                      <a
                        href="mailto:clint@brandedbydigital.co.za?subject=Get%20My%20B-SMART%E2%84%A2%20Card"
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-amber-500 hover:from-sky-400 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Get Your Digital Card</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CORE PHILOSOPHY SECTION: "Why Hand Someone A Piece Of Paper When You Can Show Them Your Business?" */}
      <section id="why-b-smart" className={`py-16 sm:py-24 border-t ${isDark ? 'border-slate-800/80 bg-slate-950/80' : 'border-slate-200 bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="relative rounded-3xl p-8 sm:p-14 overflow-hidden border border-sky-500/30 bg-gradient-to-br from-sky-950/40 via-slate-900/60 to-amber-950/30 shadow-2xl">
            {/* Subtle glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
              <span className="inline-block px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/30">
                The New Standard of Networking
              </span>

              {/* Exact Question */}
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                Why hand someone a piece of paper when you can showcase your business?
              </h2>

              {/* Exact Narrative Paragraph */}
              <p className="text-base sm:text-xl text-slate-200 max-w-3xl mx-auto leading-relaxed font-medium">
                With B-SMART™, your business is shared across platforms, accessed instantly and experienced digitally. Every share creates an opportunity to promote your brand, engage with customers and create new business opportunities.
              </p>

              {/* 3 Interactive Experience Pillars */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 text-left">
                <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/95 border-slate-200 text-slate-900'} shadow-lg space-y-3`}>
                  <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Shared Across Platforms</h3>
                  <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
                    Effortlessly distribute your profile via WhatsApp, SMS, Email, QR code scan, or NFC tap. One link reaches everyone on any device.
                  </p>
                </div>

                <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/95 border-slate-200 text-slate-900'} shadow-lg space-y-3`}>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Zap className="w-5 h-5" />
                  </div>
                  <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Accessed Instantly</h3>
                  <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
                    Zero app downloads or account logins required for recipients. Your card loads in milliseconds right in their native mobile browser.
                  </p>
                </div>

                <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/95 border-slate-200 text-slate-900'} shadow-lg space-y-3`}>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Experienced Digitally</h3>
                  <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
                    Showcase rich multimedia galleries, promote current products and services, and turn passive interest into real customer opportunities.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TARGET AUDIENCE SECTION: "Whether you're a start-up, entrepreneur, professional or established company..." */}
      <section id="for-who" className={`py-16 sm:py-24 border-t ${isDark ? 'border-slate-800/80 bg-slate-900/30' : 'border-slate-200 bg-slate-100/60'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">
              Engineered For Every Ambition
            </span>
            <h2 className={`text-2xl sm:text-4xl font-black ${isDark ? 'text-white' : 'text-slate-950'} leading-snug`}>
              Turn Introductions Into Opportunities
            </h2>
            <p className={`text-base sm:text-lg ${isDark ? 'text-slate-300' : 'text-slate-700'} font-medium leading-relaxed`}>
              Whether you're a start-up, entrepreneur, professional or established company, B-SMART™ creates a professional impression, keeps your business connected and turns introductions into opportunities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {audienceCategories.map((item, idx) => (
              <div
                key={`audience-${idx}`}
                className={`p-6 rounded-3xl border transition-all flex flex-col justify-between ${
                  isDark
                    ? 'bg-slate-900/70 border-slate-800 hover:border-sky-500/50 hover:bg-slate-900 shadow-md'
                    : 'bg-white border-slate-200 hover:border-sky-400 shadow-sm hover:shadow-md'
                }`}
              >
                <div className="space-y-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    {item.icon}
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {item.category}
                    </h3>
                    <p className={`text-xs sm:text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-slate-800/60 space-y-2">
                  {item.highlights.map((h, i) => (
                    <div key={`h-${idx}-${i}`} className="flex items-center gap-2 text-xs font-medium text-slate-300">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Pillars Grid */}
      <section id="features" className={`py-16 sm:py-24 border-t ${isDark ? 'border-slate-800/80 bg-slate-950' : 'border-slate-200 bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">
              Comprehensive Platform Capabilities
            </span>
            <h2 className={`text-2xl sm:text-4xl font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
              Everything You Need To{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-500 to-amber-400">
                Showcase Your Business
              </span>
            </h2>
            <p className={`text-sm sm:text-base ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Empowering you to showcase your business, promote products and services, share multimedia content, and reach potential new customers, all from one smart digital platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {featurePillars.map((feat, idx) => (
              <div
                key={`feature-${idx}`}
                className={`p-6 sm:p-8 rounded-3xl border transition-all ${
                  isDark
                    ? 'bg-slate-900/60 border-slate-800 hover:border-sky-500/50 hover:bg-slate-900 shadow-md'
                    : 'bg-slate-50 border-slate-200 hover:border-sky-400 hover:bg-white shadow-sm hover:shadow-md'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm'}`}>
                  {feat.icon}
                </div>
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'} mb-2`}>
                  {feat.title}
                </h3>
                <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
                  {feat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Plans Section */}
      <section id="pricing" className={`py-16 sm:py-24 border-t ${isDark ? 'border-slate-800/80 bg-slate-950' : 'border-slate-200 bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center space-y-4 mb-12">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-widest font-mono">
              Transparent Investment & Value
            </span>
            <h2 className={`text-2xl sm:text-4xl font-black ${isDark ? 'text-white' : 'text-slate-900'} tracking-tight`}>
              B-SMART™ Plans & Pricing
            </h2>
            <p className={`text-sm sm:text-base ${isDark ? 'text-slate-400' : 'text-slate-600'} max-w-2xl mx-auto leading-relaxed`}>
              Equip your organization with a digital smart presence. All pricing is concluded on evaluation to match your exact team size and requirements. New company registrations remain inactive until approved by B-SMART™.
            </p>

            {/* Management Mode Callout */}
            <div className={`mt-6 max-w-3xl mx-auto p-4 rounded-2xl border grid grid-cols-1 sm:grid-cols-2 gap-4 text-left ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="space-y-1">
                <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  <span>Managed by B-SMART™</span>
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Turnkey white-glove concierge. B-SMART™ handles card design, updates, corporate branding, and staff profile additions for you.
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Zap className="w-4 h-4" />
                  <span>Self-Managed (Manage Own Cards)</span>
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Direct administrative autonomy. Your designated company admin can create, edit, issue cards, and update operating hours directly.
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* 1. Starter */}
            <div className={`p-6 rounded-3xl border-2 flex flex-col justify-between ${
              isDark ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-lg'
            } transition-all`}>
              <div className="space-y-4">
                <div>
                  <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Starter</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-1`}>For solo practitioners & boutique offices</p>
                </div>
                <div className="py-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 font-black text-sm tracking-wide">
                    <span>Concluded on Evaluation</span>
                  </div>
                  <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'} font-medium block mt-1.5`}>Tailored quote based on team size & scope</span>
                </div>
                <ul className={`space-y-2.5 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Up to 3 Digital Smart Cards</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>NFC Tap & Dynamic QR Codes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>1-Click vCard Phone Save</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Basic Views & Call Analytics</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                <button
                  type="button"
                  onClick={onOpenSignUpModal || onLaunchApp}
                  className={`w-full py-3 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md'
                  }`}
                >
                  Sign Up & Request Evaluation
                </button>
              </div>
            </div>

            {/* 2. Professional (Featured) */}
            <div className={`relative p-6 rounded-3xl border-2 flex flex-col justify-between ${
              isDark ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-amber-500 shadow-2xl shadow-amber-500/10' : 'bg-white border-amber-500 shadow-xl'
            } transition-all`}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow">
                Most Popular
              </div>

              <div className="space-y-4 pt-1">
                <div>
                  <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Professional</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-1`}>For growing teams & established companies</p>
                </div>
                <div className="py-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-500 font-black text-sm tracking-wide">
                    <span>Concluded on Evaluation</span>
                  </div>
                  <span className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-600'} font-medium block mt-1.5`}>Tailored quote for growing teams & practices</span>
                </div>
                <ul className={`space-y-2.5 text-xs ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Up to 15 Team Member Cards</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Central Company Directory</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Inquiries & Direct Lead Manager</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Multimedia Showcase & YouTube</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Interaction & Click Analytics</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                <button
                  type="button"
                  onClick={onOpenSignUpModal || onLaunchApp}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-950/20 transition-all cursor-pointer"
                >
                  Sign Up & Request Evaluation
                </button>
              </div>
            </div>

            {/* 3. Enterprise */}
            <div className={`p-6 rounded-3xl border-2 flex flex-col justify-between ${
              isDark ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-lg'
            } transition-all`}>
              <div className="space-y-4">
                <div>
                  <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Enterprise</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-1`}>For corporate fleets & multi-branch groups</p>
                </div>
                <div className="py-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-500 font-black text-sm tracking-wide">
                    <span>Concluded on Evaluation</span>
                  </div>
                  <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'} font-medium block mt-1.5`}>Custom corporate quote for multi-branch organizations</span>
                </div>
                <ul className={`space-y-2.5 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Unlimited Digital Smart Cards</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>VIP B-SMART™ Concierge Service</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Dedicated Account Executive</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Custom Corporate Design & Domain</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Payment Reminders & Invoice Portal</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                <button
                  type="button"
                  onClick={onOpenSignUpModal || onLaunchApp}
                  className={`w-full py-3 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md'
                  }`}
                >
                  Sign Up & Request Evaluation
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section id="faq" className={`py-16 sm:py-24 border-t ${isDark ? 'border-slate-800/80 bg-slate-900/40' : 'border-slate-200 bg-slate-50'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center space-y-4 mb-12">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">
              Common Questions
            </span>
            <h2 className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={`faq-${idx}`}
                className={`rounded-2xl border transition-all ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className={`text-sm sm:text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {faq.question}
                  </span>
                  <ChevronRight
                    className={`w-5 h-5 text-sky-400 transition-transform ${
                      activeFaq === idx ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                {activeFaq === idx && (
                  <div className={`px-5 pb-5 text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION BANNER: Exact User Wording */}
      <section className="py-20 sm:py-24 relative overflow-hidden bg-gradient-to-r from-sky-600 via-blue-700 to-amber-600 text-white">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6 relative z-10">
          {/* Signature badge */}
          <div className="inline-block px-4 py-1.5 rounded-full bg-slate-950/40 border border-white/20 text-xs font-black uppercase tracking-wider backdrop-blur-md">
            B-SMART™ — The Business Card That Consistantly Works For Your Business
          </div>

          {/* Exact CTA Headline */}
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight drop-shadow-md">
            Ready to make your business smarter?
          </h2>

          {/* Exact CTA Body */}
          <p className="text-base sm:text-xl font-medium text-slate-100 max-w-2xl mx-auto leading-relaxed">
            Contact B-SMART™ today to get your Digital Business Card and start turning every connection into a potential business opportunity.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 flex-wrap">
            {onOpenSignUpModal && (
              <button
                type="button"
                onClick={onOpenSignUpModal}
                className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-3 shadow-2xl transition-all transform hover:-translate-y-0.5 cursor-pointer border border-amber-300"
              >
                <Building2 className="w-4 h-4 text-slate-950" />
                <span>Register Company with B-SMART™</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>
            )}

            <a
              href="mailto:clint@brandedbydigital.co.za?subject=Contact%20B-SMART%E2%84%A2%20-%20Get%20My%20Digital%20Business%20Card"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-black text-sm flex items-center justify-center gap-3 shadow-2xl transition-all transform hover:-translate-y-0.5 cursor-pointer border border-sky-400/40"
            >
              <Mail className="w-4 h-4 text-amber-400" />
              <span>Contact B-SMART™ Today</span>
              <ArrowRight className="w-4 h-4 text-sky-400" />
            </a>

            <button
              onClick={onLaunchApp}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm flex items-center justify-center gap-2 backdrop-blur-md border border-white/20 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-amber-300" />
              <span>Access Portal Login</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-12 border-t ${isDark ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200 bg-white text-slate-600'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-slate-800/80">
            <div className="md:col-span-2 space-y-3">
              <BSmartLogo size="md" subtitle="Digital Business Card Platform" forceDark />
              <p className="text-xs leading-relaxed max-w-sm">
                B-SMART™ is the next-generation Digital Smart Business Card designed to transform the way businesses connect with customers. We transformed the traditional business card into an interactive digital business platform — Empowering you to showcase your business and reach potential new customers.
              </p>
              <div className="pt-1">
                <span className="text-xs text-sky-400 font-semibold block">
                  B-SMART™ — The Business Card That Consistantly Works For Your Business.
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Official URL: https://b-smart-online.co.za
                </span>
              </div>
            </div>

            {/* Platform Links */}
            <div className="space-y-2 text-xs">
              <h5 className={`font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>Platform</h5>
              <div className="space-y-1.5 flex flex-col text-slate-400">
                <span className="cursor-default select-none">Interactive Business Platform</span>
                <span className="cursor-default select-none">Multimedia Content Sharing</span>
                <span className="cursor-default select-none">NFC Tap & Dynamic QR</span>
                <span className="cursor-default select-none">Lead Generation & Callback</span>
              </div>
            </div>

            {/* Contact & Support */}
            <div className="space-y-2 text-xs">
              <h5 className={`font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>Contact B-SMART™</h5>
              <div className="space-y-2 flex flex-col">
                <a href="mailto:clint@brandedbydigital.co.za" className="flex items-center gap-2 hover:text-sky-400 transition-colors">
                  <Mail className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>clint@brandedbydigital.co.za</span>
                </a>
                <a href="tel:+27502004058" className="flex items-center gap-2 hover:text-sky-400 transition-colors font-mono">
                  <Phone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>+27502004058</span>
                </a>
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>By Appointment</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} B-SMART™ Online. All rights reserved.</p>
            <p className="text-[11px] text-slate-400">
              Powered by <a href="/" className="font-black text-amber-400 hover:text-amber-300 underline underline-offset-2 tracking-wider">B-SMART™</a> • The Business Card That Consistantly Works For Your Business
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
