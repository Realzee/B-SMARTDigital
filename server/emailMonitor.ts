import fs from 'fs';
import nodemailer from 'nodemailer';

export interface EmailMonitorContext {
  getCompanies: () => any[];
  setCompanies: (next: any[]) => void;
  getCards: () => any[];
  getUsers: () => any[];
  getLeads: () => any[];
  setLeads: (next: any[]) => void;
  getEmailLogs: () => EmailNotificationLogRecord[];
  addEmailLog: (log: EmailNotificationLogRecord) => void;
  updateEmailLog: (id: string, updates: Partial<EmailNotificationLogRecord>) => void;
  persistAll: () => void;
  sql: (strings: TemplateStringsArray, ...values: any[]) => Promise<any[]>;
  hasPgPool: () => boolean;
  getAppUrl: () => string;
}

export type EmailType =
  | 'new_enquiry_cardholder'
  | 'followup_scheduled_cardholder'
  | 'followup_due_cardholder'
  | 'unattended_sla_alert'
  | 'weekly_company_report'
  | 'monthly_company_report'
  | 'delivery_test'
  | 'smtp_test';

export type DeliveryMethod =
  | 'https_webhook'
  | 'https_resend'
  | 'https_brevo'
  | 'https_sendgrid'
  | 'local_sendmail'
  | 'smtp'
  | 'in_app_direct';

export interface EmailNotificationLogRecord {
  id: string;
  companyId?: string;
  companyName?: string;
  leadId?: string;
  cardId?: string;
  cardHolderName?: string;
  cardHolderPhone?: string;
  recipientEmail: string;
  ccEmail?: string;
  emailType: EmailType;
  subject: string;
  status: 'sent' | 'active_in_app' | 'queued_smtp_unconfigured' | 'failed';
  deliveryMethod?: DeliveryMethod;
  messageId?: string;
  errorMessage?: string;
  textSummary?: string;
  htmlPreview?: string;
  createdAt: string;
  sentAt?: string;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeHttpUrl(url: unknown): string {
  const raw = String(url ?? '').trim();
  if (!raw) return '#';
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    // ignore invalid URL
  }
  return '#';
}

export function isValidEmail(email: unknown): boolean {
  const val = String(email ?? '').trim();
  if (!val || val.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}

export function csvCell(value: unknown): string {
  let raw = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(raw)) {
    raw = "'" + raw;
  }
  return `"${raw.replace(/"/g, '""')}"`;
}

export function cleanWhatsAppDigits(phone: unknown): string {
  let digits = String(phone ?? '').replace(/[^0-9]/g, '');
  if (digits.startsWith('0') && (digits.length === 9 || digits.length === 10)) {
    digits = '27' + digits.substring(1);
  }
  return digits;
}

export function getTodayDateStr(date = new Date()): string {
  return date.toISOString().split('T')[0];
}

export function getMonitoringState(lead: any, now = new Date()): {
  state: 'resolved' | 'overdue' | 'due_today' | 'unattended_sla' | 'scheduled' | 'healthy';
  label: string;
  ageHours: number;
} {
  const status = String(lead?.status || 'new').toLowerCase();
  const createdMs = lead?.createdAt ? new Date(lead.createdAt).getTime() : now.getTime();
  const ageHours = isNaN(createdMs) ? 0 : Math.max(0, (now.getTime() - createdMs) / (1000 * 60 * 60));

  if (status === 'resolved' || status === 'archived') {
    return { state: 'resolved', label: status === 'resolved' ? 'Resolved / Won' : 'Archived', ageHours };
  }

  const todayStr = getTodayDateStr(now);
  const followUpDate = String(lead?.followUpDate || '').trim();

  if (followUpDate) {
    if (followUpDate < todayStr) {
      return { state: 'overdue', label: `Overdue (${followUpDate})`, ageHours };
    }
    if (followUpDate === todayStr) {
      return { state: 'due_today', label: 'Follow-up Due Today', ageHours };
    }
    return { state: 'scheduled', label: `Scheduled (${followUpDate})`, ageHours };
  }

  if (status === 'new' && !lead?.lastContactedAt && ageHours >= 24) {
    return { state: 'unattended_sla', label: `Unattended (${Math.floor(ageHours)}h)`, ageHours };
  }

  return { state: 'healthy', label: status === 'new' ? 'Awaiting First Contact' : 'Active Pipeline', ageHours };
}

function validateExternalHttpsUrl(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl.trim());
    if (u.protocol !== 'https:') return null;
    const host = u.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '0.0.0.0' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) {
      return null;
    }
    return u.toString();
  } catch {
    return null;
  }
}

function findLocalSendmailPath(): string | null {
  const candidates = ['/usr/sbin/sendmail', '/usr/bin/sendmail', '/sbin/sendmail', '/usr/local/bin/sendmail'];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return null;
}

export function getDeliveryStatus() {
  const webhookUrl = validateExternalHttpsUrl(process.env.EMAIL_WEBHOOK_URL || '');
  const resendKey = (process.env.RESEND_API_KEY || '').trim();
  const brevoKey = (process.env.BREVO_API_KEY || '').trim();
  const sendgridKey = (process.env.SENDGRID_API_KEY || '').trim();
  const sendmailPath = findLocalSendmailPath();

  const smtpHost = (process.env.SMTP_HOST || '').trim();
  const smtpUser = (process.env.SMTP_USER || '').trim();
  const smtpPass = process.env.SMTP_PASS || '';
  const smtpConfigured = Boolean(smtpHost && smtpUser && smtpPass);

  const fromName = (process.env.EMAIL_FROM_NAME || process.env.SMTP_FROM_NAME || 'B-SMART™ Notifications').trim();
  const fromEmail = (
    process.env.EMAIL_FROM_EMAIL ||
    process.env.SMTP_FROM_EMAIL ||
    smtpUser ||
    'notifications@b-smart-online.co.za'
  ).trim();

  let activeMode: DeliveryMethod = 'in_app_direct';
  let modeLabel = 'Zero-Config Active (No SMTP · No Variables Required)';
  let autoBackgroundDelivery = false;

  if (sendmailPath) {
    activeMode = 'local_sendmail';
    modeLabel = 'Server Mail Agent Active (No SMTP · No Variables)';
    autoBackgroundDelivery = true;
  } else if (webhookUrl) {
    activeMode = 'https_webhook';
    modeLabel = 'HTTPS Email Relay Active (No SMTP)';
    autoBackgroundDelivery = true;
  } else if (resendKey) {
    activeMode = 'https_resend';
    modeLabel = 'HTTPS Email API Active (No SMTP)';
    autoBackgroundDelivery = true;
  } else if (brevoKey) {
    activeMode = 'https_brevo';
    modeLabel = 'HTTPS Email API Active (No SMTP)';
    autoBackgroundDelivery = true;
  } else if (sendgridKey) {
    activeMode = 'https_sendgrid';
    modeLabel = 'HTTPS Email API Active (No SMTP)';
    autoBackgroundDelivery = true;
  } else if (smtpConfigured) {
    activeMode = 'smtp';
    modeLabel = 'Mail Relay Active';
    autoBackgroundDelivery = true;
  }

  return {
    configured: autoBackgroundDelivery,
    activeMode,
    modeLabel,
    autoBackgroundDelivery,
    requiresSmtp: false,
    requiresVariables: false,
    fromName,
    fromEmail,
  };
}

export const getSmtpStatus = getDeliveryStatus;

export function resolveLeadRecipients(ctx: EmailMonitorContext, lead: any) {
  const cards = ctx.getCards();
  const users = ctx.getUsers();
  const companies = ctx.getCompanies();

  const card = cards.find(
    (c) =>
      c.id === lead.cardId ||
      (lead.cardName && c.businessName?.toLowerCase() === String(lead.cardName).toLowerCase())
  );

  const company = companies.find(
    (cp) =>
      cp.id === (lead.companyId || card?.companyId) ||
      (lead.companyName && cp.name?.toLowerCase() === String(lead.companyName).toLowerCase())
  );

  const assignedUser = card
    ? users.find(
        (u) =>
          (card.assignedMemberId && u.id === card.assignedMemberId) ||
          u.assignedCardId === card.id
      )
    : undefined;

  const userEmail = isValidEmail(assignedUser?.email) ? String(assignedUser.email).trim() : '';
  const cardEmail = isValidEmail(card?.socialLinks?.email) ? String(card.socialLinks.email).trim() : '';
  const companyMainEmail = isValidEmail(company?.reportEmail)
    ? String(company.reportEmail).trim()
    : isValidEmail(company?.email)
    ? String(company.email).trim()
    : isValidEmail(company?.contactEmail)
    ? String(company.contactEmail).trim()
    : '';

  const primaryCardHolderEmail = userEmail || cardEmail || companyMainEmail;
  const ccSet = new Set<string>();
  if (cardEmail && cardEmail.toLowerCase() !== primaryCardHolderEmail.toLowerCase()) {
    ccSet.add(cardEmail);
  }

  const cardHolderName =
    assignedUser?.name ||
    card?.contactPersonName ||
    lead.cardName ||
    company?.name ||
    'Card Holder';

  const cardHolderPhone =
    String(
      assignedUser?.phone ||
      card?.socialLinks?.whatsapp ||
      card?.socialLinks?.phone ||
      company?.phone ||
      ''
    ).trim();

  return {
    card,
    company,
    assignedUser,
    cardHolderName,
    cardHolderPhone,
    cardHolderEmail: primaryCardHolderEmail,
    ccEmails: Array.from(ccSet),
    companyMainEmail,
    companyPhone: String(company?.phone || '').trim(),
  };
}

async function persistEmailLog(ctx: EmailMonitorContext, entry: EmailNotificationLogRecord) {
  ctx.addEmailLog(entry);
  ctx.persistAll();

  if (ctx.hasPgPool()) {
    try {
      await ctx.sql`
        INSERT INTO email_logs (
          id, company_id, company_name, lead_id, card_id, card_holder_name, card_holder_phone,
          recipient_email, cc_email, email_type, subject, status, delivery_method,
          message_id, error_message, text_summary, html_preview, created_at, sent_at
        ) VALUES (
          ${entry.id}, ${entry.companyId || null}, ${entry.companyName || null},
          ${entry.leadId || null}, ${entry.cardId || null}, ${entry.cardHolderName || null}, ${entry.cardHolderPhone || null},
          ${entry.recipientEmail}, ${entry.ccEmail || null}, ${entry.emailType},
          ${entry.subject}, ${entry.status}, ${entry.deliveryMethod || null}, ${entry.messageId || null},
          ${entry.errorMessage || null}, ${entry.textSummary || null}, ${entry.htmlPreview || null},
          ${entry.createdAt}, ${entry.sentAt || null}
        )
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          delivery_method = EXCLUDED.delivery_method,
          message_id = EXCLUDED.message_id,
          error_message = EXCLUDED.error_message,
          text_summary = EXCLUDED.text_summary,
          sent_at = EXCLUDED.sent_at;
      `;
    } catch {
      // Non-blocking
    }
  }
}

async function sendViaHttpProvider(
  mode: 'https_webhook' | 'https_resend' | 'https_brevo' | 'https_sendgrid',
  payload: {
    fromName: string;
    fromEmail: string;
    to: string;
    cc: string[];
    replyTo?: string;
    subject: string;
    html: string;
    text: string;
    emailType: EmailType;
    companyName?: string;
    cardHolderName?: string;
    attachments?: Array<{ filename: string; content: string; contentType?: string }>;
  }
): Promise<{ messageId?: string }> {
  const timeoutSignal = AbortSignal.timeout(12000);

  if (mode === 'https_webhook') {
    const webhookUrl = validateExternalHttpsUrl(process.env.EMAIL_WEBHOOK_URL || '');
    if (!webhookUrl) throw new Error('Invalid HTTPS webhook URL.');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const secret = (process.env.EMAIL_WEBHOOK_SECRET || '').trim();
    if (secret) headers['X-Webhook-Secret'] = secret;

    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      signal: timeoutSignal,
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      throw new Error(`HTTPS webhook responded with status ${resp.status}`);
    }
    return { messageId: `webhook-${Date.now()}` };
  }

  if (mode === 'https_resend') {
    const apiKey = (process.env.RESEND_API_KEY || '').trim();
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: timeoutSignal,
      body: JSON.stringify({
        from: `${payload.fromName} <${payload.fromEmail}>`,
        to: [payload.to],
        cc: payload.cc.length > 0 ? payload.cc : undefined,
        reply_to: payload.replyTo,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        attachments: payload.attachments?.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content, 'utf8').toString('base64'),
        })),
      }),
    });
    const data: any = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(data?.message || `Email API error (${resp.status})`);
    }
    return { messageId: data?.id || `resend-${Date.now()}` };
  }

  if (mode === 'https_brevo') {
    const apiKey = (process.env.BREVO_API_KEY || '').trim();
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      signal: timeoutSignal,
      body: JSON.stringify({
        sender: { name: payload.fromName, email: payload.fromEmail },
        to: [{ email: payload.to }],
        cc: payload.cc.length > 0 ? payload.cc.map((email) => ({ email })) : undefined,
        replyTo: payload.replyTo ? { email: payload.replyTo } : undefined,
        subject: payload.subject,
        htmlContent: payload.html,
        textContent: payload.text,
        attachment: payload.attachments?.map((a) => ({
          name: a.filename,
          content: Buffer.from(a.content, 'utf8').toString('base64'),
        })),
      }),
    });
    const data: any = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(data?.message || `Email API error (${resp.status})`);
    }
    return { messageId: data?.messageId || `brevo-${Date.now()}` };
  }

  // https_sendgrid
  const apiKey = (process.env.SENDGRID_API_KEY || '').trim();
  const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    signal: timeoutSignal,
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: payload.to }],
          cc: payload.cc.length > 0 ? payload.cc.map((email) => ({ email })) : undefined,
          subject: payload.subject,
        },
      ],
      from: { email: payload.fromEmail, name: payload.fromName },
      reply_to: payload.replyTo ? { email: payload.replyTo } : undefined,
      content: [
        { type: 'text/plain', value: payload.text },
        { type: 'text/html', value: payload.html },
      ],
      attachments: payload.attachments?.map((a) => ({
        content: Buffer.from(a.content, 'utf8').toString('base64'),
        filename: a.filename,
        type: a.contentType || 'text/csv',
        disposition: 'attachment',
      })),
    }),
  });
  if (!resp.ok) {
    throw new Error(`Email API error (${resp.status})`);
  }
  return { messageId: resp.headers.get('x-message-id') || `sg-${Date.now()}` };
}

export async function dispatchMonitoredEmail(
  ctx: EmailMonitorContext,
  params: {
    companyId?: string;
    companyName?: string;
    leadId?: string;
    cardId?: string;
    cardHolderName?: string;
    cardHolderPhone?: string;
    to: string;
    cc?: string[];
    replyTo?: string;
    emailType: EmailType;
    subject: string;
    html: string;
    text: string;
    attachments?: Array<{ filename: string; content: string; contentType?: string }>;
  }
): Promise<EmailNotificationLogRecord> {
  const nowIso = new Date().toISOString();
  const logId = `eml-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const recipient = String(params.to || '').trim();
  const ccList = (params.cc || []).filter((e) => isValidEmail(e) && e.toLowerCase() !== recipient.toLowerCase());
  const channel = getDeliveryStatus();

  if (!isValidEmail(recipient)) {
    const failedEntry: EmailNotificationLogRecord = {
      id: logId,
      companyId: params.companyId,
      companyName: params.companyName,
      leadId: params.leadId,
      cardId: params.cardId,
      cardHolderName: params.cardHolderName,
      cardHolderPhone: params.cardHolderPhone,
      recipientEmail: recipient || 'missing-email',
      ccEmail: ccList.join(', ') || undefined,
      emailType: params.emailType,
      subject: params.subject,
      status: 'failed',
      deliveryMethod: channel.activeMode,
      errorMessage: 'No valid recipient email address configured for cardholder or company.',
      textSummary: params.text,
      htmlPreview: params.html,
      createdAt: nowIso,
    };
    await persistEmailLog(ctx, failedEntry);
    return failedEntry;
  }

  // Zero-SMTP Direct In-App + 1-Click Client Dispatch (when no HTTPS API/relay or local sendmail exists)
  if (channel.activeMode === 'in_app_direct') {
    const inAppEntry: EmailNotificationLogRecord = {
      id: logId,
      companyId: params.companyId,
      companyName: params.companyName,
      leadId: params.leadId,
      cardId: params.cardId,
      cardHolderName: params.cardHolderName,
      cardHolderPhone: params.cardHolderPhone,
      recipientEmail: recipient,
      ccEmail: ccList.join(', ') || undefined,
      emailType: params.emailType,
      subject: params.subject,
      status: 'active_in_app',
      deliveryMethod: 'in_app_direct',
      textSummary: params.text,
      htmlPreview: params.html,
      createdAt: nowIso,
      sentAt: nowIso,
    };
    await persistEmailLog(ctx, inAppEntry);
    return inAppEntry;
  }

  try {
    let messageId = `msg-${Date.now()}`;

    if (
      channel.activeMode === 'https_webhook' ||
      channel.activeMode === 'https_resend' ||
      channel.activeMode === 'https_brevo' ||
      channel.activeMode === 'https_sendgrid'
    ) {
      const res = await sendViaHttpProvider(channel.activeMode, {
        fromName: channel.fromName,
        fromEmail: channel.fromEmail,
        to: recipient,
        cc: ccList,
        replyTo: isValidEmail(params.replyTo) ? params.replyTo : undefined,
        subject: params.subject,
        html: params.html,
        text: params.text,
        emailType: params.emailType,
        companyName: params.companyName,
        cardHolderName: params.cardHolderName,
        attachments: params.attachments,
      });
      if (res.messageId) messageId = res.messageId;
    } else if (channel.activeMode === 'local_sendmail') {
      const sendmailPath = findLocalSendmailPath() || '/usr/sbin/sendmail';
      const transporter = nodemailer.createTransport({
        sendmail: true,
        newline: 'unix',
        path: sendmailPath,
      });
      const info = await transporter.sendMail({
        from: `"${channel.fromName}" <${channel.fromEmail}>`,
        to: recipient,
        cc: ccList.length > 0 ? ccList : undefined,
        replyTo: isValidEmail(params.replyTo) ? params.replyTo : undefined,
        subject: params.subject,
        text: params.text,
        html: params.html,
        attachments: params.attachments,
      });
      messageId = info.messageId;
    } else {
      const host = (process.env.SMTP_HOST || '').trim();
      const port = parseInt(process.env.SMTP_PORT || '465', 10) || 465;
      const secure =
        process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE === 'true' : port === 465;
      const user = (process.env.SMTP_USER || '').trim();
      const pass = process.env.SMTP_PASS || '';
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
      const info = await transporter.sendMail({
        from: `"${channel.fromName}" <${channel.fromEmail}>`,
        to: recipient,
        cc: ccList.length > 0 ? ccList : undefined,
        replyTo: isValidEmail(params.replyTo) ? params.replyTo : undefined,
        subject: params.subject,
        text: params.text,
        html: params.html,
        attachments: params.attachments,
      });
      messageId = info.messageId;
    }

    const sentEntry: EmailNotificationLogRecord = {
      id: logId,
      companyId: params.companyId,
      companyName: params.companyName,
      leadId: params.leadId,
      cardId: params.cardId,
      cardHolderName: params.cardHolderName,
      cardHolderPhone: params.cardHolderPhone,
      recipientEmail: recipient,
      ccEmail: ccList.join(', ') || undefined,
      emailType: params.emailType,
      subject: params.subject,
      status: 'sent',
      deliveryMethod: channel.activeMode,
      messageId,
      textSummary: params.text,
      htmlPreview: params.html,
      createdAt: nowIso,
      sentAt: nowIso,
    };
    await persistEmailLog(ctx, sentEntry);
    return sentEntry;
  } catch (err: any) {
    const failedEntry: EmailNotificationLogRecord = {
      id: logId,
      companyId: params.companyId,
      companyName: params.companyName,
      leadId: params.leadId,
      cardId: params.cardId,
      cardHolderName: params.cardHolderName,
      cardHolderPhone: params.cardHolderPhone,
      recipientEmail: recipient,
      ccEmail: ccList.join(', ') || undefined,
      emailType: params.emailType,
      subject: params.subject,
      status: 'failed',
      deliveryMethod: channel.activeMode,
      errorMessage: String(err?.message || 'Mail dispatch error'),
      textSummary: params.text,
      htmlPreview: params.html,
      createdAt: nowIso,
    };
    await persistEmailLog(ctx, failedEntry);
    return failedEntry;
  }
}

function renderEmailShell(title: string, badge: string, accentColor: string, bodyHtml: string, footerNote: string): string {
  const safeAccent = /^#[0-9a-fA-F]{3,8}$/.test(accentColor) ? accentColor : '#0ea5e9';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:24px;background:#060b16;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:0 auto;background:#0c1425;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
    <tr>
      <td style="padding:22px 26px;background:linear-gradient(135deg,#0f172a,#111c33);border-bottom:2px solid ${safeAccent};">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#fbbf24;margin-bottom:6px;">
          B-SMART™ DIGITAL CARD PLATFORM · ${escapeHtml(badge)}
        </div>
        <h1 style="margin:0;font-size:20px;line-height:1.3;font-weight:800;color:#ffffff;">
          ${escapeHtml(title)}
        </h1>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 26px;">
        ${bodyHtml}
      </td>
    </tr>
    <tr>
      <td style="padding:16px 26px;background:#070d1a;border-top:1px solid #1e293b;font-size:12px;color:#94a3b8;">
        ${escapeHtml(footerNote)}
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function updateLeadMonitoringFields(
  ctx: EmailMonitorContext,
  leadId: string,
  fields: Record<string, any>
) {
  const currentLeads = ctx.getLeads();
  const nextLeads = currentLeads.map((l) => (l.id === leadId ? { ...l, ...fields } : l));
  ctx.setLeads(nextLeads);
  ctx.persistAll();

  if (ctx.hasPgPool()) {
    try {
      const target = nextLeads.find((l) => l.id === leadId);
      if (target) {
        await ctx.sql`
          UPDATE leads SET
            card_holder_name = ${target.cardHolderName || null},
            card_holder_email = ${target.cardHolderEmail || null},
            card_holder_notified_at = ${target.cardHolderNotifiedAt || null},
            last_reminder_sent_at = ${target.lastReminderSentAt || null},
            escalation_sent_at = ${target.escalationSentAt || null}
          WHERE id = ${leadId}
        `;
      }
    } catch {
      // Non-blocking
    }
  }
}

export async function notifyCardHolderForLead(
  ctx: EmailMonitorContext,
  lead: any,
  trigger: 'new_enquiry' | 'followup_scheduled' | 'followup_due' | 'followup_overdue' | 'unattended_sla'
): Promise<EmailNotificationLogRecord> {
  const resolved = resolveLeadRecipients(ctx, lead);
  const appUrl = sanitizeHttpUrl(ctx.getAppUrl());
  const waDigits = cleanWhatsAppDigits(lead.phone);
  const waHref = waDigits ? `https://wa.me/${waDigits}` : '#';
  const refCode = `#${String(lead.id || '').slice(-8).toUpperCase()}`;

  let emailType: EmailType = 'new_enquiry_cardholder';
  let badge = 'NEW ENQUIRY ALERT';
  let title = `New Customer Enquiry on ${lead.cardName || resolved.cardHolderName}`;
  let leadBanner = `You received a new customer enquiry from <strong>${escapeHtml(lead.name)}</strong> via your B-SMART™ smart card.`;

  if (trigger === 'followup_scheduled') {
    emailType = 'followup_scheduled_cardholder';
    badge = 'FOLLOW-UP SCHEDULED';
    title = `Follow-Up Scheduled (${lead.followUpDate || 'Today'}): ${lead.name}`;
    leadBanner = `A follow-up reminder has been scheduled for <strong>${escapeHtml(lead.followUpDate)}</strong> for customer <strong>${escapeHtml(lead.name)}</strong>.`;
  } else if (trigger === 'followup_due') {
    emailType = 'followup_due_cardholder';
    badge = 'FOLLOW-UP DUE TODAY';
    title = `Action Required Today: Follow up with ${lead.name}`;
    leadBanner = `Your scheduled follow-up with <strong>${escapeHtml(lead.name)}</strong> is <strong>due today (${escapeHtml(lead.followUpDate)})</strong>.`;
  } else if (trigger === 'followup_overdue') {
    emailType = 'followup_due_cardholder';
    badge = 'OVERDUE FOLLOW-UP ALERT';
    title = `Overdue Follow-Up (${lead.followUpDate}): ${lead.name}`;
    leadBanner = `Your scheduled follow-up with <strong>${escapeHtml(lead.name)}</strong> was due on <strong>${escapeHtml(lead.followUpDate)}</strong> and is still open.`;
  } else if (trigger === 'unattended_sla') {
    emailType = 'unattended_sla_alert';
    badge = 'UNATTENDED ENQUIRY ESCALATION';
    title = `24h SLA Reminder: Unattended Enquiry from ${lead.name}`;
    leadBanner = `Enquiry <strong>${escapeHtml(refCode)}</strong> has remained in <strong>New</strong> status for over 24 hours without recorded contact.`;
  }

  const ccList = [...resolved.ccEmails];
  if (trigger === 'unattended_sla' && resolved.companyMainEmail && resolved.companyMainEmail.toLowerCase() !== resolved.cardHolderEmail.toLowerCase()) {
    ccList.push(resolved.companyMainEmail);
  }

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#cbd5e1;">
      Hi ${escapeHtml(resolved.cardHolderName)},<br/><br/>
      ${leadBanner}
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#111c33;border:1px solid #1e293b;border-radius:12px;margin-bottom:18px;">
      <tr><td style="padding:14px 16px;border-bottom:1px solid #1e293b;font-size:13px;"><strong style="color:#94a3b8;">Reference:</strong> <span style="color:#fbbf24;font-family:monospace;">${escapeHtml(refCode)}</span></td></tr>
      <tr><td style="padding:14px 16px;border-bottom:1px solid #1e293b;font-size:13px;"><strong style="color:#94a3b8;">Customer Name:</strong> <span style="color:#ffffff;">${escapeHtml(lead.name)}</span></td></tr>
      <tr><td style="padding:14px 16px;border-bottom:1px solid #1e293b;font-size:13px;"><strong style="color:#94a3b8;">Phone:</strong> <span style="color:#38bdf8;">${escapeHtml(lead.phone || 'Not provided')}</span></td></tr>
      <tr><td style="padding:14px 16px;border-bottom:1px solid #1e293b;font-size:13px;"><strong style="color:#94a3b8;">Email:</strong> <span style="color:#e2e8f0;">${escapeHtml(lead.email || 'Not provided')}</span></td></tr>
      <tr><td style="padding:14px 16px;border-bottom:1px solid #1e293b;font-size:13px;"><strong style="color:#94a3b8;">Topic / Channel:</strong> <span style="color:#e2e8f0;">${escapeHtml(lead.subject || 'General Inquiry')} · Preferred: ${escapeHtml(lead.preferredContact || 'WhatsApp')} (${escapeHtml(lead.preferredTime || 'Anytime')})</span></td></tr>
      <tr><td style="padding:14px 16px;border-bottom:1px solid #1e293b;font-size:13px;"><strong style="color:#94a3b8;">Status & Follow-Up:</strong> <span style="color:#ffffff;text-transform:uppercase;">${escapeHtml(lead.status || 'new')}</span>${lead.followUpDate ? ` · Follow-up: <strong style="color:#fbbf24;">${escapeHtml(lead.followUpDate)}</strong>` : ''}</td></tr>
      <tr><td style="padding:14px 16px;font-size:13px;"><strong style="color:#94a3b8;">Customer Message:</strong><div style="margin-top:6px;color:#f8fafc;white-space:pre-wrap;">${escapeHtml(lead.message || 'No message body')}</div>${lead.notes ? `<div style="margin-top:10px;padding-top:10px;border-top:1px dashed #334155;color:#cbd5e1;"><strong style="color:#fbbf24;">CRM Notes:</strong> ${escapeHtml(lead.notes)}</div>` : ''}</td></tr>
    </table>
    <div style="margin-top:16px;">
      ${waDigits ? `<a href="${escapeHtml(waHref)}" style="display:inline-block;padding:10px 18px;border-radius:10px;background:#10b981;color:#ffffff;font-weight:700;font-size:13px;text-decoration:none;margin-right:8px;">Follow Up on WhatsApp</a>` : ''}
      ${appUrl !== '#' ? `<a href="${escapeHtml(appUrl)}" style="display:inline-block;padding:10px 18px;border-radius:10px;background:#0ea5e9;color:#ffffff;font-weight:700;font-size:13px;text-decoration:none;">Open Enquiries CRM</a>` : ''}
    </div>
  `;

  const html = renderEmailShell(
    title,
    badge,
    resolved.company?.theme?.primaryColor || '#0ea5e9',
    bodyHtml,
    `Sent automatically by B-SMART™ Enquiry & Follow-Up Monitor for ${resolved.company?.name || lead.companyName || 'your organization'}.`
  );

  const text = [
    `${badge}: ${title}`,
    `Cardholder: ${resolved.cardHolderName}`,
    `Reference: ${refCode}`,
    `Customer: ${lead.name} | Phone: ${lead.phone || '-'} | Email: ${lead.email || '-'}`,
    `Topic: ${lead.subject || 'General Inquiry'} | Status: ${lead.status || 'new'}`,
    lead.followUpDate ? `Follow-up Date: ${lead.followUpDate}` : '',
    `Message: ${lead.message || ''}`,
    lead.notes ? `Notes: ${lead.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const log = await dispatchMonitoredEmail(ctx, {
    companyId: resolved.company?.id || lead.companyId,
    companyName: resolved.company?.name || lead.companyName || lead.cardName,
    leadId: lead.id,
    cardId: lead.cardId,
    cardHolderName: resolved.cardHolderName,
    cardHolderPhone: resolved.cardHolderPhone,
    to: resolved.cardHolderEmail,
    cc: ccList,
    replyTo: isValidEmail(lead.email) ? lead.email : undefined,
    emailType,
    subject: `[B-SMART™] ${title}`,
    html,
    text,
  });

  const nowIso = new Date().toISOString();
  const leadUpdates: Record<string, any> = {
    cardHolderName: resolved.cardHolderName,
    cardHolderEmail: resolved.cardHolderEmail,
  };
  if (trigger === 'new_enquiry') {
    leadUpdates.cardHolderNotifiedAt = nowIso;
  } else if (trigger === 'unattended_sla') {
    leadUpdates.escalationSentAt = nowIso;
  } else {
    leadUpdates.lastReminderSentAt = nowIso;
  }
  await updateLeadMonitoringFields(ctx, lead.id, leadUpdates);

  return log;
}

export function buildCompanyReportData(
  ctx: EmailMonitorContext,
  company: any,
  period: 'weekly' | 'monthly',
  referenceDate = new Date()
) {
  const days = period === 'weekly' ? 7 : 30;
  const cutoffMs = referenceDate.getTime() - days * 24 * 60 * 60 * 1000;
  const todayStr = getTodayDateStr(referenceDate);

  const companyCards = ctx.getCards().filter((c) => c.companyId === company.id);
  const companyCardIds = new Set(companyCards.map((c) => c.id));
  const companyNameLower = String(company.name || '').trim().toLowerCase();

  const companyLeads = ctx.getLeads().filter((l) => {
    if (!l) return false;
    if (l.companyId && l.companyId === company.id) return true;
    if (l.cardId && companyCardIds.has(l.cardId)) return true;
    if (l.companyName && String(l.companyName).trim().toLowerCase() === companyNameLower) return true;
    return false;
  });

  const periodLeads = companyLeads.filter((l) => {
    const t = l.createdAt ? new Date(l.createdAt).getTime() : 0;
    return !isNaN(t) && t >= cutoffMs;
  });

  // Include both leads created in period AND any open/overdue follow-ups so nothing is missed
  const activeOrPeriodLeads = companyLeads.filter((l) => {
    const inPeriod = periodLeads.some((pl) => pl.id === l.id);
    const isOpen = l.status !== 'resolved' && l.status !== 'archived';
    return inPeriod || isOpen;
  });

  let newCount = 0;
  let inProgressCount = 0;
  let contactedCount = 0;
  let resolvedCount = 0;
  let archivedCount = 0;
  let overdueCount = 0;
  let dueTodayCount = 0;
  let scheduledCount = 0;
  let unattended24hCount = 0;

  const cardBreakdownMap = new Map<
    string,
    { cardName: string; cardHolder: string; total: number; open: number; resolved: number; overdue: number }
  >();

  for (const l of companyLeads) {
    const st = String(l.status || 'new').toLowerCase();
    if (st === 'new') newCount++;
    else if (st === 'in_progress') inProgressCount++;
    else if (st === 'contacted') contactedCount++;
    else if (st === 'resolved') resolvedCount++;
    else if (st === 'archived') archivedCount++;

    const mon = getMonitoringState(l, referenceDate);
    if (mon.state === 'overdue') overdueCount++;
    else if (mon.state === 'due_today') dueTodayCount++;
    else if (mon.state === 'scheduled') scheduledCount++;
    else if (mon.state === 'unattended_sla') unattended24hCount++;

    const resolved = resolveLeadRecipients(ctx, l);
    const key = l.cardId || l.cardName || 'unassigned';
    const cur = cardBreakdownMap.get(key) || {
      cardName: l.cardName || resolved.card?.businessName || 'Smart Card',
      cardHolder: resolved.cardHolderName,
      total: 0,
      open: 0,
      resolved: 0,
      overdue: 0,
    };
    cur.total++;
    if (st === 'resolved') cur.resolved++;
    else if (st !== 'archived') cur.open++;
    if (mon.state === 'overdue') cur.overdue++;
    cardBreakdownMap.set(key, cur);
  }

  const engagedCount = contactedCount + inProgressCount + resolvedCount;
  const responseCoveragePct =
    companyLeads.length > 0 ? Math.round((engagedCount / companyLeads.length) * 100) : 100;

  // Sort leads for report: Overdue -> Due Today -> Unattended SLA -> New -> Scheduled -> Others
  const priorityScore = (l: any) => {
    const mon = getMonitoringState(l, referenceDate).state;
    if (mon === 'overdue') return 0;
    if (mon === 'due_today') return 1;
    if (mon === 'unattended_sla') return 2;
    if (l.status === 'new') return 3;
    if (mon === 'scheduled') return 4;
    if (l.status === 'resolved') return 6;
    return 5;
  };

  const sortedReportLeads = [...activeOrPeriodLeads].sort((a, b) => {
    const diff = priorityScore(a) - priorityScore(b);
    if (diff !== 0) return diff;
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });

  // CSV attachment with ALL company leads & follow-up monitoring fields
  const csvHeaders = [
    'Reference ID',
    'Captured Date',
    'Company',
    'Smart Card',
    'Cardholder Assigned',
    'Cardholder Email',
    'Prospect Name',
    'Phone',
    'Email',
    'Subject',
    'Preferred Channel',
    'Preferred Time',
    'Status',
    'Follow-up Date',
    'Monitoring State',
    'Last Contacted At',
    'Cardholder Notified At',
    'Last Follow-Up Alert At',
    'CRM Notes',
    'Customer Message',
  ];

  const allLeadsSorted = [...companyLeads].sort((a, b) =>
    String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
  );

  const csvRows = allLeadsSorted.map((l) => {
    const resolved = resolveLeadRecipients(ctx, l);
    const mon = getMonitoringState(l, referenceDate);
    return [
      csvCell(l.id),
      csvCell(l.createdAt || ''),
      csvCell(company.name),
      csvCell(l.cardName || ''),
      csvCell(resolved.cardHolderName),
      csvCell(resolved.cardHolderEmail),
      csvCell(l.name),
      csvCell(l.phone),
      csvCell(l.email),
      csvCell(l.subject || 'General Inquiry'),
      csvCell(l.preferredContact || 'whatsapp'),
      csvCell(l.preferredTime || ''),
      csvCell(l.status || 'new'),
      csvCell(l.followUpDate || ''),
      csvCell(mon.label),
      csvCell(l.lastContactedAt || ''),
      csvCell(l.cardHolderNotifiedAt || ''),
      csvCell(l.lastReminderSentAt || ''),
      csvCell(l.notes || ''),
      csvCell(l.message || ''),
    ].join(',');
  });

  const csvContent = '\uFEFF' + [csvHeaders.map(csvCell).join(','), ...csvRows].join('\r\n');
  const safeSlug = String(company.name || 'company').replace(/[^a-zA-Z0-9_-]+/g, '_');
  const csvFilename = `B-SMART_${safeSlug}_${period === 'weekly' ? 'Weekly' : 'Monthly'}_Leads_FollowUp_Report_${todayStr}.csv`;

  const periodLabel = period === 'weekly' ? 'Weekly' : 'Monthly';
  const periodRangeText = `Last ${days} Days (Ending ${todayStr})`;

  const breakdownRowsHtml = Array.from(cardBreakdownMap.values())
    .map(
      (b) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #1e293b;color:#f8fafc;font-weight:600;">${escapeHtml(b.cardHolder)}<div style="font-size:11px;color:#94a3b8;font-weight:400;">${escapeHtml(b.cardName)}</div></td>
        <td style="padding:10px 12px;border-bottom:1px solid #1e293b;text-align:center;color:#e2e8f0;">${b.total}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #1e293b;text-align:center;color:#38bdf8;">${b.open}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #1e293b;text-align:center;color:#34d399;">${b.resolved}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #1e293b;text-align:center;color:${b.overdue > 0 ? '#fb7185' : '#94a3b8'};font-weight:700;">${b.overdue}</td>
      </tr>`
    )
    .join('');

  const leadRowsHtml = sortedReportLeads
    .slice(0, 60)
    .map((l) => {
      const resolved = resolveLeadRecipients(ctx, l);
      const mon = getMonitoringState(l, referenceDate);
      const monColor =
        mon.state === 'overdue' || mon.state === 'unattended_sla'
          ? '#fb7185'
          : mon.state === 'due_today'
          ? '#fbbf24'
          : mon.state === 'resolved'
          ? '#34d399'
          : '#38bdf8';
      return `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #1e293b;font-size:12px;color:#f8fafc;">
          <strong>${escapeHtml(l.name)}</strong>
          <div style="font-size:11px;color:#94a3b8;">${escapeHtml(l.phone || 'No phone')} · ${escapeHtml(l.email || 'No email')}</div>
        </td>
        <td style="padding:10px;border-bottom:1px solid #1e293b;font-size:12px;color:#cbd5e1;">
          ${escapeHtml(resolved.cardHolderName)}
          <div style="font-size:11px;color:#94a3b8;">${escapeHtml(l.subject || 'General Inquiry')}</div>
        </td>
        <td style="padding:10px;border-bottom:1px solid #1e293b;font-size:11px;color:${monColor};font-weight:700;">
          ${escapeHtml(mon.label)}
          <div style="color:#94a3b8;font-weight:400;">Status: ${escapeHtml(String(l.status || 'new').replace('_', ' '))}</div>
        </td>
        <td style="padding:10px;border-bottom:1px solid #1e293b;font-size:11px;color:#cbd5e1;">
          ${l.notes ? escapeHtml(String(l.notes).slice(0, 110)) : '<span style="color:#64748b;">—</span>'}
        </td>
      </tr>`;
    })
    .join('');

  const bodyHtml = `
    <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#cbd5e1;">
      Here is the automated <strong>${escapeHtml(periodLabel)} Enquiries &amp; Follow-Up Monitoring Report</strong> for
      <strong>${escapeHtml(company.name)}</strong> (${escapeHtml(periodRangeText)}).
      The complete spreadsheet with all ${companyLeads.length} records and follow-up logs is attached as a CSV file.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
      <tr>
        <td width="25%" style="padding:6px;">
          <div style="background:#111c33;border:1px solid #1e293b;border-radius:10px;padding:12px;">
            <div style="font-size:10px;text-transform:uppercase;color:#94a3b8;font-weight:700;">New (${days}d)</div>
            <div style="font-size:22px;font-weight:800;color:#ffffff;margin-top:4px;">${periodLeads.length}</div>
          </div>
        </td>
        <td width="25%" style="padding:6px;">
          <div style="background:#111c33;border:1px solid #1e293b;border-radius:10px;padding:12px;">
            <div style="font-size:10px;text-transform:uppercase;color:#94a3b8;font-weight:700;">Total Leads</div>
            <div style="font-size:22px;font-weight:800;color:#38bdf8;margin-top:4px;">${companyLeads.length}</div>
          </div>
        </td>
        <td width="25%" style="padding:6px;">
          <div style="background:#111c33;border:1px solid #1e293b;border-radius:10px;padding:12px;">
            <div style="font-size:10px;text-transform:uppercase;color:#94a3b8;font-weight:700;">Overdue / Due</div>
            <div style="font-size:22px;font-weight:800;color:${overdueCount + dueTodayCount > 0 ? '#fb7185' : '#34d399'};margin-top:4px;">${overdueCount + dueTodayCount}</div>
          </div>
        </td>
        <td width="25%" style="padding:6px;">
          <div style="background:#111c33;border:1px solid #1e293b;border-radius:10px;padding:12px;">
            <div style="font-size:10px;text-transform:uppercase;color:#94a3b8;font-weight:700;">Won / Coverage</div>
            <div style="font-size:22px;font-weight:800;color:#34d399;margin-top:4px;">${resolvedCount} <span style="font-size:12px;color:#94a3b8;">(${responseCoveragePct}%)</span></div>
          </div>
        </td>
      </tr>
    </table>

    <div style="margin-bottom:18px;padding:12px 14px;border-radius:10px;background:#0f172a;border:1px solid #1e293b;font-size:12px;color:#cbd5e1;">
      <strong style="color:#fbbf24;">Pipeline Breakdown:</strong>
      New: <strong>${newCount}</strong> ·
      In Progress: <strong>${inProgressCount}</strong> ·
      Contacted: <strong>${contactedCount}</strong> ·
      Resolved: <strong>${resolvedCount}</strong> ·
      Scheduled Follow-ups: <strong>${scheduledCount}</strong> ·
      Unattended &gt;24h: <strong style="color:${unattended24hCount > 0 ? '#fb7185' : '#34d399'};">${unattended24hCount}</strong>
    </div>

    <h3 style="margin:20px 0 8px;font-size:14px;color:#ffffff;">Cardholder Performance Summary</h3>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#111c33;border:1px solid #1e293b;border-radius:10px;margin-bottom:22px;font-size:12px;">
      <thead>
        <tr style="background:#0f172a;color:#94a3b8;text-align:left;">
          <th style="padding:10px 12px;border-bottom:1px solid #1e293b;">Cardholder / Card</th>
          <th style="padding:10px 12px;border-bottom:1px solid #1e293b;text-align:center;">Total</th>
          <th style="padding:10px 12px;border-bottom:1px solid #1e293b;text-align:center;">Open</th>
          <th style="padding:10px 12px;border-bottom:1px solid #1e293b;text-align:center;">Won</th>
          <th style="padding:10px 12px;border-bottom:1px solid #1e293b;text-align:center;">Overdue</th>
        </tr>
      </thead>
      <tbody>
        ${breakdownRowsHtml || '<tr><td colspan="5" style="padding:14px;text-align:center;color:#64748b;">No cardholder enquiry records found yet.</td></tr>'}
      </tbody>
    </table>

    <h3 style="margin:20px 0 8px;font-size:14px;color:#ffffff;">Leads &amp; Follow-Up Status (${sortedReportLeads.length} Active / Recent)</h3>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#111c33;border:1px solid #1e293b;border-radius:10px;font-size:12px;">
      <thead>
        <tr style="background:#0f172a;color:#94a3b8;text-align:left;">
          <th style="padding:10px;border-bottom:1px solid #1e293b;">Customer</th>
          <th style="padding:10px;border-bottom:1px solid #1e293b;">Assigned / Topic</th>
          <th style="padding:10px;border-bottom:1px solid #1e293b;">Follow-Up Monitor</th>
          <th style="padding:10px;border-bottom:1px solid #1e293b;">Notes</th>
        </tr>
      </thead>
      <tbody>
        ${leadRowsHtml || '<tr><td colspan="4" style="padding:14px;text-align:center;color:#64748b;">No enquiries recorded for this period.</td></tr>'}
      </tbody>
    </table>
  `;

  const subject = `[B-SMART™] ${periodLabel} Leads & Follow-Up Report — ${company.name} (${todayStr})`;
  const html = renderEmailShell(
    `${periodLabel} Leads & Follow-Up Report`,
    `${periodLabel.toUpperCase()} COMPANY DIGEST`,
    company?.theme?.primaryColor || '#f59e0b',
    bodyHtml,
    `Delivered to ${company.name}'s main company email (${company.reportEmail || company.email || company.contactEmail || 'unconfigured'}). Configure frequency under Company Settings or CRM Reports.`
  );

  const text = [
    `B-SMART™ ${periodLabel} Report — ${company.name} (${periodRangeText})`,
    `New (${days}d): ${periodLeads.length} | Total: ${companyLeads.length} | Resolved: ${resolvedCount} | Overdue: ${overdueCount} | Due Today: ${dueTodayCount} | Unattended >24h: ${unattended24hCount}`,
    `See attached CSV (${csvFilename}) for all ${companyLeads.length} leads and follow-up details.`,
  ].join('\n');

  return {
    period,
    subject,
    recipientEmail: company.reportEmail || company.email || company.contactEmail || '',
    stats: {
      periodDays: days,
      periodLeadsCount: periodLeads.length,
      totalLeadsCount: companyLeads.length,
      newCount,
      inProgressCount,
      contactedCount,
      resolvedCount,
      archivedCount,
      overdueCount,
      dueTodayCount,
      scheduledCount,
      unattended24hCount,
      responseCoveragePct,
    },
    cardBreakdown: Array.from(cardBreakdownMap.values()),
    html,
    text,
    csvFilename,
    csvContent,
  };
}

export async function sendCompanyReport(
  ctx: EmailMonitorContext,
  company: any,
  period: 'weekly' | 'monthly'
): Promise<{ report: ReturnType<typeof buildCompanyReportData>; log: EmailNotificationLogRecord }> {
  const report = buildCompanyReportData(ctx, company, period);
  const log = await dispatchMonitoredEmail(ctx, {
    companyId: company.id,
    companyName: company.name,
    cardHolderName: company.name,
    cardHolderPhone: company.phone || '',
    to: report.recipientEmail,
    emailType: period === 'weekly' ? 'weekly_company_report' : 'monthly_company_report',
    subject: report.subject,
    html: report.html,
    text: report.text,
    attachments: [
      {
        filename: report.csvFilename,
        content: report.csvContent,
        contentType: 'text/csv; charset=utf-8',
      },
    ],
  });

  const nowIso = new Date().toISOString();
  const fieldName = period === 'weekly' ? 'lastWeeklyReportSentAt' : 'lastMonthlyReportSentAt';
  const nextCompanies = ctx.getCompanies().map((c) =>
    c.id === company.id ? { ...c, [fieldName]: nowIso } : c
  );
  ctx.setCompanies(nextCompanies);
  ctx.persistAll();

  if (ctx.hasPgPool()) {
    try {
      if (period === 'weekly') {
        await ctx.sql`UPDATE companies SET last_weekly_report_sent_at = ${nowIso} WHERE id = ${company.id}`;
      } else {
        await ctx.sql`UPDATE companies SET last_monthly_report_sent_at = ${nowIso} WHERE id = ${company.id}`;
      }
    } catch {
      // Non-blocking
    }
  }

  return { report, log };
}

export async function runFollowUpMonitoringSweep(ctx: EmailMonitorContext) {
  const now = new Date();
  const todayStr = getTodayDateStr(now);
  const leads = ctx.getLeads();

  let checkedCount = 0;
  let remindersTriggered = 0;
  let escalationsTriggered = 0;
  const triggeredLogs: EmailNotificationLogRecord[] = [];

  for (const lead of leads) {
    if (!lead || lead.status === 'resolved' || lead.status === 'archived') continue;
    checkedCount++;
    const mon = getMonitoringState(lead, now);
    const lastReminderDay = lead.lastReminderSentAt ? String(lead.lastReminderSentAt).slice(0, 10) : '';
    const lastEscalationDay = lead.escalationSentAt ? String(lead.escalationSentAt).slice(0, 10) : '';

    if (mon.state === 'overdue' && lastReminderDay !== todayStr) {
      const log = await notifyCardHolderForLead(ctx, lead, 'followup_overdue');
      remindersTriggered++;
      triggeredLogs.push(log);
    } else if (mon.state === 'due_today' && lastReminderDay !== todayStr) {
      const log = await notifyCardHolderForLead(ctx, lead, 'followup_due');
      remindersTriggered++;
      triggeredLogs.push(log);
    } else if (mon.state === 'unattended_sla' && lastEscalationDay !== todayStr) {
      const log = await notifyCardHolderForLead(ctx, lead, 'unattended_sla');
      escalationsTriggered++;
      triggeredLogs.push(log);
    }
  }

  return {
    checkedCount,
    remindersTriggered,
    escalationsTriggered,
    triggeredLogs,
    ranAt: now.toISOString(),
  };
}

function getIsoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export async function runScheduledCompanyReportsSweep(ctx: EmailMonitorContext, forceCheck = false) {
  const now = new Date();
  const utcDayOfWeek = now.getUTCDay(); // 1 = Monday
  const utcDateOfMonth = now.getUTCDate(); // 1 = 1st of month
  const utcHour = now.getUTCHours();
  const currentWeekKey = getIsoWeekKey(now);
  const currentMonthKey = now.toISOString().slice(0, 7); // YYYY-MM

  const results: Array<{ companyId: string; companyName: string; period: string; status: string }> = [];

  for (const comp of ctx.getCompanies()) {
    if (!comp || comp.status === 'inactive' || comp.status === 'suspended') continue;
    const freq = comp.reportFrequency || 'both';
    if (freq === 'none') continue;
    const mainEmail = comp.reportEmail || comp.email || comp.contactEmail;
    if (!isValidEmail(mainEmail)) continue;

    // Weekly report: Mondays >= 07:00 UTC (or > 7 days overdue since last weekly report)
    if (freq === 'weekly' || freq === 'both') {
      const lastWeeklyDate = comp.lastWeeklyReportSentAt ? new Date(comp.lastWeeklyReportSentAt) : null;
      const alreadySentThisWeek = lastWeeklyDate ? getIsoWeekKey(lastWeeklyDate) === currentWeekKey : false;
      const isMondayWindow = utcDayOfWeek === 1 && utcHour >= 7;
      const isMoreThan7DaysOld = lastWeeklyDate
        ? now.getTime() - lastWeeklyDate.getTime() >= 7 * 24 * 60 * 60 * 1000
        : false;

      if (!alreadySentThisWeek && (isMondayWindow || isMoreThan7DaysOld || forceCheck)) {
        const { log } = await sendCompanyReport(ctx, comp, 'weekly');
        results.push({ companyId: comp.id, companyName: comp.name, period: 'weekly', status: log.status });
      }
    }

    // Monthly report: 1st of month >= 07:00 UTC (or > 31 days overdue since last monthly report)
    if (freq === 'monthly' || freq === 'both') {
      const lastMonthlyKey = comp.lastMonthlyReportSentAt ? String(comp.lastMonthlyReportSentAt).slice(0, 7) : '';
      const alreadySentThisMonth = lastMonthlyKey === currentMonthKey;
      const isFirstOfMonthWindow = utcDateOfMonth === 1 && utcHour >= 7;
      const isMoreThan31DaysOld = comp.lastMonthlyReportSentAt
        ? now.getTime() - new Date(comp.lastMonthlyReportSentAt).getTime() >= 31 * 24 * 60 * 60 * 1000
        : false;

      if (!alreadySentThisMonth && (isFirstOfMonthWindow || isMoreThan31DaysOld || forceCheck)) {
        const { log } = await sendCompanyReport(ctx, comp, 'monthly');
        results.push({ companyId: comp.id, companyName: comp.name, period: 'monthly', status: log.status });
      }
    }
  }

  return { ranAt: now.toISOString(), dispatched: results };
}
