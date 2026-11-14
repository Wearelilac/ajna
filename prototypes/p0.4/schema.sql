-- P0.4: Care-gap routing and outreach draft review schema
-- Demonstrates: approved pathway library, pgvector mapping, review state machine, audit chain

CREATE EXTENSION IF NOT EXISTS vector;

-- Approved care pathways (clinical content, must be approved by authorized staff)
CREATE TABLE care_pathways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    
    -- Eligibility rules (age_bands, indicator_types, required_history)
    eligibility JSONB NOT NULL,
    -- Example: {"age_bands": ["0-5"], "indicator_types": ["overdue_screening"], "max_days_overdue": 60}
    
    -- Plain-language description for staff
    description TEXT NOT NULL,
    
    -- Approved wording snippets (templates, safe phrases)
    wording_snippets JSONB NOT NULL,
    -- Example: {"greeting": "Dear {{guardian_name}}", "body": "{{child_name}} may benefit from...", "cta": "Please call..."}
    
    -- Ownership and approval audit
    owner_role TEXT NOT NULL, -- 'clinical_lead', 'wellness_coordinator', etc.
    approved_by UUID NOT NULL, -- staff_id who approved this pathway
    approved_on TIMESTAMPTZ NOT NULL,
    
    -- Vector embedding for similarity matching (384-dim from all-MiniLM-L6-v2)
    embedding vector(384),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_care_pathways_embedding 
    ON care_pathways 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Care gaps (detected risks, overdue screenings, flag patterns)
CREATE TABLE care_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL, -- Encrypted in vault, not exposed in population view
    
    gap_type TEXT NOT NULL, -- 'overdue_screening', 'frequent_flags', 'sustained_low_pri'
    due_date DATE, -- For overdue screenings
    
    -- Indicator summary (no PHI, safe for routing)
    indicator_summary JSONB NOT NULL,
    -- Example: {"age_band": "0-5", "screening_type": "well_child_18m", "days_overdue": 45}
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_care_gaps_subject ON care_gaps (subject_id);
CREATE INDEX idx_care_gaps_gap_type ON care_gaps (gap_type);
CREATE INDEX idx_care_gaps_created ON care_gaps (created_at DESC);

-- Pathway matches (result of eligibility filter + vector search)
CREATE TABLE pathway_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    care_gap_id UUID NOT NULL REFERENCES care_gaps(id) ON DELETE CASCADE,
    pathway_id UUID NOT NULL REFERENCES care_pathways(id) ON DELETE CASCADE,
    
    rank INTEGER NOT NULL, -- 1 = best match, 2 = second-best, etc.
    similarity DECIMAL(5,4) NOT NULL, -- Cosine similarity score (0-1)
    
    -- Filter metadata (which eligibility rules matched)
    filtered_by JSONB NOT NULL,
    -- Example: {"age_band_match": true, "indicator_type_match": true, "overdue_window_ok": true}
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE (care_gap_id, pathway_id)
);

CREATE INDEX idx_pathway_matches_gap ON pathway_matches (care_gap_id);
CREATE INDEX idx_pathway_matches_pathway ON pathway_matches (pathway_id);

-- Outreach drafts (never sent automatically, always reviewed)
CREATE TABLE outreach_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    care_gap_id UUID NOT NULL REFERENCES care_gaps(id) ON DELETE CASCADE,
    pathway_id UUID NOT NULL REFERENCES care_pathways(id) ON DELETE CASCADE,
    
    -- Draft content
    body TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en', -- ISO 639-1 code
    reading_level TEXT, -- 'grade_5', 'grade_8', 'adult'
    
    -- Lifecycle status
    status TEXT NOT NULL DEFAULT 'draft',
    -- Legal states: draft → in_review → approved | edited_approved | rejected → closed
    
    -- Generation metadata
    generated_by TEXT NOT NULL, -- 'template_only' | 'template+llm'
    llm_model TEXT, -- If LLM used: 'gpt-4', 'claude-3', etc.
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_status CHECK (status IN ('draft', 'in_review', 'approved', 'edited_approved', 'rejected', 'closed'))
);

CREATE INDEX idx_outreach_drafts_gap ON outreach_drafts (care_gap_id);
CREATE INDEX idx_outreach_drafts_status ON outreach_drafts (status);
CREATE INDEX idx_outreach_drafts_created ON outreach_drafts (created_at DESC);

-- Draft reviews (audit chain for state transitions)
CREATE TABLE draft_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id UUID NOT NULL REFERENCES outreach_drafts(id) ON DELETE CASCADE,
    
    -- Reviewer identity
    reviewer_id UUID NOT NULL, -- staff_id (vault-encrypted)
    reviewer_role TEXT NOT NULL, -- 'reviewer', 'clinical_supervisor', etc.
    
    -- Transition
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    reason TEXT, -- Optional explanation for rejection or edits
    
    -- Edited content (if any)
    edited_body TEXT, -- NULL if no edits
    
    -- Hash chain for immutability
    prev_hash TEXT, -- SHA-256 of previous review in chain
    row_hash TEXT NOT NULL, -- SHA-256 of this row (canonical serialization)
    
    at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_from_status CHECK (from_status IN ('draft', 'in_review', 'approved', 'edited_approved', 'rejected', 'closed')),
    CONSTRAINT valid_to_status CHECK (to_status IN ('draft', 'in_review', 'approved', 'edited_approved', 'rejected', 'closed'))
);

CREATE INDEX idx_draft_reviews_draft ON draft_reviews (draft_id);
CREATE INDEX idx_draft_reviews_reviewer ON draft_reviews (reviewer_id);
CREATE INDEX idx_draft_reviews_at ON draft_reviews (at DESC);

-- Function to compute row hash for audit chain
CREATE OR REPLACE FUNCTION compute_review_hash(
    p_draft_id UUID,
    p_reviewer_id UUID,
    p_from_status TEXT,
    p_to_status TEXT,
    p_reason TEXT,
    p_edited_body TEXT,
    p_prev_hash TEXT,
    p_at TIMESTAMPTZ
) RETURNS TEXT AS $$
DECLARE
    canonical TEXT;
BEGIN
    -- Canonical serialization (order matters for deterministic hash)
    canonical := p_draft_id::TEXT || '|' ||
                 p_reviewer_id::TEXT || '|' ||
                 p_from_status || '|' ||
                 p_to_status || '|' ||
                 COALESCE(p_reason, '') || '|' ||
                 COALESCE(p_edited_body, '') || '|' ||
                 COALESCE(p_prev_hash, '') || '|' ||
                 p_at::TEXT;
    
    RETURN encode(sha256(canonical::bytea), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;
