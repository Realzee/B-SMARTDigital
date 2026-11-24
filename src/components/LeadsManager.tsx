import React, { useState, useMemo, useEffect } from 'react';
import {
  Mail,
  Phone,
  MessageSquare,
  Clock,
  Trash2,
  Search,
  Download,
  Plus,
  Calendar,
  AlertTriangle,
  Send,
  Building2,
  CreditCard,
  Check,
  X,
  FileText,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  BellRing,
  BarChart3,
  CheckCircle2,
  Eye,
  Activity,
  ShieldAlert,
  Copy
} from 'lucide-react';
import { LeadInquiry, LeadStatus, Company, BusinessCard, EmailNotificationLog } from '../types';
import {
  dbFetchEmailLogs,
  dbFetchMonitoringSummary,
  dbFetchReportPreview,
  dbNotifyCardHolder,
  dbResendEmailLog,
  dbRunFollowUpSweep,
  dbSendCompanyReport,
  dbSendMonitoringTest,
  getApiUrl,
} from '../lib/neon';
import { ConfirmationModal } from './ConfirmationModal';
import { useTheme } from '../context/ThemeContext';

interface LeadsManagerProps {
  leads: LeadInquiry[];
  companies?: Company[];
  cards?: BusinessCard[];
  selectedCompanyId?: string | null;
  onSelectCompany?: (companyId: string | null) => void;
  onOpenCardPreview?: (cardId: string) => void;
  onUpdateStatus: (id: string, status: LeadStatus) => void;
  onUpdateLead?: (id: string, updates: Partial<LeadInquiry>) => void;
  onAddLead?: (lead: Omit<LeadInquiry, 'id' | 'createdAt'>) => void;
  onDeleteLead: (id: string) => void;
  onShowToast?: (message: string) => void;
}

// Clean phone number for WhatsApp international URL
function cleanPhoneForWhatsApp(rawPhone: string): string {
  if (!rawPhone) return '';
  let cleaned = rawPhone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0') && (cleaned.length === 10 || cleaned.length === 9)) {
    // Standard South African mobile 082... -> 2782...
    cleaned = '27' + cleaned.substring(1);
  }
  return cleaned;
}

// Safe date formatter to prevent any RangeError or crash
function formatDateSafe(dateStr?: string): string {
  if (!dateStr) return 'Recent';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Recent';
    return d.toLocaleDateString();
  } catch {
    return 'Recent';
  }
}

function formatTimeSafe(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function buildMailtoHref(to: string, subject: string, body: string): string {
  const safeTo = (to || '').trim();
  return `mailto:${encodeURIComponent(safeTo)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function buildGmailComposeHref(to: string, subject: string, body: string): string {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent((to || '').trim())}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function buildWhatsAppAlertHref(phone: string, text: string): string {
  const digits = cleanPhoneForWhatsApp(phone);
  if (!digits) return '';
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function downloadHtmlReportFile(filename: string, html: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const LeadsManager: React.FC<LeadsManagerProps> = ({
  leads = [],
  companies = [],
  cards = [],
  selectedCompanyId = null,
  onSelectCompany,
  onOpenCardPreview,
  onUpdateStatus,
  onUpdateLead,
  onAddLead,
  onDeleteLead,
  onShowToast,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const notifyUser = (msg: string) => {
    if (onShowToast) onShowToast(msg);
  };

  // CRM Workspace Mode
  const [crmTab, setCrmTab] = useState<'workstation' | 'monitoring' | 'reports'>('workstation');

  // Company Filter - initialized from selectedCompanyId if present
  const [activeCompanyFilter, setActiveCompanyFilter] = useState<string>(() => {
    return selectedCompanyId || 'all';
  });

  // Sync if selectedCompanyId prop changes
  useEffect(() => {
    if (selectedCompanyId) {
      setActiveCompanyFilter(selectedCompanyId);
    }
  }, [selectedCompanyId]);

  // Status & Schedule Filters
  const [statusFilter, setStatusFilter] = useState<'all' | LeadStatus>('all');
  const [followUpFilter, setFollowUpFilter] = useState<'all' | 'due' | 'scheduled' | 'none' | 'unattended'>('all');
  const [search, setSearch] = useState('');

  // Pagination state (prevents UI freeze even with thousands of records)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Expanded notes & drafts
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [followUpDateDrafts, setFollowUpDateDrafts] = useState<Record<string, string>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  // Monitoring, Email Logs & Weekly/Monthly Company Report States
  const [emailLogs, setEmailLogs] = useState<EmailNotificationLog[]>([]);
  const [monitoringSummary, setMonitoringSummary] = useState<any>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [notifyingLeadId, setNotifyingLeadId] = useState<string | null>(null);
  const [runningSweep, setRunningSweep] = useState(false);
  const [resendingLogId, setResendingLogId] = useState<string | null>(null);
  const [previewEmailModal, setPreviewEmailModal] = useState<{
    subject: string;
    html: string;
    recipient: string;
    textSummary?: string;
    cardHolderPhone?: string;
  } | null>(null);

  // Reports Tab State
  const [reportCompanyId, setReportCompanyId] = useState<string>(() => selectedCompanyId || companies[0]?.id || 'all');
  const [reportPeriod, setReportPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [reportPreviewData, setReportPreviewData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [overrideReportEmail, setOverrideReportEmail] = useState('');
  const [testDispatchEmail, setTestDispatchEmail] = useState('');
  const [sendingTestDispatch, setSendingTestDispatch] = useState(false);

  // WhatsApp Follow-up Modal State
  const [whatsAppModalLead, setWhatsAppModalLead] = useState<LeadInquiry | null>(null);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<'intro' | 'callback' | 'quote' | 'custom'>('intro');
  const [customWhatsAppMessage, setCustomWhatsAppMessage] = useState('');

  // Manual Add Lead Modal
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    phone: '',
    email: '',
    cardId: '',
    companyId: selectedCompanyId || '',
    subject: 'General Inquiry',
    preferredContact: 'whatsapp' as 'whatsapp' | 'call' | 'email',
    preferredTime: 'Immediate / Urgent',
    message: '',
    status: 'new' as LeadStatus,
    followUpDate: '',
    notes: '',
  });

  // Deletion modal
  const [leadToDelete, setLeadToDelete] = useState<LeadInquiry | null>(null);

  // Today string for date comparisons (YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // 1. Resolve & normalize company associations for every lead
  const normalizedLeads = useMemo(() => {
    if (!Array.isArray(leads)) return [];
    
    // Quick deduplicate by content or ID in memory
    const seen = new Set<string>();
    const cleanList: LeadInquiry[] = [];
    for (const l of leads) {
      if (!l || !l.id) continue;
      const key = `${l.id}|${(l.name || '').trim().toLowerCase()}|${(l.phone || '').trim()}`;
      if (!seen.has(l.id) && !seen.has(key)) {
        seen.add(l.id);
        seen.add(key);

        // Resolve company ID
        let compId = l.companyId;
        let compName = l.companyName;

        if (!compId && l.cardId) {
          const matchedCard = cards.find((c) => c.id === l.cardId || c.businessName?.toLowerCase() === l.cardName?.toLowerCase());
          if (matchedCard?.companyId) {
            compId = matchedCard.companyId;
          }
        }
        if (!compId && l.cardName) {
          const matchedComp = companies.find((c) => c.name.toLowerCase() === l.cardName?.toLowerCase());
          if (matchedComp) compId = matchedComp.id;
        }

        // Resolve company Name
        if (compId && !compName) {
          const comp = companies.find((c) => c.id === compId);
          if (comp) compName = comp.name;
        }
        if (!compName) {
          compName = l.cardName || 'Corporate';
        }

        cleanList.push({
          ...l,
          companyId: compId,
          companyName: compName,
          name: l.name || 'Anonymous Prospect',
          phone: l.phone || '',
          email: l.email || '',
          subject: l.subject || 'General Inquiry',
          message: l.message || '',
          status: l.status || 'new',
        });
      }
    }
    return cleanList;
  }, [leads, cards, companies]);

  // 2. Company Lead Counts for Company Tabs Bar
  const companyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of normalizedLeads) {
      if (l.companyId) {
        counts[l.companyId] = (counts[l.companyId] || 0) + 1;
      }
    }
    return counts;
  }, [normalizedLeads]);

  // Load Monitoring & Email Logs when active filter or tab changes
  const refreshMonitoringData = async () => {
    setLoadingLogs(true);
    try {
      const [summary, logsRes] = await Promise.all([
        dbFetchMonitoringSummary(activeCompanyFilter),
        dbFetchEmailLogs(activeCompanyFilter),
      ]);
      if (summary) setMonitoringSummary(summary);
      if (logsRes) setEmailLogs(logsRes.logs || []);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    refreshMonitoringData();
  }, [activeCompanyFilter, crmTab, leads.length]);

  useEffect(() => {
    if (activeCompanyFilter !== 'all') {
      setReportCompanyId(activeCompanyFilter);
    } else if ((!reportCompanyId || reportCompanyId === 'all') && companies.length > 0) {
      setReportCompanyId(companies[0].id);
    }
  }, [activeCompanyFilter, companies]);

  const loadReportPreview = async (compId: string, period: 'weekly' | 'monthly') => {
    if (!compId || compId === 'all') return;
    setLoadingReport(true);
    try {
      const data = await dbFetchReportPreview(compId, period);
      setReportPreviewData(data);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (crmTab === 'reports' && reportCompanyId && reportCompanyId !== 'all') {
      loadReportPreview(reportCompanyId, reportPeriod);
    }
  }, [crmTab, reportCompanyId, reportPeriod, leads.length]);

  // 3. Stats calculation
  const stats = useMemo(() => {
    // Calculate stats based on current company filter
    const pool = activeCompanyFilter === 'all'
      ? normalizedLeads
      : normalizedLeads.filter((l) => l.companyId === activeCompanyFilter);

    const nowMs = Date.now();
    const total = pool.length;
    const newCount = pool.filter((l) => l.status === 'new').length;
    const contactedCount = pool.filter((l) => l.status === 'contacted').length;
    const inProgressCount = pool.filter((l) => l.status === 'in_progress').length;
    const resolvedCount = pool.filter((l) => l.status === 'resolved').length;
    const dueCount = pool.filter(
      (l) => l.followUpDate && l.followUpDate <= todayStr && l.status !== 'resolved' && l.status !== 'archived'
    ).length;
    const unattendedCount = pool.filter((l) => {
      if (l.status !== 'new' || l.lastContactedAt) return false;
      const t = l.createdAt ? new Date(l.createdAt).getTime() : nowMs;
      return !isNaN(t) && (nowMs - t) / (1000 * 60 * 60) >= 24;
    }).length;
    const cardHolderNotifiedCount = pool.filter((l) => !!l.cardHolderNotifiedAt).length;
    return { total, newCount, contactedCount, inProgressCount, resolvedCount, dueCount, unattendedCount, cardHolderNotifiedCount };
  }, [normalizedLeads, activeCompanyFilter, todayStr]);

  // 4. Filtered Leads List
  const filtered = useMemo(() => {
    const nowMs = Date.now();
    return normalizedLeads.filter((l) => {
      // Company filter
      if (activeCompanyFilter !== 'all') {
        const matchesComp =
          l.companyId === activeCompanyFilter ||
          (l.companyName && l.companyName.toLowerCase() === activeCompanyFilter.toLowerCase());
        if (!matchesComp) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;

      // Follow-up date filter
      if (followUpFilter === 'due') {
        if (!l.followUpDate || l.followUpDate > todayStr || l.status === 'resolved' || l.status === 'archived') {
          return false;
        }
      } else if (followUpFilter === 'scheduled') {
        if (!l.followUpDate || l.followUpDate < todayStr || l.status === 'resolved' || l.status === 'archived') {
          return false;
        }
      } else if (followUpFilter === 'none') {
        if (l.followUpDate) return false;
      } else if (followUpFilter === 'unattended') {
        if (l.status !== 'new' || l.lastContactedAt) return false;
        const t = l.createdAt ? new Date(l.createdAt).getTime() : nowMs;
        if (isNaN(t) || (nowMs - t) / (1000 * 60 * 60) < 24) return false;
      }

      // Query search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesQuery =
          (l.name && l.name.toLowerCase().includes(q)) ||
          (l.email && l.email.toLowerCase().includes(q)) ||
          (l.phone && l.phone.includes(q)) ||
          (l.cardName && l.cardName.toLowerCase().includes(q)) ||
          (l.companyName && l.companyName.toLowerCase().includes(q)) ||
          (l.subject && l.subject.toLowerCase().includes(q)) ||
          (l.message && l.message.toLowerCase().includes(q)) ||
          (l.notes && l.notes.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [normalizedLeads, activeCompanyFilter, statusFilter, followUpFilter, search, todayStr]);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCompanyFilter, statusFilter, followUpFilter, search, pageSize]);

  // 5. Paginated subset for instant 60fps rendering
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filtered.slice(startIndex, startIndex + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Export to CSV Function
  const handleExportCSV = () => {
    if (filtered.length === 0) {
      alert('No inquiries available to export.');
      return;
    }

    const headers = [
      'Reference ID',
      'Date Captured',
      'Prospect Name',
      'Phone Number',
      'Email Address',
      'Company Name',
      'Digital Card Name',
      'Topic / Subject',
      'Preferred Contact Channel',
      'Preferred Callback Time',
      'Pipeline Status',
      'Scheduled Follow-up Date',
      'Last Contacted At',
      'Internal CRM Notes',
      'Prospect Inquiry Message',
    ];

    const escapeCsv = (str: string | undefined | null) => {
      if (!str) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = filtered.map((l) => [
      escapeCsv(l.id),
      escapeCsv(l.createdAt ? new Date(l.createdAt).toLocaleString() : ''),
      escapeCsv(l.name),
      escapeCsv(l.phone),
      escapeCsv(l.email),
      escapeCsv(l.companyName || ''),
      escapeCsv(l.cardName),
      escapeCsv(l.subject || 'General Inquiry'),
      escapeCsv(l.preferredContact || 'whatsapp'),
      escapeCsv(l.preferredTime || 'Anytime'),
      escapeCsv(l.status),
      escapeCsv(l.followUpDate || ''),
      escapeCsv(l.lastContactedAt ? new Date(l.lastContactedAt).toLocaleString() : ''),
      escapeCsv(l.notes || ''),
      escapeCsv(l.message),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `bsmart_inquiries_${activeCompanyFilter !== 'all' ? activeCompanyFilter : 'all'}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Save Notes and Follow-Up date
  const handleSaveNotes = async (leadId: string) => {
    setSavingNoteId(leadId);
    const notes = noteDrafts[leadId] !== undefined ? noteDrafts[leadId] : normalizedLeads.find((l) => l.id === leadId)?.notes || '';
    const followUpDate =
      followUpDateDrafts[leadId] !== undefined
        ? followUpDateDrafts[leadId]
        : normalizedLeads.find((l) => l.id === leadId)?.followUpDate || '';

    if (onUpdateLead) {
      await onUpdateLead(leadId, { notes, followUpDate });
    }
    await refreshMonitoringData();
    setSavingNoteId(null);
  };

  // Manual 1-click Cardholder Alert (Zero-SMTP Direct & Multi-Channel Dispatch)
  const handleNotifyCardHolderNow = async (lead: LeadInquiry) => {
    setNotifyingLeadId(lead.id);
    try {
      const res = await dbNotifyCardHolder(lead.id);
      if (res.success && res.log) {
        if (onUpdateLead && res.lead) {
          onUpdateLead(lead.id, {
            cardHolderName: res.lead.cardHolderName,
            cardHolderEmail: res.lead.cardHolderEmail,
            cardHolderNotifiedAt: res.lead.cardHolderNotifiedAt,
            lastReminderSentAt: res.lead.lastReminderSentAt,
          });
        }
        if (res.log.status === 'sent') {
          notifyUser(`Cardholder alert delivered to ${res.log.recipientEmail}`);
        } else {
          notifyUser(`Cardholder alert logged in-app for ${res.log.recipientEmail} (ready for 1-click Gmail / Mail App / WhatsApp send)`);
          if (res.log.htmlPreview) {
            setPreviewEmailModal({
              subject: res.log.subject,
              html: res.log.htmlPreview,
              recipient: res.log.recipientEmail,
              textSummary: res.log.textSummary,
              cardHolderPhone: res.log.cardHolderPhone,
            });
          }
        }
        await refreshMonitoringData();
      } else {
        notifyUser('Could not generate cardholder alert right now.');
      }
    } finally {
      setNotifyingLeadId(null);
    }
  };

  const handleRunMonitoringSweep = async () => {
    setRunningSweep(true);
    try {
      const res = await dbRunFollowUpSweep();
      await refreshMonitoringData();
      if (res) {
        notifyUser(
          `Monitoring sweep complete: ${res.checkedCount} open enquiries checked, ${res.remindersTriggered} follow-up alerts & ${res.escalationsTriggered} SLA alerts processed.`
        );
      }
    } finally {
      setRunningSweep(false);
    }
  };

  const handleSendCompanyReportNow = async () => {
    if (!reportCompanyId || reportCompanyId === 'all') {
      notifyUser('Select a specific company first.');
      return;
    }
    setSendingReport(true);
    try {
      const res = await dbSendCompanyReport(
        reportCompanyId,
        reportPeriod,
        overrideReportEmail.trim() || undefined
      );
      await refreshMonitoringData();
      await loadReportPreview(reportCompanyId, reportPeriod);
      const firstLog = res?.results?.[0]?.log;
      if (firstLog) {
        notifyUser(
          firstLog.status === 'sent'
            ? `${reportPeriod === 'weekly' ? 'Weekly' : 'Monthly'} report emailed to ${firstLog.recipientEmail}`
            : `${reportPeriod === 'weekly' ? 'Weekly' : 'Monthly'} report generated & logged for ${firstLog.recipientEmail}`
        );
      }
    } finally {
      setSendingReport(false);
    }
  };

  // WhatsApp Follow-up Launch
  const handleLaunchWhatsApp = (lead: LeadInquiry, messageText: string) => {
    const cleanPhone = cleanPhoneForWhatsApp(lead.phone);
    const encoded = encodeURIComponent(messageText);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    const nowIso = new Date().toISOString();
    if (onUpdateLead) {
      onUpdateLead(lead.id, {
        lastContactedAt: nowIso,
        status: lead.status === 'new' ? 'contacted' : lead.status,
      });
    } else {
      if (lead.status === 'new') {
        onUpdateStatus(lead.id, 'contacted');
      }
    }
    setWhatsAppModalLead(null);
  };

  // Handle Add Lead Submit
  const handleAddLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.name.trim() || !newLeadForm.phone.trim()) {
      alert('Please provide at least a prospect name and phone number.');
      return;
    }

    const targetCompany = companies.find((c) => c.id === newLeadForm.companyId);
    const targetCard = cards.find((c) => c.id === newLeadForm.cardId);

    const leadPayload: Omit<LeadInquiry, 'id' | 'createdAt'> = {
      cardId: newLeadForm.cardId || (targetCard ? targetCard.id : cards[0]?.id || 'manual-entry'),
      cardName: targetCard?.businessName || targetCompany?.name || 'Manual Inquiry',
      companyId: newLeadForm.companyId || targetCompany?.id || undefined,
      companyName: targetCompany?.name || targetCard?.businessName || undefined,
      name: newLeadForm.name.trim(),
      phone: newLeadForm.phone.trim(),
      email: newLeadForm.email.trim(),
      subject: newLeadForm.subject,
      preferredContact: newLeadForm.preferredContact,
      preferredTime: newLeadForm.preferredTime,
      message: newLeadForm.message.trim() || 'Recorded manual lead / phone inquiry.',
      status: newLeadForm.status,
      followUpDate: newLeadForm.followUpDate || undefined,
      notes: newLeadForm.notes.trim() || undefined,
    };

    if (onAddLead) {
      onAddLead(leadPayload);
    }

    setShowAddLeadModal(false);
    setNewLeadForm({
      name: '',
      phone: '',
      email: '',
      cardId: '',
      companyId: selectedCompanyId || '',
      subject: 'General Inquiry',
      preferredContact: 'whatsapp',
      preferredTime: 'Immediate / Urgent',
      message: '',
      status: 'new',
      followUpDate: '',
      notes: '',
    });
  };

  return (
    <div className={`max-w-7xl mx-auto p-3 sm:p-6 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80 mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-xl sm:text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Leads & Inquiries CRM
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500 text-slate-950">
                  {filtered.length} {filtered.length === 1 ? 'Inquiry' : 'Inquiries'}
                </span>
              </div>
              <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
                Real-time prospect callbacks, quotation requests, and company-specific inquiry workstation.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRunMonitoringSweep}
            disabled={runningSweep}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isDark
                ? 'bg-sky-950/50 hover:bg-sky-900/60 text-sky-300 border-sky-500/30'
                : 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-300'
            }`}
            title="Check all due/overdue follow-ups and unattended enquiries & email cardholders"
          >
            <BellRing className={`w-3.5 h-3.5 ${runningSweep ? 'animate-spin' : ''}`} />
            <span>{runningSweep ? 'Checking...' : 'Run Follow-Up Check'}</span>
          </button>

          {onAddLead && (
            <button
              type="button"
              onClick={() => {
                setNewLeadForm((prev) => ({
                  ...prev,
                  companyId: activeCompanyFilter !== 'all' ? activeCompanyFilter : (companies[0]?.id || ''),
                }));
                setShowAddLeadModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Manual Lead</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isDark
                ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700 shadow-sm'
                : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-sm'
            }`}
            title="Download full inquiries spreadsheet (.csv for Excel)"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* CRM Workspace Navigation Tabs */}
      <div className={`flex flex-wrap items-center gap-2 p-1.5 rounded-2xl border mb-5 ${
        isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-slate-100 border-slate-200'
      }`}>
        <button
          type="button"
          onClick={() => setCrmTab('workstation')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            crmTab === 'workstation'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Enquiries &amp; Follow-Ups</span>
          {(stats.dueCount + stats.unattendedCount) > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500 text-white">
              {stats.dueCount + stats.unattendedCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setCrmTab('monitoring')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            crmTab === 'monitoring'
              ? 'bg-sky-500 text-slate-950 shadow-sm'
              : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Cardholder Alert Monitor</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
            crmTab === 'monitoring' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-sky-400'
          }`}>
            {emailLogs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCrmTab('reports')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            crmTab === 'reports'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-white'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Weekly &amp; Monthly Company Reports</span>
        </button>
      </div>

      {/* COMPANY QUICK-SWITCHER TABS (Shows accurate company data instantly) */}
      <div className="mb-5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'} flex items-center gap-1.5`}>
            <Building2 className="w-3.5 h-3.5 text-amber-500" />
            <span>Filter by Company:</span>
          </span>
          {activeCompanyFilter !== 'all' && (
            <button
              type="button"
              onClick={() => {
                setActiveCompanyFilter('all');
                if (onSelectCompany) onSelectCompany(null);
              }}
              className="text-xs text-amber-400 hover:underline font-bold"
            >
              Show All Companies ({normalizedLeads.length})
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar">
          {/* All Companies Button */}
          <button
            type="button"
            onClick={() => {
              setActiveCompanyFilter('all');
              if (onSelectCompany) onSelectCompany(null);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeCompanyFilter === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-400 font-black'
                : isDark
                ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-xs'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>All Companies</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeCompanyFilter === 'all' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-amber-400'
            }`}>
              {normalizedLeads.length}
            </span>
          </button>

          {/* Individual Companies Pills */}
          {companies.map((comp) => {
            const count = companyCounts[comp.id] || 0;
            const isSelected = activeCompanyFilter === comp.id;

            return (
              <button
                key={`comp-tab-${comp.id}`}
                type="button"
                onClick={() => {
                  setActiveCompanyFilter(comp.id);
                  if (onSelectCompany) onSelectCompany(comp.id);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-sky-600 text-white shadow-md ring-2 ring-sky-400 font-black'
                    : count > 0
                    ? isDark
                      ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700'
                      : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-xs'
                    : isDark
                    ? 'bg-slate-950/40 text-slate-400 border border-slate-800/60 hover:text-slate-200'
                    : 'bg-slate-50 text-slate-500 border border-slate-200'
                }`}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: comp.theme?.primaryColor || '#f59e0b' }}
                />
                <span className="truncate max-w-[180px]">{comp.name}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : count > 0
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary Metrics Bar for the Selected View */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-5">
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'all'
              ? isDark ? 'bg-slate-900 border-amber-500 shadow-md ring-1 ring-amber-500/40' : 'bg-amber-50 border-amber-400 shadow-sm'
              : isDark ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200'
          }`}
        >
          <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Inquiries
          </span>
          <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'} mt-0.5`}>
            {stats.total}
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('new')}
          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'new'
              ? isDark ? 'bg-amber-950/40 border-amber-500 shadow-md ring-1 ring-amber-500/40' : 'bg-amber-100 border-amber-500 shadow-sm'
              : isDark ? 'bg-slate-900/60 border-slate-800 hover:border-amber-500/40' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
              New
            </span>
            {stats.newCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </div>
          <div className="text-xl font-black text-amber-400 mt-0.5">
            {stats.newCount}
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('in_progress')}
          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'in_progress'
              ? isDark ? 'bg-purple-950/40 border-purple-500 shadow-md ring-1 ring-purple-500/40' : 'bg-purple-100 border-purple-500 shadow-sm'
              : isDark ? 'bg-slate-900/60 border-slate-800 hover:border-purple-500/40' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400">
            In Progress
          </span>
          <div className="text-xl font-black text-purple-400 mt-0.5">
            {stats.inProgressCount}
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('contacted')}
          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'contacted'
              ? isDark ? 'bg-sky-950/40 border-sky-500 shadow-md ring-1 ring-sky-500/40' : 'bg-sky-100 border-sky-500 shadow-sm'
              : isDark ? 'bg-slate-900/60 border-slate-800 hover:border-sky-500/40' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-sky-400">
            Contacted
          </span>
          <div className="text-xl font-black text-sky-400 mt-0.5">
            {stats.contactedCount}
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('resolved')}
          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'resolved'
              ? isDark ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/40' : 'bg-emerald-100 border-emerald-500 shadow-sm'
              : isDark ? 'bg-slate-900/60 border-slate-800 hover:border-emerald-500/40' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
            Resolved / Won
          </span>
          <div className="text-xl font-black text-emerald-400 mt-0.5">
            {stats.resolvedCount}
          </div>
        </div>

        <div
          onClick={() => setFollowUpFilter(followUpFilter === 'due' ? 'all' : 'due')}
          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
            followUpFilter === 'due'
              ? isDark ? 'bg-rose-950/40 border-rose-500 shadow-md ring-1 ring-rose-500/40' : 'bg-rose-100 border-rose-500 shadow-sm'
              : isDark ? 'bg-slate-900/60 border-slate-800 hover:border-rose-500/40' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400">
              Follow-up Due
            </span>
            {stats.dueCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white">
                Urgent
              </span>
            )}
          </div>
          <div className="text-xl font-black text-rose-400 mt-0.5">
            {stats.dueCount}
          </div>
        </div>
      </div>

      {crmTab === 'workstation' && (
        <>
          {/* Follow-up schedule dropdown */}
          <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} mb-5 space-y-3`}>
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by prospect name, email, phone, topic, notes, or card..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-amber-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500'
              }`}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Follow-up schedule dropdown */}
          <div className="w-full md:w-64 shrink-0">
            <select
              value={followUpFilter}
              onChange={(e) => setFollowUpFilter(e.target.value as any)}
              aria-label="Filter by follow-up schedule"
              className={`w-full py-2.5 px-3 rounded-xl border text-xs font-semibold focus:outline-none focus:border-amber-500 ${
                isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="all">All Follow-Up Schedules</option>
              <option value="due">Due Today / Overdue Only ({stats.dueCount})</option>
              <option value="unattended">Unattended &gt;24h SLA ({stats.unattendedCount})</option>
              <option value="scheduled">Upcoming Scheduled</option>
              <option value="none">No Follow-up Scheduled</option>
            </select>
          </div>
        </div>

        {/* Status Pill Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-[11px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'} mr-1`}>
              Status:
            </span>
            {(['all', 'new', 'in_progress', 'contacted', 'resolved', 'archived'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : isDark
                    ? 'bg-slate-950/70 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {st === 'all' ? 'All' : st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Page size selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Show:</span>
            {[15, 30, 50].map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setPageSize(sz)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  pageSize === sz ? 'bg-amber-500 text-slate-950' : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leads List / CRM Workstation */}
      {filtered.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border ${isDark ? 'bg-slate-900/50 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-500'} space-y-3`}>
          <MessageSquare className="w-12 h-12 text-slate-600 mx-auto opacity-40" />
          <h3 className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            No inquiries match your current filters
          </h3>
          <p className="text-xs max-w-sm mx-auto">
            {activeCompanyFilter !== 'all'
              ? `There are no inquiries logged for this company yet. Inquiries captured from its smart cards will show up here automatically.`
              : 'Try resetting your search query or switching to All status to view all direct customer leads.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
              setActiveCompanyFilter('all');
              setFollowUpFilter('all');
              if (onSelectCompany) onSelectCompany(null);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {paginatedLeads.map((lead, lIdx) => {
            const isNotesExpanded = !!expandedNotes[lead.id];
            const currentNote = noteDrafts[lead.id] !== undefined ? noteDrafts[lead.id] : lead.notes || '';
            const currentFollowUp = followUpDateDrafts[lead.id] !== undefined ? followUpDateDrafts[lead.id] : lead.followUpDate || '';

            // Follow-up & SLA monitoring status check
            const isOverdue = lead.followUpDate && lead.followUpDate < todayStr && lead.status !== 'resolved' && lead.status !== 'archived';
            const isDueToday = lead.followUpDate && lead.followUpDate === todayStr && lead.status !== 'resolved' && lead.status !== 'archived';
            const isScheduledFuture = lead.followUpDate && lead.followUpDate > todayStr;
            const ageHours = lead.createdAt ? Math.max(0, (Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60)) : 0;
            const isUnattendedSla = lead.status === 'new' && !lead.lastContactedAt && ageHours >= 24;

            // Company & cardholder info
            const comp = companies.find((c) => c.id === lead.companyId || c.name === lead.companyName);
            const compAccent = comp?.theme?.primaryColor || '#f59e0b';
            const assignedCard = cards.find((c) => c.id === lead.cardId);
            const holderName = lead.cardHolderName || assignedCard?.contactPersonName || lead.cardName;
            const holderEmail = lead.cardHolderEmail || assignedCard?.socialLinks?.email || comp?.email || '';
            const holderPhone = assignedCard?.socialLinks?.whatsapp || assignedCard?.socialLinks?.phone || comp?.phone || '';
            const holderAlertText = [
              `B-SMART™ Alert (${holderName}): ${isOverdue ? 'OVERDUE FOLLOW-UP' : isDueToday ? 'FOLLOW-UP DUE TODAY' : isUnattendedSla ? 'UNATTENDED >24H SLA' : 'CUSTOMER ENQUIRY'}`,
              `Customer: ${lead.name}`,
              `Phone: ${lead.phone || '-'} | Email: ${lead.email || '-'}`,
              `Topic: ${lead.subject || 'General Inquiry'}`,
              lead.followUpDate ? `Follow-up Date: ${lead.followUpDate}` : '',
              `Message: ${lead.message || ''}`,
            ].filter(Boolean).join('\n');
            const holderWhatsAppHref = buildWhatsAppAlertHref(holderPhone, holderAlertText);

            return (
              <div
                key={`crm-lead-${lead.id}-${lIdx}`}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isOverdue || isUnattendedSla
                    ? isDark ? 'bg-slate-900/90 border-rose-500/50 shadow-lg shadow-rose-950/20' : 'bg-rose-50/40 border-rose-300 shadow-sm'
                    : isDueToday
                    ? isDark ? 'bg-slate-900/90 border-amber-500/60 shadow-lg shadow-amber-950/20' : 'bg-amber-50/40 border-amber-300 shadow-sm'
                    : isDark ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                {/* Top Row: Prospect identity, Status Selector, and Badges */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-800/60">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-xs">
                        {lead.name ? lead.name.charAt(0).toUpperCase() : 'L'}
                      </div>
                      <h4 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'} truncate`}>
                        {lead.name}
                      </h4>

                      {/* Status Badge */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          lead.status === 'new'
                            ? isDark ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-amber-100 text-amber-800 border border-amber-300'
                            : lead.status === 'in_progress'
                            ? isDark ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-purple-100 text-purple-800 border border-purple-300'
                            : lead.status === 'contacted'
                            ? isDark ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-sky-100 text-sky-800 border border-sky-300'
                            : lead.status === 'resolved'
                            ? isDark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : isDark ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {lead.status.replace('_', ' ')}
                      </span>

                      {/* Follow-up & SLA Monitoring Badges */}
                      {isOverdue && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Overdue ({lead.followUpDate})</span>
                        </span>
                      )}
                      {isUnattendedSla && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" />
                          <span>Unattended {Math.floor(ageHours)}h</span>
                        </span>
                      )}
                      {isDueToday && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 animate-pulse">
                          <Clock className="w-3 h-3" />
                          <span>Due Today!</span>
                        </span>
                      )}
                      {isScheduledFuture && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/25 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Follow-up {lead.followUpDate}</span>
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                        lead.cardHolderNotifiedAt
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`} title={holderEmail ? `Cardholder: ${holderName} (${holderEmail})` : 'Cardholder notification status'}>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{lead.cardHolderNotifiedAt ? `Alerted ${holderName}` : `Holder: ${holderName}`}</span>
                      </span>
                    </div>

                    {/* Metadata Subline with Company & Card Association */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      {/* Company Badge with Accent Pill */}
                      {lead.companyName && (
                        <button
                          type="button"
                          onClick={() => {
                            if (lead.companyId) {
                              setActiveCompanyFilter(lead.companyId);
                              if (onSelectCompany) onSelectCompany(lead.companyId);
                            }
                          }}
                          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md font-bold text-[11px] transition-colors cursor-pointer ${
                            isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                          }`}
                          title={`Click to filter by ${lead.companyName}`}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: compAccent }} />
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{lead.companyName}</span>
                        </button>
                      )}

                      {/* Card Association & Preview */}
                      <span className="flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-slate-500" />
                        <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{lead.cardName}</span>
                        {onOpenCardPreview && lead.cardId && (
                          <button
                            type="button"
                            onClick={() => onOpenCardPreview(lead.cardId)}
                            className="text-amber-400 hover:text-amber-300 ml-0.5 cursor-pointer"
                            title="Preview Smart Card"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </span>

                      <span>·</span>

                      {/* Reference Code */}
                      <span className="font-mono text-[11px] text-amber-400/90 font-bold">
                        #{lead.id.slice(-8).toUpperCase()}
                      </span>

                      <span>·</span>

                      {/* Date & Time */}
                      <span className="text-[11px] font-mono">
                        {formatDateSafe(lead.createdAt)} {formatTimeSafe(lead.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Quick Pipeline Status Selector & Delete */}
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={lead.status}
                      onChange={(e) => onUpdateStatus(lead.id, e.target.value as LeadStatus)}
                      aria-label="Change Lead Pipeline Status"
                      className={`min-h-[36px] py-1.5 px-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:border-amber-500 cursor-pointer ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    >
                      <option value="new">Mark: New</option>
                      <option value="in_progress">Mark: In Progress</option>
                      <option value="contacted">Mark: Contacted</option>
                      <option value="resolved">Mark: Resolved / Won</option>
                      <option value="archived">Mark: Archived</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setLeadToDelete(lead)}
                      className={`min-h-[36px] min-w-[36px] p-2 rounded-xl transition-colors flex items-center justify-center cursor-pointer ${
                        isDark ? 'text-slate-500 hover:text-rose-400 hover:bg-rose-950/30' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                      }`}
                      title="Permanently remove inquiry record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Inquiry Content: Subject, Preferred Channel & Message */}
                <div className="py-2.5 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                      {lead.subject || 'General Inquiry'}
                    </span>

                    {lead.preferredContact && (
                      <span className="font-medium text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <span>Preferred via:</span>
                        <strong className="text-white capitalize">{lead.preferredContact}</strong>
                      </span>
                    )}

                    {lead.preferredTime && (
                      <span className="font-medium text-slate-400 bg-slate-800/40 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Best time: {lead.preferredTime}</span>
                      </span>
                    )}
                  </div>

                  {/* Customer Message Body */}
                  <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
                    isDark ? 'bg-slate-950/70 border-slate-800/80 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    <p className="whitespace-pre-wrap break-words italic">
                      "{lead.message}"
                    </p>
                  </div>
                </div>

                {/* Direct Follow-Up Action Toolbar */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/60">
                  {/* Communication Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* 1-Tap WhatsApp Follow-up */}
                    <button
                      type="button"
                      onClick={() => {
                        setWhatsAppModalLead(lead);
                        setSelectedTemplateKey('intro');
                        setCustomWhatsAppMessage(
                          `Hi ${lead.name}, thank you for connecting with ${lead.companyName || lead.cardName} via our digital smart card regarding "${lead.subject || 'your inquiry'}". How can we best assist you today?`
                        );
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      title="Open WhatsApp Follow-Up composer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp Follow-up</span>
                    </button>

                    {/* Direct Call */}
                    {lead.phone && (
                      <a
                        href={`tel:${lead.phone}`}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                          isDark ? 'bg-slate-950 hover:bg-slate-800 text-slate-200 border-slate-800' : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                        }`}
                        title={`Call ${lead.phone}`}
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-mono">{lead.phone}</span>
                      </a>
                    )}

                    {/* Direct Email */}
                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}?subject=${encodeURIComponent(`Re: Inquiry regarding ${lead.subject || lead.cardName}`)}&body=${encodeURIComponent(`Dear ${lead.name},\n\nThank you for reaching out to us via our b-Smart digital card.\n\nRegarding your inquiry:\n"${lead.message}"\n\nKind regards,\n${lead.companyName || lead.cardName}`)}`}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                          isDark ? 'bg-slate-950 hover:bg-slate-800 text-slate-200 border-slate-800' : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                        }`}
                        title={`Email ${lead.email}`}
                      >
                        <Mail className="w-3.5 h-3.5 text-sky-400" />
                        <span className="truncate max-w-[180px]">{lead.email}</span>
                      </a>
                    )}

                    {/* Alert Cardholder (Zero-SMTP Log + 1-Click Send) */}
                    <button
                      type="button"
                      onClick={() => handleNotifyCardHolderNow(lead)}
                      disabled={notifyingLeadId === lead.id}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 ${
                        isDark
                          ? 'bg-sky-950/60 hover:bg-sky-900/70 text-sky-300 border-sky-500/30'
                          : 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-300'
                      }`}
                      title={`Alert cardholder (${holderEmail || holderPhone || 'No contact set'}) without SMTP`}
                    >
                      <BellRing className={`w-3.5 h-3.5 ${notifyingLeadId === lead.id ? 'animate-spin' : ''}`} />
                      <span>{notifyingLeadId === lead.id ? 'Alerting...' : 'Alert Cardholder'}</span>
                    </button>

                    {holderWhatsAppHref && (
                      <a
                        href={holderWhatsAppHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-400 border border-teal-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                        title={`Push this enquiry directly to ${holderName}'s WhatsApp`}
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Push to Holder WA</span>
                      </a>
                    )}
                  </div>

                  {/* Notes & Follow-up Toggle */}
                  <div className="flex items-center gap-2">
                    {lead.lastContactedAt && (
                      <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'} font-mono hidden md:inline`}>
                        Contacted: {formatDateSafe(lead.lastContactedAt)}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setExpandedNotes((prev) => ({ ...prev, [lead.id]: !prev[lead.id] }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                        isNotesExpanded || lead.notes || lead.followUpDate
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : isDark ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-800' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span>{lead.notes || lead.followUpDate ? 'Notes & Schedule' : 'Add Notes'}</span>
                      {isNotesExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Collapsible Follow-up Notes & Scheduler Workspace */}
                {isNotesExpanded && (
                  <div className={`mt-3 p-3.5 rounded-xl border ${isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-100 border-slate-200'} space-y-3`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Internal CRM Notes & Next Follow-Up Schedule</span>
                      </span>

                      {/* Next Follow-up Date input */}
                      <div className="flex items-center gap-1.5 text-xs">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Follow-up Date:</span>
                        <input
                          type="date"
                          value={currentFollowUp}
                          onChange={(e) =>
                            setFollowUpDateDrafts((prev) => ({ ...prev, [lead.id]: e.target.value }))
                          }
                          aria-label="Set Next Follow-Up Date"
                          className={`py-1 px-2 rounded-lg border text-xs font-mono focus:outline-none focus:border-amber-500 ${
                            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                          }`}
                        />
                      </div>
                    </div>

                    <textarea
                      rows={2}
                      placeholder="Record call summary, client requirements, pricing discussed, next meeting time..."
                      value={currentNote}
                      onChange={(e) =>
                        setNoteDrafts((prev) => ({ ...prev, [lead.id]: e.target.value }))
                      }
                      className={`w-full p-2.5 rounded-lg border text-xs focus:outline-none focus:border-amber-500 ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveNotes(lead.id)}
                        disabled={savingNoteId === lead.id}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {savingNoteId === lead.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>{savingNoteId === lead.id ? 'Saving...' : 'Save Notes & Schedule'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'} flex flex-col sm:flex-row items-center justify-between gap-3 text-xs`}>
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} inquiries
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`p-1.5 rounded-lg border ${
                    currentPage === 1
                      ? 'opacity-40 cursor-not-allowed border-transparent'
                      : isDark ? 'hover:bg-slate-800 border-slate-700 text-white' : 'hover:bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                  if (totalPages > 7 && Math.abs(pg - currentPage) > 2 && pg !== 1 && pg !== totalPages) {
                    if (Math.abs(pg - currentPage) === 3) {
                      return <span key={`ellipsis-${pg}`} className="px-1 text-slate-500">...</span>;
                    }
                    return null;
                  }
                  return (
                    <button
                      key={`pg-${pg}`}
                      type="button"
                      onClick={() => setCurrentPage(pg)}
                      className={`min-w-[28px] h-7 rounded-lg text-xs font-bold transition-colors ${
                        currentPage === pg
                          ? 'bg-amber-500 text-slate-950'
                          : isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      {pg}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`p-1.5 rounded-lg border ${
                    currentPage === totalPages
                      ? 'opacity-40 cursor-not-allowed border-transparent'
                      : isDark ? 'hover:bg-slate-800 border-slate-700 text-white' : 'hover:bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
        </>
      )}

      {/* TAB 2: ZERO-SMTP CARDHOLDER ALERT & FOLLOW-UP MONITOR */}
      {crmTab === 'monitoring' && (
        <div className="space-y-5">
          {/* Zero-Config Delivery Status Header (No SMTP, No Variables Required) */}
          <div className={`p-4 rounded-2xl border ${
            isDark ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-emerald-50 border-emerald-300'
          } flex flex-col lg:flex-row lg:items-center justify-between gap-4`}>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500 text-slate-950">
                  {monitoringSummary?.delivery?.modeLabel || 'Zero-Config Active (No SMTP · No Variables)'}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Auto-Monitor: Every 15m · Weekly/Monthly Reports: Hourly Scheduler
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {monitoringSummary?.delivery?.autoBackgroundDelivery
                  ? `Automatic background delivery active via ${monitoringSummary.delivery.fromEmail} — zero SMTP and zero variables needed. Every alert can also be dispatched in 1 click via Gmail, Mail App, or WhatsApp.`
                  : 'All cardholder enquiry alerts, follow-up reminders, and weekly/monthly company reports run automatically with zero SMTP and zero variables to enter — tracked in-app with 1-click Gmail, Mail App, and WhatsApp dispatch.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {typeof window !== 'undefined' && 'Notification' in window && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const perm = await Notification.requestPermission();
                      if (perm === 'granted') {
                        new Notification('B-SMART™ Enquiry & Follow-Up Monitor', {
                          body: `${stats.dueCount + stats.unattendedCount + stats.newCount} active enquiries/follow-ups monitored.`,
                        });
                        notifyUser('Device push notifications enabled!');
                      } else {
                        notifyUser('Browser notification permission was not granted.');
                      }
                    } catch {
                      notifyUser('Device notifications are not supported in this view.');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                    isDark ? 'bg-slate-900 border-emerald-500/40 text-emerald-300 hover:bg-slate-800' : 'bg-white border-emerald-400 text-emerald-700'
                  }`}
                  title="Enable browser/device notifications for cardholders & managers"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>Device Alerts</span>
                </button>
              )}
              <input
                type="email"
                placeholder="Test recipient email..."
                value={testDispatchEmail}
                onChange={(e) => setTestDispatchEmail(e.target.value)}
                className={`px-3 py-1.5 rounded-xl border text-xs w-48 ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
              <button
                type="button"
                disabled={sendingTestDispatch || !testDispatchEmail.trim()}
                onClick={async () => {
                  setSendingTestDispatch(true);
                  const res = await dbSendMonitoringTest(testDispatchEmail.trim());
                  await refreshMonitoringData();
                  setSendingTestDispatch(false);
                  if (res?.log) {
                    notifyUser(
                      res.log.status === 'sent'
                        ? `Test alert delivered to ${res.log.recipientEmail}`
                        : `Alert generated for ${res.log.recipientEmail} (ready via Gmail / Mail App below)`
                    );
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                {sendingTestDispatch ? 'Testing...' : 'Test Dispatch'}
              </button>
              <button
                type="button"
                onClick={refreshMonitoringData}
                className={`p-2 rounded-xl border cursor-pointer ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
                }`}
                title="Refresh Monitoring Log"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Delivery Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="text-[10px] font-bold uppercase text-slate-400">Cardholders Notified</div>
              <div className="text-xl font-black text-sky-400 mt-1">{monitoringSummary?.monitoring?.notifiedCardHolders ?? stats.cardHolderNotifiedCount}</div>
            </div>
            <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="text-[10px] font-bold uppercase text-slate-400">Auto-Sent (No SMTP)</div>
              <div className="text-xl font-black text-emerald-400 mt-1">{monitoringSummary?.emailStats?.sentCount ?? 0}</div>
            </div>
            <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="text-[10px] font-bold uppercase text-slate-400">Active In-App / 1-Click</div>
              <div className="text-xl font-black text-amber-400 mt-1">{monitoringSummary?.emailStats?.inAppActiveCount ?? monitoringSummary?.emailStats?.queuedCount ?? 0}</div>
            </div>
            <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="text-[10px] font-bold uppercase text-slate-400">Company Reports Logged</div>
              <div className="text-xl font-black text-purple-400 mt-1">{monitoringSummary?.emailStats?.reportsSentCount ?? 0}</div>
            </div>
          </div>

          {/* Monitored Alert & Notification Logs */}
          <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="p-4 border-b border-slate-800/70 flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Mail className="w-4 h-4 text-sky-400" />
                <span>Monitored Cardholder &amp; Company Notifications ({emailLogs.length})</span>
              </h3>
            </div>

            {emailLogs.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400">
                No notifications logged yet. Submit an enquiry on a card, schedule a follow-up, click "Run Follow-Up Check", or generate a company report to see tracked alerts here.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {emailLogs.map((log) => {
                  const summaryBody = log.textSummary || `${log.subject}\nRecipient: ${log.recipientEmail}`;
                  const gmailHref = buildGmailComposeHref(log.recipientEmail, log.subject, summaryBody);
                  const mailtoHref = buildMailtoHref(log.recipientEmail, log.subject, summaryBody);
                  const waAlertHref = log.cardHolderPhone ? buildWhatsAppAlertHref(log.cardHolderPhone, summaryBody) : '';

                  return (
                    <div key={log.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            log.status === 'sent'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : log.status === 'active_in_app' || log.status === 'queued_smtp_unconfigured'
                              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {log.status === 'sent'
                              ? 'Sent Automatically'
                              : log.status === 'active_in_app' || log.status === 'queued_smtp_unconfigured'
                              ? 'Active · Ready (No SMTP)'
                              : 'Needs Valid Email'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-800 text-sky-300">
                            {log.emailType.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {formatDateSafe(log.createdAt)} {formatTimeSafe(log.createdAt)}
                          </span>
                        </div>
                        <div className="text-xs font-bold truncate">{log.subject}</div>
                        <div className="text-[11px] text-slate-400">
                          To: <strong className="text-slate-200">{log.recipientEmail}</strong>
                          {log.cardHolderName ? ` · Holder: ${log.cardHolderName}` : ''}
                          {log.companyName ? ` · Company: ${log.companyName}` : ''}
                        </div>
                        {log.errorMessage && log.status === 'failed' && (
                          <div className="text-[11px] text-rose-400/90">{log.errorMessage}</div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {log.htmlPreview && (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewEmailModal({
                                subject: log.subject,
                                html: log.htmlPreview || '',
                                recipient: log.recipientEmail,
                                textSummary: log.textSummary,
                                cardHolderPhone: log.cardHolderPhone,
                              })
                            }
                            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                              isDark ? 'bg-slate-950 border-slate-700 text-slate-200 hover:bg-slate-800' : 'bg-slate-50 border-slate-300 text-slate-700'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5 text-sky-400" />
                            <span>Preview</span>
                          </button>
                        )}
                        <a
                          href={gmailHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1"
                          title="Send immediately via Gmail Web (No SMTP)"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Gmail</span>
                        </a>
                        <a
                          href={mailtoHref}
                          className="px-2.5 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-bold flex items-center gap-1"
                          title="Open in default Mail App (No SMTP)"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Mail App</span>
                        </a>
                        {waAlertHref && (
                          <a
                            href={waAlertHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1"
                            title="Send alert directly to Cardholder WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                        <button
                          type="button"
                          disabled={resendingLogId === log.id}
                          onClick={async () => {
                            setResendingLogId(log.id);
                            const res = await dbResendEmailLog(log.id);
                            await refreshMonitoringData();
                            setResendingLogId(null);
                            if (res.log) {
                              notifyUser(
                                res.log.status === 'sent'
                                  ? `Delivered to ${res.log.recipientEmail}`
                                  : `Alert refreshed for ${res.log.recipientEmail}`
                              );
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3 h-3 ${resendingLogId === log.id ? 'animate-spin' : ''}`} />
                          <span>{resendingLogId === log.id ? '...' : 'Retry'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: WEEKLY & MONTHLY COMPANY REPORTS */}
      {crmTab === 'reports' && (
        <div className="space-y-5">
          <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Company</label>
                  <select
                    value={reportCompanyId}
                    onChange={(e) => setReportCompanyId(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.reportEmail || c.email || c.contactEmail || 'No email set'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Report Cadence</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setReportPeriod('weekly')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border cursor-pointer ${
                        reportPeriod === 'weekly'
                          ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                          : isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-300 text-slate-700'
                      }`}
                    >
                      Weekly (7d)
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportPeriod('monthly')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border cursor-pointer ${
                        reportPeriod === 'monthly'
                          ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                          : isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-300 text-slate-700'
                      }`}
                    >
                      Monthly (30d)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Main Company Email Override (Optional)</label>
                  <input
                    type="email"
                    placeholder={reportPreviewData?.company?.email || 'company@domain.co.za'}
                    value={overrideReportEmail}
                    onChange={(e) => setOverrideReportEmail(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {reportPreviewData?.report?.html && (
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewEmailModal({
                        subject: reportPreviewData.report.subject,
                        html: reportPreviewData.report.html,
                        recipient: overrideReportEmail.trim() || reportPreviewData.company?.email || 'Company Email',
                        textSummary: reportPreviewData.report.text,
                      })
                    }
                    className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                      isDark ? 'bg-slate-950 border-slate-700 text-slate-200 hover:bg-slate-800' : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5 text-sky-400" />
                    <span>Preview Report</span>
                  </button>
                )}

                {reportCompanyId && reportCompanyId !== 'all' && (
                  <a
                    href={getApiUrl(`/api/reports/preview?companyId=${encodeURIComponent(reportCompanyId)}&period=${reportPeriod}&format=csv`)}
                    download
                    className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                      isDark ? 'bg-slate-950 border-slate-700 text-emerald-400 hover:bg-slate-800' : 'bg-slate-50 border-slate-300 text-emerald-700'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV</span>
                  </a>
                )}

                {reportPreviewData?.report?.html && (
                  <button
                    type="button"
                    onClick={() =>
                      downloadHtmlReportFile(
                        `B-SMART_${reportPeriod}_Report_${todayStr}.html`,
                        reportPreviewData.report.html
                      )
                    }
                    className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                      isDark ? 'bg-slate-950 border-slate-700 text-purple-400 hover:bg-slate-800' : 'bg-slate-50 border-slate-300 text-purple-700'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Download HTML</span>
                  </button>
                )}

                {reportPreviewData?.report && (
                  <>
                    <a
                      href={buildGmailComposeHref(
                        overrideReportEmail.trim() || reportPreviewData.company?.email || '',
                        reportPreviewData.report.subject,
                        reportPreviewData.report.text
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Send via Gmail</span>
                    </a>
                    <a
                      href={buildMailtoHref(
                        overrideReportEmail.trim() || reportPreviewData.company?.email || '',
                        reportPreviewData.report.subject,
                        reportPreviewData.report.text
                      )}
                      className="px-3.5 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 font-bold text-xs flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Mail App</span>
                    </a>
                  </>
                )}

                <button
                  type="button"
                  disabled={sendingReport || !reportCompanyId || reportCompanyId === 'all'}
                  onClick={handleSendCompanyReportNow}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingReport ? 'Generating...' : `Dispatch ${reportPeriod === 'weekly' ? 'Weekly' : 'Monthly'} Report`}</span>
                </button>
              </div>
            </div>

            {reportPreviewData?.company && (
              <div className="pt-3 border-t border-slate-800/70 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <span>
                  Target Company Email: <strong className="text-white">{reportPreviewData.company.email || 'Not configured'}</strong>
                </span>
                <span>
                  Auto Schedule: <strong className="text-amber-400 uppercase">{reportPreviewData.company.reportFrequency || 'both'}</strong>
                </span>
                {reportPreviewData.company.lastWeeklyReportSentAt && (
                  <span>Last Weekly: <strong className="text-slate-200">{formatDateSafe(reportPreviewData.company.lastWeeklyReportSentAt)}</strong></span>
                )}
                {reportPreviewData.company.lastMonthlyReportSentAt && (
                  <span>Last Monthly: <strong className="text-slate-200">{formatDateSafe(reportPreviewData.company.lastMonthlyReportSentAt)}</strong></span>
                )}
              </div>
            )}
          </div>

          {loadingReport ? (
            <div className="p-10 text-center text-xs text-slate-400">Generating report preview...</div>
          ) : reportPreviewData?.report ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="text-[10px] font-bold uppercase text-slate-400">New ({reportPeriod === 'weekly' ? '7d' : '30d'})</div>
                  <div className="text-xl font-black text-white mt-1">{reportPreviewData.report.stats.periodLeadsCount}</div>
                </div>
                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Total Pipeline</div>
                  <div className="text-xl font-black text-sky-400 mt-1">{reportPreviewData.report.stats.totalLeadsCount}</div>
                </div>
                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Overdue Follow-ups</div>
                  <div className="text-xl font-black text-rose-400 mt-1">{reportPreviewData.report.stats.overdueCount}</div>
                </div>
                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Due Today</div>
                  <div className="text-xl font-black text-amber-400 mt-1">{reportPreviewData.report.stats.dueTodayCount}</div>
                </div>
                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Unattended &gt;24h</div>
                  <div className="text-xl font-black text-rose-300 mt-1">{reportPreviewData.report.stats.unattended24hCount}</div>
                </div>
                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Resolved / Coverage</div>
                  <div className="text-xl font-black text-emerald-400 mt-1">
                    {reportPreviewData.report.stats.resolvedCount} <span className="text-xs font-mono">({reportPreviewData.report.stats.responseCoveragePct}%)</span>
                  </div>
                </div>
              </div>

              <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="p-4 border-b border-slate-800/70">
                  <h4 className="text-sm font-bold">Cardholder Leads &amp; Follow-Up Breakdown</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className={isDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-50 text-slate-600'}>
                      <tr>
                        <th className="p-3">Cardholder / Smart Card</th>
                        <th className="p-3 text-center">Total Leads</th>
                        <th className="p-3 text-center">Open</th>
                        <th className="p-3 text-center">Resolved / Won</th>
                        <th className="p-3 text-center">Overdue Follow-ups</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {(reportPreviewData.report.cardBreakdown || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-500">No leads recorded for this company yet.</td>
                        </tr>
                      ) : (
                        reportPreviewData.report.cardBreakdown.map((row: any, idx: number) => (
                          <tr key={idx}>
                            <td className="p-3">
                              <div className="font-bold">{row.cardHolder}</div>
                              <div className="text-[11px] text-slate-400">{row.cardName}</div>
                            </td>
                            <td className="p-3 text-center font-mono font-bold">{row.total}</td>
                            <td className="p-3 text-center font-mono text-sky-400 font-bold">{row.open}</td>
                            <td className="p-3 text-center font-mono text-emerald-400 font-bold">{row.resolved}</td>
                            <td className={`p-3 text-center font-mono font-bold ${row.overdue > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                              {row.overdue}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Notification / Report HTML Preview Modal with 1-Click Zero-SMTP Dispatch */}
      {previewEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className={`w-full max-w-3xl rounded-2xl border overflow-hidden shadow-2xl ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-bold truncate">{previewEmailModal.subject}</div>
                <div className="text-[11px] text-slate-400">Recipient: {previewEmailModal.recipient}</div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewEmailModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                aria-label="Close email preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <iframe
              title="Monitored Notification Preview"
              sandbox=""
              srcDoc={previewEmailModal.html}
              className="w-full h-[62vh] bg-slate-950 border-0"
            />
            <div className="p-3.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-950/70">
              <span className="text-[11px] text-slate-400">Send directly without SMTP:</span>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={buildGmailComposeHref(
                    previewEmailModal.recipient,
                    previewEmailModal.subject,
                    previewEmailModal.textSummary || previewEmailModal.subject
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send via Gmail</span>
                </a>
                <a
                  href={buildMailtoHref(
                    previewEmailModal.recipient,
                    previewEmailModal.subject,
                    previewEmailModal.textSummary || previewEmailModal.subject
                  )}
                  className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 text-xs font-bold flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Mail App</span>
                </a>
                {previewEmailModal.cardHolderPhone && (
                  <a
                    href={buildWhatsAppAlertHref(
                      previewEmailModal.cardHolderPhone,
                      previewEmailModal.textSummary || previewEmailModal.subject
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp Cardholder</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(previewEmailModal.textSummary || previewEmailModal.subject);
                    notifyUser('Alert summary copied to clipboard!');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Text</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: 1-Tap WhatsApp Follow-Up Composer */}
      {whatsAppModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-lg rounded-2xl border p-5 shadow-2xl ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          } space-y-4`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">1-Tap WhatsApp Follow-Up</h3>
                  <p className="text-[11px] text-slate-400">
                    To: <strong>{whatsAppModalLead.name}</strong> ({whatsAppModalLead.phone})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setWhatsAppModalLead(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Template Selector Pills */}
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-400">
                Choose Follow-Up Template:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTemplateKey('intro');
                    setCustomWhatsAppMessage(
                      `Hi ${whatsAppModalLead.name}, thank you for connecting with ${whatsAppModalLead.companyName || whatsAppModalLead.cardName} via our digital card regarding "${whatsAppModalLead.subject || 'your inquiry'}". How can we best assist you today?`
                    );
                  }}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                    selectedTemplateKey === 'intro'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold'
                      : isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="font-bold">1. Quick Welcome</div>
                  <div className="text-[10px] opacity-70">General warm introduction</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedTemplateKey('callback');
                    setCustomWhatsAppMessage(
                      `Hi ${whatsAppModalLead.name}, this is ${whatsAppModalLead.companyName || whatsAppModalLead.cardName} following up on your callback request for "${whatsAppModalLead.subject || 'your inquiry'}". When would be a great time for a brief 5-minute call?`
                    );
                  }}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                    selectedTemplateKey === 'callback'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold'
                      : isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="font-bold">2. Callback Request</div>
                  <div className="text-[10px] opacity-70">Schedule call time</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedTemplateKey('quote');
                    setCustomWhatsAppMessage(
                      `Hi ${whatsAppModalLead.name}, following up from ${whatsAppModalLead.companyName || whatsAppModalLead.cardName} regarding your request for "${whatsAppModalLead.subject || 'quote details'}". We have prepared the information for you. Would you like us to share it right here on WhatsApp?`
                    );
                  }}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                    selectedTemplateKey === 'quote'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold'
                      : isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="font-bold">3. Quote & Pricing</div>
                  <div className="text-[10px] opacity-70">Quotation follow-up</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTemplateKey('custom')}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                    selectedTemplateKey === 'custom'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold'
                      : isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="font-bold">4. Custom Text</div>
                  <div className="text-[10px] opacity-70">Draft bespoke message</div>
                </button>
              </div>
            </div>

            {/* Editable Message Box */}
            <div className="space-y-1">
              <label className="text-[11px] uppercase font-bold text-slate-400">
                Message Preview & Edits:
              </label>
              <textarea
                rows={4}
                value={customWhatsAppMessage}
                onChange={(e) => setCustomWhatsAppMessage(e.target.value)}
                className={`w-full p-3 rounded-xl border text-xs focus:outline-none focus:border-emerald-500 ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWhatsAppModalLead(null)}
                className={`px-4 py-2 rounded-xl text-xs font-bold ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                } transition-colors cursor-pointer`}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleLaunchWhatsApp(whatsAppModalLead, customWhatsAppMessage)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Launch WhatsApp Chat</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Record Manual Lead / Walk-In / Phone Inquiry */}
      {showAddLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className={`w-full max-w-lg rounded-2xl border p-5 shadow-2xl my-6 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          } space-y-4`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Record Customer Inquiry</h3>
                  <p className="text-[11px] text-slate-400">
                    Log phone calls, event leads, or walk-in client requests.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddLeadModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddLeadSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Prospect Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sipho Dlamini"
                    value={newLeadForm.name}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 082 123 4567"
                    value={newLeadForm.phone}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. sipho@example.co.za"
                    value={newLeadForm.email}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Associated Company
                  </label>
                  <select
                    value={newLeadForm.companyId}
                    onChange={(e) => {
                      const cId = e.target.value;
                      const matchedCards = cards.filter((c) => c.companyId === cId);
                      setNewLeadForm({
                        ...newLeadForm,
                        companyId: cId,
                        cardId: matchedCards[0]?.id || '',
                      });
                    }}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="">Select Company (Optional)</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Topic / Subject
                  </label>
                  <select
                    value={newLeadForm.subject}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, subject: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Request Quotation">Request Quotation</option>
                    <option value="Callback Request">Callback Request</option>
                    <option value="Product / Service">Product / Service</option>
                    <option value="Urgent Support">Urgent Support</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Preferred Channel
                  </label>
                  <select
                    value={newLeadForm.preferredContact}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, preferredContact: e.target.value as any })}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="call">Phone Call</option>
                    <option value="email">Email</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Inquiry Details / Message
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="What is the prospect requesting or asking for?"
                  value={newLeadForm.message}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, message: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:border-amber-500 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Next Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={newLeadForm.followUpDate}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, followUpDate: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={newLeadForm.status}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, status: e.target.value as any })}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="new">New</option>
                    <option value="in_progress">In Progress</option>
                    <option value="contacted">Contacted</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Initial Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Met at trade show, interested in 5 smart cards"
                  value={newLeadForm.notes}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:border-amber-500 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowAddLeadModal(false)}
                  className={`px-4 py-2 rounded-xl font-bold ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  } transition-colors cursor-pointer`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Lead Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Lead Deletion */}
      <ConfirmationModal
        isOpen={!!leadToDelete}
        onClose={() => setLeadToDelete(null)}
        onConfirm={() => {
          if (leadToDelete) {
            onDeleteLead(leadToDelete.id);
            setLeadToDelete(null);
          }
        }}
        title="Delete Customer Lead?"
        message="Are you sure you want to permanently delete this inquiry record from the CRM? This action cannot be reversed."
        highlightText={leadToDelete ? `${leadToDelete.name} (${leadToDelete.cardName})` : ''}
        confirmLabel="Delete Inquiry"
        cancelLabel="Keep Lead"
        type="danger"
      />
    </div>
  );
};
