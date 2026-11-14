# Ajna

Privacy-first predictive population health platform combining wearable baselines, on-device acoustic analysis, and population risk dashboards for human review and care routing.

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL 15+ (with pgvector extension)
- Redis (Upstash for free tier)
- Expo CLI

### Local Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local

# Start API
npm run dev:api

# Start mobile dev build
npm run dev:mobile

# Start web dashboard
npm run dev:web

# Start scoring service
npm run dev:scoring
```

## Project Structure

```
ajna/
  apps/
    api/              # NestJS backend (Fastify)
    mobile/           # Expo React Native
    web/              # Next.js 15 dashboard
  services/
    scoring/          # FastAPI scoring service
  contracts/
    openapi.v1.yaml   # API contract (single source of truth)
    scoring.internal.v1.yaml
  prototypes/         # P0 throwaway experiments
  findings/           # P0 findings notes
  docs/               # Documentation
```

## Architecture

- **Backend:** NestJS (Fastify), PostgreSQL + pgvector, RLS, AES-256-GCM vaults
- **Mobile:** Expo SDK 52+, on-device acoustic inference (ONNX/TFLite), ephemeral ring buffer
- **Web:** Next.js 15, staff dashboard (Reviewer/Official/Admin roles)
- **Queues:** BullMQ on Upstash Redis
- **Crypto:** AES-256-GCM (vaults), SHA-256 (audit chain), argon2id (passwords)

## Key Features

### Feature A: Wearable Health Radar
- Daily wearable metrics ingestion
- 30-day personal baseline computation
- >3 SD deviation detection (advisory only)
- Personal Resilience Index (0-100)

### Feature B: Monitor Me (Acoustic)
- User-toggled, foreground-only session
- On-device acoustic/tone analysis
- Ephemeral 10s ring buffer (audio never leaves phone)
- De-identified flag → human crisis review queue

### Feature C: Population Risk Dashboard
- Community-level aggregates (small-cell suppressed K≥10)
- Underserved-community clustering (pgvector)
- Care-gap detection (Well-Child Visits, screenings)
- Outreach draft review (never auto-sent)

## Security & Privacy

- **No raw audio transmitted:** Proven by CI test suite (lint, runtime spy, canary pattern scan)
- **Encryption:** AES-256-GCM at rest in vaults; SHA-256 audit chains
- **RLS:** Enforced on all PHI tables; Officials see suppressed aggregates only
- **Consent:** Per-scope (wearable, monitor_me, population_use), revocable at any time
- **Retention:** 30d flags → aggregates, 13m metrics, 24m audit log, never auto-send

## Wording Rules

- ✓ "Flagged for review", "advisory indicator", "elevated indicator"
- ✗ "Diagnosed", "detected condition", "patient has", "alert sent to patient", "emergency dispatched"

## Development Workflow

1. **Read spec file** → Understand requirements
2. **Verify handoff** → Check what already exists
3. **Plan architecture** → Design the implementation
4. **Implement** → Write production-quality code
5. **Run acceptance checks** → Verify all criteria
6. **Write handoff** → Document for the next file

## Testing

```bash
# Run all tests
npm run test

# Run with coverage
npm run test -- --coverage

# Lint and type check
npm run lint && npm run type-check
```

## Deployment

See `docs/DEPLOY.md` for Render + Upstash setup.

## Documentation

- `docs/privacy-impact.md` - Data flows, retention, controls
- `docs/demo-script.md` - 5-7 min walkthrough
- `docs/coverage-check.md` - Requirements coverage matrix
- `docs/ephemerality-evidence.md` - Audio privacy proofs

## License

Proprietary. Built for the Future Health challenge.

## Support

See `docs/KNOWN_LIMITATIONS.md` for gaps and deferred items.
