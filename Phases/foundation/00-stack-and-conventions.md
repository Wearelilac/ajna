# 00-stack-and-conventions

**Read first:** `00-glossary.md`.

## Decisions made at approval

- Backend framework: **NestJS** (Fastify adapter), TypeScript.
- Feature B runs as **foreground monitor sessions** only, with a visible indicator. Background listening is out of scope unless `P0.2` proves it is viable and a later file is explicitly added.
- Files in the master plan may be merged or split when it helps the coding agent. If you do, keep IDs stable, renumber nothing, and note the change under "Gaps found" in the handoff.

## 1. Locked stack

| Tier | Choice |
|---|---|
| Mobile | React Native, Expo SDK 52+ (**development build**, not Expo Go), NativeWind, react-native-reanimated, zustand, TanStack Query |
| Edge ML | ONNX Runtime Mobile (`onnxruntime-react-native`) or TensorFlow Lite; native audio stream via a streaming library chosen in `P0.2` (the brief's `react-native-ovo` is unverified and must be proven or replaced, recorded under Gaps found) |
| API | NestJS (Fastify adapter) Web Service on Render; OpenAPI via `@nestjs/swagger`; validation via `zod` (with `nestjs-zod`) |
| Scoring | Python FastAPI service on Render: scikit-learn, numpy, scipy |
| Workers | BullMQ on Upstash Redis |
| Database | Render PostgreSQL with `pgvector`, Row-Level Security enabled and forced |
| Crypto | AES-256-GCM at rest in vaults, SHA-256 hash chain for audit logs |
| Web | Next.js 15 (App Router) + Tailwind CSS |

**Rule:** any library outside this list must be flagged under "Gaps found" in that file's Handoff with a reason. Supporting utilities (zod, openapi-typescript, pino, jest, pytest) are pre-approved.

## 2. Repository layout

```
ajna/
  contracts/
    openapi.v1.yaml          # single API contract, written by B files only
    scoring.internal.v1.yaml # API <-> FastAPI internal contract
  findings/                  # P0 findings notes
  prompts/                   # these markdown files
  apps/
    api/                     # NestJS
      src/
        modules/<feature>/   # controller, service, dto, repo, *.spec.ts
        common/              # errors, logging, config, guards, crypto
        workers/             # BullMQ processors
        db/                  # migrations, rls policies, seeds
    mobile/                  # Expo
      src/
        app/                 # routes
        features/<feature>/  # screens, hooks, state
        edge/                # acoustic engine ONLY (see rule below)
        api/                 # generated client, never hand-edited
        lib/
    web/                     # Next.js 15
      src/
        app/                 # App Router routes
        features/<feature>/
        api/                 # generated client, never hand-edited
  services/
    scoring/                 # FastAPI
      app/ (routers, models, scoring, config)
      tests/
  prototypes/                # throwaway P0 code, never imported by production code
```

**Edge isolation rule:** `apps/mobile/src/edge/` is the only place that may touch the microphone or audio buffers. It has no import of the network client, no filesystem import, and no logging of buffer contents. A lint rule and a test enforce this (see `00-data-protection-model.md`).

## 3. Naming

- Files: `kebab-case.ts`. React components: `PascalCase.tsx`. Python: `snake_case.py`.
- DB: `snake_case`, plural tables (`wearable_daily`), primary keys `id uuid`, pseudonymous subject key `subject_id uuid`, timestamps `timestamptz` named `*_at`.
- Endpoints: `/v1/<resource>`, plural nouns, verbs only for actions (`POST /v1/crisis-reviews/{id}/assign`).
- Queues: `ajna.<domain>.<action>` (e.g. `ajna.wearable.compute-baseline`).
- Env vars: `AJNA_` prefix for app config, uppercase snake.
- Prompt file IDs: `P0.x`, `Bn.n`, `Mn.n`, `Wn.n` as in the master plan.

## 4. Error shape (all tiers, all endpoints)

```json
{
  "statusCode": 422,
  "error": "Unprocessable Entity",
  "code": "WEARABLE_PAYLOAD_INVALID",
  "message": "metric hrv_rmssd_ms must be between 1 and 300",
  "requestId": "9f0c2e1a-..."
}
```

- `code` is `UPPER_SNAKE`, stable, listed in the contract.
- `message` is safe to show to a user: no PHI, no stack traces, no SQL.
- `requestId` is generated at the edge of the API (or taken from `x-request-id` if valid) and returned in a response header too.
- FastAPI uses the same shape through an exception handler.
- Clients branch on `code`, never on `message`.

## 5. Logging rules

- Structured JSON (`pino` for Node, `structlog` or stdlib JSON for Python).
- Every log line has `requestId`, `service`, `level`, `event`.
- **Never log:** audio or audio-derived arrays, PHI values (metric values, names, emails, phone numbers), tokens, keys, full request bodies.
- Log `subject_id` only where needed for support, and never next to PHI.
- Workers log job id, queue and outcome, not payloads.
- Mobile logs are dev-only and the `edge/` module logs nothing but counters and timings.
- A CI test greps the codebase and a runtime test checks sample logs for banned patterns.

## 6. Environment validation

- Each service validates env at boot with a zod schema (Node) or pydantic-settings (Python) and **refuses to start** on a missing or malformed value, printing variable names only, never values.
- Required at minimum: `DATABASE_URL`, `REDIS_URL`, `AJNA_KEK_BASE64` (32 bytes), `AJNA_JWT_SECRET`, `AJNA_SCORING_URL`, `AJNA_SCORING_TOKEN`, `AJNA_ENV`.
- `.env.example` is committed and kept in sync. Real secrets live only in Render/Upstash env settings.

## 7. Contract discipline

- Backend files add or change endpoints in `contracts/openapi.v1.yaml` and list them in their Handoff.
- Clients run codegen (`openapi-typescript`) against the contract. They never write a fetch to an undeclared path.
- CI fails if the generated client differs from the committed one.

## 8. Testing baseline

- Jest (API, mobile, web), pytest (scoring), Playwright (web smoke), Detox or Maestro optional (mobile smoke).
- Every Acceptance check demands evidence: a number, a test name or an output excerpt, not an impression.

## 9. Hackathon scoping rule

Production-shaped thinking, demo-sized scope. When a requirement threatens a small team's timeline, build the thin vertical slice, record the cut under "Gaps found", and move on.
