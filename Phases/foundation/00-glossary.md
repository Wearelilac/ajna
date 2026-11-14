# 00-glossary

**Read first:** none. Every other file reads this one.

Fixed terms. Use them exactly. Do not introduce synonyms in code, UI copy, tests or docs.

## Product terms

| Term | Definition |
|---|---|
| **Ajna** | The product. Third-chakra name. Never "Monitor Me" in code or copy, except where "Monitor Me" names the acoustic feature below. |
| **Monitor Me** | The user-toggled on-device acoustic and tone analysis feature (Feature B). A feature name only, not the product name. |
| **Wearable Health Radar** | Feature A: multi-stream daily wearable metrics, baselines and the Personal Resilience Index. |
| **Population Risk Dashboard** | Feature C: the web dashboard for public health officials, plus care-gap routing. |
| **Personal Resilience Index (PRI)** | A 0-100 score per user per day, higher means more resilient. Computed from deviations of that day's metrics against the user's own 30-day baseline. Advisory only. |
| **30-day baseline** | Per user, per metric: mean and standard deviation over the trailing 30 days, excluding the current day. Needs at least 14 valid days before any deviation flag may be produced (the rule is confirmed or changed by `P0.1`). |
| **Deviation flag** | Raised when a metric's z-score against the 30-day baseline has absolute value greater than 3. Carries the metric, z-score and date. Advisory, "flagged for review". |
| **Distress signature** | A de-identified mathematical result from the on-device model: one of a closed set of classes (`vocal_tension_spike`, `distress_signature`, `verbal_aggression_pattern`, `hesitation_cluster`), a confidence value and a coarse time bucket. Contains no audio, no words, no transcript. |
| **Edge buffer** | The ephemeral in-memory ring buffer on the phone that holds a few seconds of audio for inference. Never written to disk, never sent. Zeroed on overwrite and on session end. |
| **De-identified flag** | The only thing Feature B sends to the cloud: a distress signature plus the minimum metadata in `00-data-protection-model.md`. Linked to a pseudonymous ID, never to a name. |
| **Monitor session** | One user-started, user-stoppable period during which the edge buffer is active. Has a visible on-screen indicator while running. Ends automatically at the cap set in `M3.2`. |
| **Care-gap** | A person (or household) overdue for an approved preventive service: Well-Child Visit, adult comprehensive screening, immunisation catch-up. |
| **Well-Child Visit** | A scheduled preventive check for a child, per the approved schedule held in `care_pathways`. |
| **Care pathway** | An entry in the approved list of preventive care routes, owned and edited by humans. The system maps risk and care-gaps to pathways. It never invents one. |
| **Outreach draft** | Tailored message text generated for a care-gap. Always a draft. Only a human staff member can approve it, and sending happens outside Ajna in this prototype. |
| **Crisis review** | The human-owned workflow that handles a de-identified flag of distress. Has a named owner, a state machine and an outcome. |
| **Reviewer** | Staff role that works the crisis review queue and outreach drafts. |
| **Official** | Public health official role. Sees aggregated data only. |
| **Flagged for review** | The only allowed wording for any risk output. Never "diagnosed", "detected condition", "patient has", "alert sent to patient". |

## Technical terms

| Term | Definition |
|---|---|
| **Pseudonymous ID** | Random UUID v4 (`subject_id`) used in all derived data. The link to the real identity lives only in the user's vault. |
| **Vault** | A user's AES-256-GCM encrypted store for PHI and the identity link, using envelope encryption. |
| **PHI** | Protected health information: identity, wearable metrics, care history, clinical notes. Data class 3. |
| **RLS** | Row-Level Security in PostgreSQL. Enabled and forced on every table holding user or health data. |
| **Consent record** | Row recording that a user granted or revoked one scope (`wearable`, `monitor_me`, `population_use`). Required before the matching data is processed. Revocable at any time. |
| **Contract** | `contracts/openapi.v1.yaml`. The single source of API truth. Backend files publish into it, clients only read it. |
| **Findings note** | Output of a `P0` file: `findings/P0.x-findings.md` with a verdict of `go`, `limited-go` or `no-go`. |
| **Handoff block** | The paste-ready "What already exists" block at the end of every prompt file. |
| **Gaps found** | Heading inside a Handoff listing any deviation from the locked stack or any unresolved issue. |
| **Audit chain** | Append-only audit log where each row stores `SHA-256(previous_hash || canonical_row)`. |
| **Small-cell suppression** | Population views hide any group with fewer than `K` subjects (default `K = 10`). |

## Data classes (full rules in `00-data-protection-model.md`)

| Class | Name | One-line rule |
|---|---|---|
| 1 | Raw audio | Never persisted, never transmitted. |
| 2 | Derived features / de-identified flags | Minimal, pseudonymous, short retention. |
| 3 | Health data (PHI) | Encrypted vault, RLS, consent-gated. |

## Banned wording (applies to code, UI, logs, API messages, tests)

`diagnose`, `diagnosed`, `diagnosis` (for system output), `patient is`, `auto-send`, `automatically notified the patient`, `emergency dispatched`. Use "flagged for review", "elevated indicator", "advisory".
