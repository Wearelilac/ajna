# P0.3: pgvector Population Aggregation & Risk Store

**Purpose:** Prove that pgvector can store de-identified flags and PRI summaries at realistic population scale (100k subjects) with RLS, small-cell suppression, and support similarity search for underserved communities.

**Scope:**
1. Provision Render PostgreSQL with pgvector
2. Generate synthetic 100k subject population
3. Create aggregation queries (flags/community/week, mean PRI/community/month)
4. Apply small-cell suppression (K=10)
5. Build community embeddings (flag rates, PRI, deprivation)
6. Test similarity search and clustering
7. Verify RLS (app_official cannot read row-level data)
8. Test 30-day retention job

**Status:** Scaffold in place. Implementation starting.

## Files to Create

### Synthetic Data
- `generate_population.py` - 100k subjects with flags, PRI, care history
- `load_data.sql` - Load synthetic data into Render Postgres
- `conftest.py` - Pytest fixtures

### Queries
- `aggregation_queries.sql` - Flags/week, PRI/month, care gap counts
- `similarity_search.sql` - Find communities similar to X
- `clustering.sql` - k-means/DBSCAN grouping

### Indexing
- `create_indexes.sql` - HNSW vs IVFFlat comparison

### Tests
- `test_aggregation.py` - Query latency at 1k/10k/100k/1M rows
- `test_suppression.py` - Small-cell K=10 enforcement
- `test_rls.py` - app_official cannot read row-level tables
- `test_retention.py` - 30-day flag cleanup, aggregate unchanged
- `test_clustering.py` - Precision/recall on planted underserved communities

### Documentation
- `findings/P0.3-findings.md` - Verdict + limits

## Acceptance Checks (9 total)

- [ ] pgvector version and Render tier limits recorded
- [ ] Row counts: 1k/10k/100k/1M flags loaded (report times)
- [ ] Aggregation queries timed at each scale (median + worst vs 2sec target)
- [ ] HNSW vs IVFFlat compared (build time, index size, query latency, recall@10)
- [ ] Cluster recovery: precision/recall on planted underserved communities
- [ ] Small-cell test: K=10 enforced (show test)
- [ ] RLS test: app_official denied on row-level tables
- [ ] Retention job test: old flags deleted, aggregates unchanged
- [ ] Verdict recorded (go/limited-go/no-go) with limits

## Estimated Time: 2-3 hours
