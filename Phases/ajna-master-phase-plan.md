# Ajna — Master Phase Plan

**Product:** Ajna, a predictive population health platform for the "Future Health" challenge.
**Purpose of this file:** the index of every prompt file that will be written, in build order, with a coverage check. No other file is written until this structure is approved.

---

## 1. Product in one paragraph

Ajna finds high-risk individuals before an acute medical or psychiatric crisis, using (A) multi-stream wearable baselines, (B) a user-toggled, fully on-device acoustic and tone listener, and (C) a population dashboard that routes care gaps to human staff. Every flag is advisory, wording is "flagged for review" and never "diagnosed", and nothing is auto-diagnosed, auto-messaged to a patient, or auto-escalated to emergency services. Raw audio never leaves the device, and this is proven by test.

---

## 2. File ID scheme

| Prefix | Meaning |
|---|---|
| `00-` | Foundation files, referenced by every later file |
| `P0.x` | Feasibility prototypes (throwaway; output is a findings note with a go / limited-go / no-go verdict) |
| `B` | Backend (NestJS or Hono, FastAPI, workers, Postgres) |
| `M` | Mobile app (Expo React Native) |
| `W` | Web dashboard (Next.js 15) |

Every prompt file after the foundation uses these sections in this order:
Title → **Read first** → Purpose → What already exists → Scope → Out of scope → Contracts used → Data model → Rules and behaviour → Acceptance checks → Handoff.

---

## 3. Files, grouped by phase

### Phase 0 — Foundation (docs only)

| File | Content |
|---|---|
| `00-glossary.md` | Fixed terms: Personal Resilience Index, 30-day baseline, deviation flag, distress signature, care-gap, Well-Child Visit, edge buffer, de-identified flag, monitor session, RLS, vault, flagged for review |
| `00-stack-and-conventions.md` | Locked stack, folder layout per tier, naming, error shape `{ statusCode, error, code, message, requestId }`, logging rules, env validation |
| `00-data-protection-model.md` | Three data classes (raw audio / de-identified flags / PHI), key handling, retention, wording rules |
| `00-system-map.md` | All components, trust boundaries, what crosses each boundary and in which direction |

### Phase 1 — Feasibility prototypes (gate production work)

| File | Experiment | Gates |
|---|---|---|
| `P0.1-wearable-ingestion-sim.md` | Payload shapes, 30-day baseline, z-score deviation detection, BullMQ throughput on free Render/Upstash tiers | B2.x, M2.x |
| `P0.2-on-device-acoustic-inference.md` | ONNX/TFLite packaging in Expo (dev build), inference latency, battery per hour, Android/iOS mic and background limits, buffer ephemerality proof, false-trigger rate on a nuisance set | B3.x, M3.x, W3.x |
| `P0.3-pgvector-risk-store.md` | Flag storage, population aggregation queries, similarity/clustering for underserved-community views at realistic row counts | B4.x, W4.x |
| `P0.4-care-gap-routing.md` | Risk score to approved care pathway mapping, outreach draft generation, staff review workflow | B4.2, W4.2 |

Each P0 file ends with a findings note saved to `findings/P0.x-findings.md`. Production files for a feature must not start until that note exists.

### Phase 2 — Foundation build (parallel after all P0 notes exist)

| File | Content |
|---|---|
| `B1.1-api-skeleton-and-contract.md` | Service scaffold, env validation, error shape, request IDs, health endpoints, `contracts/openapi.v1.yaml` seeded |
| `B1.2-database-rls-and-vaults.md` | Schema, pseudonymous IDs, RLS policies, AES-256 encrypted vaults, key handling |
| `B1.3-auth-consent-and-audit.md` | Auth, role model (user / reviewer / official / admin), consent records, hash-chained audit log |
| `B1.4-workers-and-scoring-service.md` | BullMQ queues on Upstash, FastAPI scoring service skeleton, internal service contract |
| `M1.1-mobile-scaffold.md` | Expo SDK 52+, NativeWind, navigation, zustand, TanStack Query, typed client generated from the contract |
| `M1.2-mobile-auth-consent-and-secure-storage.md` | Sign-in, consent screens (per feature, revocable), secure storage |
| `W1.1-dashboard-scaffold.md` | Next.js 15 App Router, Tailwind, auth, role-based routing, typed client from the contract |

### Phase 3 — Feature A: Wearable Health Radar

| File | Content |
|---|---|
| `B2.1-wearable-ingest-and-simulator.md` | Ingest endpoint, payload validation, simulator for demo data |
| `B2.2-baseline-and-resilience-index.md` | 30-day baseline worker, >3 SD deviation flags, Personal Resilience Index, FastAPI anomaly scoring |
| `M2.1-resilience-radar-screens.md` | Daily metrics, Personal Resilience Index, deviation flag history, "flagged for review" wording |

### Phase 4 — Feature B: Monitor Me acoustic analysis (on-device)

| File | Content |
|---|---|
| `M3.1-acoustic-engine.md` | Native audio stream, ephemeral in-memory ring buffer, ONNX/TFLite inference, threshold logic |
| `M3.2-monitor-session-ux-and-flag-emission.md` | User toggle, session lifecycle, visible "listening" indicator, de-identified flag construction and send |
| `B3.1-deidentified-flag-ingest-and-review-queue.md` | Flag ingest with field allow-list, short retention, human-owned crisis review queue |
| `W3.1-crisis-review-console.md` | Reviewer console: queue, assignment, outcome recording, no auto-actions |

### Phase 5 — Feature C: Population dashboard and care-gap routing

| File | Content |
|---|---|
| `B4.1-population-aggregation-and-pgvector.md` | Aggregation queries, risk-to-pathway embedding map, underserved-community clustering, small-cell suppression |
| `B4.2-care-gap-routing-and-outreach-drafts.md` | Overdue Well-Child Visit / screening detection, pathway mapping, outreach drafts, staff review state machine (drafts are never auto-sent) |
| `W4.1-population-risk-dashboard.md` | Maps, community views, trends, filters |
| `W4.2-care-gap-and-outreach-review.md` | Care-gap worklist, draft review/edit/approve UI |

### Phase 6 — Hardening

| File | Content |
|---|---|
| `B5.1-retention-privacy-and-security-hardening.md` | Retention jobs, RLS test suite, audit-chain verification, rate limits, secret scanning |
| `M5.1-ephemerality-proof-and-polish.md` | Automated proof that no raw audio is persisted or transmitted, battery and permission edge cases, demo polish |
| `W5.1-demo-seed-and-end-to-end.md` | Demo dataset, end-to-end demo script, accessibility pass |

**Total:** 4 foundation + 4 prototype + 21 production = 29 files.

---

## 4. Build order and gates

1. Foundation files `00-*` (no code).
2. All P0 prototypes, each producing a findings note with a verdict.
3. B1.x, M1.1–M1.2 and W1.1 in parallel. Clients only read the published `contracts/openapi.v1.yaml`.
4. Feature phases, each gated by its P0 verdict:
   - A (needs P0.1)
   - B (needs P0.2)
   - C (needs P0.3 and P0.4)
5. Hardening last.

**Gate rule:** a `no-go` verdict on a P0 means the dependent feature phase is rewritten to the fallback named in the findings note before any production file starts. A `limited-go` means the production file's Scope must quote the limit it was granted.

**Contract rule:** each backend file publishes or updates endpoints in `contracts/openapi.v1.yaml` and lists them in its Handoff. Client files never invent endpoints.

---

## 5. Coverage check

| Requirement | Built by | Proven by |
|---|---|---|
| A: multi-stream daily metrics ingestion | B2.1, M2.1 | P0.1, B2.1 acceptance |
| A: 30-day personal baseline | B2.2 | P0.1 |
| A: >3 SD deviation flag | B2.2 | P0.1, B2.2 acceptance |
| A: Personal Resilience Index | B2.2, M2.1 | B2.2 acceptance |
| B: on-device-only inference | M3.1 | P0.2, M5.1 |
| B: ephemeral buffer, instant discard | M3.1 | P0.2, M5.1 |
| B: user-toggled monitor session | M3.2 | M3.2 acceptance |
| B: de-identified metadata flag only | M3.2, B3.1 | B3.1 field allow-list test |
| B: crisis flag goes to a human | B3.1, W3.1 | W3.1 acceptance |
| C: population aggregation | B4.1, W4.1 | P0.3 |
| C: underserved community view | B4.1, W4.1 | P0.3 |
| C: Well-Child / screening care gaps | B4.2, W4.2 | P0.4 |
| C: pgvector risk-to-pathway mapping | B4.1, B4.2 | P0.3, P0.4 |
| C: outreach drafts for staff review, never auto-sent | B4.2, W4.2 | P0.4, B4.2 acceptance |
| AES-256 encrypted vaults | B1.2 | B1.2, B5.1 |
| RLS on all PHI tables | B1.2 | B5.1 RLS test suite |
| Hash-chained audit log | B1.3 | B5.1 chain verification |
| Consent gating (per feature, revocable) | B1.3, M1.2 | B1.3, M1.2 acceptance |
| "Flagged for review", never "diagnosed" | `00-glossary`, all UI files | Wording lint in every UI file's acceptance checks |
| Contract-first clients | B1.1 plus all B files | W1.1 and M1.1 generated clients |

---

## 6. Where I disagree with, or want to flag, your brief

1. **`react-native-ovo`:** I can't confirm this library exists under that name. In P0.2 I'd test `onnxruntime-react-native` (or TFLite) together with a native audio streaming library, and record the chosen one under "Gaps found" in the handoff. Expo Go cannot load native ML modules, so P0.2 and everything in M3.x require an Expo development build.
2. **Backend framework:** you allowed NestJS or Hono. I propose **Hono** for the hackathon: less boilerplate, faster to a published OpenAPI contract. This is decided in `00-stack-and-conventions.md` and I'll flag it if you'd rather have NestJS.
3. **Background listening:** iOS and Android heavily restrict background microphone use. I'm scoping Feature B to foreground sessions with a visible indicator (plus Android foreground service if P0.2 shows it's viable), rather than promising always-on listening. P0.2 produces the real limits.
4. **Small-cell suppression (added):** population views hide groups below a minimum size so a dashboard can't point at an individual. It's a small addition to B4.1 and consistent with the privacy-first framing.
5. **Four P0s kept as you suggested,** no additions. A separate P0 for the crisis review workflow isn't needed because P0.4 covers the staff review state machine and B3.1 reuses it.

---

## 7. Decisions I need from you to approve

1. Is the structure and file list above approved as is, or should any file be merged or split?
2. (Decided: NestJS.)
3. (Decided: foreground-only monitor session is acceptable.)

Once you approve, I'll write the four `00-*` foundation files, one per message.
