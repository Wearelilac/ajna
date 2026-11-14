# 00-data-protection-model

**Read first:** `00-glossary.md`, `00-stack-and-conventions.md`.

Privacy is the headline feature of Ajna. Every later file must comply with this one, and each file's Acceptance checks must include the checks from this file that apply to it.

## 1. The three data classes

### Class 1: RAW AUDIO

| Rule | Detail |
|---|---|
| Never persisted | No file, no database, no AsyncStorage/MMKV, no cache, no crash report, no log. |
| Never transmitted | No network call carries audio, audio-derived waveforms, spectrograms, embeddings, transcripts or speech-to-text output. |
| Ephemeral buffers only | Fixed-size in-memory ring buffer (`edge buffer`), default 10 s, overwritten continuously, zero-filled on session end, app background, and error. |
| Inference is local | Model runs on-device. No cloud fallback. If the model cannot load, the feature is unavailable. |
| No speech content | The model scores acoustic and tone features. No speech recognition is performed, so no words are ever produced. |
| Provable in tests | See section 6. |

### Class 2: Derived features and de-identified flags

| Rule | Detail |
|---|---|
| Minimal | Only the allow-listed fields below, nothing else. Unknown fields cause the request to be rejected. |
| Pseudonymous | Keyed by `subject_id` (random UUID). No name, email, phone, device ID, IP or precise location stored with a flag. |
| Short retention | De-identified flags kept 30 days at row level, then only counted into aggregates (see section 5). |
| Consent-gated | Rejected unless an active `monitor_me` consent exists. |

**De-identified flag: field-by-field allow-list**

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | server generated |
| `subject_id` | uuid | pseudonymous |
| `signature` | enum | `vocal_tension_spike`, `distress_signature`, `verbal_aggression_pattern`, `hesitation_cluster` |
| `confidence` | number 0-1, 2 decimals | thresholded on device |
| `time_bucket` | timestamptz truncated to the hour | not exact time |
| `model_version` | string | for audit and drift |
| `session_id` | uuid | random, not linkable to audio |

Explicitly **not** allowed: GPS or location (a coarse region comes from the user's vault profile, only when needed for aggregation), duration of speech, number of speakers, loudness values, raw or summarised feature vectors, any text.

### Class 3: Health data (PHI)

| Rule | Detail |
|---|---|
| Encrypted vaults | AES-256-GCM, per-user data key (DEK) wrapped by a key-encryption key (KEK). |
| RLS | `ENABLE` and `FORCE ROW LEVEL SECURITY` on every table with user or health data. |
| Consent-gated | Wearable processing needs `wearable` consent. Use in population views needs `population_use` consent. |
| Least privilege | Roles: `app_user`, `app_reviewer`, `app_official`, `app_worker`, `app_admin`. Officials never read row-level PHI. |
| Auditable | Every read of vault data by anyone other than the owner writes an audit chain row. |

## 2. Key handling

- **Envelope encryption.** Each user has a random 256-bit DEK. The DEK is wrapped (AES-256-GCM) with the KEK and stored next to the vault. Each encrypted field uses a fresh 96-bit nonce and the `subject_id` as additional authenticated data (AAD).
- **KEK** comes from `AJNA_KEK_BASE64` in Render env settings for the hackathon. KEK access is isolated in one module (`common/crypto`). Production note for the Handoff: move to a managed KMS and rotate.
- **Rotation (prototype scope):** KEK rotation re-wraps DEKs only. The rotation script exists and is tested on seed data.
- No key is ever logged, returned by an API or committed to the repo.
- Mobile: session tokens in `expo-secure-store`. No health data cached unencrypted on the device beyond what the OS secure store holds.
- Hashes for audit use SHA-256. Passwords (if any) use argon2id.

## 3. Pseudonymisation

- The identity-to-`subject_id` link lives only in the user's vault.
- Population queries run on `subject_id` and coarse attributes (age band, region code), never names.
- Small-cell suppression: any group with fewer than `K = 10` subjects is hidden in all Official views.
- Re-identification by a Reviewer is a separate, audited action requiring a recorded reason, and exists only for crisis review and care-gap outreach.

## 4. Consent

| Scope | Gates |
|---|---|
| `wearable` | Ingest, baselines, PRI |
| `monitor_me` | Starting a monitor session, accepting flags |
| `population_use` | Including the subject's flags and metrics in population aggregates |

- Granting is explicit, per scope, with plain-language text stored by version.
- Revoking stops new processing immediately, and a revocation job deletes or detaches derived data within the retention rules in section 5.
- A session in progress ends the moment `monitor_me` is revoked.

## 5. Retention (hackathon defaults, all configurable)

| Data | Retention |
|---|---|
| Raw audio | 0 seconds beyond the ring buffer window |
| De-identified flags (row level) | 30 days, then deleted and counted into aggregates |
| Crisis review records | 12 months (outcome and notes, no flag detail beyond the signature) |
| Wearable daily metrics (vault) | 13 months rolling |
| Baselines and PRI | 13 months rolling |
| Outreach drafts and decisions | 12 months |
| Audit chain | 24 months, never edited |
| Aggregates (suppressed, no subject IDs) | Indefinite |

## 6. How "provable by test" works for raw audio

All of these must exist by `M5.1` and run in CI. `P0.2` builds the first versions.

1. **Static import test:** `src/edge/` imports no network, filesystem, storage or logging module. A lint rule fails the build if one appears.
2. **Runtime spy test:** during a scripted monitor session with a synthetic audio source, spy on `fetch`, `XMLHttpRequest`, WebSocket, filesystem writes and storage writes. Assert zero calls whose payload size exceeds the allow-listed flag size, and zero calls at all while no threshold was crossed.
3. **Canary test:** feed audio containing a unique canary byte pattern. After the session, scan the JS heap snapshot, outgoing request logs, app storage directories and logs for the pattern. Assert it appears nowhere except (briefly) inside the buffer, and the buffer is zero-filled after stop.
4. **Payload shape test:** every outbound flag is validated against the allow-list schema. A request with any extra field is rejected by the API with a `FLAG_FIELD_NOT_ALLOWED` error.
5. **Permissions test:** microphone permission is requested only when the user starts a session, and released on stop.

Be honest in the findings: these tests give strong evidence for the app's own code paths. They do not prove anything about the OS or third-party native libraries, and the findings note must say which native libraries were inspected.

## 7. Row-Level Security pattern

- Per request, the API sets `SET LOCAL app.subject_id` / `app.role` inside the transaction.
- Policies: a user sees rows where `subject_id = current_setting('app.subject_id')::uuid`. Reviewers see rows assigned to them. Officials have no policy on row-level tables and read only from suppressed aggregate views.
- Workers use `app_worker` with explicit, narrow grants.
- `B5.1` ships an RLS test suite: for every table, each role is tried against every operation, and the matrix is compared with expected results.

## 8. Wording rules (UI, API messages, drafts, docs)

- Always: "flagged for review", "elevated indicator", "advisory", "for human review".
- Never: "diagnosed", "has [condition]", "detected depression/psychosis/etc.", "alert sent to patient", "emergency dispatched".
- Every screen or page that shows a flag carries the line: *"This is an advisory indicator for human review, not a diagnosis."*
- Crisis-related flags show a named owner and a state (`new`, `assigned`, `in_review`, `closed`), never a promise of intervention.
- A wording lint (banned-word grep) runs over UI strings and outreach templates in CI.

## 9. No-automatic-action rules

1. No automatic diagnosis.
2. No automatic message to a patient or user about a flag. Outreach is always a draft that a human approves, and sending is out of band.
3. No automatic emergency action. A crisis flag enters the crisis review queue and notifies Reviewers. A human decides what happens next.
4. Every flag has a human owner field in the data model, and a flag with no owner after the configured time escalates to the Reviewer team lead, not to emergency services.

## 10. Incident basics (hackathon scope)

- If a raw-audio leak is ever suspected: disable Feature B remotely (feature flag), and record it in the audit chain.
- Data subject deletion request: delete the vault and DEK, detach `subject_id` rows. Aggregates remain because they contain no subject data.
