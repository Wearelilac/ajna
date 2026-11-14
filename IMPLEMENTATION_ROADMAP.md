# Ajna Implementation Roadmap

**Status:** Repository initialized and ready for Phase 1 (P0 Prototypes)  
**Last Updated:** November 14, 2026

---

## Completed ✓

### Repository Foundation
- ✓ Git initialized and first commit made
- ✓ Workspace structure created per `00-stack-and-conventions.md`
- ✓ `.gitignore` and `.env.example` configured
- ✓ Root `package.json` with workspace setup
- ✓ `README.md` with quick start guide

### P0.1 Prototype Scaffolding
- ✓ Payload schema (`canonical.schema.json`)
- ✓ Simulator (`simulator.py`) - 1,000 subjects × 60 days with injected events
- ✓ Baseline computer (`baseline.py`) - 30-day rolling, mean/SD + median/MAD
- ✓ Deviation detector - single and multi-metric rules
- ✓ PRI formula (`pri.py`) - 0-100 resilience score from weighted z-scores
- ✓ Findings template (`P0.1-findings-template.md`)
- ✓ Run script (`run_p0.1.sh`)

### Foundation Infrastructure
- ✓ `common/limits.ts` skeleton (to be populated after P0.1)
- ✓ Documentation structure

---

## Next Immediate Actions (Session 1)

### 1. Run P0.1 Prototype (1.5 hours)
```bash
cd c:\Ajna\prototypes\p0.1
pip install -r requirements.txt
python simulator.py --subjects=1000 --days=60 --seed=42 --output=data/synthetic.csv
python baseline.py --data=data/synthetic.csv --baselines=data/baselines.csv --flags=data/deviation_flags.csv
python pri.py --data=data/synthetic.csv --baselines=data/baselines.csv --output=data/pri.csv
```

**Expected Outputs:**
- `data/synthetic.csv` - 57,000 rows
- `data/baselines.csv` - 30-day baselines
- `data/deviation_flags.csv` - Flagged deviations (expect 94-96% detection on injected events)
- `data/pri.csv` - Resilience index scores

**Acceptance Criteria:**
- [ ] Simulator reproducible (same seed = identical output)
- [ ] Baseline computation < 30 seconds
- [ ] Deviation detection: ≥90% on injected events
- [ ] False flag rate: <1 per subject-month

### 2. Fill P0.1 Findings Note (30 min)
Copy `findings/P0.1-findings-template.md` → `findings/P0.1-findings.md`
Fill with actual results from Step 1.
Set verdict: **go** (assuming all checks pass)

### 3. Scaffold P0.2 (On-Device Acoustic) (1 hour)
Create `prototypes/p0.2/` with:
- `README.md` - Experiment plan
- `requirements.txt` - Python/Node deps (ONNX Runtime, audio capture libs)
- Decision checkpoint on `react-native-ovo` existence

### 4. Scaffold P0.3 (pgvector) (1 hour)
Create `prototypes/p0.3/` with:
- `README.md` - Experiment plan
- Population generator (1M subjects, communities, clusters)
- Aggregation query templates

### 5. Scaffold P0.4 (Care-Gap Routing) (1 hour)
Create `prototypes/p0.4/` with:
- `README.md` - Experiment plan
- Pathway library schema
- Draft generation templates

---

## Phase 1 Timeline (P0 Prototypes)

| Prototype | Duration | Blocker For |
|-----------|----------|------------|
| **P0.1** Wearable | 1-2 sessions | B2.1, B2.2, M2.1 |
| **P0.2** Acoustic | 2-3 sessions | M3.1, M3.2, B3.1, W3.1 |
| **P0.3** pgvector | 2-3 sessions | B4.1, B4.2, W4.1, W4.2 |
| **P0.4** Care Gaps | 2-3 sessions | B4.2, W4.2 |

**Total:** 7-11 sessions (can run P0.2, P0.3, P0.4 in parallel after P0.1 go verdict)

---

## Phase 2: Foundation Build (B1.x, M1.x, W1.1)

**Starts after:** All P0 verdicts achieved  
**Duration:** 4-5 sessions  
**Output:** Deployed API, mobile app shell, web dashboard shell + contract

### B1.1: API Skeleton & Contract
- NestJS (Fastify) boilerplate
- Env validation (zod)
- Error shape
- Request ID middleware
- Pino logging
- @nestjs/swagger → `contracts/openapi.v1.yaml` v1
- Deployed to Render

### B1.2: Database + RLS + Vaults
- PostgreSQL schema (subjects, vaults, vault_items)
- Migrations (node-pg-migrate)
- DB roles (app_user, app_reviewer, app_official, app_worker, app_admin)
- AES-256-GCM crypto
- Seed script (20 subjects)

### B1.3: Auth, Consent, Audit
- Registration/login (argon2id)
- JWT + refresh tokens
- Guards (Auth, Roles, Consent)
- Audit chain (SHA-256)
- Endpoints for auth, consent, audit verify

### B1.4: Workers & Scoring Service
- BullMQ on Upstash Redis
- Queue naming scheme
- Sweeper (pending_jobs)
- FastAPI scoring service (stub endpoints)
- Scoring client (timeout/retry/circuit-breaker)

### M1.1: Mobile Scaffold
- Expo dev build
- NativeWind + tokens
- zustand stores
- TanStack Query
- Generated client from contract
- Tab navigation (Radar, Monitor Me, Privacy, Settings)

### M1.2: Mobile Auth & Consent
- Sign-in/logout screens
- Secure token storage
- Session bootstrap
- Consent UI (3 scopes)
- Monitor Me tab gating

### W1.1: Web Dashboard Scaffold
- Next.js 15 (App Router)
- Tailwind
- Staff sign-in
- Role-based middleware
- Placeholder pages (/review, /population, /admin)

---

## Features (Phase 3-5)

### Feature A: Wearable Health Radar (B2.1, B2.2, M2.1)
**Starts after:** P0.1 go verdict + Foundation complete  
**Duration:** 2 sessions

- Wearable ingest (batch, simulator, demo seed)
- Baseline + PRI worker
- Radar tab (metrics, PRI, flags, demo loader)

### Feature B: Monitor Me (M3.1, M3.2, B3.1, W3.1)
**Starts after:** P0.2 go verdict + Foundation complete  
**Duration:** 3 sessions

- Acoustic engine (buffer, model, inference, thresholding)
- Session UX (indicator, flag emission, offline queue)
- Flag ingest & crisis review queue
- Reviewer console

### Feature C: Population & Care Gaps (B4.1, B4.2, W4.1, W4.2)
**Starts after:** P0.3, P0.4 go verdicts + Foundation complete  
**Duration:** 3 sessions

- Population aggregation (pgvector, clustering)
- Care-gap detection & matching
- Draft generation & review
- Population dashboard
- Care-gap UI

---

## Phase 6: Hardening (B5.1, M5.1, W5.1)

**Starts after:** All features complete  
**Duration:** 2 sessions

- Retention jobs + schema cleanup
- RLS audit matrix
- Subject deletion
- Audit chain verification
- API hardening (rate limits, CORS, secret scanning)
- Ephemerality proof suite (M5.1)
- Demo seed + end-to-end tests
- Documentation: privacy impact, demo script, coverage matrix

---

## Key Decision Checkpoints

| Decision | Status | Target |
|----------|--------|--------|
| `react-native-ovo` exists? | ⏳ P0.2 | Must verify or replace |
| ONNX vs TFLite? | ⏳ P0.2 | Will pick based on Expo compat |
| Foreground-only Monitor Me? | ✓ Approved | P0.2 validates OS limits |
| BullMQ throughput acceptable? | ⏳ P0.1 | Need numbers for `common/limits.ts` |
| Suppression K=10? | ✓ Approved | Enforced in P0.3 |
| Template vs. template+LLM drafts? | ⏳ P0.4 | Will recommend after test |

---

## Success Criteria for Full Implementation

- [ ] All 4 P0 findings notes published with **go** verdicts
- [ ] Contract (`openapi.v1.yaml`) generated and linted, client types current
- [ ] All acceptance checks pass with concrete evidence (numbers, test results, logs)
- [ ] No plaintext PHI outside vaults; audio never leaves device (proven by tests)
- [ ] Wording: zero instances of "diagnosed", "auto-send", "dispatch" in code/UI
- [ ] Demo workflow: 5-7 min rehearsed walkthrough with all features accessible
- [ ] Coverage matrix: every master plan requirement traced to built code + acceptance evidence
- [ ] RLS matrix: 100% of PHI tables tested by role
- [ ] Audit chain: verified on 100k rows; tamper detected
- [ ] Deployed to Render: health check passing

---

## Environment Setup

### Local Development

```bash
# Install Node dependencies
npm install

# Python environments (separate per service)
cd services/scoring && python -m venv venv && . venv/Scripts/Activate.ps1 && pip install -r requirements.txt

# Set environment
cp .env.example .env.local
# Edit .env.local with real values or Render URL in preview/prod

# Run backend
npm run dev:api

# Run mobile dev build (requires EAS CLI)
npm run dev:mobile

# Run web dashboard
npm run dev:web

# Run scoring service
cd services/scoring && python -m uvicorn app.main:app --reload
```

### Deployment

See `docs/DEPLOY.md` (to be created in W5.1) for Render + Upstash setup.

---

## Critical Files to Watch

| File | Purpose | Updated By |
|------|---------|-----------|
| `contracts/openapi.v1.yaml` | Single source of truth for API | All B files on endpoint changes |
| `contracts/scoring.internal.v1.yaml` | Scoring service contract | B1.4, B2.2 |
| `findings/P0.*.md` | Feasibility verdicts gating production | Each P0.x |
| `apps/api/src/common/limits.ts` | Throughput/retention limits from P0s | B1.1 (updated after P0.1) |
| `.env.example` | Configuration reference | Updated as new secrets added |
| `docs/privacy-impact.md` | Data protection evidence | B5.1 |

---

## Current Git Status

```
✓ Initialized git repository
✓ First commit: "Initial project structure: foundation docs, P0.1 prototype skeleton, env config"
→ Next commit after P0.1: "P0.1 findings: go verdict, baseline limits ready"
```

---

## Notes for Implementation

1. **No stubs, no placeholders:** Every file in `prototypes/` is throwaway experiment code, not production. Real implementation goes in `apps/` or `services/`.

2. **Contract-first:** Before coding a backend endpoint, ensure it's documented in the OpenAPI contract. Clients generate from it.

3. **Acceptance evidence:** Every acceptance check needs a concrete deliverable (test result, number, screenshot, log excerpt).

4. **Gates enforce order:** Production files cannot start until their P0 findings note exists with verdict `go` or `limited-go`.

5. **Parallel tracks:** P0s can run in parallel (P0.2, P0.3, P0.4 after P0.1 go). Foundation B1.x, M1.x, W1.1 can start once contract skeleton exists. Features A, B, C are gated separately.

---

## Quick Reference Commands

```bash
# Run all tests
npm run test

# Build all packages
npm run build

# Lint and type-check
npm run lint && npm run type-check

# Regenerate clients from contract
npm run contract:gen

# Reset demo database
npm run demo:reset

# View git log
git log --oneline | head -20
```

---

**Next Session:** Run P0.1, collect findings, set verdict → **go** to begin Foundation Build.
