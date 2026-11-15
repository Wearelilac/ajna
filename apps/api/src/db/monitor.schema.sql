-- B3.1: Monitor sessions and de-identified flags schema
-- Crisis review queue for human workflow

-- Monitor sessions (tracks active acoustic monitoring sessions)
CREATE TABLE monitor_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL,
    
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    end_reason TEXT, -- 'user_stopped', 'timeout', 'consent_revoked'
    
    -- Session cap from P0.2 (600 seconds = 10 minutes)
    max_duration_sec INTEGER NOT NULL DEFAULT 600,
    
    CONSTRAINT session_duration_check CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE INDEX idx_monitor_sessions_subject ON monitor_sessions (subject_id);
CREATE INDEX idx_monitor_sessions_started ON monitor_sessions (started_at DESC);
CREATE INDEX idx_monitor_sessions_active ON monitor_sessions (subject_id, ended_at) WHERE ended_at IS NULL;

-- De-identified flags (7-field allow-list from 00-data-protection-model.md)
CREATE TABLE deidentified_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL,
    session_id UUID NOT NULL REFERENCES monitor_sessions(id) ON DELETE CASCADE,
    
    -- Allow-list fields (from P0.2)
    signature TEXT NOT NULL, -- 'distress_signature', 'vocal_tension_spike', etc.
    confidence NUMERIC(3, 2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    time_bucket TIMESTAMPTZ NOT NULL, -- Truncated to hour server-side
    model_version TEXT NOT NULL, -- 'distress-1.0', etc.
    
    -- Session metadata (NOT audio, NOT features, NOT transcript)
    session_duration_sec INTEGER,
    energy_db NUMERIC(5, 2),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 30-day retention (from P0.2)
    CONSTRAINT flag_retention_check CHECK (created_at > NOW() - INTERVAL '30 days')
);

CREATE INDEX idx_deidentified_flags_subject ON deidentified_flags (subject_id);
CREATE INDEX idx_deidentified_flags_session ON deidentified_flags (session_id);
CREATE INDEX idx_deidentified_flags_time_bucket ON deidentified_flags (time_bucket DESC);
CREATE INDEX idx_deidentified_flags_created ON deidentified_flags (created_at DESC);

-- Crisis reviews (human workflow queue)
CREATE TABLE crisis_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL,
    
    -- State machine: new → assigned → in_review → closed
    state TEXT NOT NULL DEFAULT 'new' CHECK (state IN ('new', 'assigned', 'in_review', 'closed')),
    
    -- Ownership (Reviewer assigned to this case)
    owner_id UUID, -- staff_id from auth system
    
    -- Outcome (set when closed)
    outcome TEXT CHECK (outcome IN ('no_action', 'routine_follow_up_requested', 'escalated_to_clinical_lead')),
    
    -- Flag aggregation (rolling window: group repeated flags)
    first_flag_at TIMESTAMPTZ NOT NULL,
    last_flag_at TIMESTAMPTZ NOT NULL,
    flag_count INTEGER NOT NULL DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    
    -- SLA tracking (escalate to team lead if unassigned past SLA)
    escalated_to_lead BOOLEAN NOT NULL DEFAULT FALSE,
    
    CONSTRAINT state_outcome_check CHECK (
        (state = 'closed' AND outcome IS NOT NULL) OR 
        (state != 'closed' AND outcome IS NULL)
    ),
    CONSTRAINT owner_state_check CHECK (
        (state IN ('assigned', 'in_review', 'closed') AND owner_id IS NOT NULL) OR
        (state = 'new' AND owner_id IS NULL)
    )
);

CREATE INDEX idx_crisis_reviews_subject ON crisis_reviews (subject_id);
CREATE INDEX idx_crisis_reviews_state ON crisis_reviews (state);
CREATE INDEX idx_crisis_reviews_owner ON crisis_reviews (owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX idx_crisis_reviews_created ON crisis_reviews (created_at DESC);
CREATE INDEX idx_crisis_reviews_unassigned_sla ON crisis_reviews (created_at) WHERE state = 'new' AND escalated_to_lead = FALSE;

-- Crisis review events (audit trail for state transitions)
CREATE TABLE crisis_review_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES crisis_reviews(id) ON DELETE CASCADE,
    
    from_state TEXT NOT NULL,
    to_state TEXT NOT NULL,
    
    actor_id UUID NOT NULL, -- staff_id who performed transition
    reason TEXT, -- Required for some transitions
    
    at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Audit chain (hash-linked for immutability)
    prev_hash TEXT,
    row_hash TEXT NOT NULL
);

CREATE INDEX idx_crisis_review_events_review ON crisis_review_events (review_id);
CREATE INDEX idx_crisis_review_events_at ON crisis_review_events (at DESC);

-- RLS policies

ALTER TABLE monitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deidentified_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_review_events ENABLE ROW LEVEL SECURITY;

-- monitor_sessions: owner can read/write their own, app_worker can read all
CREATE POLICY monitor_sessions_owner_rw ON monitor_sessions
    FOR ALL TO app_user
    USING (subject_id::text = current_setting('app.subject_id', true))
    WITH CHECK (subject_id::text = current_setting('app.subject_id', true));

CREATE POLICY monitor_sessions_worker_read ON monitor_sessions
    FOR SELECT TO app_worker
    USING (true);

-- deidentified_flags: owner CANNOT read (de-identified), app_worker can write, app_reviewer can read
CREATE POLICY deidentified_flags_owner_deny ON deidentified_flags
    FOR ALL TO app_user
    USING (false);

CREATE POLICY deidentified_flags_worker_write ON deidentified_flags
    FOR INSERT TO app_worker
    WITH CHECK (true);

CREATE POLICY deidentified_flags_reviewer_read ON deidentified_flags
    FOR SELECT TO app_reviewer
    USING (true);

-- crisis_reviews: app_reviewer can read all, app_official NO ACCESS
CREATE POLICY crisis_reviews_reviewer_read ON crisis_reviews
    FOR SELECT TO app_reviewer
    USING (true);

CREATE POLICY crisis_reviews_reviewer_update ON crisis_reviews
    FOR UPDATE TO app_reviewer
    USING (true)
    WITH CHECK (true);

CREATE POLICY crisis_reviews_official_deny ON crisis_reviews
    FOR ALL TO app_official
    USING (false);

-- crisis_review_events: app_reviewer can read/write
CREATE POLICY crisis_review_events_reviewer_rw ON crisis_review_events
    FOR ALL TO app_reviewer
    USING (true)
    WITH CHECK (true);

-- Comments
COMMENT ON TABLE monitor_sessions IS 'Acoustic monitoring sessions (metadata only, NO audio). Max 10 minutes per P0.2.';
COMMENT ON TABLE deidentified_flags IS '7-field allow-list only (NO audio, NO transcript, NO precise location). 30-day retention.';
COMMENT ON TABLE crisis_reviews IS 'Human workflow queue. State machine: new → assigned → in_review → closed. NO automatic actions.';
COMMENT ON COLUMN crisis_reviews.outcome IS 'no_action | routine_follow_up_requested | escalated_to_clinical_lead (set when closed)';
COMMENT ON COLUMN crisis_reviews.escalated_to_lead IS 'TRUE if unassigned past SLA (notifies staff, NOT user)';
