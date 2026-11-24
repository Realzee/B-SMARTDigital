// server.ts
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
import pg from "pg";
import { neon } from "@neondatabase/serverless";

// src/data/defaultCards.ts
var INITIAL_COMPANIES = [
  {
    id: "comp-besmart",
    name: "b-Smart",
    tagline: "Official Digital Smart Business Communicator Platform \xB7 https://b-smart-online.co.za/app",
    category: "professional",
    categoryLabel: "Smart Digital Cards & Business Communicator",
    logoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80",
    aboutText: "b-Smart is the premier digital smart business card platform providing instant card sharing, corporate team member directory management, and real-time lead capture.",
    operatingHours: "Mon - Fri: 08:00 - 18:00 (24/7 Digital Card Sharing)",
    website: "https://b-smart-online.co.za/app",
    phone: "+27502004058",
    email: "clint@brandedbydigital.co.za",
    address: "By Appointment",
    theme: {
      primaryColor: "#0284c7",
      secondaryColor: "#f59e0b",
      bgType: "image",
      bgImageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
      headerImageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
      darkOverlayOpacity: 75,
      glassmorphism: true
    },
    createdAt: "2026-09-25T08:00:00Z"
  }
];
var INITIAL_USERS = [
  {
    id: "user-zweli-admin",
    email: "zweli@msn.com",
    name: "Zweli Hector Vimbelela",
    role: "admin",
    companyId: "comp-besmart",
    companyIds: ["comp-besmart"],
    password: "password123",
    phone: "+27 83 491 5468",
    designation: "Co-Founder & Managing Director",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
    bio: "Co-Founder & Managing Director overseeing b-Smart digital card platform, enterprise business automation, and cloud integrations.",
    assignedCardId: "card-zweli-besmart",
    status: "active",
    createdAt: "2026-09-25T08:00:00Z"
  },
  {
    id: "user-zweli-gmail",
    email: "mzwelisto@gmail.com",
    name: "Zweli Hector Vimbelela",
    role: "admin",
    companyId: "comp-besmart",
    companyIds: ["comp-besmart"],
    password: "password123",
    phone: "+27 83 491 5468",
    designation: "Co-Founder & Managing Director",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
    bio: "Co-Founder & Managing Director overseeing b-Smart digital card platform, enterprise business automation, and cloud integrations.",
    assignedCardId: "card-zweli-besmart",
    status: "active",
    createdAt: "2026-09-25T08:00:00Z"
  },
  {
    id: "user-clint-admin",
    email: "clint@brandedbydigital.co.za",
    name: "Clinton Proctor",
    role: "admin",
    companyId: "comp-besmart",
    companyIds: ["comp-besmart"],
    password: "password123",
    phone: "+27 82 911 9999",
    designation: "Co-Founder & Executive Director",
    avatarUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80",
    bio: "Co-Founder & Executive Director driving b-Smart brand partnerships, digital communicator technology, and corporate enterprise rollouts.",
    assignedCardId: "card-clint-besmart",
    status: "active",
    createdAt: "2026-09-25T08:00:00Z"
  }
];
var INITIAL_CARDS = [
  {
    id: "card-besmart-master",
    companyId: "comp-besmart",
    slug: "besmart",
    businessName: "b-Smart",
    tagline: "Official Digital Smart Business Communicator Platform \xB7 https://b-smart-online.co.za/app",
    businessType: "professional",
    businessTypeLabel: "Smart Digital Cards & Business Communicator",
    contactPersonName: "",
    designation: "",
    logoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80",
    aboutText: "b-Smart is the premier digital smart business card platform providing instant card sharing, corporate team member directory management, and real-time lead capture.",
    operatingHours: "Mon - Fri: 08:00 - 18:00 (24/7 Digital Card Sharing)",
    theme: {
      primaryColor: "#0284c7",
      secondaryColor: "#f59e0b",
      bgType: "image",
      bgImageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
      headerImageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
      darkOverlayOpacity: 75,
      glassmorphism: true
    },
    banners: [
      {
        id: "b-bsm-1",
        title: "Smart Digital Communicator Cards",
        subtitle: "Share your official digital business profile via NFC, QR code, or direct link",
        imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
        badgeText: "b-Smart Platform"
      },
      {
        id: "b-bsm-2",
        title: "Corporate Multi-Team Management",
        subtitle: "Issue branded digital smart cards to every team member in seconds",
        imageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
        badgeText: "Enterprise Solution"
      }
    ],
    services: [
      {
        id: "srv-bsm-1",
        title: "Corporate Digital Card Issuance",
        description: "Empower your company workforce with interactive digital business cards.",
        price: "Per License"
      },
      {
        id: "srv-bsm-2",
        title: "Custom Brand & Theme Integration",
        description: "Apply your corporate brand guidelines, colors, banners, and links across all team member cards.",
        price: "Included"
      }
    ],
    galleryImages: [
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80"
    ],
    socialLinks: {
      phone: "+27502004058",
      whatsapp: "+27502004058",
      email: "clint@brandedbydigital.co.za",
      website: "https://b-smart-online.co.za/app",
      address: "By Appointment"
    },
    status: "live",
    viewsCount: 0,
    sharesCount: 0,
    callClicksCount: 0,
    whatsappClicksCount: 0,
    vcardDownloadsCount: 0,
    createdAt: "2026-09-25T08:00:00Z",
    updatedAt: "2026-09-25T08:00:00Z"
  },
  {
    id: "card-zweli-besmart",
    companyId: "comp-besmart",
    slug: "besmart-zweli-vimbelela",
    businessName: "b-Smart",
    tagline: "Official Digital Smart Business Communicator Platform",
    businessType: "professional",
    businessTypeLabel: "Smart Digital Cards & Business Communicator",
    contactPersonName: "Zweli Hector Vimbelela",
    designation: "Co-Founder & Managing Director",
    logoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
    aboutText: "Co-Founder & Managing Director overseeing b-Smart digital card platform, enterprise business automation, and cloud integrations.",
    operatingHours: "Mon - Fri: 08:00 - 18:00 (24/7 Digital Card Sharing)",
    theme: {
      primaryColor: "#0284c7",
      secondaryColor: "#f59e0b",
      bgType: "image",
      bgImageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
      headerImageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
      darkOverlayOpacity: 75,
      glassmorphism: true
    },
    banners: [
      {
        id: "b-zw-1",
        title: "Executive Digital Card - Zweli Hector Vimbelela",
        subtitle: "Co-Founder & Managing Director at b-Smart",
        imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
        badgeText: "Executive Director"
      }
    ],
    services: [
      {
        id: "srv-zw-1",
        title: "Enterprise Digital Transformation",
        description: "Consulting on corporate smart card rollouts and enterprise workflow digitisation."
      }
    ],
    galleryImages: [
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80"
    ],
    socialLinks: {
      phone: "+27 83 491 5468",
      whatsapp: "+27 63 169 4359",
      email: "zweli@msn.com",
      website: "https://b-smart-online.co.za/app",
      address: "Sandton City Office Towers, Sandton, Gauteng"
    },
    status: "live",
    assignedMemberId: "user-zweli-admin",
    viewsCount: 0,
    sharesCount: 0,
    callClicksCount: 0,
    whatsappClicksCount: 0,
    vcardDownloadsCount: 0,
    createdAt: "2026-09-25T08:00:00Z",
    updatedAt: "2026-09-25T08:00:00Z"
  },
  {
    id: "card-clint-besmart",
    companyId: "comp-besmart",
    slug: "besmart-clinton-proctor",
    businessName: "b-Smart",
    tagline: "Official Digital Smart Business Communicator Platform",
    businessType: "professional",
    businessTypeLabel: "Smart Digital Cards & Business Communicator",
    contactPersonName: "Clinton Proctor",
    designation: "Co-Founder & Executive Director",
    logoUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80",
    aboutText: "Co-Founder & Executive Director driving b-Smart brand partnerships, digital communicator technology, and corporate enterprise rollouts.",
    operatingHours: "Mon - Fri: 08:00 - 18:00 (24/7 Digital Card Sharing)",
    theme: {
      primaryColor: "#0284c7",
      secondaryColor: "#f59e0b",
      bgType: "image",
      bgImageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
      headerImageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
      darkOverlayOpacity: 75,
      glassmorphism: true
    },
    banners: [
      {
        id: "b-cl-1",
        title: "Executive Digital Card - Clinton Proctor",
        subtitle: "Co-Founder & Executive Director at b-Smart",
        imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
        badgeText: "Executive Director"
      }
    ],
    services: [
      {
        id: "srv-cl-1",
        title: "Corporate Partnerships & Licensing",
        description: "Bespoke enterprise digital card solutions for South African companies and organizations."
      }
    ],
    galleryImages: [
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80"
    ],
    socialLinks: {
      phone: "+27 82 911 9999",
      whatsapp: "+27 82 911 9999",
      email: "clint@brandedbydigital.co.za",
      website: "https://b-smart-online.co.za/app",
      address: "Sandton City Office Towers, Sandton, Gauteng"
    },
    status: "live",
    assignedMemberId: "user-clint-admin",
    viewsCount: 0,
    sharesCount: 0,
    callClicksCount: 0,
    whatsappClicksCount: 0,
    vcardDownloadsCount: 0,
    createdAt: "2026-09-25T08:00:00Z",
    updatedAt: "2026-09-25T08:00:00Z"
  }
];
var INITIAL_LEADS = [];

// server.ts
dotenv.config();
var { Pool } = pg;
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = process.env.PORT || 3e3;
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
var DATA_DIR = path.resolve(__dirname, "data");
var DATA_FILE = path.join(DATA_DIR, "local_db.json");
var UPLOADS_DIR = path.resolve(__dirname, "uploads");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use("/uploads", express.static(UPLOADS_DIR));
app.use("/app/uploads", express.static(UPLOADS_DIR));
app.get(["/app/uploads/:filename", "/uploads/:filename"], async (req, res, next) => {
  const { filename } = req.params;
  const filePath = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  if (pgPool) {
    try {
      const rows = await sql`SELECT * FROM uploads WHERE filename = ${filename} OR id = ${filename} LIMIT 1`;
      if (rows && rows[0] && rows[0].data_base64) {
        const buffer = Buffer.from(rows[0].data_base64, "base64");
        try {
          fs.writeFileSync(filePath, buffer);
        } catch {
        }
        res.setHeader("Content-Type", rows[0].mime_type || "image/jpeg");
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        return res.send(buffer);
      }
    } catch {
    }
  }
  next();
});
app.use((req, _res, next) => {
  if (req.url.startsWith("/app/api")) {
    req.url = req.url.substring(4);
  }
  next();
});
var memoryCompanies = [...INITIAL_COMPANIES];
var memoryUsers = [...INITIAL_USERS];
var memoryCards = [...INITIAL_CARDS];
var memoryLeads = [...INITIAL_LEADS];
var memoryDeletedCompanyIds = /* @__PURE__ */ new Set();
var memoryDeletedCardIds = /* @__PURE__ */ new Set();
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
          deletedCardIds: Array.from(memoryDeletedCardIds)
        },
        null,
        2
      )
    );
  } catch {
  }
}
function restoreLocalData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      if (Array.isArray(data.deletedCompanyIds)) {
        memoryDeletedCompanyIds = new Set(data.deletedCompanyIds);
      }
      if (Array.isArray(data.deletedCardIds)) {
        memoryDeletedCardIds = new Set(data.deletedCardIds);
      }
      if (Array.isArray(data.companies) && data.companies.length > 0) {
        memoryCompanies = data.companies.filter((c) => !memoryDeletedCompanyIds.has(c.id));
      }
      if (Array.isArray(data.users) && data.users.length > 0) memoryUsers = data.users;
      if (Array.isArray(data.cards) && data.cards.length > 0) {
        memoryCards = data.cards.filter((c) => !memoryDeletedCardIds.has(c.id)).map((c) => ({
          ...c,
          viewsCount: c.viewsCount === 3400 || c.viewsCount === 1890 || c.viewsCount === 1420 ? 0 : c.viewsCount || 0,
          sharesCount: c.sharesCount === 290 || c.sharesCount === 160 || c.sharesCount === 115 ? 0 : c.sharesCount || 0,
          callClicksCount: c.callClicksCount === 310 || c.callClicksCount === 220 || c.callClicksCount === 165 ? 0 : c.callClicksCount || 0,
          whatsappClicksCount: c.whatsappClicksCount === 420 || c.whatsappClicksCount === 290 || c.whatsappClicksCount === 210 ? 0 : c.whatsappClicksCount || 0,
          vcardDownloadsCount: c.vcardDownloadsCount === 260 || c.vcardDownloadsCount === 195 || c.vcardDownloadsCount === 140 ? 0 : c.vcardDownloadsCount || 0
        }));
      }
      if (Array.isArray(data.leads) && data.leads.length > 0) memoryLeads = data.leads;
    }
  } catch {
  }
}
restoreLocalData();
var DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL || "";
var pgPool = null;
var neonSql = null;
var dbProvider = "local_resilient";
if (DATABASE_URL) {
  if (DATABASE_URL.includes("neon.tech")) {
    if (!DATABASE_URL.includes("patient-snow-11357681")) {
      try {
        neonSql = neon(DATABASE_URL);
        dbProvider = "neon_serverless";
        console.log("[DB] Configured Neon Serverless endpoint");
      } catch {
        neonSql = null;
      }
    } else {
      console.log("[DB] Remote Neon quota reached. Resilient local storage is active.");
    }
  } else {
    try {
      const isLocal = DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1") || DATABASE_URL.includes("::1");
      pgPool = new Pool({
        connectionString: DATABASE_URL,
        ssl: isLocal ? false : { rejectUnauthorized: false },
        connectionTimeoutMillis: 5e3,
        idleTimeoutMillis: 3e4,
        max: 10
      });
      pgPool.on("error", (err) => {
        console.log("[DB Pool notice]", err.message);
      });
      dbProvider = isLocal ? "cpanel_postgres_local" : "postgres_pool";
      console.log(`[DB] Configured PostgreSQL pool (${isLocal ? "cPanel localhost" : "remote"})`);
    } catch {
      pgPool = null;
    }
  }
}
async function sql(strings, ...values) {
  if (pgPool) {
    try {
      let queryText = "";
      const params = [];
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
    } catch (err) {
      const msg = String(err?.message || "");
      if (msg.includes("402") || msg.includes("quota") || msg.includes("exceeded")) {
        neonSql = null;
        dbProvider = "local_resilient";
      }
      return [];
    }
  }
  return [];
}
var isDbConfigured = () => !!(pgPool || neonSql);
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
          if (r.entity_type === "company") memoryDeletedCompanyIds.add(r.id);
          if (r.entity_type === "card") memoryDeletedCardIds.add(r.id);
        }
      }
    } catch {
    }
    const compCount = await sql`SELECT COUNT(*) as count FROM companies`;
    if (compCount && Number(compCount[0]?.count) === 0) {
      for (const comp of memoryCompanies) {
        if (memoryDeletedCompanyIds.has(comp.id)) continue;
        await sql`
          INSERT INTO companies (id, name, tagline, category, category_label, logo_url, theme, about_text, operating_hours, website, phone, email, address)
          VALUES (
            ${comp.id}, ${comp.name}, ${comp.tagline || ""}, ${comp.category || "custom"},
            ${comp.categoryLabel || "Custom"}, ${comp.logoUrl || ""}, ${JSON.stringify(comp.theme || {})},
            ${comp.aboutText || ""}, ${comp.operatingHours || ""}, ${comp.website || ""},
            ${comp.phone || ""}, ${comp.email || ""}, ${comp.address || ""}
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
            ${card.id}, ${card.companyId || null}, ${card.socialLinks?.email || ""}, ${card.slug},
            ${card.businessName}, ${card.tagline || ""}, ${card.businessType || "custom"}, ${card.businessTypeLabel || "Custom"},
            ${card.contactPersonName || ""}, ${card.designation || ""}, ${card.logoUrl || ""},
            ${card.theme?.primaryColor || "#0284c7"}, ${JSON.stringify(card.theme || {})}, ${JSON.stringify(card.banners || [])},
            ${JSON.stringify([])}, ${JSON.stringify([])},
            ${card.socialLinks?.phone || ""}, ${card.socialLinks?.whatsapp || ""}, ${card.socialLinks?.email || ""},
            ${card.socialLinks?.address || ""}, ${card.socialLinks?.website || ""},
            ${card.emergencyPhone || ""}, ${card.emergencyPhone || ""}, ${JSON.stringify(card.socialLinks || {})},
            ${card.aboutText || ""}, ${JSON.stringify(card.services || [])}, ${JSON.stringify(card.galleryImages || [])}, ${card.operatingHours || ""},
            ${card.status || "live"}, ${card.assignedMemberId || null}
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
            ${user.id}, ${cleanEmail}, ${user.name || "Team Member"}, ${user.role || "employee"},
            ${user.companyId || null}, ${JSON.stringify(user.companyIds || [])}, ${user.password || null}, ${user.assignedCardId || null},
            ${user.status || "active"}, ${user.phone || ""}, ${user.designation || ""},
            ${user.avatarUrl || ""}, ${user.bio || ""}
          ) ON CONFLICT (id) DO NOTHING;
        `;
      }
    }
    const dbCompanies = await sql`SELECT * FROM companies ORDER BY name ASC`;
    if (dbCompanies && dbCompanies.length > 0) {
      memoryCompanies = dbCompanies.filter((c) => !memoryDeletedCompanyIds.has(c.id));
    }
    const dbCards = await sql`SELECT * FROM cards ORDER BY created_at ASC`;
    if (dbCards && dbCards.length > 0) {
      memoryCards = dbCards.filter((c) => !memoryDeletedCardIds.has(c.id));
    }
    const dbUsers = await sql`SELECT * FROM users ORDER BY created_at ASC`;
    if (dbUsers && dbUsers.length > 0) memoryUsers = dbUsers;
    const dbLeads = await sql`SELECT * FROM leads ORDER BY created_at DESC`;
    if (dbLeads && dbLeads.length > 0) memoryLeads = dbLeads;
    persistLocalData();
    console.log("[DB] cPanel PostgreSQL schema verified & memory cache synced successfully");
  } catch (err) {
    console.log("[DB] Schema notice:", err.message);
  }
}
initTables();
app.get("/api/health", async (_req, res) => {
  let dbStatus = "disconnected";
  let companyCount = memoryCompanies.length;
  let cardCount = memoryCards.length;
  let userCount = memoryUsers.length;
  let leadCount = memoryLeads.length;
  if (pgPool) {
    try {
      const rows = await sql`SELECT COUNT(*) as c FROM companies`;
      if (rows && rows[0]) {
        dbStatus = "connected_cpanel_postgres";
        companyCount = parseInt(rows[0].c, 10) || companyCount;
      }
    } catch {
      dbStatus = "postgres_connection_pending";
    }
  } else if (neonSql) {
    dbStatus = "connected_neon";
  }
  res.json({
    status: "ok",
    appName: "B-Smart Mobile Communicator",
    appUrl: "https://b-smart-online.co.za/app",
    database: {
      provider: dbProvider,
      configured: isDbConfigured(),
      status: dbStatus,
      counts: {
        companies: companyCount,
        cards: cardCount,
        users: userCount,
        leads: leadCount
      }
    },
    cpanel: {
      url: "/app",
      uploadsEnabled: true,
      bundleReady: fs.existsSync(path.resolve(__dirname, "cpanel_app_bundle.zip"))
    },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.post("/api/upload", async (req, res) => {
  try {
    const { image, filename: clientFilename, type } = req.body;
    if (!image || typeof image !== "string") {
      return res.status(400).json({ error: "No image data provided" });
    }
    let ext = "jpg";
    let base64Data = image;
    if (image.startsWith("data:image/")) {
      const mimeMatch = image.match(/^data:image\/([a-zA-Z0-9\+\-]+);base64,/);
      if (mimeMatch) {
        const rawExt = mimeMatch[1].toLowerCase();
        ext = rawExt === "jpeg" ? "jpg" : rawExt === "svg+xml" ? "svg" : rawExt === "png" ? "png" : "jpg";
        base64Data = image.replace(/^data:image\/[a-zA-Z0-9\+\-]+;base64,/, "");
      }
    }
    const prefix = type ? `${type}_` : "img_";
    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 8);
    const safeName = clientFilename && clientFilename.endsWith(`.${ext}`) ? `${timestamp}_${clientFilename.replace(/[^a-zA-Z0-9_\-\.]/g, "")}` : `${prefix}${timestamp}_${randomHex}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, safeName);
    const buffer = Buffer.from(base64Data, "base64");
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
      } catch (dbErr) {
        console.warn("[DB] Image upload postgres cache notice:", dbErr?.message);
      }
    }
    return res.json({
      success: true,
      filename: safeName,
      url: publicUrl,
      rootUrl,
      sizeBytes: buffer.length,
      savedOnCPanel: true
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to save image on cPanel", details: err?.message });
  }
});
function parseJsonSafe(val, fallback) {
  if (val === null || val === void 0) return fallback;
  if (typeof val === "object") return val;
  if (typeof val === "string") {
    try {
      const p = JSON.parse(val);
      if (typeof p === "string") {
        try {
          return JSON.parse(p);
        } catch {
          return p;
        }
      }
      return p;
    } catch {
      return fallback;
    }
  }
  return fallback;
}
function mapDbRowToCard(row) {
  if (!row) return null;
  const parsedTheme = parseJsonSafe(row.theme, null);
  const defaultTheme = {
    primaryColor: row.accent || row.primaryColor || "#f59e0b",
    bgType: "image",
    bgImageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
    darkOverlayOpacity: 40,
    glassmorphism: true
  };
  const finalTheme = parsedTheme ? {
    ...defaultTheme,
    ...parsedTheme,
    primaryColor: parsedTheme.primaryColor || row.accent || defaultTheme.primaryColor,
    bgImageUrl: parsedTheme.bgImageUrl || row.bg_image_url || row.bgImageUrl || void 0,
    darkOverlayOpacity: parsedTheme.darkOverlayOpacity ?? 40
  } : defaultTheme;
  return {
    id: row.id,
    companyId: row.company_id || row.companyId || void 0,
    slug: row.slug,
    businessName: row.business_name || row.businessName || row.name || "Business Card",
    tagline: row.tagline || row.role || "",
    businessType: row.business_type || row.businessType || "custom",
    businessTypeLabel: row.business_type_label || row.businessTypeLabel || "Custom",
    contactPersonName: row.contact_person_name || row.contactPersonName || "",
    designation: row.designation || "",
    logoUrl: row.logo_url || row.logoUrl || "",
    emergencyPhone: row.emergency_phone || row.emergencyPhone || row.panic_phone || void 0,
    banners: parseJsonSafe(row.banners, []),
    theme: finalTheme,
    socialLinks: parseJsonSafe(row.social_links || row.socialLinks, {
      phone: row.phone || "",
      whatsapp: row.whatsapp || "",
      email: row.email || "",
      website: row.website || "",
      address: row.address || ""
    }),
    aboutText: row.about_text || row.aboutText || "",
    services: parseJsonSafe(row.services, []),
    galleryImages: parseJsonSafe(row.gallery_images || row.galleryImages, []),
    operatingHours: row.operating_hours || row.operatingHours || "",
    status: row.status || "live",
    assignedMemberId: row.assigned_member_id || row.assignedMemberId || void 0,
    viewsCount: row.views_count ?? row.viewsCount ?? 0,
    sharesCount: row.shares_count ?? row.sharesCount ?? 0,
    callClicksCount: row.call_clicks_count ?? row.callClicksCount ?? 0,
    whatsappClicksCount: row.whatsapp_clicks_count ?? row.whatsappClicksCount ?? 0,
    vcardDownloadsCount: row.vcard_downloads_count ?? row.vcardDownloadsCount ?? 0,
    createdAt: row.created_at || row.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: row.updated_at || row.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}
function mapDbRowToCompany(row) {
  if (!row) return null;
  const parsedTheme = parseJsonSafe(row.theme, null);
  const defaultTheme = {
    primaryColor: "#f59e0b",
    secondaryColor: "#1e3a8a",
    bgType: "image",
    bgImageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
    headerImageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
    glassmorphism: true,
    darkOverlayOpacity: 40
  };
  const finalTheme = parsedTheme ? {
    ...defaultTheme,
    ...parsedTheme,
    bgImageUrl: parsedTheme.bgImageUrl || row.bg_image_url || row.bgImageUrl || defaultTheme.bgImageUrl,
    darkOverlayOpacity: parsedTheme.darkOverlayOpacity ?? 40
  } : defaultTheme;
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline || "",
    category: row.category || "custom",
    categoryLabel: row.category_label || row.categoryLabel || "Business",
    logoUrl: row.logo_url || row.logoUrl || "",
    theme: finalTheme,
    aboutText: row.about_text || row.aboutText || "",
    operatingHours: row.operating_hours || row.operatingHours || "",
    website: row.website || "",
    phone: row.phone || "",
    email: row.email || "",
    address: row.address || "",
    createdAt: row.created_at || row.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: row.updated_at || row.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}
function mapDbRowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role || "employee",
    companyId: row.company_id || row.companyId || void 0,
    assignedCardId: row.assigned_card_id || row.assignedCardId || void 0,
    status: row.status || "active",
    phone: row.phone || void 0,
    designation: row.designation || void 0,
    avatarUrl: row.avatar_url || row.avatarUrl || void 0,
    bio: row.bio || void 0,
    createdAt: row.created_at || row.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: row.updated_at || row.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}
app.get("/api/companies", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  let comps = [];
  if (pgPool) {
    try {
      const rows = await sql`SELECT * FROM companies ORDER BY name ASC`;
      if (rows && rows.length > 0) {
        comps = rows.map(mapDbRowToCompany);
      }
    } catch {
    }
  }
  if (comps.length === 0) {
    comps = memoryCompanies.map(mapDbRowToCompany);
  }
  const activeCompanies = comps.filter((c) => c && c.id && !memoryDeletedCompanyIds.has(c.id));
  res.json({
    companies: activeCompanies,
    deletedCompanyIds: Array.from(memoryDeletedCompanyIds),
    source: pgPool ? "database" : "resilient"
  });
});
app.post("/api/companies", async (req, res) => {
  const body = req.body;
  let itemsToSave = [];
  if (Array.isArray(body)) {
    itemsToSave = body;
  } else if (body && Array.isArray(body.companies)) {
    itemsToSave = body.companies;
  } else if (body && body.id) {
    itemsToSave = [body];
  }
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
            ${comp.id}, ${comp.name}, ${comp.tagline || ""}, ${comp.category || "custom"},
            ${comp.categoryLabel || "Custom"}, ${comp.logoUrl || ""}, ${JSON.stringify(comp.theme || {})},
            ${comp.aboutText || ""}, ${comp.operatingHours || ""}, ${comp.website || ""},
            ${comp.phone || ""}, ${comp.email || ""}, ${comp.address || ""}, NOW()
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
      } catch (e) {
        console.warn("[DB] Company postgres save notice:", e?.message);
      }
    }
  }
  persistLocalData();
  res.json({ success: true, count: itemsToSave.length });
});
app.delete("/api/companies/:id", async (req, res) => {
  const { id } = req.params;
  memoryDeletedCompanyIds.add(id);
  memoryCompanies = memoryCompanies.filter((c) => c.id !== id);
  const linkedCards = memoryCards.filter((c) => c.companyId === id);
  for (const card of linkedCards) {
    memoryDeletedCardIds.add(card.id);
  }
  memoryCards = memoryCards.filter((c) => c.companyId !== id);
  memoryUsers = memoryUsers.map((u) => {
    if (u.companyId === id || u.companyIds && u.companyIds.includes(id)) {
      const newCompanyIds = (u.companyIds || []).filter((cid) => cid !== id);
      return {
        ...u,
        companyId: u.companyId === id ? void 0 : u.companyId,
        companyIds: newCompanyIds
      };
    }
    return u;
  });
  persistLocalData();
  if (pgPool) {
    try {
      await sql`UPDATE cards SET company_id = NULL WHERE company_id = ${id}`;
      await sql`DELETE FROM cards WHERE company_id = ${id}`;
      await sql`UPDATE users SET company_id = NULL WHERE company_id = ${id}`;
      await sql`DELETE FROM companies WHERE id = ${id}`;
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
    } catch (err) {
      console.warn("[DB] Company delete postgres notice:", err?.message);
    }
  }
  res.json({ success: true, deletedId: id });
});
app.get("/api/cards", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  let cardList = [];
  if (pgPool) {
    try {
      const rows = await sql`SELECT * FROM cards ORDER BY created_at ASC`;
      if (rows && rows.length > 0) {
        cardList = rows.map(mapDbRowToCard);
      }
    } catch {
    }
  }
  if (cardList.length === 0) {
    cardList = memoryCards.map(mapDbRowToCard);
  }
  const activeCards = cardList.filter((c) => c && c.id && !memoryDeletedCardIds.has(c.id));
  res.json({
    cards: activeCards,
    deletedCardIds: Array.from(memoryDeletedCardIds),
    source: pgPool ? "database" : "resilient"
  });
});
app.get("/api/cards/:slugOrId", async (req, res) => {
  const { slugOrId } = req.params;
  const decoded = decodeURIComponent(slugOrId).toLowerCase().trim();
  const clean = decoded.replace(/[^a-z0-9]/g, "");
  let rawCard = null;
  if (pgPool) {
    try {
      const rows = await sql`
        SELECT * FROM cards 
        WHERE LOWER(slug) = ${decoded} 
           OR id = ${slugOrId} 
           OR REPLACE(LOWER(slug), '-', '') = ${clean}
           OR LOWER(slug) = ${decoded.replace("b-smart", "besmart")}
           OR LOWER(slug) = ${decoded.replace("besmart", "b-smart")}
        LIMIT 1
      `;
      if (rows && rows[0] && !memoryDeletedCardIds.has(rows[0].id)) {
        rawCard = rows[0];
      }
    } catch {
    }
  }
  if (!rawCard) {
    rawCard = memoryCards.find(
      (c) => !memoryDeletedCardIds.has(c.id) && (c.slug.toLowerCase() === decoded || c.id === slugOrId || c.slug.toLowerCase().replace(/[^a-z0-9]/g, "") === clean || clean === "bsmart" && (c.slug === "besmart" || c.slug === "b-smart") || clean === "besmart" && (c.slug === "besmart" || c.slug === "b-smart"))
    );
  }
  if (rawCard) {
    const card = mapDbRowToCard(rawCard);
    const companyId = card.companyId;
    let company = null;
    let companyTemplate = null;
    let member = null;
    if (card.assignedMemberId) {
      if (pgPool) {
        try {
          const userRows = await sql`SELECT * FROM users WHERE id = ${card.assignedMemberId} LIMIT 1`;
          if (userRows && userRows[0]) member = mapDbRowToUser(userRows[0]);
        } catch {
        }
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
        }
      }
      if (!company) {
        const memComp = memoryCompanies.find((c) => c.id === companyId);
        if (memComp) company = mapDbRowToCompany(memComp);
      }
      if (!companyTemplate) {
        const memTmpl = memoryCards.find((c) => (c.companyId === companyId || c.company_id === companyId) && !c.assignedMemberId && !c.assigned_member_id);
        if (memTmpl) companyTemplate = mapDbRowToCard(memTmpl);
      }
    }
    const isExplicitlyNoBg = card.theme?.bgType === "none" || card.theme?.bgType === "color" || card.theme?.bgImageUrl === "" || card.theme?.bgImageUrl === "none";
    if (!isExplicitlyNoBg && (!card.theme || !card.theme.bgImageUrl) && company?.theme?.bgImageUrl) {
      if (!card.theme) card.theme = { primaryColor: "#2563eb" };
      card.theme.bgImageUrl = company.theme.bgImageUrl;
    }
    return res.json({
      card,
      company,
      companyTemplate,
      member,
      source: pgPool ? "database" : "resilient"
    });
  }
  res.status(404).json({ error: "Card not found" });
});
app.post("/api/cards", async (req, res) => {
  const body = req.body;
  let cardsToSave = [];
  if (Array.isArray(body)) {
    cardsToSave = body;
  } else if (body && Array.isArray(body.cards)) {
    cardsToSave = body.cards;
  } else if (body && body.id) {
    cardsToSave = [body];
  }
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
            ${card.id}, ${card.companyId || null}, ${card.socialLinks?.email || ""}, ${card.slug},
            ${card.businessName}, ${card.tagline || ""}, ${card.businessType || "custom"}, ${card.businessTypeLabel || "Custom"},
            ${card.contactPersonName || ""}, ${card.designation || ""}, ${card.logoUrl || ""},
            ${card.theme?.primaryColor || "#0284c7"}, ${JSON.stringify(card.theme || {})}, ${JSON.stringify(card.banners || [])},
            ${JSON.stringify([])}, ${JSON.stringify([])},
            ${card.socialLinks?.phone || ""}, ${card.socialLinks?.whatsapp || ""}, ${card.socialLinks?.email || ""},
            ${card.socialLinks?.address || ""}, ${card.socialLinks?.website || ""},
            ${card.emergencyPhone || ""}, ${card.emergencyPhone || ""}, ${JSON.stringify(card.socialLinks || {})},
            ${card.aboutText || ""}, ${JSON.stringify(card.services || [])}, ${JSON.stringify(card.galleryImages || [])}, ${card.operatingHours || ""},
            ${card.status || "live"}, ${card.assignedMemberId || null},
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
      } catch (e) {
        console.warn("[DB] Card postgres save notice:", e?.message);
      }
    }
  }
  persistLocalData();
  res.json({ success: true, count: cardsToSave.length });
});
app.delete("/api/cards/:id", async (req, res) => {
  const { id } = req.params;
  memoryDeletedCardIds.add(id);
  memoryCards = memoryCards.filter((c) => c.id !== id);
  memoryUsers = memoryUsers.map((u) => u.assignedCardId === id ? { ...u, assignedCardId: void 0 } : u);
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
    } catch (err) {
      console.warn("[DB] Card delete notice:", err?.message);
    }
  }
  res.json({ success: true, deletedId: id });
});
app.post("/api/cards/:id/metric", async (req, res) => {
  const { id } = req.params;
  const { type } = req.body;
  const card = memoryCards.find((c) => c.id === id);
  if (card) {
    if (type === "view") card.viewsCount = (card.viewsCount || 0) + 1;
    else if (type === "share") card.sharesCount = (card.sharesCount || 0) + 1;
    else if (type === "call") card.callClicksCount = (card.callClicksCount || 0) + 1;
    else if (type === "whatsapp") card.whatsappClicksCount = (card.whatsappClicksCount || 0) + 1;
    else if (type === "vcard") card.vcardDownloadsCount = (card.vcardDownloadsCount || 0) + 1;
    persistLocalData();
  }
  if (pgPool) {
    try {
      if (type === "view") {
        await sql`UPDATE cards SET views_count = COALESCE(views_count, 0) + 1 WHERE id = ${id}`;
      } else if (type === "share") {
        await sql`UPDATE cards SET shares_count = COALESCE(shares_count, 0) + 1 WHERE id = ${id}`;
      } else if (type === "call") {
        await sql`UPDATE cards SET call_clicks_count = COALESCE(call_clicks_count, 0) + 1 WHERE id = ${id}`;
      } else if (type === "whatsapp") {
        await sql`UPDATE cards SET whatsapp_clicks_count = COALESCE(whatsapp_clicks_count, 0) + 1 WHERE id = ${id}`;
      } else if (type === "vcard") {
        await sql`UPDATE cards SET vcard_downloads_count = COALESCE(vcard_downloads_count, 0) + 1 WHERE id = ${id}`;
      }
    } catch {
    }
  }
  res.json({ success: true });
});
app.get("/api/users", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  if (pgPool) {
    try {
      const rows = await sql`SELECT * FROM users ORDER BY created_at ASC`;
      if (rows && rows.length > 0) {
        return res.json({ users: rows, source: "database" });
      }
    } catch {
    }
  }
  res.json({ users: memoryUsers, source: "resilient" });
});
app.post("/api/users", async (req, res) => {
  const body = req.body;
  let usersToSave = [];
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
            ${user.id}, ${cleanEmail}, ${user.name || "Team Member"}, ${user.role || "employee"},
            ${user.companyId || null}, ${JSON.stringify(user.companyIds || [])}, ${user.password || null}, ${user.assignedCardId || null},
            ${user.status || "active"}, ${user.phone || ""}, ${user.designation || ""},
            ${user.avatarUrl || ""}, ${user.bio || ""}, NOW()
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
      } catch (e) {
        console.warn("[DB] User postgres save notice:", e?.message);
      }
    }
  }
  persistLocalData();
  res.json({ success: true, count: usersToSave.length });
});
app.delete("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  memoryUsers = memoryUsers.filter((u) => u.id !== id);
  persistLocalData();
  if (pgPool) {
    try {
      await sql`DELETE FROM users WHERE id = ${id}`;
    } catch {
    }
  }
  res.json({ success: true });
});
app.get("/api/leads", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  if (pgPool) {
    try {
      const rows = await sql`SELECT * FROM leads ORDER BY created_at DESC`;
      if (rows && rows.length > 0) {
        return res.json({ leads: rows, source: "database" });
      }
    } catch {
    }
  }
  res.json({ leads: memoryLeads, source: "resilient" });
});
app.post("/api/leads", async (req, res) => {
  const lead = req.body;
  if (!lead) return res.json({ success: true, lead });
  const id = lead.id || `lead-${Date.now()}`;
  const fullLead = { ...lead, id, createdAt: lead.createdAt || (/* @__PURE__ */ new Date()).toISOString() };
  memoryLeads.unshift(fullLead);
  persistLocalData();
  if (pgPool) {
    try {
      await sql`
        INSERT INTO leads (id, card_id, card_name, name, email, phone, message, status)
        VALUES (
          ${id}, ${lead.cardId || "card-general"}, ${lead.cardName || "Smart Card"},
          ${lead.name}, ${lead.email || ""}, ${lead.phone || ""}, ${lead.message || ""},
          ${lead.status || "new"}
        )
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status;
      `;
    } catch {
    }
  }
  res.json({ success: true, lead: fullLead });
});
app.patch("/api/leads/:id", async (req, res) => {
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
    }
  }
  res.json({ success: true });
});
app.delete("/api/leads/:id", async (req, res) => {
  const { id } = req.params;
  memoryLeads = memoryLeads.filter((l) => l.id !== id);
  persistLocalData();
  if (pgPool) {
    try {
      await sql`DELETE FROM leads WHERE id = ${id}`;
    } catch {
    }
  }
  res.json({ success: true });
});
app.get(
  ["/bundle", "/bundle-download", "/download-bundle", "/get-bundle", "/bundle.html", "/app/bundle", "/app/bundle-download"],
  (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Downloading b-Smart cPanel Production Bundle...</title>
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
      padding: 20px;
      box-sizing: border-box;
      text-align: center;
    }
    .card {
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid rgba(56, 189, 248, 0.35);
      border-radius: 24px;
      padding: 40px 30px;
      max-width: 500px;
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
    p { font-size: 13px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px; }
    .status {
      font-size: 12px;
      font-weight: 700;
      color: #38bdf8;
      background: rgba(14, 165, 233, 0.12);
      border: 1px solid rgba(14, 165, 233, 0.25);
      padding: 12px 20px;
      border-radius: 14px;
      margin-bottom: 24px;
      display: inline-block;
    }
    .btn {
      background: linear-gradient(135deg, #0284c7, #2563eb);
      color: white;
      font-weight: 800;
      font-size: 14px;
      padding: 15px 32px;
      border-radius: 14px;
      text-decoration: none;
      display: inline-block;
      border: none;
      cursor: pointer;
      box-shadow: 0 10px 25px rgba(2, 132, 199, 0.35);
      transition: all 0.2s;
    }
    .btn:hover { background: linear-gradient(135deg, #0369a1, #1d4ed8); transform: translateY(-1px); }
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
    <div class="icon">\u{1F4E6}</div>
    <h1>b-Smart cPanel Production Bundle</h1>
    <p>Preparing standalone <strong>cpanel_app_bundle.zip</strong> (50 MB) containing Node.js server, pre-compiled static assets, and database migration files.</p>
    <div id="status" class="status"><span class="spinner"></span> Initiating secure stream...</div>
    <br/>
    <button id="dlBtn" class="btn" onclick="startDownload()">Download ZIP File</button>
  </div>

  <script>
    async function startDownload() {
      const statusEl = document.getElementById('status');
      statusEl.innerHTML = '<span class="spinner"></span> Fetching package stream...';
      try {
        const res = await fetch('/api/bundle-base64', { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (data.success && data.base64) {
          statusEl.innerHTML = '\u26A1 Unpacking bundle...';
          const binaryString = window.atob(data.base64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'application/zip' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = data.filename || 'cpanel_app_bundle.zip';
          document.body.appendChild(a);
          a.click();
          statusEl.innerHTML = '\u2705 Download started! Saved to your Downloads folder.';
          setTimeout(() => { window.URL.revokeObjectURL(url); document.body.removeChild(a); }, 2000);
          return;
        }
      } catch (err) {
        console.warn('Base64 stream notice:', err);
      }
      statusEl.innerHTML = '\u23F3 Direct binary download fallback...';
      window.location.href = '/api/download-cpanel-bundle';
    }

    window.onload = () => {
      setTimeout(startDownload, 300);
    };
  </script>
</body>
</html>`);
  }
);
app.get(["/api/bundle-base64", "/app/api/bundle-base64"], (_req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const possibleZipPaths = [
    path.resolve(__dirname, "cpanel_app_bundle.zip"),
    path.resolve(__dirname, "public/cpanel_app_bundle.zip"),
    path.resolve(__dirname, "dist/cpanel_app_bundle.zip"),
    path.resolve(process.cwd(), "cpanel_app_bundle.zip"),
    path.resolve(process.cwd(), "public/cpanel_app_bundle.zip"),
    path.resolve(process.cwd(), "dist/cpanel_app_bundle.zip")
  ];
  for (const p of possibleZipPaths) {
    if (fs.existsSync(p)) {
      const buffer = fs.readFileSync(p);
      const base64 = buffer.toString("base64");
      return res.json({
        success: true,
        filename: "cpanel_app_bundle.zip",
        size: buffer.length,
        base64
      });
    }
  }
  res.status(404).json({ success: false, error: "Deployment bundle not found." });
});
app.get(
  [
    "/cpanel_app_bundle.zip",
    "/app/cpanel_app_bundle.zip",
    "/download",
    "/download/bundle",
    "/api/download",
    "/api/download-code",
    "/api/download-cpanel-bundle",
    "/app/api/download-cpanel-bundle",
    "/download-code",
    "/download-cpanel-bundle",
    "/app/download-code",
    "/app/download-cpanel-bundle"
  ],
  (_req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS, HEAD");
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition, Content-Length");
    res.setHeader("Content-Type", "application/zip");
    const possibleZipPaths = [
      path.resolve(__dirname, "cpanel_app_bundle.zip"),
      path.resolve(__dirname, "public/cpanel_app_bundle.zip"),
      path.resolve(__dirname, "dist/cpanel_app_bundle.zip"),
      path.resolve(process.cwd(), "cpanel_app_bundle.zip"),
      path.resolve(process.cwd(), "public/cpanel_app_bundle.zip"),
      path.resolve(process.cwd(), "dist/cpanel_app_bundle.zip")
    ];
    const possibleTarPaths = [
      path.resolve(__dirname, "cpanel_app_bundle.tar.gz"),
      path.resolve(__dirname, "public/cpanel_app_bundle.tar.gz"),
      path.resolve(__dirname, "dist/cpanel_app_bundle.tar.gz"),
      path.resolve(process.cwd(), "cpanel_app_bundle.tar.gz")
    ];
    for (const p of possibleZipPaths) {
      if (fs.existsSync(p)) {
        return res.sendFile(p);
      }
    }
    for (const p of possibleTarPaths) {
      if (fs.existsSync(p)) {
        return res.download(p, "cpanel_app_bundle.tar.gz", (err) => {
          if (err && !res.headersSent) {
            res.status(500).send("Error downloading deployment bundle.");
          }
        });
      }
    }
    res.status(404).send("Deployment bundle is generating or not found. Please try again in a few moments.");
  }
);
var isProduction = process.env.NODE_ENV === "production" || process.env.CPANEL === "true";
async function startServer() {
  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: false
        },
        appType: "spa"
      });
      app.use(vite.middlewares);
    } catch {
      const distDir = path.resolve(__dirname, "dist");
      if (fs.existsSync(distDir)) {
        app.use("/app", express.static(distDir));
        app.use(express.static(distDir));
        app.get(["/app", "/app/*", "/card/*", "*"], (_req, res) => {
          res.sendFile(path.join(distDir, "index.html"));
        });
      }
    }
  } else {
    const distDir = path.resolve(__dirname, "dist");
    if (fs.existsSync(distDir)) {
      app.use("/app", express.static(distDir));
      app.use(express.static(distDir));
      app.get(["/app", "/app/*", "/card/*", "*"], (_req, res) => {
        res.sendFile(path.join(distDir, "index.html"));
      });
    }
  }
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (provider: ${dbProvider})`);
  });
}
startServer();
