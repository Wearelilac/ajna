-- P0.3: Aggregation query examples for population health analytics

-- ============================================
-- 1. Weekly flag counts by region (K-anonymity enforced)
-- ============================================
SELECT 
    DATE_TRUNC('week', time_bucket) AS week,
    region_code,
    age_band,
    signature,
    COUNT(*) AS flag_count
FROM population_flags
WHERE time_bucket >= NOW() - INTERVAL '12 weeks'
GROUP BY DATE_TRUNC('week', time_bucket), region_code, age_band, signature
HAVING COUNT(*) >= 10 -- Small-cell suppression (K=10)
ORDER BY week DESC, flag_count DESC;

-- ============================================
-- 2. Community PRI trends (month-over-month)
-- ============================================
WITH monthly_trends AS (
    SELECT 
        community_id,
        month,
        avg_pri,
        high_risk_pct,
        LAG(avg_pri) OVER (PARTITION BY community_id ORDER BY month) AS prev_avg_pri
    FROM community_pri_monthly
    WHERE month >= DATE_TRUNC('month', NOW() - INTERVAL '6 months')
)
SELECT 
    community_id,
    month,
    avg_pri,
    high_risk_pct,
    ROUND(avg_pri - prev_avg_pri, 2) AS avg_pri_change
FROM monthly_trends
WHERE prev_avg_pri IS NOT NULL
    AND member_count >= 10 -- K-anonymity check
ORDER BY ABS(avg_pri - prev_avg_pri) DESC
LIMIT 20;

-- ============================================
-- 3. Care gap identification (frequent flags)
-- ============================================
WITH flag_clusters AS (
    SELECT 
        age_band,
        region_code,
        community_id,
        signature,
        COUNT(DISTINCT session_id) AS session_count,
        COUNT(*) AS flag_count
    FROM population_flags
    WHERE time_bucket >= NOW() - INTERVAL '4 weeks'
    GROUP BY age_band, region_code, community_id, signature
    HAVING COUNT(DISTINCT session_id) >= 5 -- 5+ sessions with flags
)
SELECT 
    age_band,
    region_code,
    community_id,
    signature,
    session_count,
    flag_count,
    CASE 
        WHEN session_count >= 10 THEN 'high'
        WHEN session_count >= 7 THEN 'medium'
        ELSE 'low'
    END AS severity,
    'frequent_flags' AS gap_type
FROM flag_clusters
WHERE session_count >= 10 -- Small-cell suppression
ORDER BY session_count DESC;

-- ============================================
-- 4. Vector similarity search (find similar acoustic patterns)
-- ============================================
-- Example: Find flags with similar embeddings to a target flag
WITH target_flag AS (
    SELECT embedding 
    FROM population_flags 
    WHERE id = :target_flag_id
)
SELECT 
    pf.id,
    pf.signature,
    pf.confidence,
    pf.region_code,
    pf.age_band,
    pf.time_bucket,
    1 - (pf.embedding <=> tf.embedding) AS similarity -- cosine similarity
FROM population_flags pf
CROSS JOIN target_flag tf
WHERE pf.id != :target_flag_id
ORDER BY pf.embedding <=> tf.embedding -- <=> is cosine distance operator
LIMIT 50;

-- ============================================
-- 5. Retention cleanup (30-day window)
-- ============================================
-- Daily job to delete expired flags
DELETE FROM population_flags
WHERE created_at < NOW() - INTERVAL '30 days';

-- ============================================
-- 6. RLS verification (app_official should NOT read individual flags)
-- ============================================
-- Run as app_official:
SET LOCAL app.role = 'official';

-- This should return 0 rows (policy denies)
SELECT COUNT(*) FROM population_flags; 

-- This should work (aggregates allowed)
SELECT COUNT(*) FROM community_pri_monthly WHERE member_count >= 10;
SELECT COUNT(*) FROM care_gaps WHERE estimated_size >= 10;

-- ============================================
-- 7. Index performance comparison (HNSW vs IVFFlat)
-- ============================================
-- EXPLAIN ANALYZE both index types
EXPLAIN (ANALYZE, BUFFERS) 
SELECT id, signature, confidence
FROM population_flags
ORDER BY embedding <=> '[0,0,0,...,0]'::vector(512) -- Zero vector
LIMIT 100;

-- For IVFFlat (if created):
-- SET ivfflat.probes = 10; -- Tune probes for recall/speed tradeoff
-- EXPLAIN (ANALYZE, BUFFERS) ...same query...
