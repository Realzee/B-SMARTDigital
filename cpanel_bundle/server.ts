import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import pg from 'pg';
import { neon } from '@neondatabase/serverless';
import { INITIAL_CARDS, INITIAL_COMPANIES, INITIAL_USERS, INITIAL_LEADS } from './src/data/defaultCards';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
let memoryDeletedCompanyIds = new Set<string>();
let memoryDeletedCardIds = new Set<string>();

function persistLocalData() {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(
        {
          companies: memoryCompanies.filter((c) => !memoryDeletedCompanyIds.has(c.id)),
          users: memoryUsers,
          cards: memoryCards.filter((c) => !memoryDeletedCardIds.has(c.id)),
          leads: memoryLeads,
          deletedCompanyIds: Array.from(memoryDeletedCompanyIds),
          deletedCardIds: Array.from(memoryDeletedCardIds),
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
      if (Array.isArray(data.companies) && data.companies.length > 0) {
        memoryCompanies = data.companies.filter((c: any) => !memoryDeletedCompanyIds.has(c.id));
      }
      if (Array.isArray(data.users) && data.users.length > 0) memoryUsers = data.users;
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
      if (Array.isArray(data.leads) && data.leads.length > 0) memoryLeads = data.leads;
    }
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

    // Permanent deletion tombstones so deleted companies & cards NEVER resurrect
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
      memoryCompanies = dbCompanies.filter((c: any) => !memoryDeletedCompanyIds.has(c.id));
    }

    const dbCards = await sql`SELECT * FROM cards ORDER BY created_at ASC`;
    if (dbCards && dbCards.length > 0) {
      memoryCards = dbCards.filter((c: any) => !memoryDeletedCardIds.has(c.id));
    }

    const dbUsers = await sql`SELECT * FROM users ORDER BY created_at ASC`;
    if (dbUsers && dbUsers.length > 0) memoryUsers = dbUsers;

    const dbLeads = await sql`SELECT * FROM leads ORDER BY created_at DESC`;
    if (dbLeads && dbLeads.length > 0) memoryLeads = dbLeads;

    persistLocalData();
    console.log('[DB] cPanel PostgreSQL schema verified & memory cache synced successfully');
  } catch (err: any) {
    console.log('[DB] Schema notice:', err.message);
  }
}

initTables();

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
        comps = rows;
      }
    } catch {
      // Fallback
    }
  }

  if (comps.length === 0) {
    comps = memoryCompanies;
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

  for (const comp of itemsToSave) {
    if (!comp || !comp.id) continue;
    const idx = memoryCompanies.findIndex((c) => c.id === comp.id);
    if (idx >= 0) {
      memoryCompanies[idx] = { ...memoryCompanies[idx], ...comp };
    } else {
      memoryCompanies.push(comp);
    }

    if (pgPool) {
      try {
        await sql`
          INSERT INTO companies (id, name, tagline, category, category_label, logo_url, theme, about_text, operating_hours, website, phone, email, address, updated_at)
          VALUES (
            ${comp.id}, ${comp.name}, ${comp.tagline || ''}, ${comp.category || 'custom'},
            ${comp.categoryLabel || 'Custom'}, ${comp.logoUrl || ''}, ${JSON.stringify(comp.theme || {})},
            ${comp.aboutText || ''}, ${comp.operatingHours || ''}, ${comp.website || ''},
            ${comp.phone || ''}, ${comp.email || ''}, ${comp.address || ''}, NOW()
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
        cardList = rows;
      }
    } catch {
      // Fallback
    }
  }

  if (cardList.length === 0) {
    cardList = memoryCards;
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
        return res.json({ card: rows[0], source: 'database' });
      }
    } catch {
      // Fallback
    }
  }

  const memoryCard = memoryCards.find(
    (c) =>
      !memoryDeletedCardIds.has(c.id) &&
      (c.slug.toLowerCase() === decoded ||
        c.id === slugOrId ||
        c.slug.toLowerCase().replace(/[^a-z0-9]/g, '') === clean ||
        (clean === 'bsmart' && (c.slug === 'besmart' || c.slug === 'b-smart')) ||
        (clean === 'besmart' && (c.slug === 'besmart' || c.slug === 'b-smart')))
  );
  if (memoryCard) {
    return res.json({ card: memoryCard, source: 'resilient' });
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

  for (const card of cardsToSave) {
    if (!card || !card.id) continue;
    const idx = memoryCards.findIndex((c) => c.id === card.id);
    if (idx >= 0) {
      memoryCards[idx] = { ...memoryCards[idx], ...card };
    } else {
      memoryCards.push(card);
    }

    if (pgPool) {
      try {
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

  if (pgPool) {
    try {
      const rows = await sql`SELECT * FROM users ORDER BY created_at ASC`;
      if (rows && rows.length > 0) {
        return res.json({ users: rows, source: 'database' });
      }
    } catch {
      // Fallback
    }
  }

  res.json({ users: memoryUsers, source: 'resilient' });
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

  if (usersToSave.length === 0) {
    return res.json({ success: true, count: 0 });
  }

  for (const user of usersToSave) {
    if (!user || !user.id) continue;
    const idx = memoryUsers.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      memoryUsers[idx] = { ...memoryUsers[idx], ...user };
    } else {
      memoryUsers.push(user);
    }

    if (pgPool) {
      try {
        const cleanEmail = (user.email || `${user.id}@bsmart.internal`).toLowerCase().trim();
        await sql`
          INSERT INTO users (id, email, name, role, company_id, company_ids, password, assigned_card_id, status, phone, designation, avatar_url, bio, updated_at)
          VALUES (
            ${user.id}, ${cleanEmail}, ${user.name || 'Team Member'}, ${user.role || 'employee'},
            ${user.companyId || null}, ${JSON.stringify(user.companyIds || [])}, ${user.password || null}, ${user.assignedCardId || null},
            ${user.status || 'active'}, ${user.phone || ''}, ${user.designation || ''},
            ${user.avatarUrl || ''}, ${user.bio || ''}, NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            company_id = EXCLUDED.company_id,
            company_ids = EXCLUDED.company_ids,
            password = EXCLUDED.password,
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

  persistLocalData();
  res.json({ success: true, count: usersToSave.length });
});

app.delete('/api/users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  memoryUsers = memoryUsers.filter((u) => u.id !== id);
  persistLocalData();

  if (pgPool) {
    try {
      await sql`DELETE FROM users WHERE id = ${id}`;
    } catch {
      // Non-blocking
    }
  }

  res.json({ success: true });
});

// LEADS API
app.get('/api/leads', async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (pgPool) {
    try {
      const rows = await sql`SELECT * FROM leads ORDER BY created_at DESC`;
      if (rows && rows.length > 0) {
        return res.json({ leads: rows, source: 'database' });
      }
    } catch {
      // Fallback
    }
  }

  res.json({ leads: memoryLeads, source: 'resilient' });
});

app.post('/api/leads', async (req: Request, res: Response) => {
  const lead = req.body;
  if (!lead) return res.json({ success: true, lead });

  const id = lead.id || `lead-${Date.now()}`;
  const fullLead = { ...lead, id, createdAt: lead.createdAt || new Date().toISOString() };

  memoryLeads.unshift(fullLead);
  persistLocalData();

  if (pgPool) {
    try {
      await sql`
        INSERT INTO leads (id, card_id, card_name, name, email, phone, message, status)
        VALUES (
          ${id}, ${lead.cardId || 'card-general'}, ${lead.cardName || 'Smart Card'},
          ${lead.name}, ${lead.email || ''}, ${lead.phone || ''}, ${lead.message || ''},
          ${lead.status || 'new'}
        )
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status;
      `;
    } catch {
      // Non-blocking
    }
  }

  res.json({ success: true, lead: fullLead });
});

app.patch('/api/leads/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const lead = memoryLeads.find((l) => l.id === id);
  if (lead) {
    lead.status = status;
    persistLocalData();
  }

  if (pgPool) {
    try {
      await sql`UPDATE leads SET status = ${status} WHERE id = ${id}`;
    } catch {
      // Non-blocking
    }
  }

  res.json({ success: true });
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

// Download deployment bundle for cPanel
app.get(
  ['/download-code', '/download-cpanel-bundle', '/app/download-cpanel-bundle'],
  (_req: Request, res: Response) => {
    const zipPath = path.resolve(__dirname, 'cpanel_app_bundle.zip');
    const tarPath = path.resolve(__dirname, 'cpanel_app_bundle.tar.gz');
    if (fs.existsSync(zipPath)) {
      return res.download(zipPath, 'cpanel_app_bundle.zip');
    }
    if (fs.existsSync(tarPath)) {
      return res.download(tarPath, 'cpanel_app_bundle.tar.gz');
    }
    res.status(404).send('Deployment bundle is generating. Please try again in a few moments.');
  }
);

/* =========================================================================
   STATIC ASSETS & VITE INTEGRATION
   Handles both '/' and '/app' subpaths for cPanel Passenger deployments
   ========================================================================= */

const isProduction = process.env.NODE_ENV === 'production' || process.env.CPANEL === 'true';

async function startServer() {
  if (!isProduction) {
    // Development mode with Vite middleware
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
        app.use('/app', express.static(distDir));
        app.use(express.static(distDir));
        app.get(['/app', '/app/*', '/card/*', '*'], (_req: Request, res: Response) => {
          res.sendFile(path.join(distDir, 'index.html'));
        });
      }
    }
  } else {
    // Production cPanel mode
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use('/app', express.static(distDir));
      app.use(express.static(distDir));
      app.get(['/app', '/app/*', '/card/*', '*'], (_req: Request, res: Response) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (provider: ${dbProvider})`);
  });
}

startServer();
