-- ============================================================================
-- cPanel PostgreSQL Schema Setup for B-Smart Online (https://b-smart-online.co.za/app)
-- You can run this in cPanel > phpPgAdmin or via cPanel Terminal using:
-- psql -U your_db_user -d your_db_name -f setup_postgres.sql
-- ============================================================================

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

-- cPanel image & media uploads tracking table
CREATE TABLE IF NOT EXISTS uploads (
  id VARCHAR(128) PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  filepath TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type VARCHAR(64),
  size_bytes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Permanent deletion tracking table so deleted items never reappear across devices
CREATE TABLE IF NOT EXISTS deleted_entities (
  id VARCHAR(128) PRIMARY KEY,
  entity_type VARCHAR(64) NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_cards_slug ON cards(slug);
CREATE INDEX IF NOT EXISTS idx_cards_company_id ON cards(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_leads_card_id ON leads(card_id);
CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON uploads(created_at);
CREATE INDEX IF NOT EXISTS idx_deleted_entities_type ON deleted_entities(entity_type);

