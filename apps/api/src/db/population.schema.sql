-- B4.1: Population aggregation and pgvector schema
-- Community-level aggregates with K-anonymity (K≥10)
-- Officials see ONLY aggregates, NEVER row-level data

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Communities (coarse geographic + demographic groupings)
CREATE TABLE communities (
    community_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    region_code TEXT NOT NULL, -- 'US-CA', 'US-TX', etc.
    deprivation_index NUMERIC(4,3) CHECK (deprivation_index BETWEEN 0 AND 1),
    population_estimate INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_communities_region ON communities (region_code);

-- Weekly community aggregates (K≥10 suppression enforced)
CREATE TABLE community_week_agg (
    community_id TEXT NOT NULL REFERENCES communities(community_id),
    week_start DATE NOT NULL, -- Monday of week
    age_band TEXT NOT NULL, -- '0-18', '19-50', '51+'
    
    -- Counts (NULL if suppressed)
    subjects_n INTEGER, -- Unique subjects contributing
    flag_count INTEGER,
    
    -- PRI metrics (NULL if suppressed)
    mean_pri NUMERIC(5,2) CHECK (mean_pri BETWEEN 0 AND 100),
    median_pri INTEGER CHECK (median_pri BETWEEN 0 AND 100),
    p10_pri INTEGER CHECK (p10_pri BETWEEN 0 AND 100),
    p90_pri INTEGER CHECK (p90_pri BETWEEN 0 AND 100),
    
    -- Deviation share (% of subjects with z>3)
    deviation_share NUMERIC(4,3) CHECK (deviation_share BETWEEN 0 AND 1),
    
    -- Suppression flag
    suppressed BOOLEAN NOT NULL DEFAULT FALSE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (community_id, week_start, age_band),
    
    -- Enforce K-anonymity: NULL counts when suppressed
    CONSTRAINT suppressed_nulls_check CHECK (
        (suppressed = FALSE AND subjects_n >= 10) OR
        (suppressed = TRUE AND subjects_n IS NULL AND flag_count IS NULL)
    )
);

CREATE INDEX idx_community_week_agg_week ON community_week_agg (week_start DESC);
CREATE INDEX idx_community_week_agg_community ON community_week_agg (community_id);

-- Monthly community aggregates (same pattern as weekly)
CREATE TABLE community_month_agg (
    community_id TEXT NOT NULL REFERENCES communities(community_id),
    month_start DATE NOT NULL, -- First day of month
    age_band TEXT NOT NULL,
    
    subjects_n INTEGER,
    flag_count INTEGER,
    mean_pri NUMERIC(5,2) CHECK (mean_pri BETWEEN 0 AND 100),
    median_pri INTEGER CHECK (median_pri BETWEEN 0 AND 100),
    p10_pri INTEGER CHECK (p10_pri BETWEEN 0 AND 100),
    p90_pri INTEGER CHECK (p90_pri BETWEEN 0 AND 100),
    deviation_share NUMERIC(4,3) CHECK (deviation_share BETWEEN 0 AND 1),
    suppressed BOOLEAN NOT NULL DEFAULT FALSE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (community_id, month_start, age_band),
    
    CONSTRAINT suppressed_nulls_check CHECK (
        (suppressed = FALSE AND subjects_n >= 10) OR
        (suppressed = TRUE AND subjects_n IS NULL AND flag_count IS NULL)
    )
);

CREATE INDEX idx_community_month_agg_month ON community_month_agg (month_start DESC);
CREATE INDEX idx_community_month_agg_community ON community_month_agg (community_id);

-- Community vectors (pgvector embeddings for similarity search)
CREATE TABLE community_vectors (
    community_id TEXT PRIMARY KEY REFERENCES communities(community_id),
    embedding vector(128), -- 128-dim feature vector
    
    -- Features used to compute embedding (for transparency)
    features JSONB NOT NULL,
    
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW index for similarity search (from P0.3: m=16, ef_construction=64)
CREATE INDEX idx_community_vectors_hnsw 
    ON community_vectors 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Community clusters (underserved groupings)
CREATE TABLE community_clusters (
    community_id TEXT NOT NULL REFERENCES communities(community_id),
    cluster_id INTEGER NOT NULL,
    label TEXT NOT NULL, -- Descriptive label (NOT diagnostic)
    score NUMERIC(5,2) NOT NULL, -- 0-100 composite score
    score_breakdown JSONB NOT NULL, -- Transparent components
    
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (community_id, cluster_id)
);

CREATE INDEX idx_community_clusters_cluster ON community_clusters (cluster_id);
CREATE INDEX idx_community_clusters_score ON community_clusters (score DESC);

-- RLS: Officials see ONLY aggregates, NEVER row-level data
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_week_agg ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_month_agg ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_clusters ENABLE ROW LEVEL SECURITY;

-- app_worker writes aggregates
CREATE POLICY communities_worker_rw ON communities
    FOR ALL TO app_worker
    USING (true)
    WITH CHECK (true);

CREATE POLICY community_week_agg_worker_rw ON community_week_agg
    FOR ALL TO app_worker
    USING (true)
    WITH CHECK (true);

CREATE POLICY community_month_agg_worker_rw ON community_month_agg
    FOR ALL TO app_worker
    USING (true)
    WITH CHECK (true);

CREATE POLICY community_vectors_worker_rw ON community_vectors
    FOR ALL TO app_worker
    USING (true)
    WITH CHECK (true);

CREATE POLICY community_clusters_worker_rw ON community_clusters
    FOR ALL TO app_worker
    USING (true)
    WITH CHECK (true);

-- app_official reads aggregates only
CREATE POLICY communities_official_read ON communities
    FOR SELECT TO app_official
    USING (true);

CREATE POLICY community_week_agg_official_read ON community_week_agg
    FOR SELECT TO app_official
    USING (true);

CREATE POLICY community_month_agg_official_read ON community_month_agg
    FOR SELECT TO app_official
    USING (true);

CREATE POLICY community_vectors_official_read ON community_vectors
    FOR SELECT TO app_official
    USING (true);

CREATE POLICY community_clusters_official_read ON community_clusters
    FOR SELECT TO app_official
    USING (true);

-- app_user and app_reviewer CANNOT access population data
-- (no policies = implicit deny)

-- Views for Officials (suppression enforced)
CREATE OR REPLACE VIEW v_population_overview AS
SELECT
    COUNT(DISTINCT community_id) AS total_communities,
    SUM(CASE WHEN NOT suppressed THEN subjects_n ELSE 0 END) AS total_subjects,
    SUM(CASE WHEN NOT suppressed THEN flag_count ELSE 0 END) AS total_flags,
    AVG(CASE WHEN NOT suppressed THEN mean_pri ELSE NULL END) AS avg_pri,
    MAX(week_start) AS latest_week
FROM community_week_agg
WHERE week_start > NOW() - INTERVAL '30 days';

CREATE OR REPLACE VIEW v_community_summary AS
SELECT
    c.community_id,
    c.name,
    c.region_code,
    c.deprivation_index,
    c.population_estimate,
    m.month_start AS latest_month,
    m.subjects_n,
    m.flag_count,
    m.mean_pri,
    m.deviation_share,
    m.suppressed
FROM communities c
LEFT JOIN LATERAL (
    SELECT * FROM community_month_agg
    WHERE community_id = c.community_id
    ORDER BY month_start DESC
    LIMIT 1
) m ON true;

-- Comments
COMMENT ON TABLE communities IS 'Communities (coarse geographic + demographic groupings). Officials can read.';
COMMENT ON TABLE community_week_agg IS 'Weekly aggregates (K≥10 enforced). suppressed=TRUE → counts NULL.';
COMMENT ON TABLE community_month_agg IS 'Monthly aggregates (K≥10 enforced). suppressed=TRUE → counts NULL.';
COMMENT ON TABLE community_vectors IS 'pgvector embeddings for similarity search. 128-dim feature vectors.';
COMMENT ON TABLE community_clusters IS 'K-means/DBSCAN clusters (underserved communities). Descriptive labels only.';

COMMENT ON COLUMN community_week_agg.suppressed IS 'TRUE if subjects_n < 10 (K-anonymity). All counts NULL when suppressed.';
COMMENT ON COLUMN community_month_agg.suppressed IS 'TRUE if subjects_n < 10 (K-anonymity). All counts NULL when suppressed.';
COMMENT ON COLUMN community_clusters.label IS 'Descriptive cluster label (e.g., "Higher deviation, lower PRI"). NOT diagnostic.';
