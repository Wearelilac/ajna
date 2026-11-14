-- B2.1: Wearable daily metrics storage
-- Encrypted per-subject daily summaries from wearables (Oura, generic, simulator)

CREATE TABLE wearable_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL,
    date DATE NOT NULL,
    source TEXT NOT NULL, -- 'oura', 'generic', 'simulator'
    
    -- Encrypted canonical metrics (plaintext stored in ciphertext)
    ciphertext BYTEA NOT NULL,
    nonce BYTEA NOT NULL,
    dek_version SMALLINT NOT NULL DEFAULT 1,
    
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Idempotency: one row per (subject, date, source)
    CONSTRAINT wearable_daily_unique UNIQUE (subject_id, date, source),
    
    -- Data retention: no dates older than 13 months (from P0.1)
    CONSTRAINT wearable_date_retention CHECK (date >= CURRENT_DATE - INTERVAL '13 months'),
    
    -- No future dates
    CONSTRAINT wearable_date_not_future CHECK (date <= CURRENT_DATE)
);

-- Indexes
CREATE INDEX idx_wearable_daily_subject ON wearable_daily (subject_id);
CREATE INDEX idx_wearable_daily_date ON wearable_daily (date DESC);
CREATE INDEX idx_wearable_daily_received ON wearable_daily (received_at DESC);

-- RLS policies

-- Enable RLS
ALTER TABLE wearable_daily ENABLE ROW LEVEL SECURITY;

-- Owner only (subject can read their own data)
CREATE POLICY wearable_daily_owner_select 
    ON wearable_daily FOR SELECT
    TO app_user
    USING (subject_id::text = current_setting('app.subject_id', true));

CREATE POLICY wearable_daily_owner_insert 
    ON wearable_daily FOR INSERT
    TO app_user
    WITH CHECK (subject_id::text = current_setting('app.subject_id', true));

CREATE POLICY wearable_daily_owner_update 
    ON wearable_daily FOR UPDATE
    TO app_user
    USING (subject_id::text = current_setting('app.subject_id', true))
    WITH CHECK (subject_id::text = current_setting('app.subject_id', true));

-- app_worker can read for baseline computation (but not decrypt without subject's DEK)
CREATE POLICY wearable_daily_worker_select 
    ON wearable_daily FOR SELECT
    TO app_worker
    USING (true);

-- app_official has NO access (not needed for population views)
-- Explicit deny policy
CREATE POLICY wearable_daily_official_deny 
    ON wearable_daily FOR ALL
    TO app_official
    USING (false);

-- Comments
COMMENT ON TABLE wearable_daily IS 'Encrypted daily wearable metrics. RLS: owner only + app_worker for baseline jobs.';
COMMENT ON COLUMN wearable_daily.ciphertext IS 'AES-256-GCM encrypted canonical metrics JSON (hrv_rmssd_ms, resting_hr_bpm, sleep_total_min, etc.)';
COMMENT ON COLUMN wearable_daily.source IS 'Vendor identifier: oura, generic, simulator';
COMMENT ON COLUMN wearable_daily.dek_version IS 'DEK version for key rotation (default 1)';
