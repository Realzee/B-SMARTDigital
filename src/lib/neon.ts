import { neon } from '@neondatabase/serverless';
import { BusinessCard, Company, EmailNotificationLog, LeadInquiry, User } from '../types';
import { INITIAL_CARDS, INITIAL_COMPANIES, INITIAL_USERS } from '../data/defaultCards';
import { getRemoteServerUrl, isNativeRuntime, resolveNativeAssetUrl } from '../utils/nativeRuntime';

// Neon Project Configuration
export const NEON_PROJECT_ID = 'patient-snow-11357681';

// Direct Client-Side Neon SQL fallback only if configured and valid
const CLIENT_NEON_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_NEON_DATABASE_URL) || '';

let clientSql: any = null;
if (CLIENT_NEON_URL && !CLIENT_NEON_URL.includes('patient-snow-11357681')) {
  try {
    clientSql = neon(CLIENT_NEON_URL);
  } catch {
    clientSql = null;
  }
}

/* =========================================================================
   TYPE MAPPERS: TypeScript (camelCase) <--> PostgreSQL (snake_case)
   Handles both formats gracefully
   ========================================================================= */

function parseJsonSafe<T>(val: any, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try {
      const p = JSON.parse(val);
      if (typeof p === 'string') {
        try { return JSON.parse(p); } catch { return p as any; }
      }
      return p;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function mapDbToCard(row: any): BusinessCard {
  const parsedTheme: any = parseJsonSafe(row.theme, null);
  const defaultTheme = {
    primaryColor: row.accent || row.primaryColor || '#f59e0b',
    bgType: 'image' as const,
    bgImageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    darkOverlayOpacity: 40,
    glassmorphism: true,
  };

  const finalTheme = parsedTheme
    ? {
        ...defaultTheme,
        ...parsedTheme,
        primaryColor: parsedTheme.primaryColor || row.accent || defaultTheme.primaryColor,
        bgImageUrl: resolveNativeAssetUrl(parsedTheme.bgImageUrl || row.bg_image_url || row.bgImageUrl || undefined) || undefined,
        darkOverlayOpacity: parsedTheme.darkOverlayOpacity ?? 40,
      }
    : defaultTheme;

  const parsedSocial = parseJsonSafe(row.social_links || row.socialLinks, null);
  const finalSocial = parsedSocial || {
    phone: row.phone || '',
    whatsapp: row.whatsapp || '',
    email: row.email || '',
    website: row.website || '',
    address: row.address || '',
  };

  return {
    id: row.id,
    companyId: row.company_id || row.companyId || undefined,
    slug: row.slug,
    businessName: row.business_name || row.businessName || row.name || 'Business Card',
    tagline: row.tagline || row.role || '',
    businessType: (row.business_type as any) || (row.businessType as any) || (row.biz_type as any) || 'custom',
    businessTypeLabel: row.business_type_label || row.businessTypeLabel || row.business_type || 'Custom',
    contactPersonName: row.contact_person_name || row.contactPersonName || row.contact_name || '',
    designation: row.designation || '',
    logoUrl: resolveNativeAssetUrl(row.logo_url || row.logoUrl || ''),
    emergencyPhone: row.emergency_phone || row.emergencyPhone || row.panic_phone || undefined,
    banners: parseJsonSafe(row.banners, []),
    theme: finalTheme,
    socialLinks: finalSocial,
    aboutText: row.about_text || row.aboutText || '',
    services: parseJsonSafe(row.services, []),
    galleryImages: parseJsonSafe(row.gallery_images || row.galleryImages, []),
    multimedia: parseJsonSafe(row.multimedia, []),
    operatingHours: row.operating_hours || row.operatingHours || '',
    status: (row.status as any) || 'live',
    assignedMemberId: row.assigned_member_id || row.assignedMemberId || undefined,
    viewsCount: row.views_count ?? row.viewsCount ?? 0,
    sharesCount: row.shares_count ?? row.sharesCount ?? 0,
    callClicksCount: row.call_clicks_count ?? row.callClicksCount ?? 0,
    whatsappClicksCount: row.whatsapp_clicks_count ?? row.whatsappClicksCount ?? 0,
    vcardDownloadsCount: row.vcard_downloads_count ?? row.vcardDownloadsCount ?? 0,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

export function mapDbToCompany(row: any): Company {
  const parsedTheme: any = parseJsonSafe(row.theme, null);
  const defaultTheme = {
    primaryColor: '#f59e0b',
    secondaryColor: '#1e3a8a',
    bgType: 'image' as const,
    bgImageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    headerImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    glassmorphism: true,
    darkOverlayOpacity: 40,
  };

  const finalTheme = parsedTheme
    ? {
        ...defaultTheme,
        ...parsedTheme,
        bgImageUrl: resolveNativeAssetUrl(parsedTheme.bgImageUrl || row.bg_image_url || row.bgImageUrl || defaultTheme.bgImageUrl),
        headerImageUrl: resolveNativeAssetUrl(parsedTheme.headerImageUrl || defaultTheme.headerImageUrl),
        darkOverlayOpacity: parsedTheme.darkOverlayOpacity ?? 40,
      }
    : defaultTheme;

  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline || '',
    category: row.category || 'custom',
    categoryLabel: row.category_label || row.categoryLabel || row.category || 'Business',
    logoUrl: resolveNativeAssetUrl(row.logo_url || row.logoUrl || ''),
    theme: finalTheme,
    aboutText: row.about_text || row.aboutText || '',
    operatingHours: row.operating_hours || row.operatingHours || '',
    website: row.website || '',
    phone: row.phone || '',
    email: row.email || '',
    address: row.address || '',
    status: (row.status as any) || 'active',
    managementMode: (row.management_mode as any) || (row.managementMode as any) || 'self_managed',
    modules: parseJsonSafe(row.modules, {
      cards: true,
      teamDirectory: true,
      multimedia: true,
      leads: true,
      analytics: true,
      customBranding: true,
    }),
    subscription: parseJsonSafe(row.subscription, {
      planId: 'professional',
      planName: 'B-SMART™ Professional',
      billingCycle: 'monthly',
      amountZAR: 499,
      billingStatus: 'paid',
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paymentMethod: 'EFT / Bank Transfer',
    }),
    contactPersonName: row.contact_person_name || row.contactPersonName || '',
    contactEmail: row.contact_email || row.contactEmail || '',
    contactPhone: row.contact_phone || row.contactPhone || '',
    registrationNotes: row.registration_notes || row.registrationNotes || '',
    approvedAt: row.approved_at || row.approvedAt || undefined,
    approvedBy: row.approved_by || row.approvedBy || undefined,
    reportFrequency: row.report_frequency || row.reportFrequency || 'both',
    reportEmail: row.report_email || row.reportEmail || '',
    lastWeeklyReportSentAt: row.last_weekly_report_sent_at || row.lastWeeklyReportSentAt || undefined,
    lastMonthlyReportSentAt: row.last_monthly_report_sent_at || row.lastMonthlyReportSentAt || undefined,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

export function mapDbToUser(row: any): User {
  let cIds = Array.isArray(row.company_ids) ? row.company_ids : (Array.isArray(row.companyIds) ? row.companyIds : []);
  const compId = row.company_id || row.companyId;
  if (compId && !cIds.includes(compId)) {
    cIds = [compId, ...cIds];
  }
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role === 'admin' ? 'admin' : 'employee',
    companyId: compId || cIds[0] || undefined,
    companyIds: cIds,
    password: row.role === 'admin' ? (row.password || 'password123') : undefined,
    assignedCardId: row.assigned_card_id || row.assignedCardId || undefined,
    status: (row.status as any) || 'active',
    phone: row.phone || undefined,
    designation: row.designation || undefined,
    avatarUrl: resolveNativeAssetUrl(row.avatar_url || row.avatarUrl || '') || undefined,
    bio: row.bio || undefined,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || undefined,
  };
}

export function mapDbToLead(row: any): LeadInquiry {
  return {
    id: row.id,
    cardId: row.card_id || row.cardId || 'card-general',
    cardName: row.card_name || row.cardName || 'Smart Card',
    companyId: row.company_id || row.companyId || undefined,
    companyName: row.company_name || row.companyName || undefined,
    cardHolderName: row.card_holder_name || row.cardHolderName || undefined,
    cardHolderEmail: row.card_holder_email || row.cardHolderEmail || undefined,
    name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    message: row.message || '',
    subject: row.subject || row.inquiry_type || 'General Inquiry',
    preferredContact: row.preferred_contact || row.preferredContact || 'whatsapp',
    preferredTime: row.preferred_time || row.preferredTime || '',
    status: (row.status as any) || 'new',
    notes: row.notes || '',
    followUpDate: row.follow_up_date || row.followUpDate || '',
    lastContactedAt: row.last_contacted_at || row.lastContactedAt || undefined,
    cardHolderNotifiedAt: row.card_holder_notified_at || row.cardHolderNotifiedAt || undefined,
    lastReminderSentAt: row.last_reminder_sent_at || row.lastReminderSentAt || undefined,
    escalationSentAt: row.escalation_sent_at || row.escalationSentAt || undefined,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || row.created_at || row.createdAt || undefined,
  };
}

/* =========================================================================
   DATABASE OPERATIONS: Neon / PostgreSQL via /api with Direct Fallback
   ========================================================================= */

export function getApiUrl(endpoint: string): string {
  const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (isNativeRuntime()) {
    const base = getRemoteServerUrl();
    const cleanEndpoint = base.endsWith('/app') && clean.startsWith('/app/') ? clean.slice(4) : clean;
    return `${base}${cleanEndpoint}`;
  }

  if (clean.startsWith('/app/')) {
    return clean;
  }
  if (typeof window !== 'undefined') {
    const p = window.location.pathname || '';
    if (p === '/app' || p.startsWith('/app/')) {
      return `/app${clean}`;
    }
  }
  return clean;
}

export async function dbFetchHealth(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 3500) : null;
  try {
    const res = await fetch(getApiUrl(`/api/health?_t=${Date.now()}`), {
      cache: 'no-store',
      signal: controller?.signal,
    });
    if (!res.ok) return false;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return false;
    const data = await res.json();
    return Boolean(data && (data.status === 'ok' || data.ok === true));
  } catch {
    return false;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

// COMPANIES
export async function dbFetchCompanies(): Promise<Company[]> {
  try {
    const res = await fetch(getApiUrl(`/api/companies?_t=${Date.now()}`), { cache: 'no-store' });
    const ct = res.headers.get('content-type');
    if (res.ok && ct && ct.includes('application/json')) {
      const data = await res.json();
      if (Array.isArray(data.deletedCompanyIds) && typeof window !== 'undefined') {
        try {
          const currentDeleted = JSON.parse(localStorage.getItem('yebo_deleted_company_ids') || '[]');
          const merged = Array.from(new Set([...currentDeleted, ...data.deletedCompanyIds]));
          localStorage.setItem('yebo_deleted_company_ids', JSON.stringify(merged));
        } catch {
          // Non-blocking
        }
      }
      if (Array.isArray(data.companies)) {
        return data.companies.map(mapDbToCompany);
      }
    }
  } catch {
    // Offline / fallback mode
  }

  // Direct client fallback if configured
  if (clientSql) {
    try {
      const rows = await clientSql`SELECT * FROM companies ORDER BY name ASC`;
      if (rows && rows.length > 0) return rows.map(mapDbToCompany);
    } catch (e: any) {
      if (e?.message?.includes('402') || e?.message?.includes('quota')) {
        clientSql = null;
      }
    }
  }

  return [];
}

export async function dbSaveCompanies(companies: Company[]): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl('/api/companies'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companies }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function dbSaveCompany(company: Company): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl('/api/companies'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(company),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function dbDeleteCompany(id: string): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl(`/api/companies/${encodeURIComponent(id)}`), {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

// CARDS
export async function dbFetchCards(): Promise<BusinessCard[]> {
  try {
    const res = await fetch(getApiUrl(`/api/cards?_t=${Date.now()}`), { cache: 'no-store' });
    const ct = res.headers.get('content-type');
    if (res.ok && ct && ct.includes('application/json')) {
      const data = await res.json();
      if (Array.isArray(data.deletedCardIds) && typeof window !== 'undefined') {
        try {
          const currentDeleted = JSON.parse(localStorage.getItem('yebo_deleted_card_ids') || '[]');
          const merged = Array.from(new Set([...currentDeleted, ...data.deletedCardIds]));
          localStorage.setItem('yebo_deleted_card_ids', JSON.stringify(merged));
        } catch {
          // Non-blocking
        }
      }
      if (Array.isArray(data.cards)) {
        return data.cards.map(mapDbToCard);
      }
    }
  } catch {
    // Fallback mode
  }

  if (clientSql) {
    try {
      const rows = await clientSql`
        SELECT * FROM cards WHERE slug != 'system-companies-registry' ORDER BY created_at DESC
      `;
      if (rows && rows.length > 0) return rows.map(mapDbToCard);
    } catch (e: any) {
      if (e?.message?.includes('402') || e?.message?.includes('quota')) {
        clientSql = null;
      }
    }
  }

  return [];
}

export async function dbFetchCardBySlugOrId(slugOrId: string): Promise<BusinessCard | null> {
  const clean = slugOrId.toLowerCase().trim();
  try {
    const res = await fetch(getApiUrl(`/api/cards/${encodeURIComponent(clean)}?_t=${Date.now()}`), { cache: 'no-store' });
    const ct = res.headers.get('content-type');
    if (res.ok && ct && ct.includes('application/json')) {
      const data = await res.json();
      if (data.card) {
        const mapped = mapDbToCard(data.card);
        if (data.company) {
          (mapped as any)._company = mapDbToCompany(data.company);
          const isExplicitlyNoBg =
            mapped.theme?.bgType === 'none' ||
            mapped.theme?.bgType === 'color' ||
            mapped.theme?.bgImageUrl === '' ||
            mapped.theme?.bgImageUrl === 'none';
          if (!isExplicitlyNoBg && (!mapped.theme || !mapped.theme.bgImageUrl) && data.company.theme?.bgImageUrl) {
            if (!mapped.theme) {
              mapped.theme = {
                primaryColor: '#2563eb',
                bgType: 'image',
                darkOverlayOpacity: 40,
                glassmorphism: true,
              };
            }
            mapped.theme.bgImageUrl = data.company.theme.bgImageUrl;
          }
        }
        if (data.companyTemplate) {
          (mapped as any)._companyTemplate = mapDbToCard(data.companyTemplate);
        }
        if (data.member) {
          (mapped as any)._member = mapDbToUser(data.member);
        }
        return mapped;
      }
    }
  } catch {
    // Fallback
  }

  if (clientSql) {
    try {
      const rows = await clientSql`
        SELECT * FROM cards
        WHERE id = ${clean} OR LOWER(slug) = ${clean} OR slug ILIKE ${`%${clean}%`}
        LIMIT 1
      `;
      if (rows && rows[0]) return mapDbToCard(rows[0]);
    } catch (e: any) {
      if (e?.message?.includes('402') || e?.message?.includes('quota')) {
        clientSql = null;
      }
    }
  }

  return null;
}

export async function dbSaveCard(card: BusinessCard): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl('/api/cards'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function dbDeleteCard(id: string): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl(`/api/cards/${encodeURIComponent(id)}`), {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function dbIncrementCardMetric(
  id: string,
  type: 'view' | 'share' | 'call' | 'whatsapp' | 'vcard'
): Promise<void> {
  try {
    await fetch(getApiUrl(`/api/cards/${encodeURIComponent(id)}/metric`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
  } catch {
    // Non-blocking metric tracking
  }
}

// USERS
export async function dbFetchUsers(): Promise<User[]> {
  try {
    const res = await fetch(getApiUrl(`/api/users?_t=${Date.now()}`), { cache: 'no-store' });
    const ct = res.headers.get('content-type');
    if (res.ok && ct && ct.includes('application/json')) {
      const data = await res.json();
      if (Array.isArray(data.users) && data.users.length > 0) {
        return data.users.map(mapDbToUser);
      }
    }
  } catch {
    // Fallback
  }

  if (clientSql) {
    try {
      const rows = await clientSql`SELECT * FROM users ORDER BY created_at ASC`;
      if (rows && rows.length > 0) return rows.map(mapDbToUser);
    } catch (e: any) {
      if (e?.message?.includes('402') || e?.message?.includes('quota')) {
        clientSql = null;
      }
    }
  }

  return [];
}

export async function dbSaveUser(user: User): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl('/api/users'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function dbDeleteUser(id: string): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl(`/api/users/${encodeURIComponent(id)}`), {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

// LEADS
export async function dbFetchLeads(): Promise<LeadInquiry[]> {
  try {
    const res = await fetch(getApiUrl(`/api/leads?_t=${Date.now()}`), { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.leads) && data.leads.length > 0) {
        return data.leads.map(mapDbToLead);
      }
    }
  } catch {
    // Fallback
  }

  return [];
}

export async function dbSaveLeadWithMonitor(
  lead: LeadInquiry
): Promise<{ ok: boolean; lead?: LeadInquiry; emailNotification?: EmailNotificationLog | null }> {
  try {
    const res = await fetch(getApiUrl('/api/leads'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead),
    });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return {
      ok: true,
      lead: data.lead ? mapDbToLead(data.lead) : undefined,
      emailNotification: data.emailNotification || null,
    };
  } catch {
    return { ok: false };
  }
}

export async function dbSaveLead(lead: LeadInquiry): Promise<boolean> {
  const result = await dbSaveLeadWithMonitor(lead);
  return result.ok;
}

export async function dbUpdateLeadStatus(
  id: string,
  status: 'new' | 'contacted' | 'in_progress' | 'resolved' | 'archived'
): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl(`/api/leads/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function dbUpdateLead(
  id: string,
  updates: Partial<LeadInquiry>
): Promise<{ ok: boolean; emailNotification?: EmailNotificationLog | null; lead?: LeadInquiry }> {
  try {
    const res = await fetch(getApiUrl(`/api/leads/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return {
      ok: true,
      emailNotification: data.emailNotification || null,
      lead: data.lead ? mapDbToLead(data.lead) : undefined,
    };
  } catch {
    return { ok: false };
  }
}

export async function dbDeleteLead(id: string): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl(`/api/leads/${encodeURIComponent(id)}`), {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ENQUIRY MONITORING, CARDHOLDER EMAIL ALERTS & COMPANY REPORTS
export async function dbFetchMonitoringSummary(companyId = 'all'): Promise<any | null> {
  try {
    const res = await fetch(
      getApiUrl(`/api/monitoring/summary?companyId=${encodeURIComponent(companyId)}&_t=${Date.now()}`),
      { cache: 'no-store' }
    );
    if (res.ok) return await res.json();
  } catch {
    // Non-blocking
  }
  return null;
}

export async function dbRunFollowUpSweep(): Promise<any | null> {
  try {
    const res = await fetch(getApiUrl('/api/monitoring/check-followups'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) return await res.json();
  } catch {
    // Non-blocking
  }
  return null;
}

export async function dbNotifyCardHolder(leadId: string, trigger?: string): Promise<{ success: boolean; log?: EmailNotificationLog; lead?: LeadInquiry }> {
  try {
    const res = await fetch(getApiUrl(`/api/leads/${encodeURIComponent(leadId)}/notify`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger }),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        log: data.log,
        lead: data.lead ? mapDbToLead(data.lead) : undefined,
      };
    }
  } catch {
    // Non-blocking
  }
  return { success: false };
}

export async function dbFetchEmailLogs(
  companyId = 'all',
  leadId = ''
): Promise<{ logs: EmailNotificationLog[]; delivery?: any; smtp?: any }> {
  try {
    const res = await fetch(
      getApiUrl(`/api/email-logs?companyId=${encodeURIComponent(companyId)}&leadId=${encodeURIComponent(leadId)}&_t=${Date.now()}`),
      { cache: 'no-store' }
    );
    if (res.ok) {
      const data = await res.json();
      return { logs: Array.isArray(data.logs) ? data.logs : [], delivery: data.delivery, smtp: data.smtp };
    }
  } catch {
    // Non-blocking
  }
  return { logs: [] };
}

export async function dbResendEmailLog(logId: string): Promise<{ success: boolean; log?: EmailNotificationLog }> {
  try {
    const res = await fetch(getApiUrl(`/api/email-logs/${encodeURIComponent(logId)}/resend`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) return await res.json();
  } catch {
    // Non-blocking
  }
  return { success: false };
}

export async function dbFetchReportPreview(companyId: string, period: 'weekly' | 'monthly'): Promise<any | null> {
  try {
    const res = await fetch(
      getApiUrl(`/api/reports/preview?companyId=${encodeURIComponent(companyId)}&period=${period}&_t=${Date.now()}`),
      { cache: 'no-store' }
    );
    if (res.ok) return await res.json();
  } catch {
    // Non-blocking
  }
  return null;
}

export async function dbSendCompanyReport(
  companyId: string,
  period: 'weekly' | 'monthly',
  overrideEmail?: string
): Promise<any | null> {
  try {
    const res = await fetch(getApiUrl('/api/reports/send'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, period, overrideEmail }),
    });
    if (res.ok) return await res.json();
  } catch {
    // Non-blocking
  }
  return null;
}

export async function dbSendMonitoringTest(to: string): Promise<any | null> {
  try {
    const res = await fetch(getApiUrl('/api/monitoring/test-dispatch'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to }),
    });
    if (res.ok) return await res.json();
  } catch {
    // Non-blocking
  }
  return null;
}

export const dbSendSmtpTest = dbSendMonitoringTest;

/* =========================================================================
   SEED & SUBSCRIPTION HELPERS
   ========================================================================= */

export async function seedCentralDatabaseIfNeeded(): Promise<void> {
  try {
    if (typeof window !== 'undefined') {
      const alreadySeeded =
        sessionStorage.getItem('yebo_session_seeded') ||
        localStorage.getItem('yebo_central_db_seeded');
      if (alreadySeeded) return;
    }

    // Check if remote has users
    const users = await dbFetchUsers();
    if (!users || users.length === 0) {
      for (const u of INITIAL_USERS) {
        await dbSaveUser(u);
      }
    }

    // Check if remote has cards
    const cards = await dbFetchCards();
    if (!cards || cards.length === 0) {
      const deletedCardIds: string[] = JSON.parse(localStorage.getItem('yebo_deleted_card_ids') || '[]');
      const cardsToSeed = INITIAL_CARDS.slice(0, 5).filter((c) => !deletedCardIds.includes(c.id));
      for (const c of cardsToSeed) {
        await dbSaveCard(c);
      }
    }

    // Check if remote has companies
    const companies = await dbFetchCompanies();
    if (!companies || companies.length === 0) {
      const deletedCompanyIds: string[] = JSON.parse(localStorage.getItem('yebo_deleted_company_ids') || '[]');
      const compsToSeed = INITIAL_COMPANIES.filter((c) => !deletedCompanyIds.includes(c.id));
      if (compsToSeed.length > 0) {
        await dbSaveCompanies(compsToSeed);
      }
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('yebo_session_seeded', 'true');
      localStorage.setItem('yebo_central_db_seeded', 'true');
    }
  } catch {
    // Non-blocking
  }
}

/**
 * Real-time heartbeat sync subscription
 */
export function subscribeToCentralDatabase(callbacks: {
  onCardsChange?: () => void;
  onUsersChange?: () => void;
  onLeadsChange?: () => void;
  onStatusChange?: (online: boolean) => void;
}): () => void {
  // Initial real server reachability check
  dbFetchHealth().then((reachable) => {
    callbacks.onStatusChange?.(reachable);
  });

  // Periodic heartbeat every 30s
  const interval = setInterval(async () => {
    const reachable = await dbFetchHealth();
    callbacks.onStatusChange?.(reachable);
  }, 30000);

  return () => {
    clearInterval(interval);
  };
}
