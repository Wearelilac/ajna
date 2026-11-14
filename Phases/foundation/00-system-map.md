# 00-system-map

**Read first:** `00-glossary.md`, `00-stack-and-conventions.md`, `00-data-protection-model.md`.

## 1. Components

| ID | Component | Tech | Hosted on |
|---|---|---|---|
| C1 | Mobile app (user) | Expo React Native | User's phone |
| C1a | Edge acoustic engine | ONNX/TFLite + native audio stream, inside `apps/mobile/src/edge/` | User's phone |
| C2 | API gateway / backend | NestJS (Fastify) | Render Web Service |
| C3 | Workers | BullMQ | Render Background Worker + Upstash Redis |
| C4 | Database | PostgreSQL + pgvector + RLS | Render PostgreSQL |
| C5 | Scoring service | FastAPI (scikit-learn, numpy, scipy) | Render Web Service (private) |
| C6 | Web dashboard | Next.js 15 | Render Web Service or static host |
| C7 | Wearable source | Simulator, or vendor API payloads | External / `prototypes/` |

## 2. Diagram

```
 [Wearable source C7] --(daily metrics payloads)--+
                                                  v
 [Phone C1] -- (HTTPS, JWT) --> [API C2] --enqueue--> [Redis/BullMQ C3]
   |                              |  ^                    |
   | C1a edge engine              |  |                    | jobs: baseline, PRI, aggregation,
   | (audio stays here)           |  |                    |       care-gap, retention, audit
   | de-identified flag only ---->|  |                    v
                                  |  +---- reads/writes  [Postgres + pgvector C4]  (RLS, vaults)
                                  |                         ^           ^
                                  +-- internal HTTPS --> [Scoring C5] --+ (via API/worker only)
                                                              
 [Dashboard C6] -- (HTTPS, JWT, role) --> [API C2]   (Reviewers, Officials)
```

Only C2 and C3 talk to C4 and C5. C1 and C6 never touch the database or scoring service directly.

## 3. Trust boundaries

| # | Boundary | Trust change |
|---|---|---|
| TB1 | Phone (C1) to internet | Everything the phone sends is untrusted input. Raw audio does not cross this boundary at all. |
| TB2 | Within the phone: edge engine (C1a) to app JS (C1) | The only thing that may leave C1a is a de-identified flag object. Enforced by module isolation and tests. |
| TB3 | Public internet to API (C2) | Authenticated, validated, rate-limited. |
| TB4 | API/worker to Postgres (C4) | RLS and role-separated DB users. PHI fields encrypted before write. |
| TB5 | API/worker to scoring service (C5) | Private network, bearer token, only pseudonymous numeric inputs. No names or identifiers beyond `subject_id`. |
| TB6 | Web dashboard (C6) to API (C2) | Role-based: Reviewer sees assigned items, Official sees only suppressed aggregates. |

## 4. What crosses each boundary

| From to To | Direction | Crosses | Never crosses |
|---|---|---|---|
| Wearable source to API | in | Daily metric payload for a user (HRV, skin temp deviation, resting HR, sleep stages, activity/recovery) | Raw continuous sensor streams (out of scope) |
| Phone (C1) to API | in | Auth, consent changes, wearable metrics (if phone-sourced), **de-identified flags**, care-gap acknowledgements | **Raw audio, audio features, transcripts** |
| API to Phone | out | PRI and deviation history for that user, consent state, config (thresholds, model version) | Other users' data |
| API to Redis/BullMQ | out | Job ids and `subject_id` references | PHI values in job payloads |
| Worker to Postgres | both | Computed baselines, PRI, flags, aggregates, drafts | Plaintext PHI outside the vault interface |
| API/Worker to Scoring (C5) | out | Numeric arrays (metric history) keyed by a request-scoped id | Identity, names |
| Scoring to API/Worker | in | Scores, z-scores, anomaly labels, model version | Narrative text |
| API to Dashboard (C6) | out | Reviewer: assigned crisis reviews and care-gap drafts; Official: suppressed aggregates | Row-level PHI to Officials |
| Dashboard to API | in | Review outcomes, draft edits, approvals | Sending messages to patients (not implemented here) |

## 5. Flows (reference by later files)

**F1 Wearable ingest:** payload to C2 (validate, consent check) to vault write (C4) to enqueue `ajna.wearable.compute-baseline` (C3) to scoring call (C5) to baseline, PRI and deviation flags (C4) to visible on C1 and (aggregated) on C6.

**F2 Monitor Me session:** user taps start (consent checked locally and server-side) to C1a captures to ring buffer to on-device inference to threshold crossed to de-identified flag object to C1 sends to C2 to field allow-list validation to `crisis_review` item created (C4) to Reviewer sees it on C6. Audio is discarded continuously, never at the end.

**F3 Population view:** worker `ajna.population.aggregate` reads consented flags and PRI summaries, applies small-cell suppression, writes aggregate tables (C4), embeds pathway matches (pgvector), and the Official sees them on C6.

**F4 Care-gap routing:** worker finds overdue Well-Child Visits and screenings, maps risk to approved `care_pathways` through pgvector, generates an outreach **draft**, Reviewer approves, edits or rejects on C6. Approval records a decision only. No sending occurs.

**F5 Audit:** every PHI read by a non-owner, every crisis review state change and every draft decision appends a hash-chained row.

## 6. Failure and degradation

| Failure | Behaviour |
|---|---|
| Phone offline during a monitor session | Flags queue **as flag objects only**, in memory plus the app's local queue (allow-listed fields only), and send on reconnect. Never queue audio. |
| Scoring service down | Ingest still stores data. Jobs retry with backoff, and baselines show "pending". |
| Redis down | API still accepts ingest and writes a `pending_jobs` row, and a sweeper requeues. |
| Model fails to load on device | Monitor Me is unavailable with a clear message. There is no cloud fallback. |
| Reviewer queue unattended | Items past the configured time escalate to a team lead role. There is no automatic external action. |

## 7. Out of scope for the whole project

Native vendor OAuth with real wearable accounts (simulated or file-ingested instead), sending messages to patients, integration with real health records, background always-on listening, speech recognition.
