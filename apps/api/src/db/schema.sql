-- B1.2 Database Schema: Core tables with RLS and encryption support
-- All PHI fields are encrypted in vaults, never stored plaintext.
-- RLS enabled and forced on all tables with user/health data.

-- ============================================================================
-- Extensions (PostgreSQL 16)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- AES-256-GCM, random UUIDs
CREATE EXTENSION IF NOT EXISTS vector;     -- pgvector for embedding search


-- ============================================================================
-- Roles (Least Privilege)
-- ============================================================================

-- app_user: typical authenticated user
-- Cannot read other users' data via RLS policy
CREATE ROLE app_user WITH LOGIN;
GRANT CONNECT ON DATABASE ajna TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;

-- app_worker: background job processor
-- Explicit narrow grants per table in migrations
CREATE ROLE app_worker WITH LOGIN;
GRANT CONNECT ON DATABASE ajna TO app_worker;
GRANT USAGE ON SCHEMA public TO app_worker;

-- app_reviewer: staff role for crisis review and outreach
-- Can see assigned items (not all rows)
CREATE ROLE app_reviewer WITH LOGIN;
GRANT CONNECT ON DATABASE ajna TO app_reviewer;
GRANT USAGE ON SCHEMA public TO app_reviewer;

-- app_official: public health official
-- Reads aggregated data only (no row-level user data)
CREATE ROLE app_official WITH LOGIN;
GRANT CONNECT ON DATABASE ajna TO app_official;
GRANT USAGE ON SCHEMA public TO app_official;

-- app_admin: deployment/maintenance only
CREATE ROLE app_admin WITH LOGIN SUPERUSER;


-- ============================================================================
-- Core Tables
-- ============================================================================

-- subjects: pseudonymous user references
-- Primary key is a random UUID (no sequence, no identity leak)
-- Link to real identity exists only in the identity vault
CREATE TABLE IF NOT EXISTS subjects (
  subject_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  age_band TEXT,                  -- coarse: "0-5", "6-12", "13-18", "19-30", etc. (read-only, from vault)
  region_code TEXT,               -- coarse: "US-CA", "US-TX", etc. (read-only, from vault)
  community_id TEXT,              -- community/clinic identifier (nullable)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,         -- soft delete for GDPR
  CONSTRAINT no_duplicate_deleted CHECK (deleted_at IS NULL OR created_at < deleted_at)
);

-- Enable RLS on subjects (required by 00-data-protection-model.md section 7)
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects FORCE ROW LEVEL SECURITY;

-- RLS policy: app_user sees only their own row
-- The row is identified by matching app.subject_id context variable (set by API for each request)
CREATE POLICY subjects_user_isolation ON subjects
  FOR SELECT
  USING (subject_id = current_setting('app.subject_id')::UUID);

CREATE POLICY subjects_user_insert ON subjects
  FOR INSERT
  WITH CHECK (subject_id = current_setting('app.subject_id')::UUID);

-- app_worker has explicit narrow access (granted per table in migrations)
-- app_official has no policy (reads only aggregates, not subjects table)


-- vaults: DEK storage (envelope encryption)
-- Stores wrapped (encrypted) DEK for each subject
-- DEK is wrapped with the KEK from AJNA_KEK_BASE64
-- One entry per subject
CREATE TABLE IF NOT EXISTS vaults (
  subject_id UUID PRIMARY KEY REFERENCES subjects(subject_id) ON DELETE CASCADE,
  wrapped_dek BYTEA NOT NULL,     -- AES-256-GCM(DEK, KEK, nonce, AAD=subject_id)
  dek_nonce BYTEA NOT NULL,       -- 96-bit nonce used to wrap DEK
  kek_version SMALLINT DEFAULT 1, -- KEK version for rotation support
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaults FORCE ROW LEVEL SECURITY;

CREATE POLICY vaults_user_isolation ON vaults
  FOR SELECT
  USING (subject_id = current_setting('app.subject_id')::UUID);

CREATE POLICY vaults_user_insert ON vaults
  FOR INSERT
  WITH CHECK (subject_id = current_setting('app.subject_id')::UUID);

CREATE POLICY vaults_user_update ON vaults
  FOR UPDATE
  USING (subject_id = current_setting('app.subject_id')::UUID);


-- vault_items: encrypted PHI storage
-- One row per plaintext key (e.g., "identity", "contact", "emergency")
-- Ciphertext never decrypted server-side except to return to owner
-- Multiple items per subject, keyed by subject_id + item_key
CREATE TABLE IF NOT EXISTS vault_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(subject_id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,         -- e.g., "identity", "contact", "emergency"
  ciphertext BYTEA NOT NULL,      -- AES-256-GCM(plaintext_json, DEK, nonce, AAD=subject_id)
  nonce BYTEA NOT NULL,           -- 96-bit nonce (random per encryption)
  dek_version SMALLINT DEFAULT 1, -- DEK version for tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(subject_id, item_key)
);

ALTER TABLE vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_items FORCE ROW LEVEL SECURITY;

CREATE POLICY vault_items_user_isolation ON vault_items
  FOR SELECT
  USING (subject_id = current_setting('app.subject_id')::UUID);

CREATE POLICY vault_items_user_insert ON vault_items
  FOR INSERT
  WITH CHECK (subject_id = current_setting('app.subject_id')::UUID);

CREATE POLICY vault_items_user_update ON vault_items
  FOR UPDATE
  USING (subject_id = current_setting('app.subject_id')::UUID);


-- ============================================================================
-- Audit Chain (Append-Only, Hash-Chained)
-- ============================================================================
-- Each row hashes: SHA-256(previous_hash || canonical_row)
-- Never edited, only inserted
-- For every PHI read by non-owner, every state change, every decision

CREATE TABLE IF NOT EXISTS audit_chain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  previous_hash BYTEA,            -- SHA-256 of previous row (NULL for first row)
  event_type TEXT NOT NULL,       -- e.g., "PHI_READ", "CONSENT_GRANTED", "CRISIS_OPENED"
  subject_id UUID,                -- null if event is system-wide
  actor_role TEXT,                -- "app_user", "app_reviewer", "app_official", "app_worker"
  actor_id UUID,                  -- user ID or worker ID (nullable for system events)
  action_detail JSONB,            -- action-specific data (no PHI values)
  request_id UUID,                -- from the HTTP request context
  canonical_hash BYTEA NOT NULL,  -- SHA-256(previous_hash || row_data) for this row
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_chain ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_chain FORCE ROW LEVEL SECURITY;

-- Reviewers see only their own audit events
-- Officials see only their own
-- Workers see none
CREATE POLICY audit_chain_reviewer_view ON audit_chain
  FOR SELECT
  USING (actor_role = 'app_reviewer' AND actor_id = current_setting('app.subject_id')::UUID);

-- No update/delete on audit chain (append-only)


-- ============================================================================
-- Consent Records
-- ============================================================================
-- Scope: "wearable", "monitor_me", "population_use"
-- Granted/revoked at specific times
-- Revocation triggers data cleanup jobs

CREATE TABLE IF NOT EXISTS consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(subject_id) ON DELETE CASCADE,
  scope TEXT NOT NULL,            -- "wearable", "monitor_me", "population_use"
  granted_at TIMESTAMPTZ,         -- NULL if revoked
  revoked_at TIMESTAMPTZ,         -- NULL if currently granted
  consent_text_version TEXT,      -- version hash of plain-language text
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(subject_id, scope),
  CONSTRAINT grant_or_revoke CHECK (
    (granted_at IS NOT NULL AND revoked_at IS NULL) OR
    (granted_at IS NULL AND revoked_at IS NULL AND created_at = granted_at) OR
    (revoked_at IS NOT NULL)
  )
);

ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents FORCE ROW LEVEL SECURITY;

CREATE POLICY consents_user_view ON consents
  FOR SELECT
  USING (subject_id = current_setting('app.subject_id')::UUID);


-- ============================================================================
-- Indexes (Performance)
-- ============================================================================

CREATE INDEX idx_vaults_subject_id ON vaults(subject_id);
CREATE INDEX idx_vault_items_subject_id ON vault_items(subject_id);
CREATE INDEX idx_vault_items_subject_key ON vault_items(subject_id, item_key);
CREATE INDEX idx_audit_chain_subject_id ON audit_chain(subject_id);
CREATE INDEX idx_audit_chain_created_at ON audit_chain(created_at DESC);
CREATE INDEX idx_consents_subject_id ON consents(subject_id);
CREATE INDEX idx_consents_scope ON consents(scope);

-- ============================================================================
-- Permissions (GRANT statements follow in migrations)
-- ============================================================================
