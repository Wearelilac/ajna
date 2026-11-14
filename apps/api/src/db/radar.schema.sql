-- B2.2: Radar tables (baselines, PRI, deviation flags)
-- Derived metrics computed from wearable_daily by baseline worker

-- Personal baselines (30-day rolling window per metric)
CREATE TABLE baselines (
    subject_id UUID NOT NULL,
    date DATE NOT NULL,
    metric TEXT NOT NULL,
    
    -- Mean/SD approach (chosen from P0.1)
    mean NUMERIC(10, 4),
    sd NUMERIC(10, 4),
    
    -- Median/MAD approach (alternative, not used for v1)
    median NUMERIC(10, 4),
    mad NUMERIC(10, 4),
    
    -- Valid days in baseline window
    n_valid_days SMALLINT NOT NULL,
    
    -- Metadata
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    model_version TEXT NOT NULL DEFAULT 'pri-1.0',
    
    PRIMARY KEY (subject_id, date, metric)
);

CREATE INDEX idx_baselines_subject ON baselines (subject_id);
CREATE INDEX idx_baselines_date ON baselines (date DESC);
CREATE INDEX idx_baselines_computed ON baselines (computed_at DESC);

-- Daily PRI scores (Personal Resilience Index 0-100)
CREATE TABLE pri_daily (
    subject_id UUID NOT NULL,
    date DATE NOT NULL,
    
    -- PRI score (0-100, higher is better)
    pri SMALLINT NOT NULL CHECK (pri BETWEEN 0 AND 100),
    
    -- Number of deviation flags on this day
    deviation_count SMALLINT NOT NULL DEFAULT 0,
    
    -- Metadata
    model_version TEXT NOT NULL DEFAULT 'pri-1.0',
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (subject_id, date)
);

CREATE INDEX idx_pri_daily_subject ON pri_daily (subject_id);
CREATE INDEX idx_pri_daily_date ON pri_daily (date DESC);
CREATE INDEX idx_pri_daily_pri ON pri_daily (pri); -- For low-PRI queries

-- Deviation flags (|z| > 3)
CREATE TABLE deviation_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL,
    date DATE NOT NULL,
    metric TEXT NOT NULL,
    
    -- Z-score and direction
    z NUMERIC(5, 2) NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('high', 'low')),
    
    -- Current value and baseline
    current_value NUMERIC(10, 4),
    baseline_mean NUMERIC(10, 4),
    baseline_sd NUMERIC(10, 4),
    
    -- Status (advisory only, never "diagnosed" or "confirmed")
    status TEXT NOT NULL DEFAULT 'flagged_for_review',
    
    -- Metadata
    model_version TEXT NOT NULL DEFAULT 'pri-1.0',
    flagged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT deviation_flags_unique UNIQUE (subject_id, date, metric)
);

CREATE INDEX idx_deviation_flags_subject ON deviation_flags (subject_id);
CREATE INDEX idx_deviation_flags_date ON deviation_flags (date DESC);
CREATE INDEX idx_deviation_flags_status ON deviation_flags (status);

-- RLS policies

-- Enable RLS on all radar tables
ALTER TABLE baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pri_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE deviation_flags ENABLE ROW LEVEL SECURITY;

-- Owner read-only (subject can read their own derived data)
CREATE POLICY baselines_owner_select 
    ON baselines FOR SELECT
    TO app_user
    USING (subject_id::text = current_setting('app.subject_id', true));

CREATE POLICY pri_daily_owner_select 
    ON pri_daily FOR SELECT
    TO app_user
    USING (subject_id::text = current_setting('app.subject_id', true));

CREATE POLICY deviation_flags_owner_select 
    ON deviation_flags FOR SELECT
    TO app_user
    USING (subject_id::text = current_setting('app.subject_id', true));

-- app_worker can write (baseline processor)
CREATE POLICY baselines_worker_insert 
    ON baselines FOR INSERT
    TO app_worker
    WITH CHECK (true);

CREATE POLICY baselines_worker_update 
    ON baselines FOR UPDATE
    TO app_worker
    USING (true)
    WITH CHECK (true);

CREATE POLICY pri_daily_worker_insert 
    ON pri_daily FOR INSERT
    TO app_worker
    WITH CHECK (true);

CREATE POLICY pri_daily_worker_update 
    ON pri_daily FOR UPDATE
    TO app_worker
    USING (true)
    WITH CHECK (true);

CREATE POLICY deviation_flags_worker_insert 
    ON deviation_flags FOR INSERT
    TO app_worker
    WITH CHECK (true);

CREATE POLICY deviation_flags_worker_update 
    ON deviation_flags FOR UPDATE
    TO app_worker
    USING (true)
    WITH CHECK (true);

-- app_official has NO access to row-level radar data (use population aggregates instead)
CREATE POLICY baselines_official_deny 
    ON baselines FOR ALL
    TO app_official
    USING (false);

CREATE POLICY pri_daily_official_deny 
    ON pri_daily FOR ALL
    TO app_official
    USING (false);

CREATE POLICY deviation_flags_official_deny 
    ON deviation_flags FOR ALL
    TO app_official
    USING (false);

-- Comments
COMMENT ON TABLE baselines IS 'Personal 30-day rolling baselines per metric. RLS: owner read, app_worker write.';
COMMENT ON TABLE pri_daily IS 'Daily Personal Resilience Index (0-100). RLS: owner read, app_worker write.';
COMMENT ON TABLE deviation_flags IS 'Deviation flags (|z| > 3). Status is advisory only. RLS: owner read, app_worker write.';
COMMENT ON COLUMN deviation_flags.status IS 'Always flagged_for_review (advisory). Never diagnosed or confirmed.';
