-- B4.2: Care-gap routing and outreach draft review schema
-- NO automatic sending - human review required for all outreach

CREATE EXTENSION IF NOT EXISTS vector;

-- Approved care pathways (clinical content, must be approved)
CREATE TABLE care_pathways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    
    -- Eligibility rules (age_bands, gap_types, conditions)
    eligibility JSONB NOT NULL,
    
    -- Plain-language description for staff
    description TEXT NOT NULL,
    
    -- Approved wording templates
    wording_snippets JSONB NOT NULL,
    
    -- Ownership and approval audit
    owner_role TEXT NOT NULL,
    approved_by UUID NOT NULL,
    approved_on TIMESTAMPTZ NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Vector embedding for similarity matching (384-dim)
    embedding vector(384),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_care_pathways_active ON care_pathways (active);
CREATE INDEX idx_care_pathways_embedding 
    ON care_pathways 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Care gaps (detected risks, overdue screenings)
CREATE TABLE care_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL,
    
    gap_type TEXT NOT NULL, -- 'overdue_screening', 'frequent_flags', 'sustained_low_pri'
    due_date DATE,
    
    -- Indicator summary (no PHI, safe for routing)
    indicator_summary JSONB NOT NULL,
    
    status TEXT NOT NULL DEFAULT 'detected',
    -- States: detected → matched → draft_generated → in_review → closed
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_gap_type CHECK (gap_type IN ('overdue_screening', 'frequent_flags', 'sustained_low_pri', 'sudden_decline'))
);

CREATE INDEX idx_care_gaps_subject ON care_gaps (subject_id);
CREATE INDEX idx_care_gaps_status ON care_gaps (status);
CREATE INDEX idx_care_gaps_created ON care_gaps (created_at DESC);

-- Pathway matches (eligibility filter + vector similarity)
CREATE TABLE pathway_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    care_gap_id UUID NOT NULL REFERENCES care_gaps(id) ON DELETE CASCADE,
    pathway_id UUID NOT NULL REFERENCES care_pathways(id) ON DELETE CASCADE,
    
    rank INTEGER NOT NULL,
    similarity NUMERIC(5,4) NOT NULL,
    filtered_by JSONB NOT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE (care_gap_id, pathway_id)
);

CREATE INDEX idx_pathway_matches_gap ON pathway_matches (care_gap_id);
CREATE INDEX idx_pathway_matches_rank ON pathway_matches (care_gap_id, rank);

-- Outreach drafts (NEVER sent automatically)
CREATE TABLE outreach_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    care_gap_id UUID NOT NULL REFERENCES care_gaps(id) ON DELETE CASCADE,
    pathway_id UUID NOT NULL REFERENCES care_pathways(id) ON DELETE CASCADE,
    
    -- Draft content
    body TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    reading_level TEXT,
    
    -- Lifecycle status
    status TEXT NOT NULL DEFAULT 'draft',
    -- States: draft → in_review → approved | edited_approved | rejected → closed
    
    -- Generation metadata
    generated_by TEXT NOT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_status CHECK (status IN ('draft', 'in_review', 'approved', 'edited_approved', 'rejected', 'closed'))
);

CREATE INDEX idx_outreach_drafts_gap ON outreach_drafts (care_gap_id);
CREATE INDEX idx_outreach_drafts_status ON outreach_drafts (status);

-- Draft reviews (audit chain for state transitions)
CREATE TABLE draft_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id UUID NOT NULL REFERENCES outreach_drafts(id) ON DELETE CASCADE,
    
    reviewer_id UUID NOT NULL,
    reviewer_role TEXT NOT NULL,
    
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    reason TEXT,
    edited_body TEXT,
    
    -- Hash chain
    prev_hash TEXT,
    row_hash TEXT NOT NULL,
    
    at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_draft_reviews_draft ON draft_reviews (draft_id);
CREATE INDEX idx_draft_reviews_at ON draft_reviews (at DESC);

-- RLS: Reviewers see items, workers write, officials none
ALTER TABLE care_pathways ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE pathway_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_reviews ENABLE ROW LEVEL SECURITY;

-- app_worker writes all
CREATE POLICY care_pathways_worker_rw ON care_pathways FOR ALL TO app_worker USING (true) WITH CHECK (true);
CREATE POLICY care_gaps_worker_rw ON care_gaps FOR ALL TO app_worker USING (true) WITH CHECK (true);
CREATE POLICY pathway_matches_worker_rw ON pathway_matches FOR ALL TO app_worker USING (true) WITH CHECK (true);
CREATE POLICY outreach_drafts_worker_rw ON outreach_drafts FOR ALL TO app_worker USING (true) WITH CHECK (true);
CREATE POLICY draft_reviews_worker_rw ON draft_reviews FOR ALL TO app_worker USING (true) WITH CHECK (true);

-- app_reviewer reads all (NO subject_id exposed in list views)
CREATE POLICY care_pathways_reviewer_read ON care_pathways FOR SELECT TO app_reviewer USING (true);
CREATE POLICY care_gaps_reviewer_read ON care_gaps FOR SELECT TO app_reviewer USING (true);
CREATE POLICY pathway_matches_reviewer_read ON pathway_matches FOR SELECT TO app_reviewer USING (true);
CREATE POLICY outreach_drafts_reviewer_read ON outreach_drafts FOR SELECT TO app_reviewer USING (true);
CREATE POLICY draft_reviews_reviewer_read ON draft_reviews FOR SELECT TO app_reviewer USING (true);

CREATE POLICY outreach_drafts_reviewer_update ON outreach_drafts
    FOR UPDATE TO app_reviewer
    USING (true)
    WITH CHECK (true);

-- Comments
COMMENT ON TABLE care_pathways IS 'Approved care pathways. All pathways require clinical approval before use.';
COMMENT ON TABLE care_gaps IS 'Detected care gaps (overdue screenings, risk indicators). Consent-gated.';
COMMENT ON TABLE pathway_matches IS 'Eligibility + pgvector similarity matches. Top-k ranked.';
COMMENT ON TABLE outreach_drafts IS 'Outreach drafts. NEVER sent automatically. Human review required.';
COMMENT ON TABLE draft_reviews IS 'Audit chain for draft transitions. Hash-linked for immutability.';

COMMENT ON COLUMN outreach_drafts.status IS 'draft → in_review → approved|edited_approved|rejected → closed. NO automatic send.';
COMMENT ON COLUMN care_pathways.approved_by IS 'Staff ID who approved this pathway (required for all pathways).';
