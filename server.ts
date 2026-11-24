import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import pg from 'pg';
import { neon } from '@neondatabase/serverless';
import { INITIAL_CARDS, INITIAL_COMPANIES, INITIAL_USERS, INITIAL_LEADS } from './src/data/defaultCards';
import {
  deduplicateUsers,
  ensureUniqueSlug,
  normalizeEmail,
  reconcileLinks,
  syncUserCompanies,
} from './src/utils/linking';
import {
  EmailMonitorContext,
  EmailNotificationLogRecord,
  buildCompanyReportData,
  dispatchMonitoredEmail,
  escapeHtml,
  getDeliveryStatus,
  getMonitoringState,
  getSmtpStatus,
  getTodayDateStr,
  isValidEmail,
  notifyCardHolderForLead,
  resolveLeadRecipients,
  runFollowUpMonitoringSweep,
  runScheduledCompanyReportsSweep,
  sendCompanyReport,
} from './server/emailMonitor';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS support for offline Electron (.exe) & Capacitor (.apk) native apps syncing with live server
app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Directories on cPanel
const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'local_db.json');
const UPLOADS_DIR = path.resolve(__dirname, 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploaded images directly from cPanel disk for both root and /app subpaths
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/app/uploads', express.static(UPLOADS_DIR));

// Fallback image recovery handler: If disk file was missing or deleted, restore from PostgreSQL
app.get(['/app/uploads/:filename', '/uploads/:filename'], async (req: Request, res: Response, next) => {
  const { filename } = req.params;
  const filePath = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  if (pgPool) {
    try {
      const rows = await sql`SELECT * FROM uploads WHERE filename = ${filename} OR id = ${filename} LIMIT 1`;
      if (rows && rows[0] && rows[0].data_base64) {
        const buffer = Buffer.from(rows[0].data_base64, 'base64');
        try {
          fs.writeFileSync(filePath, buffer);
        } catch {
          // ignore
        }
        res.setHeader('Content-Type', rows[0].mime_type || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.send(buffer);
      }
    } catch {
      // Fall through to next
    }
  }
  next();
});

// Normalize '/app/api' requests to '/api'
app.use((req, _res, next) => {
  if (req.url.startsWith('/app/api')) {
    req.url = req.url.substring(4);
  }
  next();
});

/* =========================================================================
   RESILIENT IN-MEMORY & PERSISTENT LOCAL DATA ENGINE
   ========================================================================= */

let memoryCompanies = [...INITIAL_COMPANIES];
let memoryUsers = [...INITIAL_USERS];
let memoryCards = [...INITIAL_CARDS];
let memoryLeads = [...INITIAL_LEADS];
let memoryEmailLogs: EmailNotificationLogRecord[] = [];
let memoryDeletedCompanyIds = new Set<string>();
let memoryDeletedCardIds = new Set<string>();
let memoryDeletedUserIds = new Set<string>();

function reconcileInMemoryStore() {
  const reconciled = reconcileLinks(memoryCompanies, memoryUsers, memoryCards, {
    deletedCompanyIds: Array.from(memoryDeletedCompanyIds),
    deletedCardIds: Array.from(memoryDeletedCardIds),
    deletedUserIds: Array.from(memoryDeletedUserIds),
  });
  memoryCompanies = reconciled.companies;
  memoryUsers = reconciled.users;
  memoryCards = reconciled.cards;
}

function persistLocalData() {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(
        {
          companies: memoryCompanies.filter((c) => !memoryDeletedCompanyIds.has(c.id)),
          users: memoryUsers.filter((u) => !memoryDeletedUserIds.has(u.id)),
          cards: memoryCards.filter((c) => !memoryDeletedCardIds.has(c.id)),
          leads: memoryLeads,
          emailLogs: memoryEmailLogs.slice(0, 500),
          deletedCompanyIds: Array.from(memoryDeletedCompanyIds),
          deletedCardIds: Array.from(memoryDeletedCardIds),
          deletedUserIds: Array.from(memoryDeletedUserIds),
        },
        null,
        2
      )
    );
  } catch {
    // Non-blocking disk persistence
  }
}

function restoreLocalData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      if (Array.isArray(data.deletedCompanyIds)) {
        memoryDeletedCompanyIds = new Set(data.deletedCompanyIds);
      }
      if (Array.isArray(data.deletedCardIds)) {
        memoryDeletedCardIds = new Set(data.deletedCardIds);
      }
      if (Array.isArray(data.deletedUserIds)) {
        memoryDeletedUserIds = new Set(data.deletedUserIds);
      }
      if (Array.isArray(data.companies) && data.companies.length > 0) {
        memoryCompanies = data.companies.filter((c: any) => !memoryDeletedCompanyIds.has(c.id));
      }
      if (Array.isArray(data.users) && data.users.length > 0) {
        memoryUsers = data.users.filter((u: any) => !memoryDeletedUserIds.has(u.id));
      }
      if (Array.isArray(data.cards) && data.cards.length > 0) {
        memoryCards = data.cards
          .filter((c: any) => !memoryDeletedCardIds.has(c.id))
          .map((c: any) => ({
            ...c,
            viewsCount: (c.viewsCount === 3400 || c.viewsCount === 1890 || c.viewsCount === 1420) ? 0 : (c.viewsCount || 0),
            sharesCount: (c.sharesCount === 290 || c.sharesCount === 160 || c.sharesCount === 115) ? 0 : (c.sharesCount || 0),
            callClicksCount: (c.callClicksCount === 310 || c.callClicksCount === 220 || c.callClicksCount === 165) ? 0 : (c.callClicksCount || 0),
            whatsappClicksCount: (c.whatsappClicksCount === 420 || c.whatsappClicksCount === 290 || c.whatsappClicksCount === 210) ? 0 : (c.whatsappClicksCount || 0),
            vcardDownloadsCount: (c.vcardDownloadsCount === 260 || c.vcardDownloadsCount === 195 || c.vcardDownloadsCount === 140) ? 0 : (c.vcardDownloadsCount || 0),
          }));
      }
      if (Array.isArray(data.leads) && data.leads.length > 0) {
        const seenLeads = new Set<string>();
        const uniqueLeads: any[] = [];
        for (const l of data.leads) {
          if (!l || !l.id) continue;
          const contentKey = `${(l.name || '').trim().toLowerCase()}|${(l.phone || '').trim()}|${(l.message || '').trim()}`;
          if (!seenLeads.has(l.id) && !seenLeads.has(contentKey)) {
            seenLeads.add(l.id);
            seenLeads.add(contentKey);
            if (!l.companyId && l.cardId) {
              const matchedCard = memoryCards.find((c) => c.id === l.cardId || c.businessName?.toLowerCase() === l.cardName?.toLowerCase());
              if (matchedCard) {
                l.companyId = matchedCard.companyId;
                const matchedComp = memoryCompanies.find((comp) => comp.id === matchedCard.companyId);
                l.companyName = matchedComp ? matchedComp.name : matchedCard.businessName;
              }
            }
            uniqueLeads.push(l);
          }
        }
        memoryLeads = uniqueLeads;
      }
      if (Array.isArray(data.emailLogs)) {
        memoryEmailLogs = data.emailLogs.slice(0, 500);
      }
    }
    reconcileInMemoryStore();
    persistLocalData();
  } catch {
    // Non-blocking disk restoration
  }
}

restoreLocalData();

/* =========================================================================
   DATABASE CONFIGURATION: cPanel PostgreSQL Pool + Optional Neon Driver
   ========================================================================= */

const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.NEON_DATABASE_URL ||
  '';

let pgPool: pg.Pool | null = null;
let neonSql: any = null;
let dbProvider = 'local_resilient';

if (DATABASE_URL) {
  if (DATABASE_URL.includes('neon.tech')) {
    if (!DATABASE_URL.includes('patient-snow-11357681')) {
      try {
        neonSql = neon(DATABASE_URL);
        dbProvider = 'neon_serverless';
        console.log('[DB] Configured Neon Serverless endpoint');
      } catch {
        neonSql = null;
      }
    } else {
      console.log('[DB] Remote Neon quota reached. Resilient local storage is active.');
    }
  } else {
    // Standard PostgreSQL connection (cPanel localhost:5432 or remote PostgreSQL)
    try {
      const isLocal =
        DATABASE_URL.includes('localhost') ||
        DATABASE_URL.includes('127.0.0.1') ||
        DATABASE_URL.includes('::1');

      pgPool = new Pool({
        connectionString: DATABASE_URL,
        ssl: isLocal ? false : { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        max: 10,
      });

      pgPool.on('error', (err) => {
        console.log('[DB Pool notice]', err.message);
      });

      dbProvider = isLocal ? 'cpanel_postgres_local' : 'postgres_pool';
      console.log(`[DB] Configured PostgreSQL pool (${isLocal ? 'cPanel localhost' : 'remote'})`);
    } catch {
      pgPool = null;
    }
  }
}

/**
 * Universal SQL tagged template literal executor
 */
async function sql(strings: TemplateStringsArray, ...values: any[]): Promise<any[]> {
  if (pgPool) {
    try {
      let queryText = '';
      const params: any[] = [];
      for (let i = 0; i < strings.length; i++) {
        queryText += strings[i];
        if (i < values.length) {
          params.push(values[i]);
          queryText += `$${params.length}`;
        }
      }
      const res = await pgPool.query(queryText, params);
      return res.rows;
    } catch {
      return [];
    }
  }

  if (neonSql) {
    try {
      return await neonSql(strings, ...values);
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('402') || msg.includes('quota') || msg.includes('exceeded')) {
        neonSql = null;
        dbProvider = 'local_resilient';
      }
      return [];
    }
  }

  return [];
}

const isDbConfigured = () => !!(pgPool || neonSql);

// Auto-initialize PostgreSQL tables if connected to standard PostgreSQL on cPanel
async function initTables() {
  if (!pgPool) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS companies (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        tagline TEXT,
        category VARCHAR(64) NOT NULL DEFAULT 'custom',
        category_label VARCHAR(128),
        logo_url TEXT,
        theme JSONB NOT NULL DEFAULT '{"primaryColor": "#0284c7", "secondaryColor": "#f59e0b", "bgType": "dark"}'::jsonb,
        about_text TEXT,
        operating_hours TEXT,
        website TEXT,
        phone VARCHAR(64),
        email VARCHAR(255),
        address TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    try {
      await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'active';`;
      await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS management_mode VARCHAR(32) DEFAULT 'self_managed';`;
      await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS modules JSONB DEFAULT '{}'::jsonb;`;
      await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription JSONB DEFAULT '{}'::jsonb;`;
      await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_person_name VARCHAR(255);`;
      await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);`;
      await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(64);`;
      await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS registration_notes TEXT;`;
      await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;`;
      await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255);`;
      await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS report_frequency VARCHAR(32) DEFAULT 'both';`;
      await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS report_email VARCHAR(255);`;
      await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_weekly_report_sent_at TIMESTAMPTZ;`;
      await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_monthly_report_sent_at TIMESTAMPTZ;`;
    } catch {
      // Ignored if unsupported or already present
    }

    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(32) NOT NULL DEFAULT 'employee',
        company_id VARCHAR(64),
        company_ids JSONB DEFAULT '[]'::jsonb,
        password TEXT,
        assigned_card_id VARCHAR(64),
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        phone VARCHAR(64),
        designation VARCHAR(128),
        avatar_url TEXT,
        bio TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS cards (
        id VARCHAR(64) PRIMARY KEY,
        company_id VARCHAR(64),
        owner_email VARCHAR(255),
        slug VARCHAR(128) NOT NULL UNIQUE,
        business_name VARCHAR(255) NOT NULL,
        tagline TEXT,
        business_type VARCHAR(64) NOT NULL DEFAULT 'custom',
        business_type_label VARCHAR(128),
        contact_person_name VARCHAR(255),
        designation VARCHAR(128),
        logo_url TEXT,
        accent VARCHAR(32) DEFAULT '#0284c7',
        theme JSONB NOT NULL DEFAULT '{"primaryColor": "#0284c7", "secondaryColor": "#f59e0b", "bgType": "dark"}'::jsonb,
        banners JSONB DEFAULT '[]'::jsonb,
        chips JSONB DEFAULT '[]'::jsonb,
        tabs JSONB DEFAULT '[]'::jsonb,
        phone VARCHAR(64),
        whatsapp VARCHAR(64),
        email VARCHAR(255),
        address TEXT,
        website TEXT,
        panic_phone VARCHAR(64),
        emergency_phone VARCHAR(64),
        social_links JSONB DEFAULT '{}'::jsonb,
        about_text TEXT,
        services JSONB DEFAULT '[]'::jsonb,
        gallery_images JSONB DEFAULT '[]'::jsonb,
        multimedia JSONB DEFAULT '[]'::jsonb,
        operating_hours TEXT,
        status VARCHAR(32) NOT NULL DEFAULT 'live',
        assigned_member_id VARCHAR(64),
        views_count INTEGER NOT NULL DEFAULT 0,
        shares_count INTEGER NOT NULL DEFAULT 0,
        call_clicks_count INTEGER NOT NULL DEFAULT 0,
        whatsapp_clicks_count INTEGER NOT NULL DEFAULT 0,
        vcard_downloads_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    try {
      await sql`ALTER TABLE cards ADD COLUMN IF NOT EXISTS multimedia JSONB DEFAULT '[]'::jsonb;`;
    } catch {}

    await sql`
      CREATE TABLE IF NOT EXISTS leads (
        id VARCHAR(64) PRIMARY KEY,
        card_id VARCHAR(64),
        card_name VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(64),
        message TEXT,
        status VARCHAR(32) NOT NULL DEFAULT 'new',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    try {
      await sql`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS subject VARCHAR(255);
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS preferred_contact VARCHAR(64);
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS preferred_time VARCHAR(128);
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_date VARCHAR(64);
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_id VARCHAR(64);
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS card_holder_name VARCHAR(255);
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS card_holder_email VARCHAR(255);
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS card_holder_notified_at TIMESTAMPTZ;
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS escalation_sent_at TIMESTAMPTZ;
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
      `;
    } catch {}

    await sql`
      CREATE TABLE IF NOT EXISTS email_logs (
        id VARCHAR(64) PRIMARY KEY,
        company_id VARCHAR(64),
        company_name VARCHAR(255),
        lead_id VARCHAR(64),
        card_id VARCHAR(64),
        card_holder_name VARCHAR(255),
        card_holder_phone VARCHAR(64),
        recipient_email VARCHAR(255) NOT NULL,
        cc_email VARCHAR(255),
        email_type VARCHAR(64) NOT NULL,
        subject TEXT NOT NULL,
        status VARCHAR(64) NOT NULL,
        delivery_method VARCHAR(64),
        message_id VARCHAR(255),
        error_message TEXT,
        text_summary TEXT,
        html_preview TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        sent_at TIMESTAMPTZ
      );
    `;
    try {
      await sql`ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS card_holder_phone VARCHAR(64);`;
      await sql`ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(64);`;
      await sql`ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS text_summary TEXT;`;
    } catch {}

    await sql`
      CREATE TABLE IF NOT EXISTS uploads (
        id VARCHAR(128) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        filepath TEXT NOT NULL,
        url TEXT NOT NULL,
        mime_type VARCHAR(64),
        size_bytes INTEGER DEFAULT 0,
        data_base64 TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    try {
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS company_ids JSONB DEFAULT '[]'::jsonb;`;
    } catch {}

    // Permanent deletion tombstones so deleted companies, cards & users NEVER resurrect
    await sql`
      CREATE TABLE IF NOT EXISTS deleted_entities (
        id VARCHAR(128) PRIMARY KEY,
        entity_type VARCHAR(64) NOT NULL,
        deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    try {
      const delRows = await sql`SELECT id, entity_type FROM deleted_entities`;
      if (delRows && delRows.length > 0) {
        for (const r of delRows) {
          if (r.entity_type === 'company') memoryDeletedCompanyIds.add(r.id);
          if (r.entity_type === 'card') memoryDeletedCardIds.add(r.id);
          if (r.entity_type === 'user') memoryDeletedUserIds.add(r.id);
        }
      }
    } catch {
      // Non-blocking
    }

    // Seed baseline entities into PostgreSQL if tables are empty and not deleted
    const compCount = await sql`SELECT COUNT(*) as count FROM companies`;
    if (compCount && Number(compCount[0]?.count) === 0) {
      for (const comp of memoryCompanies) {
        if (memoryDeletedCompanyIds.has(comp.id)) continue;
        await sql`
          INSERT INTO companies (id, name, tagline, category, category_label, logo_url, theme, about_text, operating_hours, website, phone, email, address)
          VALUES (
            ${comp.id}, ${comp.name}, ${comp.tagline || ''}, ${comp.category || 'custom'},
            ${comp.categoryLabel || 'Custom'}, ${comp.logoUrl || ''}, ${JSON.stringify(comp.theme || {})},
            ${comp.aboutText || ''}, ${comp.operatingHours || ''}, ${comp.website || ''},
            ${comp.phone || ''}, ${comp.email || ''}, ${comp.address || ''}
          ) ON CONFLICT (id) DO NOTHING;
        `;
      }
    }

    const cardCount = await sql`SELECT COUNT(*) as count FROM cards`;
    if (cardCount && Number(cardCount[0]?.count) === 0) {
      for (const card of memoryCards) {
        if (memoryDeletedCardIds.has(card.id)) continue;
        await sql`
          INSERT INTO cards (
            id, company_id, owner_email, slug, business_name, tagline, business_type, business_type_label,
            contact_person_name, designation, logo_url, accent, theme, banners, chips, tabs,
            phone, whatsapp, email, address, website, panic_phone, emergency_phone, social_links,
            about_text, services, gallery_images, operating_hours, status, assigned_member_id
          ) VALUES (
            ${card.id}, ${card.companyId || null}, ${card.socialLinks?.email || ''}, ${card.slug},
            ${card.businessName}, ${card.tagline || ''}, ${card.businessType || 'custom'}, ${card.businessTypeLabel || 'Custom'},
            ${card.contactPersonName || ''}, ${card.designation || ''}, ${card.logoUrl || ''},
            ${card.theme?.primaryColor || '#0284c7'}, ${JSON.stringify(card.theme || {})}, ${JSON.stringify(card.banners || [])},
            ${JSON.stringify([])}, ${JSON.stringify([])},
            ${card.socialLinks?.phone || ''}, ${card.socialLinks?.whatsapp || ''}, ${card.socialLinks?.email || ''},
            ${card.socialLinks?.address || ''}, ${card.socialLinks?.website || ''},
            ${card.emergencyPhone || ''}, ${card.emergencyPhone || ''}, ${JSON.stringify(card.socialLinks || {})},
            ${card.aboutText || ''}, ${JSON.stringify(card.services || [])}, ${JSON.stringify(card.galleryImages || [])}, ${card.operatingHours || ''},
            ${card.status || 'live'}, ${card.assignedMemberId || null}
          ) ON CONFLICT (id) DO NOTHING;
        `;
      }
    }

    const userCount = await sql`SELECT COUNT(*) as count FROM users`;
    if (userCount && Number(userCount[0]?.count) === 0) {
      for (const user of memoryUsers) {
        if (memoryDeletedUserIds.has(user.id)) continue;
        const cleanEmail = (user.email || `${user.id}@bsmart.internal`).toLowerCase().trim();
        await sql`
          INSERT INTO users (id, email, name, role, company_id, company_ids, password, assigned_card_id, status, phone, designation, avatar_url, bio)
          VALUES (
            ${user.id}, ${cleanEmail}, ${user.name || 'Team Member'}, ${user.role || 'employee'},
            ${user.companyId || null}, ${JSON.stringify(user.companyIds || [])}, ${user.password || null}, ${user.assignedCardId || null},
            ${user.status || 'active'}, ${user.phone || ''}, ${user.designation || ''},
            ${user.avatarUrl || ''}, ${user.bio || ''}
          ) ON CONFLICT (id) DO NOTHING;
        `;
      }
    }

    // Hydrate memory cache from PostgreSQL so server memory is always in lockstep with the database
    const dbCompanies = await sql`SELECT * FROM companies ORDER BY name ASC`;
    if (dbCompanies && dbCompanies.length > 0) {
      memoryCompanies = dbCompanies
        .map(mapDbRowToCompany)
        .filter((c: any) => c && !memoryDeletedCompanyIds.has(c.id));
    }

    const dbCards = await sql`SELECT * FROM cards ORDER BY created_at ASC`;
    if (dbCards && dbCards.length > 0) {
      memoryCards = dbCards
        .map(mapDbRowToCard)
        .filter((c: any) => c && !memoryDeletedCardIds.has(c.id));
    }

    const dbUsers = await sql`SELECT * FROM users ORDER BY created_at ASC`;
    if (dbUsers && dbUsers.length > 0) {
      memoryUsers = dbUsers
        .map(mapDbRowToUser)
        .filter((u: any) => u && !memoryDeletedUserIds.has(u.id));
    }

    reconcileInMemoryStore();

    const dbLeads = await sql`SELECT * FROM leads ORDER BY created_at DESC`;
    if (dbLeads && dbLeads.length > 0) memoryLeads = dbLeads;

    try {
      const dbEmailLogs = await sql`SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 500`;
      if (dbEmailLogs && dbEmailLogs.length > 0) {
        memoryEmailLogs = dbEmailLogs.map((r: any) => ({
          id: r.id,
          companyId: r.company_id || undefined,
          companyName: r.company_name || undefined,
          leadId: r.lead_id || undefined,
          cardId: r.card_id || undefined,
          cardHolderName: r.card_holder_name || undefined,
          cardHolderPhone: r.card_holder_phone || undefined,
          recipientEmail: r.recipient_email,
          ccEmail: r.cc_email || undefined,
          emailType: r.email_type,
          subject: r.subject,
          status: r.status === 'queued_smtp_unconfigured' ? 'active_in_app' : r.status,
          deliveryMethod: r.delivery_method || undefined,
          messageId: r.message_id || undefined,
          errorMessage: r.status === 'queued_smtp_unconfigured' ? undefined : (r.error_message || undefined),
          textSummary: r.text_summary || undefined,
          htmlPreview: r.html_preview || undefined,
          createdAt: r.created_at || new Date().toISOString(),
          sentAt: r.sent_at || undefined,
        }));
      }
    } catch {
      // Non-blocking
    }

    persistLocalData();
    console.log('[DB] cPanel PostgreSQL schema verified & memory cache synced successfully');
  } catch (err: any) {
    console.log('[DB] Schema notice:', err.message);
  }
}

initTables();

const emailMonitorCtx: EmailMonitorContext = {
  getCompanies: () => memoryCompanies,
  setCompanies: (next) => {
    memoryCompanies = next;
  },
  getCards: () => memoryCards,
  getUsers: () => memoryUsers,
  getLeads: () => memoryLeads,
  setLeads: (next) => {
    memoryLeads = next;
  },
  getEmailLogs: () => memoryEmailLogs,
  addEmailLog: (log) => {
    memoryEmailLogs = [log, ...memoryEmailLogs.filter((l) => l.id !== log.id)].slice(0, 500);
  },
  updateEmailLog: (id, updates) => {
    memoryEmailLogs = memoryEmailLogs.map((l) => (l.id === id ? { ...l, ...updates } : l));
  },
  persistAll: () => persistLocalData(),
  sql,
  hasPgPool: () => !!pgPool,
  getAppUrl: () => (process.env.APP_URL || 'https://b-smart-online.co.za/app').trim(),
};

/* =========================================================================
   API ROUTES (Mounted for both /api and /app/api)
   ========================================================================= */

// HEALTH CHECK
app.get('/api/health', async (_req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  let companyCount = memoryCompanies.length;
  let cardCount = memoryCards.length;
  let userCount = memoryUsers.length;
  let leadCount = memoryLeads.length;

  if (pgPool) {
    try {
      const rows = await sql`SELECT COUNT(*) as c FROM companies`;
      if (rows && rows[0]) {
        dbStatus = 'connected_cpanel_postgres';
        companyCount = parseInt(rows[0].c, 10) || companyCount;
      }
    } catch {
      dbStatus = 'postgres_connection_pending';
    }
  } else if (neonSql) {
    dbStatus = 'connected_neon';
  }

  res.json({
    status: 'ok',
    appName: 'B-Smart Mobile Communicator',
    appUrl: 'https://b-smart-online.co.za/app',
    database: {
      provider: dbProvider,
      configured: isDbConfigured(),
      status: dbStatus,
      counts: {
        companies: companyCount,
        cards: cardCount,
        users: userCount,
        leads: leadCount,
      },
    },
    cpanel: {
      url: '/app',
      uploadsEnabled: true,
      bundleReady: fs.existsSync(path.resolve(__dirname, 'cpanel_app_bundle.zip')),
    },
    timestamp: new Date().toISOString(),
  });
});

// IMAGE UPLOAD API (Saves directly to cPanel disk in uploads/)
app.post('/api/upload', async (req: Request, res: Response) => {
  try {
    const { image, filename: clientFilename, type } = req.body;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'No image data provided' });
    }

    let ext = 'jpg';
    let base64Data = image;

    if (image.startsWith('data:image/')) {
      const mimeMatch = image.match(/^data:image\/([a-zA-Z0-9\+\-]+);base64,/);
      if (mimeMatch) {
        const rawExt = mimeMatch[1].toLowerCase();
        ext = rawExt === 'jpeg' ? 'jpg' : rawExt === 'svg+xml' ? 'svg' : rawExt === 'png' ? 'png' : 'jpg';
        base64Data = image.replace(/^data:image\/[a-zA-Z0-9\+\-]+;base64,/, '');
      }
    }

    const prefix = type ? `${type}_` : 'img_';
    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 8);
    const safeName = clientFilename && clientFilename.endsWith(`.${ext}`)
      ? `${timestamp}_${clientFilename.replace(/[^a-zA-Z0-9_\-\.]/g, '')}`
      : `${prefix}${timestamp}_${randomHex}.${ext}`;
    
    const filePath = path.join(UPLOADS_DIR, safeName);
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/app/uploads/${safeName}`;
    const rootUrl = `/uploads/${safeName}`;

    if (pgPool) {
      try {
        await sql`
          INSERT INTO uploads (id, filename, filepath, url, mime_type, size_bytes, data_base64)
          VALUES (
            ${safeName}, ${safeName}, ${filePath}, ${publicUrl},
            ${`image/${ext}`}, ${buffer.length}, ${base64Data}
          )
          ON CONFLICT (id) DO UPDATE SET
            data_base64 = EXCLUDED.data_base64,
            size_bytes = EXCLUDED.size_bytes;
        `;
      } catch (dbErr: any) {
        console.warn('[DB] Image upload postgres cache notice:', dbErr?.message);
      }
    }

    return res.json({
      success: true,
      filename: safeName,
      url: publicUrl,
      rootUrl,
      sizeBytes: buffer.length,
      savedOnCPanel: true,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to save image on cPanel', details: err?.message });
  }
});

// Helpers to normalize PostgreSQL snake_case rows and JSON strings into camelCase objects
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

function mapDbRowToCard(row: any): any {
  if (!row) return null;
  const parsedTheme: any = parseJsonSafe(row.theme, null);
  const defaultTheme = {
    primaryColor: row.accent || row.primaryColor || '#f59e0b',
    bgType: 'image',
    bgImageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    darkOverlayOpacity: 40,
    glassmorphism: true,
  };

  const finalTheme = parsedTheme
    ? {
        ...defaultTheme,
        ...parsedTheme,
        primaryColor: parsedTheme.primaryColor || row.accent || defaultTheme.primaryColor,
        bgImageUrl: parsedTheme.bgImageUrl || row.bg_image_url || row.bgImageUrl || undefined,
        darkOverlayOpacity: parsedTheme.darkOverlayOpacity ?? 40,
      }
    : defaultTheme;

  return {
    id: row.id,
    companyId: row.company_id || row.companyId || undefined,
    slug: row.slug,
    businessName: row.business_name || row.businessName || row.name || 'Business Card',
    tagline: row.tagline || row.role || '',
    businessType: row.business_type || row.businessType || 'custom',
    businessTypeLabel: row.business_type_label || row.businessTypeLabel || 'Custom',
    contactPersonName: row.contact_person_name || row.contactPersonName || '',
    designation: row.designation || '',
    logoUrl: row.logo_url || row.logoUrl || '',
    emergencyPhone: row.emergency_phone || row.emergencyPhone || row.panic_phone || undefined,
    banners: parseJsonSafe(row.banners, []),
    theme: finalTheme,
    socialLinks: parseJsonSafe(row.social_links || row.socialLinks, {
      phone: row.phone || '',
      whatsapp: row.whatsapp || '',
      email: row.email || '',
      website: row.website || '',
      address: row.address || '',
    }),
    aboutText: row.about_text || row.aboutText || '',
    services: parseJsonSafe(row.services, []),
    galleryImages: parseJsonSafe(row.gallery_images || row.galleryImages, []),
    multimedia: parseJsonSafe(row.multimedia, []),
    operatingHours: row.operating_hours || row.operatingHours || '',
    status: row.status || 'live',
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

function mapDbRowToCompany(row: any): any {
  if (!row) return null;
  const parsedTheme: any = parseJsonSafe(row.theme, null);
  const defaultTheme = {
    primaryColor: '#f59e0b',
    secondaryColor: '#1e3a8a',
    bgType: 'image',
    bgImageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    headerImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    glassmorphism: true,
    darkOverlayOpacity: 40,
  };

  const finalTheme = parsedTheme
    ? {
        ...defaultTheme,
        ...parsedTheme,
        bgImageUrl: parsedTheme.bgImageUrl || row.bg_image_url || row.bgImageUrl || defaultTheme.bgImageUrl,
        darkOverlayOpacity: parsedTheme.darkOverlayOpacity ?? 40,
      }
    : defaultTheme;

  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline || '',
    category: row.category || 'custom',
    categoryLabel: row.category_label || row.categoryLabel || 'Business',
    logoUrl: row.logo_url || row.logoUrl || '',
    theme: finalTheme,
    aboutText: row.about_text || row.aboutText || '',
    operatingHours: row.operating_hours || row.operatingHours || '',
    website: row.website || '',
    phone: row.phone || '',
    email: row.email || '',
    address: row.address || '',
    status: row.status || 'active',
    managementMode: row.management_mode || row.managementMode || 'self_managed',
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
      planName: 'B-SMART Professional',
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

function mapDbRowToUser(row: any): any {
  if (!row) return null;
  const parsedCompanyIds = parseJsonSafe<string[]>(row.company_ids ?? row.companyIds, []);
  const primaryCompanyId = row.company_id || row.companyId || undefined;
  const baseUser = {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role || 'employee',
    companyId: primaryCompanyId,
    companyIds: Array.isArray(parsedCompanyIds) ? parsedCompanyIds : [],
    assignedCardId: row.assigned_card_id || row.assignedCardId || undefined,
    status: row.status || 'active',
    phone: row.phone || undefined,
    designation: row.designation || undefined,
    avatarUrl: row.avatar_url || row.avatarUrl || undefined,
    bio: row.bio || undefined,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
  return syncUserCompanies(baseUser);
}

// COMPANIES API
app.get('/api/companies', async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  let comps: any[] = [];
  if (pgPool) {
    try {
      const rows = await sql`SELECT * FROM companies ORDER BY name ASC`;
      if (rows && rows.length > 0) {
        comps = rows.map(mapDbRowToCompany);
      }
    } catch {
      // Fallback
    }
  }

  if (comps.length === 0) {
    comps = memoryCompanies.map(mapDbRowToCompany);
  }

  // Filter out any company that was deleted
  const activeCompanies = comps.filter((c: any) => c && c.id && !memoryDeletedCompanyIds.has(c.id));

  res.json({
    companies: activeCompanies,
    deletedCompanyIds: Array.from(memoryDeletedCompanyIds),
    source: pgPool ? 'database' : 'resilient',
  });
});

app.post('/api/companies', async (req: Request, res: Response) => {
  const body = req.body;
  let itemsToSave: any[] = [];

  if (Array.isArray(body)) {
    itemsToSave = body;
  } else if (body && Array.isArray(body.companies)) {
    itemsToSave = body.companies;
  } else if (body && body.id) {
    itemsToSave = [body];
  }

  // Strictly filter out any company that has been marked as deleted
  itemsToSave = itemsToSave.filter((c) => c && c.id && !memoryDeletedCompanyIds.has(c.id));

  if (itemsToSave.length === 0) {
    return res.json({ success: true, count: 0 });
  }

  const writeNow = new Date().toISOString();
  for (const comp of itemsToSave) {
    if (!comp || !comp.id) continue;
    const stampedComp = { ...comp, updatedAt: writeNow };
    const idx = memoryCompanies.findIndex((c) => c.id === comp.id);
    if (idx >= 0) {
      memoryCompanies[idx] = { ...memoryCompanies[idx], ...stampedComp };
    } else {
      memoryCompanies.push({ ...stampedComp, createdAt: stampedComp.createdAt || writeNow });
    }

    if (pgPool) {
      try {
        await sql`
          INSERT INTO companies (
            id, name, tagline, category, category_label, logo_url, theme, about_text, operating_hours, website, phone, email, address,
            status, management_mode, modules, subscription, contact_person_name, contact_email, contact_phone, registration_notes, approved_at, approved_by,
            report_frequency, report_email, last_weekly_report_sent_at, last_monthly_report_sent_at,
            updated_at
          )
          VALUES (
            ${comp.id}, ${comp.name}, ${comp.tagline || ''}, ${comp.category || 'custom'},
            ${comp.categoryLabel || 'Custom'}, ${comp.logoUrl || ''}, ${JSON.stringify(comp.theme || {})},
            ${comp.aboutText || ''}, ${comp.operatingHours || ''}, ${comp.website || ''},
            ${comp.phone || ''}, ${comp.email || ''}, ${comp.address || ''},
            ${comp.status || 'active'}, ${comp.managementMode || 'self_managed'},
            ${JSON.stringify(comp.modules || {})}, ${JSON.stringify(comp.subscription || {})},
            ${comp.contactPersonName || ''}, ${comp.contactEmail || ''}, ${comp.contactPhone || ''},
            ${comp.registrationNotes || ''}, ${comp.approvedAt || null}, ${comp.approvedBy || null},
            ${comp.reportFrequency || 'both'}, ${comp.reportEmail || ''},
            ${comp.lastWeeklyReportSentAt || null}, ${comp.lastMonthlyReportSentAt || null},
            NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            tagline = EXCLUDED.tagline,
            category = EXCLUDED.category,
            category_label = EXCLUDED.category_label,
            logo_url = EXCLUDED.logo_url,
            theme = EXCLUDED.theme,
            about_text = EXCLUDED.about_text,
            operating_hours = EXCLUDED.operating_hours,
            website = EXCLUDED.website,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            address = EXCLUDED.address,
            status = EXCLUDED.status,
            management_mode = EXCLUDED.management_mode,
            modules = EXCLUDED.modules,
            subscription = EXCLUDED.subscription,
            contact_person_name = EXCLUDED.contact_person_name,
            contact_email = EXCLUDED.contact_email,
            contact_phone = EXCLUDED.contact_phone,
            registration_notes = EXCLUDED.registration_notes,
            approved_at = EXCLUDED.approved_at,
            approved_by = EXCLUDED.approved_by,
            report_frequency = EXCLUDED.report_frequency,
            report_email = EXCLUDED.report_email,
            last_weekly_report_sent_at = COALESCE(EXCLUDED.last_weekly_report_sent_at, companies.last_weekly_report_sent_at),
            last_monthly_report_sent_at = COALESCE(EXCLUDED.last_monthly_report_sent_at, companies.last_monthly_report_sent_at),
            updated_at = NOW();
        `;
      } catch (e: any) {
        console.warn('[DB] Company postgres save notice:', e?.message);
      }
    }
  }

  persistLocalData();
  res.json({ success: true, count: itemsToSave.length });
});

app.delete('/api/companies/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  memoryDeletedCompanyIds.add(id);
  memoryCompanies = memoryCompanies.filter((c) => c.id !== id);

  // Also clean up linked cards in memory
  const linkedCards = memoryCards.filter((c) => c.companyId === id);
  for (const card of linkedCards) {
    memoryDeletedCardIds.add(card.id);
  }
  memoryCards = memoryCards.filter((c) => c.companyId !== id);

  // Unassign users from this company in memory
  memoryUsers = memoryUsers.map((u) => {
    if (u.companyId === id || (u.companyIds && u.companyIds.includes(id))) {
      const newCompanyIds = (u.companyIds || []).filter((cid: string) => cid !== id);
      return {
        ...u,
        companyId: u.companyId === id ? undefined : u.companyId,
        companyIds: newCompanyIds,
      };
    }
    return u;
  });

  persistLocalData();

  if (pgPool) {
    try {
      // 1. Unassign and delete linked cards to avoid foreign key violations
      await sql`UPDATE cards SET company_id = NULL WHERE company_id = ${id}`;
      await sql`DELETE FROM cards WHERE company_id = ${id}`;
      // 2. Unassign users
      await sql`UPDATE users SET company_id = NULL WHERE company_id = ${id}`;
      // 3. Delete from companies table
      await sql`DELETE FROM companies WHERE id = ${id}`;
      // 4. Save deletion tombstones into deleted_entities
      await sql`
        INSERT INTO deleted_entities (id, entity_type, deleted_at)
        VALUES (${id}, 'company', NOW())
        ON CONFLICT (id) DO NOTHING
      `;
      for (const card of linkedCards) {
        await sql`
          INSERT INTO deleted_entities (id, entity_type, deleted_at)
          VALUES (${card.id}, 'card', NOW())
          ON CONFLICT (id) DO NOTHING
        `;
      }
    } catch (err: any) {
      console.warn('[DB] Company delete postgres notice:', err?.message);
    }
  }

  res.json({ success: true, deletedId: id });
});

// CARDS API
app.get('/api/cards', async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  let cardList: any[] = [];
  if (pgPool) {
    try {
      const rows = await sql`SELECT * FROM cards ORDER BY created_at ASC`;
      if (rows && rows.length > 0) {
        cardList = rows.map(mapDbRowToCard);
      }
    } catch {
      // Fallback
    }
  }

  if (cardList.length === 0) {
    cardList = memoryCards.map(mapDbRowToCard);
  }

  // Filter out any card that was deleted
  const activeCards = cardList.filter((c: any) => c && c.id && !memoryDeletedCardIds.has(c.id));

  res.json({
    cards: activeCards,
    deletedCardIds: Array.from(memoryDeletedCardIds),
    source: pgPool ? 'database' : 'resilient',
  });
});

app.get('/api/cards/:slugOrId', async (req: Request, res: Response) => {
  const { slugOrId } = req.params;
  const decoded = decodeURIComponent(slugOrId).toLowerCase().trim();
  const clean = decoded.replace(/[^a-z0-9]/g, '');

  let rawCard: any = null;

  if (pgPool) {
    try {
      const rows = await sql`
        SELECT * FROM cards 
        WHERE LOWER(slug) = ${decoded} 
           OR id = ${slugOrId} 
           OR REPLACE(LOWER(slug), '-', '') = ${clean}
           OR LOWER(slug) = ${decoded.replace('b-smart', 'besmart')}
           OR LOWER(slug) = ${decoded.replace('besmart', 'b-smart')}
        LIMIT 1
      `;
      if (rows && rows[0] && !memoryDeletedCardIds.has(rows[0].id)) {
        rawCard = rows[0];
      }
    } catch {
      // Fallback
    }
  }

  if (!rawCard) {
    rawCard = memoryCards.find(
      (c) =>
        !memoryDeletedCardIds.has(c.id) &&
        (c.slug.toLowerCase() === decoded ||
          c.id === slugOrId ||
          c.slug.toLowerCase().replace(/[^a-z0-9]/g, '') === clean ||
          (clean === 'bsmart' && (c.slug === 'besmart' || c.slug === 'b-smart')) ||
          (clean === 'besmart' && (c.slug === 'besmart' || c.slug === 'b-smart')))
    );
  }

  if (rawCard) {
    const card = mapDbRowToCard(rawCard);

    // Look up linked company, company template, and assigned member
    const companyId = card.companyId;
    let company: any = null;
    let companyTemplate: any = null;
    let member: any = null;

    if (card.assignedMemberId) {
      if (pgPool) {
        try {
          const userRows = await sql`SELECT * FROM users WHERE id = ${card.assignedMemberId} LIMIT 1`;
          if (userRows && userRows[0]) member = mapDbRowToUser(userRows[0]);
        } catch {}
      }
      if (!member) {
        const memUser = memoryUsers.find((u) => u.id === card.assignedMemberId);
        if (memUser) member = mapDbRowToUser(memUser);
      }
    }

    if (companyId) {
      if (pgPool) {
        try {
          const compRows = await sql`SELECT * FROM companies WHERE id = ${companyId} LIMIT 1`;
          if (compRows && compRows[0]) {
            company = mapDbRowToCompany(compRows[0]);
          }
          const tmplRows = await sql`SELECT * FROM cards WHERE company_id = ${companyId} AND (assigned_member_id IS NULL OR assigned_member_id = '') LIMIT 1`;
          if (tmplRows && tmplRows[0]) {
            companyTemplate = mapDbRowToCard(tmplRows[0]);
          }
        } catch {
          // Non-blocking
        }
      }
      if (!company) {
        const memComp = memoryCompanies.find((c) => c.id === companyId);
        if (memComp) company = mapDbRowToCompany(memComp);
      }
      if (!companyTemplate) {
        const memTmpl = memoryCards.find((c) => (c.companyId === companyId || (c as any).company_id === companyId) && !c.assignedMemberId && !(c as any).assigned_member_id);
        if (memTmpl) companyTemplate = mapDbRowToCard(memTmpl);
      }
    }

    // Auto-inherit rich background image from company ONLY if not explicitly removed
    const isExplicitlyNoBg =
      card.theme?.bgType === 'none' ||
      card.theme?.bgType === 'color' ||
      card.theme?.bgImageUrl === '' ||
      card.theme?.bgImageUrl === 'none';

    if (!isExplicitlyNoBg && (!card.theme || !card.theme.bgImageUrl) && company?.theme?.bgImageUrl) {
      if (!card.theme) card.theme = { primaryColor: '#2563eb' };
      card.theme.bgImageUrl = company.theme.bgImageUrl;
    }

    return res.json({
      card,
      company,
      companyTemplate,
      member,
      source: pgPool ? 'database' : 'resilient',
    });
  }

  res.status(404).json({ error: 'Card not found' });
});

app.post('/api/cards', async (req: Request, res: Response) => {
  const body = req.body;
  let cardsToSave: any[] = [];

  if (Array.isArray(body)) {
    cardsToSave = body;
  } else if (body && Array.isArray(body.cards)) {
    cardsToSave = body.cards;
  } else if (body && body.id) {
    cardsToSave = [body];
  }

  // Filter out any deleted card
  cardsToSave = cardsToSave.filter((c) => c && c.id && !memoryDeletedCardIds.has(c.id));

  if (cardsToSave.length === 0) {
    return res.json({ success: true, count: 0 });
  }

  for (const rawCard of cardsToSave) {
    if (!rawCard || !rawCard.id) continue;

    // Guarantee unique slug across active cards (excluding this card's own id)
    const uniqueSlug = ensureUniqueSlug(
      rawCard.slug || rawCard.businessName || rawCard.id,
      memoryCards,
      rawCard.id
    );
    const cardWriteNow = new Date().toISOString();
    const card = { ...rawCard, slug: uniqueSlug, updatedAt: cardWriteNow, createdAt: rawCard.createdAt || cardWriteNow };

    // Enforce 1-to-1 card <-> user link integrity in memory
    if (card.assignedMemberId) {
      memoryCards = memoryCards.map((c) =>
        c.id !== card.id && c.assignedMemberId === card.assignedMemberId
          ? { ...c, assignedMemberId: undefined }
          : c
      );
      memoryUsers = memoryUsers.map((u) => {
        if (u.id === card.assignedMemberId) {
          return syncUserCompanies(
            { ...u, assignedCardId: card.id },
            { addCompanyIds: [card.companyId], primaryCompanyId: u.companyId || card.companyId }
          );
        }
        return u.assignedCardId === card.id ? { ...u, assignedCardId: undefined } : u;
      });
    } else {
      memoryUsers = memoryUsers.map((u) =>
        u.assignedCardId === card.id ? { ...u, assignedCardId: undefined } : u
      );
    }

    const idx = memoryCards.findIndex((c) => c.id === card.id);
    if (idx >= 0) {
      memoryCards[idx] = { ...memoryCards[idx], ...card };
    } else {
      memoryCards.push(card);
    }

    if (pgPool) {
      try {
        if (card.assignedMemberId) {
          await sql`UPDATE cards SET assigned_member_id = NULL WHERE id <> ${card.id} AND assigned_member_id = ${card.assignedMemberId}`;
          await sql`UPDATE users SET assigned_card_id = NULL WHERE id <> ${card.assignedMemberId} AND assigned_card_id = ${card.id}`;
          await sql`UPDATE users SET assigned_card_id = ${card.id} WHERE id = ${card.assignedMemberId}`;
        } else {
          await sql`UPDATE users SET assigned_card_id = NULL WHERE assigned_card_id = ${card.id}`;
        }

        await sql`
          INSERT INTO cards (
            id, company_id, owner_email, slug, business_name, tagline, business_type, business_type_label,
            contact_person_name, designation, logo_url, accent, theme, banners, chips, tabs,
            phone, whatsapp, email, address, website, panic_phone, emergency_phone, social_links,
            about_text, services, gallery_images, operating_hours, status, assigned_member_id,
            views_count, shares_count, call_clicks_count, whatsapp_clicks_count, vcard_downloads_count, updated_at
          ) VALUES (
            ${card.id}, ${card.companyId || null}, ${card.socialLinks?.email || ''}, ${card.slug},
            ${card.businessName}, ${card.tagline || ''}, ${card.businessType || 'custom'}, ${card.businessTypeLabel || 'Custom'},
            ${card.contactPersonName || ''}, ${card.designation || ''}, ${card.logoUrl || ''},
            ${card.theme?.primaryColor || '#0284c7'}, ${JSON.stringify(card.theme || {})}, ${JSON.stringify(card.banners || [])},
            ${JSON.stringify([])}, ${JSON.stringify([])},
            ${card.socialLinks?.phone || ''}, ${card.socialLinks?.whatsapp || ''}, ${card.socialLinks?.email || ''},
            ${card.socialLinks?.address || ''}, ${card.socialLinks?.website || ''},
            ${card.emergencyPhone || ''}, ${card.emergencyPhone || ''}, ${JSON.stringify(card.socialLinks || {})},
            ${card.aboutText || ''}, ${JSON.stringify(card.services || [])}, ${JSON.stringify(card.galleryImages || [])}, ${card.operatingHours || ''},
            ${card.status || 'live'}, ${card.assignedMemberId || null},
            ${card.viewsCount || 0}, ${card.sharesCount || 0}, ${card.callClicksCount || 0}, ${card.whatsappClicksCount || 0}, ${card.vcardDownloadsCount || 0}, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            company_id = EXCLUDED.company_id,
            slug = EXCLUDED.slug,
            business_name = EXCLUDED.business_name,
            tagline = EXCLUDED.tagline,
            business_type = EXCLUDED.business_type,
            business_type_label = EXCLUDED.business_type_label,
            contact_person_name = EXCLUDED.contact_person_name,
            designation = EXCLUDED.designation,
            logo_url = EXCLUDED.logo_url,
            accent = EXCLUDED.accent,
            theme = EXCLUDED.theme,
            banners = EXCLUDED.banners,
            chips = EXCLUDED.chips,
            tabs = EXCLUDED.tabs,
            phone = EXCLUDED.phone,
            whatsapp = EXCLUDED.whatsapp,
            email = EXCLUDED.email,
            address = EXCLUDED.address,
            website = EXCLUDED.website,
            panic_phone = EXCLUDED.panic_phone,
            emergency_phone = EXCLUDED.emergency_phone,
            social_links = EXCLUDED.social_links,
            about_text = EXCLUDED.about_text,
            services = EXCLUDED.services,
            gallery_images = EXCLUDED.gallery_images,
            operating_hours = EXCLUDED.operating_hours,
            status = EXCLUDED.status,
            assigned_member_id = EXCLUDED.assigned_member_id,
            views_count = EXCLUDED.views_count,
            shares_count = EXCLUDED.shares_count,
            call_clicks_count = EXCLUDED.call_clicks_count,
            whatsapp_clicks_count = EXCLUDED.whatsapp_clicks_count,
            vcard_downloads_count = EXCLUDED.vcard_downloads_count,
            updated_at = NOW();
        `;
      } catch (e: any) {
        console.warn('[DB] Card postgres save notice:', e?.message);
      }
    }
  }

  reconcileInMemoryStore();
  persistLocalData();
  res.json({ success: true, count: cardsToSave.length });
});

app.delete('/api/cards/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  memoryDeletedCardIds.add(id);
  memoryCards = memoryCards.filter((c) => c.id !== id);
  // Clear assigned card from users in memory
  memoryUsers = memoryUsers.map((u) => (u.assignedCardId === id ? { ...u, assignedCardId: undefined } : u));
  persistLocalData();

  if (pgPool) {
    try {
      await sql`UPDATE users SET assigned_card_id = NULL WHERE assigned_card_id = ${id}`;
      await sql`DELETE FROM leads WHERE card_id = ${id}`;
      await sql`DELETE FROM cards WHERE id = ${id}`;
      await sql`
        INSERT INTO deleted_entities (id, entity_type, deleted_at)
        VALUES (${id}, 'card', NOW())
        ON CONFLICT (id) DO NOTHING
      `;
    } catch (err: any) {
      console.warn('[DB] Card delete notice:', err?.message);
    }
  }

  res.json({ success: true, deletedId: id });
});

// METRIC INCREMENT
app.post('/api/cards/:id/metric', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { type } = req.body;

  const card = memoryCards.find((c) => c.id === id);
  if (card) {
    if (type === 'view') card.viewsCount = (card.viewsCount || 0) + 1;
    else if (type === 'share') card.sharesCount = (card.sharesCount || 0) + 1;
    else if (type === 'call') card.callClicksCount = (card.callClicksCount || 0) + 1;
    else if (type === 'whatsapp') card.whatsappClicksCount = (card.whatsappClicksCount || 0) + 1;
    else if (type === 'vcard') card.vcardDownloadsCount = (card.vcardDownloadsCount || 0) + 1;
    persistLocalData();
  }

  if (pgPool) {
    try {
      if (type === 'view') {
        await sql`UPDATE cards SET views_count = COALESCE(views_count, 0) + 1 WHERE id = ${id}`;
      } else if (type === 'share') {
        await sql`UPDATE cards SET shares_count = COALESCE(shares_count, 0) + 1 WHERE id = ${id}`;
      } else if (type === 'call') {
        await sql`UPDATE cards SET call_clicks_count = COALESCE(call_clicks_count, 0) + 1 WHERE id = ${id}`;
      } else if (type === 'whatsapp') {
        await sql`UPDATE cards SET whatsapp_clicks_count = COALESCE(whatsapp_clicks_count, 0) + 1 WHERE id = ${id}`;
      } else if (type === 'vcard') {
        await sql`UPDATE cards SET vcard_downloads_count = COALESCE(vcard_downloads_count, 0) + 1 WHERE id = ${id}`;
      }
    } catch {
      // Non-blocking
    }
  }

  res.json({ success: true });
});

// USERS API
app.get('/api/users', async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  let userList: any[] = [];
  if (pgPool) {
    try {
      const rows = await sql`SELECT * FROM users ORDER BY created_at ASC`;
      if (rows && rows.length > 0) {
        userList = rows.map(mapDbRowToUser);
      }
    } catch {
      // Fallback
    }
  }

  if (userList.length === 0) {
    userList = memoryUsers.map(mapDbRowToUser);
  }

  const activeUsers = deduplicateUsers(userList, Array.from(memoryDeletedUserIds));

  res.json({
    users: activeUsers,
    deletedUserIds: Array.from(memoryDeletedUserIds),
    source: pgPool ? 'database' : 'resilient',
  });
});

app.post('/api/users', async (req: Request, res: Response) => {
  const body = req.body;
  let usersToSave: any[] = [];

  if (Array.isArray(body)) {
    usersToSave = body;
  } else if (body && Array.isArray(body.users)) {
    usersToSave = body.users;
  } else if (body && body.id) {
    usersToSave = [body];
  }

  usersToSave = usersToSave.filter((u) => u && u.id && !memoryDeletedUserIds.has(u.id));

  if (usersToSave.length === 0) {
    return res.json({ success: true, count: 0 });
  }

  for (const rawUser of usersToSave) {
    if (!rawUser || !rawUser.id) continue;

    // Normalize email & reuse canonical id if duplicate email or legacy Zweli Gmail exists
    const isLegacyZweliAlias =
      rawUser.id === 'user-zweli-gmail' || normalizeEmail(rawUser.email) === 'mzwelisto@gmail.com';
    const cleanEmail = isLegacyZweliAlias
      ? 'zweli@msn.com'
      : normalizeEmail(rawUser.email || `${rawUser.id}@bsmart.internal`) || `${rawUser.id}@bsmart.internal`;

    const existingById = memoryUsers.find(
      (u) => u.id === (isLegacyZweliAlias ? 'user-zweli-admin' : rawUser.id)
    );
    const existingByEmail = memoryUsers.find(
      (u) => normalizeEmail(u.email) === cleanEmail
    );
    const canonicalTarget = existingById || existingByEmail;
    const targetId = canonicalTarget ? canonicalTarget.id : rawUser.id;

    const userWriteNow = new Date().toISOString();
    const normalizedUser = syncUserCompanies(
      {
        ...(canonicalTarget || {}),
        ...rawUser,
        id: targetId,
        email: cleanEmail,
        updatedAt: userWriteNow,
        createdAt: (canonicalTarget || rawUser).createdAt || userWriteNow,
      },
      {
        addCompanyIds: canonicalTarget?.companyIds,
        primaryCompanyId: rawUser.companyId || canonicalTarget?.companyId,
      }
    );

    // Enforce 1-to-1 card <-> user link integrity in memory
    if (normalizedUser.assignedCardId) {
      memoryUsers = memoryUsers.map((u) =>
        u.id !== targetId && u.assignedCardId === normalizedUser.assignedCardId
          ? { ...u, assignedCardId: undefined }
          : u
      );
      memoryCards = memoryCards.map((c) => {
        if (c.id === normalizedUser.assignedCardId) {
          return { ...c, assignedMemberId: targetId };
        }
        return c.assignedMemberId === targetId ? { ...c, assignedMemberId: undefined } : c;
      });
    } else {
      memoryCards = memoryCards.map((c) =>
        c.assignedMemberId === targetId ? { ...c, assignedMemberId: undefined } : c
      );
    }

    const idx = memoryUsers.findIndex((u) => u.id === targetId);
    if (idx >= 0) {
      memoryUsers[idx] = { ...memoryUsers[idx], ...normalizedUser };
    } else {
      memoryUsers.push(normalizedUser);
    }

    if (pgPool) {
      try {
        if (normalizedUser.assignedCardId) {
          await sql`UPDATE users SET assigned_card_id = NULL WHERE id <> ${targetId} AND assigned_card_id = ${normalizedUser.assignedCardId}`;
          await sql`UPDATE cards SET assigned_member_id = NULL WHERE id <> ${normalizedUser.assignedCardId} AND assigned_member_id = ${targetId}`;
          await sql`UPDATE cards SET assigned_member_id = ${targetId} WHERE id = ${normalizedUser.assignedCardId}`;
        } else {
          await sql`UPDATE cards SET assigned_member_id = NULL WHERE assigned_member_id = ${targetId}`;
        }

        await sql`
          INSERT INTO users (id, email, name, role, company_id, company_ids, password, assigned_card_id, status, phone, designation, avatar_url, bio, updated_at)
          VALUES (
            ${targetId}, ${cleanEmail}, ${normalizedUser.name || 'Team Member'}, ${normalizedUser.role || 'employee'},
            ${normalizedUser.companyId || null}, ${JSON.stringify(normalizedUser.companyIds || [])}, ${normalizedUser.password || null}, ${normalizedUser.assignedCardId || null},
            ${normalizedUser.status || 'active'}, ${normalizedUser.phone || ''}, ${normalizedUser.designation || ''},
            ${normalizedUser.avatarUrl || ''}, ${normalizedUser.bio || ''}, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            company_id = EXCLUDED.company_id,
            company_ids = EXCLUDED.company_ids,
            password = COALESCE(EXCLUDED.password, users.password),
            assigned_card_id = EXCLUDED.assigned_card_id,
            status = EXCLUDED.status,
            phone = EXCLUDED.phone,
            designation = EXCLUDED.designation,
            avatar_url = EXCLUDED.avatar_url,
            bio = EXCLUDED.bio,
            updated_at = NOW();
        `;
      } catch (e: any) {
        console.warn('[DB] User postgres save notice:', e?.message);
      }
    }
  }

  reconcileInMemoryStore();
  persistLocalData();
  res.json({ success: true, count: usersToSave.length });
});

app.delete('/api/users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  memoryDeletedUserIds.add(id);
  memoryUsers = memoryUsers.filter((u) => u.id !== id);
  memoryCards = memoryCards.map((c) =>
    c.assignedMemberId === id ? { ...c, assignedMemberId: undefined } : c
  );
  persistLocalData();

  if (pgPool) {
    try {
      await sql`UPDATE cards SET assigned_member_id = NULL WHERE assigned_member_id = ${id}`;
      await sql`DELETE FROM users WHERE id = ${id}`;
      await sql`
        INSERT INTO deleted_entities (id, entity_type, deleted_at)
        VALUES (${id}, 'user', NOW())
        ON CONFLICT (id) DO NOTHING
      `;
    } catch {
      // Non-blocking
    }
  }

  res.json({ success: true, deletedId: id });
});

// LEADS API
app.get('/api/leads', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const { companyId } = req.query;

  let leadsList = [...memoryLeads];
  if (pgPool) {
    try {
      const rows = await sql`SELECT * FROM leads ORDER BY created_at DESC LIMIT 500`;
      if (rows && rows.length > 0) {
        leadsList = rows.map((r: any) => ({
          id: r.id,
          cardId: r.card_id || r.cardId,
          cardName: r.card_name || r.cardName || 'Smart Card',
          companyId: r.company_id || r.companyId || undefined,
          companyName: r.company_name || r.companyName || undefined,
          cardHolderName: r.card_holder_name || r.cardHolderName || undefined,
          cardHolderEmail: r.card_holder_email || r.cardHolderEmail || undefined,
          name: r.name || 'Anonymous',
          email: r.email || '',
          phone: r.phone || '',
          message: r.message || '',
          subject: r.subject || 'General Inquiry',
          preferredContact: r.preferred_contact || r.preferredContact || 'whatsapp',
          preferredTime: r.preferred_time || r.preferredTime || '',
          status: r.status || 'new',
          notes: r.notes || '',
          followUpDate: r.follow_up_date || r.followUpDate || '',
          lastContactedAt: r.last_contacted_at || r.lastContactedAt || undefined,
          cardHolderNotifiedAt: r.card_holder_notified_at || r.cardHolderNotifiedAt || undefined,
          lastReminderSentAt: r.last_reminder_sent_at || r.lastReminderSentAt || undefined,
          escalationSentAt: r.escalation_sent_at || r.escalationSentAt || undefined,
          createdAt: r.created_at || r.createdAt || new Date().toISOString(),
          updatedAt: r.updated_at || r.updatedAt || r.created_at || r.createdAt || undefined,
        }));
      }
    } catch {
      // Fallback
    }
  }

  // Deduplicate and enrich cardholder + company info
  const seen = new Set<string>();
  const deduplicated: any[] = [];
  for (const l of leadsList) {
    if (!l || !l.id) continue;
    const contentKey = `${(l.name || '').trim().toLowerCase()}|${(l.phone || '').trim()}|${(l.message || '').trim()}`;
    if (!seen.has(l.id) && !seen.has(contentKey)) {
      seen.add(l.id);
      seen.add(contentKey);
      const resolved = resolveLeadRecipients(emailMonitorCtx, l);
      if (!l.companyId && resolved.company?.id) {
        l.companyId = resolved.company.id;
      }
      if (!l.companyName && resolved.company?.name) {
        l.companyName = resolved.company.name;
      }
      if (!l.cardHolderName && resolved.cardHolderName) {
        l.cardHolderName = resolved.cardHolderName;
      }
      if (!l.cardHolderEmail && resolved.cardHolderEmail) {
        l.cardHolderEmail = resolved.cardHolderEmail;
      }
      deduplicated.push(l);
    }
  }

  const finalLeads = companyId && companyId !== 'all'
    ? deduplicated.filter(
        (l) =>
          l.companyId === companyId ||
          l.cardId === companyId ||
          (l.companyName && l.companyName.toLowerCase() === String(companyId).toLowerCase())
      )
    : deduplicated;

  res.json({ leads: finalLeads, total: deduplicated.length, source: pgPool ? 'database' : 'resilient' });
});

app.post('/api/leads', async (req: Request, res: Response) => {
  const lead = req.body;
  if (!lead) return res.json({ success: true, lead });

  const id = lead.id || `lead-${Date.now()}`;
  const resolved = resolveLeadRecipients(emailMonitorCtx, lead);
  const existingIdx = memoryLeads.findIndex((l) => l.id === id);
  const isNewRecord = existingIdx < 0;

  const leadNow = new Date().toISOString();
  const fullLead = {
    ...lead,
    id,
    companyId: lead.companyId || resolved.company?.id || undefined,
    companyName: lead.companyName || resolved.company?.name || undefined,
    cardHolderName: lead.cardHolderName || resolved.cardHolderName,
    cardHolderEmail: lead.cardHolderEmail || resolved.cardHolderEmail,
    subject: lead.subject || 'General Inquiry',
    preferredContact: lead.preferredContact || 'whatsapp',
    preferredTime: lead.preferredTime || '',
    notes: lead.notes || '',
    followUpDate: lead.followUpDate || '',
    status: lead.status || 'new',
    createdAt: lead.createdAt || leadNow,
    updatedAt: leadNow,
  };

  if (existingIdx >= 0) {
    memoryLeads[existingIdx] = { ...memoryLeads[existingIdx], ...fullLead };
  } else {
    memoryLeads.unshift(fullLead);
  }
  persistLocalData();

  if (pgPool) {
    try {
      await sql`
        INSERT INTO leads (
          id, card_id, card_name, company_id, company_name, name, email, phone, message,
          subject, preferred_contact, preferred_time, notes, follow_up_date, status,
          card_holder_name, card_holder_email, created_at
        ) VALUES (
          ${id}, ${lead.cardId || 'card-general'}, ${lead.cardName || 'Smart Card'},
          ${fullLead.companyId || null}, ${fullLead.companyName || null},
          ${lead.name}, ${lead.email || ''}, ${lead.phone || ''}, ${lead.message || ''},
          ${fullLead.subject}, ${fullLead.preferredContact}, ${fullLead.preferredTime},
          ${fullLead.notes}, ${fullLead.followUpDate}, ${fullLead.status},
          ${fullLead.cardHolderName || null}, ${fullLead.cardHolderEmail || null},
          ${fullLead.createdAt}
        )
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          notes = EXCLUDED.notes,
          follow_up_date = EXCLUDED.follow_up_date,
          card_holder_name = COALESCE(EXCLUDED.card_holder_name, leads.card_holder_name),
          card_holder_email = COALESCE(EXCLUDED.card_holder_email, leads.card_holder_email),
          last_contacted_at = COALESCE(EXCLUDED.last_contacted_at, leads.last_contacted_at);
      `;
    } catch {
      // Non-blocking
    }
  }

  let emailNotification: EmailNotificationLogRecord | null = null;
  if (isNewRecord && req.body?.skipNotification !== true) {
    try {
      emailNotification = await notifyCardHolderForLead(emailMonitorCtx, fullLead, 'new_enquiry');
    } catch {
      // Non-blocking
    }
  }

  const latestLead = memoryLeads.find((l) => l.id === id) || fullLead;
  res.json({ success: true, lead: latestLead, emailNotification });
});

app.patch('/api/leads/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body || {};

  const lead = memoryLeads.find((l) => l.id === id);
  const prevFollowUpDate = lead?.followUpDate || '';
  if (lead) {
    Object.assign(lead, updates, { updatedAt: new Date().toISOString() });
    persistLocalData();
  }

  if (pgPool) {
    try {
      const statusVal = updates.status || (lead ? lead.status : 'new');
      const notesVal = updates.notes !== undefined ? updates.notes : (lead ? lead.notes || '' : '');
      const followUpDateVal = updates.followUpDate !== undefined ? updates.followUpDate : (lead ? lead.followUpDate || '' : '');
      const lastContactedVal = updates.lastContactedAt ? new Date(updates.lastContactedAt) : (lead?.lastContactedAt ? new Date(lead.lastContactedAt) : null);

      await sql`
        UPDATE leads 
        SET status = ${statusVal}, notes = ${notesVal}, follow_up_date = ${followUpDateVal},
            last_contacted_at = ${lastContactedVal}, updated_at = NOW()
        WHERE id = ${id}
      `;
    } catch {
      // Non-blocking
    }
  }

  let emailNotification: EmailNotificationLogRecord | null = null;
  if (lead && updates.followUpDate && updates.followUpDate !== prevFollowUpDate && lead.status !== 'resolved' && lead.status !== 'archived') {
    const todayStr = getTodayDateStr();
    const trigger = updates.followUpDate < todayStr
      ? 'followup_overdue'
      : updates.followUpDate === todayStr
      ? 'followup_due'
      : 'followup_scheduled';
    try {
      emailNotification = await notifyCardHolderForLead(emailMonitorCtx, lead, trigger);
    } catch {
      // Non-blocking
    }
  }

  res.json({ success: true, lead, emailNotification });
});

app.delete('/api/leads/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  memoryLeads = memoryLeads.filter((l) => l.id !== id);
  persistLocalData();

  if (pgPool) {
    try {
      await sql`DELETE FROM leads WHERE id = ${id}`;
    } catch {
      // Non-blocking
    }
  }

  res.json({ success: true });
});

// ENQUIRY & FOLLOW-UP MONITORING, CARDHOLDER EMAILS & WEEKLY/MONTHLY COMPANY REPORTS
app.post('/api/leads/:id/notify', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { trigger } = req.body || {};
  const lead = memoryLeads.find((l) => l.id === id);
  if (!lead) {
    return res.status(404).json({ error: 'Enquiry not found' });
  }
  const mon = getMonitoringState(lead);
  const chosenTrigger =
    trigger === 'new_enquiry' || trigger === 'followup_scheduled' || trigger === 'followup_due' || trigger === 'followup_overdue' || trigger === 'unattended_sla'
      ? trigger
      : mon.state === 'overdue'
      ? 'followup_overdue'
      : mon.state === 'due_today'
      ? 'followup_due'
      : mon.state === 'unattended_sla'
      ? 'unattended_sla'
      : lead.followUpDate
      ? 'followup_scheduled'
      : 'new_enquiry';

  const log = await notifyCardHolderForLead(emailMonitorCtx, lead, chosenTrigger);
  const updatedLead = memoryLeads.find((l) => l.id === id) || lead;
  res.json({ success: true, log, lead: updatedLead });
});

app.get('/api/monitoring/summary', (req: Request, res: Response) => {
  const companyId = typeof req.query.companyId === 'string' ? req.query.companyId : 'all';
  const now = new Date();
  const leadsPool = companyId && companyId !== 'all'
    ? memoryLeads.filter((l) => l.companyId === companyId || l.cardId === companyId)
    : memoryLeads;

  const logsPool = companyId && companyId !== 'all'
    ? memoryEmailLogs.filter((e) => e.companyId === companyId)
    : memoryEmailLogs;

  let overdueCount = 0;
  let dueTodayCount = 0;
  let scheduledCount = 0;
  let unattended24hCount = 0;
  let notifiedCardHolders = 0;

  for (const l of leadsPool) {
    const mon = getMonitoringState(l, now);
    if (mon.state === 'overdue') overdueCount++;
    else if (mon.state === 'due_today') dueTodayCount++;
    else if (mon.state === 'scheduled') scheduledCount++;
    else if (mon.state === 'unattended_sla') unattended24hCount++;
    if (l.cardHolderNotifiedAt || l.lastReminderSentAt) notifiedCardHolders++;
  }

  const delivery = getDeliveryStatus();
  res.json({
    delivery,
    smtp: delivery,
    monitoring: {
      totalLeads: leadsPool.length,
      overdueCount,
      dueTodayCount,
      scheduledCount,
      unattended24hCount,
      notifiedCardHolders,
    },
    emailStats: {
      totalLogged: logsPool.length,
      sentCount: logsPool.filter((l) => l.status === 'sent').length,
      inAppActiveCount: logsPool.filter((l) => l.status === 'active_in_app' || l.status === 'queued_smtp_unconfigured').length,
      queuedCount: logsPool.filter((l) => l.status === 'active_in_app' || l.status === 'queued_smtp_unconfigured').length,
      failedCount: logsPool.filter((l) => l.status === 'failed').length,
      reportsSentCount: logsPool.filter(
        (l) => l.emailType === 'weekly_company_report' || l.emailType === 'monthly_company_report'
      ).length,
    },
    timestamp: now.toISOString(),
  });
});

app.post('/api/monitoring/check-followups', async (_req: Request, res: Response) => {
  const result = await runFollowUpMonitoringSweep(emailMonitorCtx);
  res.json({ success: true, ...result });
});

app.get('/api/email-logs', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  const companyId = typeof req.query.companyId === 'string' ? req.query.companyId : 'all';
  const leadId = typeof req.query.leadId === 'string' ? req.query.leadId : '';
  const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || '100'), 10) || 100));

  let logs = [...memoryEmailLogs].map((l) =>
    l.status === 'queued_smtp_unconfigured'
      ? { ...l, status: 'active_in_app' as const, deliveryMethod: 'in_app_direct' as const, errorMessage: undefined }
      : l
  );
  if (companyId && companyId !== 'all') {
    logs = logs.filter((l) => l.companyId === companyId);
  }
  if (leadId) {
    logs = logs.filter((l) => l.leadId === leadId);
  }

  const delivery = getDeliveryStatus();
  res.json({ logs: logs.slice(0, limit), total: logs.length, delivery, smtp: delivery });
});

app.post('/api/email-logs/:id/resend', async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = memoryEmailLogs.find((l) => l.id === id);
  if (!existing) {
    return res.status(404).json({ error: 'Notification log record not found' });
  }
  const newLog = await dispatchMonitoredEmail(emailMonitorCtx, {
    companyId: existing.companyId,
    companyName: existing.companyName,
    leadId: existing.leadId,
    cardId: existing.cardId,
    cardHolderName: existing.cardHolderName,
    cardHolderPhone: existing.cardHolderPhone,
    to: existing.recipientEmail,
    cc: existing.ccEmail ? existing.ccEmail.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
    emailType: existing.emailType,
    subject: existing.subject,
    html: existing.htmlPreview || `<p>${escapeHtml(existing.subject)}</p>`,
    text: existing.textSummary || existing.subject,
  });
  res.json({ success: newLog.status === 'sent' || newLog.status === 'active_in_app', log: newLog });
});

app.get('/api/reports/preview', (req: Request, res: Response) => {
  const companyId = typeof req.query.companyId === 'string' ? req.query.companyId : '';
  const period = req.query.period === 'monthly' ? 'monthly' : 'weekly';
  const format = typeof req.query.format === 'string' ? req.query.format : 'json';

  const company = companyId && companyId !== 'all'
    ? memoryCompanies.find((c) => c.id === companyId)
    : memoryCompanies[0];

  if (!company) {
    return res.status(404).json({ error: 'Company not found for report generation' });
  }

  const report = buildCompanyReportData(emailMonitorCtx, company, period);
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${report.csvFilename}"`);
    return res.send(report.csvContent);
  }

  res.json({
    company: {
      id: company.id,
      name: company.name,
      email: company.reportEmail || company.email || company.contactEmail || '',
      reportFrequency: company.reportFrequency || 'both',
      lastWeeklyReportSentAt: company.lastWeeklyReportSentAt,
      lastMonthlyReportSentAt: company.lastMonthlyReportSentAt,
    },
    report,
  });
});

app.post('/api/reports/send', async (req: Request, res: Response) => {
  const { companyId, period, overrideEmail } = req.body || {};
  const targetPeriod = period === 'monthly' ? 'monthly' : 'weekly';
  const targets = companyId && companyId !== 'all'
    ? memoryCompanies.filter((c) => c.id === companyId)
    : memoryCompanies.filter((c) => c.status !== 'inactive' && c.status !== 'suspended');

  if (targets.length === 0) {
    return res.status(404).json({ error: 'No matching active company found.' });
  }

  const results: Array<{ companyId: string; companyName: string; log: EmailNotificationLogRecord }> = [];
  for (const comp of targets) {
    const compWithTargetEmail = isValidEmail(overrideEmail)
      ? { ...comp, reportEmail: String(overrideEmail).trim() }
      : comp;
    const { log } = await sendCompanyReport(emailMonitorCtx, compWithTargetEmail, targetPeriod);
    results.push({ companyId: comp.id, companyName: comp.name, log });
  }

  res.json({
    success: true,
    period: targetPeriod,
    sentCount: results.filter((r) => r.log.status === 'sent').length,
    inAppActiveCount: results.filter((r) => r.log.status === 'active_in_app').length,
    queuedCount: results.filter((r) => r.log.status === 'active_in_app' || r.log.status === 'queued_smtp_unconfigured').length,
    results,
  });
});

app.get(['/api/delivery/status', '/api/smtp/status'], (_req: Request, res: Response) => {
  res.json(getDeliveryStatus());
});

app.post(['/api/monitoring/test-dispatch', '/api/smtp/test'], async (req: Request, res: Response) => {
  const { to } = req.body || {};
  if (!isValidEmail(to)) {
    return res.status(400).json({ error: 'Valid destination email address is required.' });
  }
  const log = await dispatchMonitoredEmail(emailMonitorCtx, {
    to: String(to).trim(),
    emailType: 'delivery_test',
    subject: '[B-SMART™] Zero-SMTP Monitoring & Dispatch Check',
    html: `<div style="font-family:sans-serif;padding:20px;background:#0c1425;color:#f8fafc;border-radius:12px;"><h2>B-SMART™ Zero-SMTP Notification Verified</h2><p>Cardholder enquiry alerts, scheduled follow-up reminders, and weekly/monthly company reports are active without requiring SMTP credentials.</p></div>`,
    text: 'B-SMART™ Zero-SMTP Notification Verified. Cardholder enquiry alerts, follow-up reminders, and weekly/monthly company reports are active.',
  });
  res.json({ success: log.status === 'sent' || log.status === 'active_in_app', log });
});

// Dedicated Web Page Download Portal (Guarantees 100% successful downloads when opened from chat or external browser tabs)
app.get(
  ['/bundle', '/bundle-download', '/download-bundle', '/get-bundle', '/bundle.html', '/app/bundle', '/app/bundle-download'],
  (req: Request, res: Response) => {
    const base = req.baseUrl || '';
    const codeUrl = `${base}/cpanel_app_code.zip`;
    const zipUrl = `${base}/cpanel_app_bundle.zip`;
    const tarUrl = `${base}/cpanel_app_bundle.tar.gz`;
    
    let codeSizeStr = '(4.9 MB)';
    let zipSizeStr = '(108 MB)';
    let tarSizeStr = '(86 MB)';
    const codePath = path.resolve(process.cwd(), 'cpanel_app_code.zip');
    const zipPath = path.resolve(process.cwd(), 'cpanel_app_bundle.zip');
    const tarPath = path.resolve(process.cwd(), 'cpanel_app_bundle.tar.gz');
    if (fs.existsSync(codePath)) {
      codeSizeStr = `(${(fs.statSync(codePath).size / (1024 * 1024)).toFixed(1)} MB)`;
    }
    if (fs.existsSync(zipPath)) {
      zipSizeStr = `(${(fs.statSync(zipPath).size / (1024 * 1024)).toFixed(1)} MB)`;
    }
    if (fs.existsSync(tarPath)) {
      tarSizeStr = `(${(fs.statSync(tarPath).size / (1024 * 1024)).toFixed(1)} MB)`;
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Download b-Smart cPanel Production Bundle</title>
  <style>
    body {
      background-color: #020617;
      color: #f8fafc;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px 16px;
      box-sizing: border-box;
      text-align: center;
    }
    .card {
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid rgba(56, 189, 248, 0.35);
      border-radius: 24px;
      padding: 40px 32px;
      max-width: 620px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7);
    }
    .icon {
      width: 64px;
      height: 64px;
      background: rgba(14, 165, 233, 0.15);
      border-radius: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      color: #38bdf8;
      font-size: 32px;
    }
    h1 { font-size: 22px; font-weight: 800; margin: 0 0 10px; color: #ffffff; letter-spacing: -0.5px; }
    p { font-size: 13px; color: #94a3b8; line-height: 1.6; margin: 0 0 20px; }
    .badge {
      display: inline-block;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 9999px;
      margin-bottom: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status {
      font-size: 12px;
      font-weight: 700;
      color: #38bdf8;
      background: rgba(14, 165, 233, 0.12);
      border: 1px solid rgba(14, 165, 233, 0.25);
      padding: 12px 20px;
      border-radius: 14px;
      margin-bottom: 24px;
      display: block;
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }
    .btn {
      background: linear-gradient(135deg, #059669, #10b981);
      color: white;
      font-weight: 800;
      font-size: 13px;
      padding: 14px 24px;
      border-radius: 14px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      border: none;
      cursor: pointer;
      box-shadow: 0 10px 25px rgba(16, 185, 129, 0.35);
      transition: all 0.2s;
    }
    .btn:hover { background: linear-gradient(135deg, #047857, #059669); transform: translateY(-1px); }
    .btn-secondary {
      background: #1e293b;
      color: #e2e8f0;
      border: 1px solid #334155;
      font-weight: 700;
      font-size: 13px;
      padding: 14px 24px;
      border-radius: 14px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-secondary:hover { background: #334155; }
    .instructions {
      text-align: left;
      background: rgba(2, 6, 23, 0.6);
      border: 1px solid rgba(51, 65, 85, 0.6);
      border-radius: 14px;
      padding: 16px 20px;
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.6;
    }
    .instructions ol { margin: 6px 0 0; padding-left: 18px; }
    .instructions li { margin-bottom: 4px; }
    .instructions strong { color: #f1f5f9; }
    .spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(56, 189, 248, 0.3);
      border-radius: 50%;
      border-top-color: #38bdf8;
      animation: spin 0.8s linear infinite;
      margin-right: 8px;
      vertical-align: middle;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🚀</div>
    <div class="badge">cPanel CloudLinux Deployment Portal</div>
    <h1>b-Smart Production Deployment Packages</h1>
    <p>Choose your preferred deployment archive. All archives include the latest updates, enquiry &amp; follow-up monitoring, zero-config cardholder alerts, weekly/monthly company reports, and database auto-migration.</p>
    
    <div id="status" class="status">⚡ Ready for download — select your preferred package below</div>
    
    <div class="actions">
      <a href="${zipUrl}" download="cpanel_app_bundle.zip" class="btn">
        <span>📦 Complete Standalone ZIP (Pre-installed node_modules)</span>
        <span>${zipSizeStr}</span>
      </a>
      <a href="${tarUrl}" download="cpanel_app_bundle.tar.gz" class="btn-secondary" style="border-color: #10b981; color: #6ee7b7;">
        <span>🐧 Linux Standalone TAR.GZ (Recommended for cPanel & Edge)</span>
        <span>${tarSizeStr}</span>
      </a>
      <a href="${codeUrl}" download="cpanel_app_code.zip" class="btn-secondary">
        <span>⚡ Lightweight Code ZIP (Run 'npm install' in cPanel)</span>
        <span>${codeSizeStr}</span>
      </a>
    </div>

    <div class="instructions" style="border-left: 4px solid #38bdf8; margin-bottom: 16px;">
      <strong style="color: #38bdf8;">💡 Microsoft Edge / Chrome Download Tip:</strong><br/>
      If your browser shows <em>"Couldn't download - Something went wrong. Try again, or contact your organization"</em>:
      <ol style="margin-top: 6px;">
        <li>Open your browser Downloads (press <strong>Ctrl + J</strong>).</li>
        <li>Hover over <strong>cpanel_app_bundle.zip</strong>, click the three dots (<strong>...</strong>), and select <strong>Keep</strong> &rarr; <strong>Keep anyway</strong>.</li>
        <li><strong>Alternative:</strong> Click the <strong>Linux Standalone TAR.GZ</strong> button above — Linux tarballs bypass Windows/Edge .zip scanner restrictions and extract natively in cPanel File Manager!</li>
      </ol>
    </div>

    <div class="instructions">
      <strong>Zero-Friction cPanel Setup (Standalone 107 MB Bundle):</strong>
      <ol>
        <li>Upload <strong>cpanel_app_bundle.zip</strong> (or <strong>.tar.gz</strong>) directly to your cPanel application directory via cPanel <strong>File Manager</strong>.</li>
        <li>Right-click the uploaded file and click <strong>Extract</strong>.</li>
        <li>In cPanel <strong>Setup Node.js App</strong>, verify the application startup file is set to <strong>app.js</strong>.</li>
        <li>Click <strong>Restart</strong>. All database tables and schemas auto-initialize on first run.</li>
      </ol>
    </div>
  </div>
</body>
</html>`);
  }
);

// Download deployment bundle for cPanel
app.get(
  [
    '/cpanel_app_code.zip',
    '/app/cpanel_app_code.zip',
    '/cpanel_app_bundle.zip',
    '/app/cpanel_app_bundle.zip',
    '/cpanel_app_bundle.tar.gz',
    '/app/cpanel_app_bundle.tar.gz',
    '/download',
    '/download/bundle',
    '/api/download',
    '/api/download-code',
    '/api/download-cpanel-bundle',
    '/app/api/download-cpanel-bundle',
    '/download-code',
    '/download-cpanel-bundle',
    '/app/download-code',
    '/app/download-cpanel-bundle',
    '/download-zip',
    '/download-tar'
  ],
  (req: Request, res: Response) => {
    const isCode = req.path.includes('code');
    const isTar = req.path.includes('.tar.gz') || req.path.includes('tar');

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    let targetFilename = 'cpanel_app_bundle.zip';
    let candidates: string[] = [];

    if (isCode) {
      targetFilename = 'cpanel_app_code.zip';
      candidates = [
        path.resolve(process.cwd(), 'cpanel_app_code.zip'),
        path.resolve(process.cwd(), 'public/cpanel_app_code.zip'),
        path.resolve(process.cwd(), 'dist/cpanel_app_code.zip'),
        path.resolve(__dirname, 'public/cpanel_app_code.zip'),
        path.resolve(__dirname, 'dist/cpanel_app_code.zip'),
        path.resolve(__dirname, 'cpanel_app_code.zip'),
      ];
    } else if (isTar) {
      targetFilename = 'cpanel_app_bundle.tar.gz';
      candidates = [
        path.resolve(process.cwd(), 'cpanel_app_bundle.tar.gz'),
        path.resolve(process.cwd(), 'public/cpanel_app_bundle.tar.gz'),
        path.resolve(process.cwd(), 'dist/cpanel_app_bundle.tar.gz'),
        path.resolve(__dirname, 'public/cpanel_app_bundle.tar.gz'),
        path.resolve(__dirname, 'dist/cpanel_app_bundle.tar.gz'),
        path.resolve(__dirname, 'cpanel_app_bundle.tar.gz'),
      ];
    } else {
      targetFilename = 'cpanel_app_bundle.zip';
      candidates = [
        path.resolve(process.cwd(), 'cpanel_app_bundle.zip'),
        path.resolve(process.cwd(), 'public/cpanel_app_bundle.zip'),
        path.resolve(process.cwd(), 'dist/cpanel_app_bundle.zip'),
        path.resolve(__dirname, 'public/cpanel_app_bundle.zip'),
        path.resolve(__dirname, 'dist/cpanel_app_bundle.zip'),
        path.resolve(__dirname, 'cpanel_app_bundle.zip'),
      ];
    }

    let bestCandidate: string | null = null;
    let maxSizeBytes = 0;
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        try {
          const s = fs.statSync(p).size;
          if (s > maxSizeBytes) {
            maxSizeBytes = s;
            bestCandidate = p;
          }
        } catch {}
      }
    }

    if (bestCandidate) {
      return res.download(bestCandidate, targetFilename, (err) => {
        if (err && !res.headersSent) {
          console.warn(`[Download Notice] ${targetFilename} transfer interrupted:`, err.message);
        }
      });
    }

    res.status(404).send('Deployment bundle is generating. Please refresh in a moment.');
  }
);

// Standalone customer presentation deck (separate from React app & landing page)
app.get(
  ['/presentation', '/presentation.html', '/app/presentation', '/app/presentation.html'],
  (req: Request, res: Response) => {
    const candidates = [
      path.resolve(process.cwd(), 'public/presentation.html'),
      path.resolve(process.cwd(), 'dist/presentation.html'),
      path.resolve(__dirname, 'public/presentation.html'),
      path.resolve(__dirname, 'dist/presentation.html'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        if (req.query.download === '1' || req.query.download === 'true') {
          return res.download(candidate, 'B-SMART-Presentation.html');
        }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.sendFile(candidate);
      }
    }
    res.status(404).send('Presentation not found.');
  }
);

app.get(
  ['/presentation/download', '/B-SMART-Presentation.html', '/app/presentation/download', '/app/B-SMART-Presentation.html'],
  (_req: Request, res: Response) => {
    const candidates = [
      path.resolve(process.cwd(), 'public/B-SMART-Presentation.html'),
      path.resolve(process.cwd(), 'dist/B-SMART-Presentation.html'),
      path.resolve(__dirname, 'public/B-SMART-Presentation.html'),
      path.resolve(__dirname, 'dist/B-SMART-Presentation.html'),
      path.resolve(process.cwd(), 'public/presentation.html'),
      path.resolve(process.cwd(), 'dist/presentation.html'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return res.download(candidate, 'B-SMART-Presentation.html');
      }
    }
    res.status(404).send('Downloadable HTML presentation not found.');
  }
);

app.get(
  ['/presentation.pdf', '/B-SMART-Presentation.pdf', '/app/presentation.pdf', '/app/B-SMART-Presentation.pdf'],
  (req: Request, res: Response) => {
    const candidates = [
      path.resolve(process.cwd(), 'public/B-SMART-Presentation.pdf'),
      path.resolve(process.cwd(), 'dist/B-SMART-Presentation.pdf'),
      path.resolve(__dirname, 'public/B-SMART-Presentation.pdf'),
      path.resolve(__dirname, 'dist/B-SMART-Presentation.pdf'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        if (req.query.inline === '1' || req.query.inline === 'true') {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'inline; filename="B-SMART-Presentation.pdf"');
          return res.sendFile(candidate);
        }
        return res.download(candidate, 'B-SMART-Presentation.pdf');
      }
    }
    res.status(404).send('PDF presentation not found.');
  }
);

/* =========================================================================
   STATIC ASSETS & VITE INTEGRATION
   Handles both '/' and '/app' subpaths for cPanel Passenger deployments
   ========================================================================= */

const isProduction = process.env.NODE_ENV === 'production' || process.env.CPANEL === 'true';

const mountDistStaticWithPwa = (distDir: string) => {
  const pwaStaticOpts = {
    setHeaders: (res: Response, filePath: string) => {
      if (filePath.endsWith('sw.js') || filePath.endsWith('registerSW.js')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Service-Worker-Allowed', '/');
      } else if (filePath.endsWith('.webmanifest')) {
        res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  };

  app.get(['/manifest.webmanifest', '/app/manifest.webmanifest'], (_req: Request, res: Response, next) => {
    const distManifest = path.join(distDir, 'manifest.webmanifest');
    const pubManifest = path.resolve(__dirname, 'public', 'manifest.webmanifest');
    const target = fs.existsSync(distManifest) ? distManifest : fs.existsSync(pubManifest) ? pubManifest : null;
    if (!target) return next();
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(target);
  });

  app.get(['/sw.js', '/app/sw.js'], (_req: Request, res: Response, next) => {
    const swPath = path.join(distDir, 'sw.js');
    if (!fs.existsSync(swPath)) return next();
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Service-Worker-Allowed', '/');
    return res.sendFile(swPath);
  });

  app.use('/app', express.static(distDir, pwaStaticOpts));
  app.use(express.static(distDir, pwaStaticOpts));
  app.get(['/app', '/app/*', '/card/*', '*'], (_req: Request, res: Response) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
};

async function startServer() {
  if (!isProduction) {
    // Development mode with Vite middleware
    app.get(['/manifest.webmanifest', '/app/manifest.webmanifest'], (_req: Request, res: Response, next) => {
      const pubManifest = path.resolve(__dirname, 'public', 'manifest.webmanifest');
      if (!fs.existsSync(pubManifest)) return next();
      res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      return res.sendFile(pubManifest);
    });

    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: false,
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch {
      const distDir = path.resolve(__dirname, 'dist');
      if (fs.existsSync(distDir)) {
        mountDistStaticWithPwa(distDir);
      }
    }
  } else {
    // Production cPanel mode
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      mountDistStaticWithPwa(distDir);
    }
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (provider: ${dbProvider})`);

    // Automated background monitoring sweeps for follow-ups & scheduled weekly/monthly company reports
    setTimeout(() => {
      runFollowUpMonitoringSweep(emailMonitorCtx).catch((err) =>
        console.warn('[Monitor] Initial follow-up sweep notice:', err?.message)
      );
      runScheduledCompanyReportsSweep(emailMonitorCtx).catch((err) =>
        console.warn('[Reports] Initial scheduled report check notice:', err?.message)
      );
    }, 15000);

    setInterval(() => {
      runFollowUpMonitoringSweep(emailMonitorCtx).catch((err) =>
        console.warn('[Monitor] Follow-up sweep notice:', err?.message)
      );
    }, 15 * 60 * 1000);

    setInterval(() => {
      runScheduledCompanyReportsSweep(emailMonitorCtx).catch((err) =>
        console.warn('[Reports] Scheduled report sweep notice:', err?.message)
      );
    }, 60 * 60 * 1000);
  });
}

startServer();
