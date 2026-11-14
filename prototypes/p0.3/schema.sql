-- P0.3: pgvector schema for population aggregation testing
-- Demonstrates de-identified flag storage, HNSW/IVFFlat indexing, small-cell suppression

CREATE EXTENSION IF NOT EXISTS vector;

-- Population-level de-identified flags (NO PHI, row-level retention 30 days)
CREATE TABLE population_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Anonymized demographics (K>=10 for release)
    age_band TEXT NOT NULL, -- '0-5', '6-12', '13-18', '19-30', '31-50', '51-65', '66+'
    region_code TEXT NOT NULL, -- 'US-CA', 'US-TX', etc.
    community_id TEXT NOT NULL, -- pseudo-ID for clustering
    deprivation_index DECIMAL(3,2), -- 0.0-1.0
    
    -- Acoustic signature (de-identified)
    signature TEXT NOT NULL, -- 'vocal_tension_spike', 'distress_signature', etc.
    confidence DECIMAL(3,2) NOT NULL,
    
    -- Temporal (bucketed to hour, no precise timestamp)
    time_bucket TIMESTAMP NOT NULL,
    
    -- Embedding for similarity search (512-dim from acoustic model)
    embedding vector(512),
    
    -- Audit metadata
    model_version TEXT NOT NULL,
    session_id UUID NOT NULL, -- links to session (not subject)
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Retention constraint (30 days from spec)
    CONSTRAINT retention_check CHECK (created_at > NOW() - INTERVAL '30 days')
);

-- HNSW index for similarity search (fast, high recall)
CREATE INDEX idx_population_flags_hnsw 
    ON population_flags 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- IVFFlat index alternative (lower memory)
-- CREATE INDEX idx_population_flags_ivfflat 
--     ON population_flags 
--     USING ivfflat (embedding vector_cosine_ops)
--     WITH (lists = 100);

-- Composite indexes for aggregation queries
CREATE INDEX idx_population_flags_time_bucket ON population_flags (time_bucket DESC);
CREATE INDEX idx_population_flags_region_age ON population_flags (region_code, age_band);
CREATE INDEX idx_population_flags_community ON population_flags (community_id);
CREATE INDEX idx_population_flags_signature ON population_flags (signature);

-- Aggregated PRI trends (no individual scores, community-level only)
CREATE TABLE community_pri_monthly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id TEXT NOT NULL,
    month DATE NOT NULL, -- First day of month
    
    -- Aggregates (K>=10 community size required)
    avg_pri DECIMAL(5,2) NOT NULL,
    p50_pri INTEGER NOT NULL,
    p90_pri INTEGER NOT NULL,
    member_count INTEGER NOT NULL,
    high_risk_pct DECIMAL(5,2), -- % with PRI < 40
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT member_count_check CHECK (member_count >= 10), -- K-anonymity
    UNIQUE (community_id, month)
);

CREATE INDEX idx_community_pri_month ON community_pri_monthly (month DESC);
CREATE INDEX idx_community_pri_community ON community_pri_monthly (community_id);

-- Care gaps (derived from flags + PRI, no PHI)
CREATE TABLE care_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Population segment (anonymized)
    age_band TEXT NOT NULL,
    region_code TEXT NOT NULL,
    community_id TEXT NOT NULL,
    
    -- Gap identification
    gap_type TEXT NOT NULL, -- 'frequent_flags', 'sustained_low_pri', 'sudden_decline'
    severity TEXT NOT NULL, -- 'low', 'medium', 'high'
    estimated_size INTEGER NOT NULL, -- Number of subjects matching
    
    -- Temporal
    detected_date DATE NOT NULL,
    
    -- Routing metadata
    suggested_pathway TEXT, -- 'crisis', 'counseling', 'wellness_check'
    priority_score DECIMAL(5,2), -- 0-100
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT estimated_size_check CHECK (estimated_size >= 10) -- Small-cell suppression
);

CREATE INDEX idx_care_gaps_detected ON care_gaps (detected_date DESC);
CREATE INDEX idx_care_gaps_severity ON care_gaps (severity);
CREATE INDEX idx_care_gaps_community ON care_gaps (community_id);

-- RLS: app_official can read aggregated views, NO row-level flag access
ALTER TABLE population_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_pri_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_gaps ENABLE ROW LEVEL SECURITY;

-- app_worker can write flags (from ingest pipeline)
CREATE POLICY population_flags_worker_insert 
    ON population_flags FOR INSERT
    TO app_worker
    WITH CHECK (true);

-- app_official can ONLY read aggregates (NOT individual flags)
CREATE POLICY population_flags_official_deny 
    ON population_flags FOR SELECT
    TO app_official
    USING (false); -- Explicit deny

CREATE POLICY community_pri_official_select 
    ON community_pri_monthly FOR SELECT
    TO app_official
    USING (true);

CREATE POLICY care_gaps_official_select 
    ON care_gaps FOR SELECT
    TO app_official
    USING (true);
