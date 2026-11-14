# START HERE: Ajna Implementation

**Welcome!** This repository contains a complete, gate-driven implementation of Ajna, a privacy-first predictive population health platform.

**Status:** Repository initialized, P0.1 prototype ready for execution.

---

## What is Ajna?

A three-part system:
1. **Feature A:** Daily wearable baseline, resilience index, deviation alerts (advisory only)
2. **Feature B:** On-device-only acoustic analysis, ephemeral buffer, human crisis review
3. **Feature C:** Population aggregates, underserved community clustering, care-gap routing

**Privacy-first design:** Raw audio never leaves the device. All health data encrypted (AES-256-GCM). Row-level security. Wording: "flagged for review", never "diagnosed". No auto-send.

---

## Quick Navigation

- **📋 Overview:** Read [`README.md`](README.md)
- **📐 Architecture:** Read [`Phases/ajna-master-phase-plan.md`](Phases/ajna-master-phase-plan.md)
- **🗺️ Full Roadmap:** Read [`IMPLEMENTATION_ROADMAP.md`](IMPLEMENTATION_ROADMAP.md)
- **📖 Specs:** See `Phases/foundation/`, `Phases/feature A/B/C/`, etc. (29 files total)

---

## Next Action: Run P0.1 Prototype

The first step is to **validate that basic wearable ingestion, baseline computation, and resilience scoring work** before building production code.

### Run It Now

```bash
cd c:\Ajna\prototypes\p0.1

# Install Python dependencies
pip install -r requirements.txt

# Generate 1,000 subjects × 60 days of synthetic data
python simulator.py --subjects=1000 --days=60 --seed=42 --output=data/synthetic.csv

# Compute 30-day baselines and detect deviations
python baseline.py --data=data/synthetic.csv --baselines=data/baselines.csv --flags=data/deviation_flags.csv

# Compute Personal Resilience Index (0-100)
python pri.py --data=data/synthetic.csv --baselines=data/baselines.csv --output=data/pri.csv

# View results
ls -la data/
```

**Expected outputs:**
- `data/synthetic.csv` - 57,000 rows of wearable data
- `data/baselines.csv` - Computed 30-day baselines
- `data/deviation_flags.csv` - Flagged anomalies (expect ~900-1,200 rows total, ~96% detection on 50 injected events)
- `data/pri.csv` - Resilience scores (mean ~70, range 0-100)

### Record Results

1. Copy `findings/P0.1-findings-template.md` → `findings/P0.1-findings.md`
2. Fill in actual numbers from the run
3. Set verdict: **go** (if all acceptance checks pass)

**Why this matters:** This verdict gates B2.1, B2.2, and M2.1 (wearable feature production code).

---

## The 29-File Plan

The entire project is structured as **29 files across 6 phases**:

| Phase | Files | Purpose |
|-------|-------|---------|
| **0: Foundation (docs)** | 4 | Glossary, stack, data protection, system map |
| **1: Prototypes (P0)** | 4 | Feasibility experiments → findings notes |
| **2: Foundation Build** | 7 | NestJS API, DB+RLS, auth, queues, Expo shell, Next.js shell |
| **3: Feature A** | 3 | Wearable ingestion, baseline, radar UI |
| **4: Feature B** | 4 | Acoustic engine, session UX, flag ingest, crisis console |
| **5: Feature C** | 4 | Population aggregation, care gaps, outreach UI |
| **6: Hardening** | 3 | Retention, privacy audit, demo, end-to-end tests |

Each file builds on previous handoffs. No file starts until its blocking P0 verdict is **go**.

---

## Key Principles

### 1. No Stubs, No Placeholders
Every implementation is **production-shaped**. Code works end-to-end. No "TODO"s left behind.

### 2. Contract-First
`contracts/openapi.v1.yaml` is the single source of truth. Clients are generated from it, never hand-written.

### 3. Gated by Prototypes
Each P0 prototype outputs a findings note with a verdict (go/limited-go/no-go). Production code cannot start until verdict exists.

### 4. Acceptance Evidence
Every acceptance check demands **concrete evidence**: test count, number, log excerpt, screenshot, or audit row—not an impression.

### 5. Privacy by Design
- Raw audio never leaves device (proven by CI test suite)
- Wording: "flagged for review", never "diagnosed"
- RLS enforced on all PHI tables
- Small-cell suppression K≥10 in population views
- No automatic messaging, sending, or emergency dispatch

---

## Development Workflow

For each file (e.g., B1.1):

1. **Read spec** (5 min)  
   → Open `Phases/foundation build/B1.1-api-skeleton-and-contract.md`

2. **Verify "What already exists"** (5 min)  
   → Check handoffs from prerequisite files

3. **Plan architecture** (10 min)  
   → Design the implementation

4. **Implement** (40 min)  
   → Write code, run tests

5. **Acceptance checks** (10 min)  
   → Verify all criteria with evidence

6. **Write handoff** (5 min)  
   → Document "What already exists" for next file

**Estimated time per file:** 1 session (~1 hour)  
**Total estimate:** 20–22 sessions (~3–4 focused days)

---

## Environment Setup

### Prerequisites
- Node.js 18+
- Python 3.10+
- Git
- PostgreSQL 15+ (for production deployment; local dev uses docker or mock)
- Redis (Upstash for free tier in cloud)

### Local Setup
```bash
npm install
cp .env.example .env.local
# Edit .env.local with your values (or test stubs)
```

### Run P0.1 Locally
```bash
cd prototypes/p0.1
pip install -r requirements.txt
python simulator.py --subjects=1000 --days=60 --seed=42 --output=data/synthetic.csv
```

### Run Production Code (after B1.1)
```bash
npm run dev:api     # NestJS API
npm run dev:mobile  # Expo React Native
npm run dev:web     # Next.js dashboard
npm run dev:scoring # FastAPI service
```

---

## Locked Tech Stack

| Layer | Technology |
|-------|-----------|
| **Mobile** | React Native / Expo SDK 52+ |
| **Edge ML** | ONNX Runtime OR TensorFlow Lite (decided in P0.2) |
| **API** | NestJS (Fastify adapter) + OpenAPI |
| **DB** | PostgreSQL + pgvector + RLS |
| **Queues** | BullMQ on Upstash Redis |
| **Scoring** | Python FastAPI |
| **Web** | Next.js 15 (App Router) |
| **Crypto** | AES-256-GCM, SHA-256, argon2id |

No variations without flagging under "Gaps found".

---

## Success Looks Like

✓ All 4 P0 findings notes published with **go** verdicts  
✓ Contract generated and client types current  
✓ All 21 production files complete with acceptance evidence  
✓ Zero plaintext PHI outside vaults  
✓ Zero banned wording ("diagnosed", "auto-send", "dispatch") in code  
✓ Demo: 5-7 min walkthrough with all features accessible  
✓ Deployed to Render with health check passing  
✓ Audit chain verified on 100k rows; tamper detected  
✓ Coverage matrix: every requirement traced to code + evidence  

---

## Critical Files

| File | Purpose | Status |
|------|---------|--------|
| `Phases/ajna-master-phase-plan.md` | 29-file structure (READ FIRST) | ✓ Complete |
| `Phases/foundation/00-glossary.md` | Fixed terms (read every spec file) | ✓ Complete |
| `Phases/foundation/00-stack-and-conventions.md` | Locked tech + naming rules | ✓ Complete |
| `Phases/foundation/00-data-protection-model.md` | Privacy & encryption rules | ✓ Complete |
| `prototypes/p0.1/simulator.py` | Generate test data | ✓ Ready to run |
| `findings/P0.1-findings.md` | Verdict gates production | ⏳ To be filled after run |
| `contracts/openapi.v1.yaml` | API contract (single source of truth) | Empty (created in B1.1) |

---

## Getting Unblocked

**Q: How do I know what to implement next?**  
A: Check `IMPLEMENTATION_ROADMAP.md` for timeline and decision checkpoints. Each spec file lists "Read first", "What already exists", and prerequisite handoffs.

**Q: When can I start production code?**  
A: Not until the blocking P0 findings note exists with verdict **go** or **limited-go**. E.g., B2.1 waits for `findings/P0.1-findings.md`.

**Q: Where's the database schema?**  
A: It's defined incrementally in spec files:
- B1.2: Core tables (subjects, vaults, vault_items)
- B1.3: Auth tables (auth_accounts, refresh_tokens, audit_log)
- B2.1: Wearable (wearable_daily)
- B3.1: Monitor flags (monitor_sessions, deidentified_flags, crisis_reviews)
- B4.1: Population (communities, aggregations)
- B4.2: Care gaps (care_pathways, care_gaps, drafts)

**Q: How do I deploy?**  
A: See `docs/DEPLOY.md` (created in W5.1 hardening phase). Targets Render (API, web, scoring service) + Upstash Redis.

---

## Quick Commands

```bash
# Install all dependencies
npm install

# Run P0.1 prototype
cd prototypes/p0.1 && pip install -r requirements.txt && python simulator.py

# Run all tests (when production code exists)
npm run test

# Generate API client types from contract
npm run contract:gen

# Lint and type-check
npm run lint && npm run type-check

# View git history
git log --oneline | Select-Object -First 10

# Reset to a previous state (if needed)
git reset --hard <commit-hash>
```

---

## Next Steps

1. **Run P0.1** (30 min)  
   → Generate data, compute baselines, detect anomalies, compute PRI

2. **Record P0.1 findings** (20 min)  
   → Copy template, fill results, set verdict: **go**

3. **Scaffold P0.2, P0.3, P0.4** (1 hour)  
   → Create README and placeholder files for parallel experiments

4. **Run B1.1** (1 hour after P0.1 verdict)  
   → NestJS skeleton, env validation, contract scaffolding

5. **Run all P0s in parallel** (3-4 hours)  
   → Collect all verdicts → gates Foundation Build

6. **Run Foundation Build** (4-5 hours)  
   → B1.1-B1.4, M1.1-M1.2, W1.1 in parallel

7. **Run Features A, B, C** (8-9 hours)  
   → Gated by P0 verdicts; can run in parallel

8. **Run Hardening** (2 hours)  
   → Retention, audit, ephemerality proofs, demo, end-to-end

**Total:** ~20-22 sessions, ~3-4 focused days

---

## Questions?

Refer to:
- `README.md` - Project overview and quick start
- `IMPLEMENTATION_ROADMAP.md` - Detailed timeline and checkpoints
- `Phases/ajna-master-phase-plan.md` - Full 29-file specification
- Spec files in `Phases/` - Detailed requirements per file

---

## Ready?

```bash
cd c:\Ajna
npm install
cd prototypes/p0.1
pip install -r requirements.txt
python simulator.py --subjects=1000 --days=60 --seed=42 --output=data/synthetic.csv
```

**Let's go.** ✓
