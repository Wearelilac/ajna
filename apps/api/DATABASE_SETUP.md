# B1.2 Database Setup Guide

This document describes the PostgreSQL database infrastructure for Ajna, including schema, RLS, encryption, and migration steps.

## Overview

**Architecture:**
- PostgreSQL 16+ with pgcrypto and pgvector extensions
- Row-Level Security (RLS) enforced on all user/health data tables
- AES-256-GCM envelope encryption for PHI (all sensitive data encrypted at rest)
- Five database roles with least-privilege grants
- Append-only audit chain with hash-chaining
- Soft deletes for GDPR compliance

**Key principle:** No plaintext PHI anywhere. All health data encrypted in vaults.

---

## Database Roles

| Role | Purpose | Privileges |
|------|---------|-----------|
| `app_user` | Authenticated end user | SELECT/INSERT/UPDATE own rows via RLS |
| `app_worker` | Background job processor | Explicit narrow grants per table |
| `app_reviewer` | Staff reviewing cases | SELECT assigned items only |
| `app_official` | Public health official | SELECT aggregates only (no RLS on row-level tables) |
| `app_admin` | Deployment/maintenance | SUPERUSER |

---

## Tables

### Core Tables

#### `subjects`
Pseudonymous user references. Primary key is a random UUID (no sequence, prevents identity leakage).

```sql
CREATE TABLE subjects (
  subject_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  age_band TEXT,              -- coarse: "0-5", "6-12", etc. (not PHI)
  region_code TEXT,           -- coarse: "US-CA", "US-TX", etc.
  community_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ      -- soft delete for GDPR
);
```

**RLS Policy:** `app_user` sees only `subject_id = current_setting('app.subject_id')::UUID`

#### `vaults`
Wraps each subject's DEK (Data Encryption Key) with the KEK (Key Encryption Key).

```sql
CREATE TABLE vaults (
  subject_id UUID PRIMARY KEY REFERENCES subjects(subject_id),
  wrapped_dek BYTEA NOT NULL,     -- AES-256-GCM(DEK, KEK, nonce)
  dek_nonce BYTEA NOT NULL,       -- 96-bit nonce for wrap
  kek_version SMALLINT DEFAULT 1, -- for KEK rotation
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Encryption Model:** Envelope encryption
- Each subject has a random 256-bit DEK
- DEK is wrapped (encrypted) with the KEK from `AJNA_KEK_BASE64`
- Only the wrapped DEK is stored; plaintext DEK never touches the database
- To decrypt a subject's data, unwrap the DEK first, then decrypt vault items

#### `vault_items`
Encrypted PHI storage. One row per item key (e.g., "identity", "contact", "emergency").

```sql
CREATE TABLE vault_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(subject_id),
  item_key TEXT NOT NULL,         -- "identity", "contact", "emergency"
  ciphertext BYTEA NOT NULL,      -- AES-256-GCM encrypted data
  nonce BYTEA NOT NULL,           -- random 96-bit nonce
  dek_version SMALLINT DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(subject_id, item_key)
);
```

**Example item content (encrypted):**
```json
{
  "identity": { "name": "Alice", "email": "alice@example.com", "phone": "555-1234" },
  "contact": { "emergency": "555-5678", "insurance_id": "XXX123" },
  "emergency": { "conditions": ["allergy_penicillin"], "medications": [] }
}
```

#### `consents`
Tracks user consent for each scope. Supports grant/revoke with timestamps.

```sql
CREATE TABLE consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(subject_id),
  scope TEXT NOT NULL,           -- "wearable", "monitor_me", "population_use"
  granted_at TIMESTAMPTZ,        -- NULL if revoked
  revoked_at TIMESTAMPTZ,        -- when consent was withdrawn
  consent_text_version TEXT,     -- version hash for audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(subject_id, scope)
);
```

#### `audit_chain`
Append-only, hash-chained. Never edited, only inserted. Logs every PHI read by non-owner and every state change.

```sql
CREATE TABLE audit_chain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  previous_hash BYTEA,           -- SHA-256 of previous row
  event_type TEXT NOT NULL,      -- "PHI_READ", "CONSENT_GRANTED", etc.
  subject_id UUID,               -- NULL for system events
  actor_role TEXT,               -- "app_user", "app_reviewer", etc.
  actor_id UUID,                 -- user ID or worker ID
  action_detail JSONB,           -- action-specific data (NO PHI VALUES)
  request_id UUID,               -- from HTTP request
  canonical_hash BYTEA NOT NULL, -- SHA-256(previous_hash || row_data)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Row-Level Security (RLS)

Enabled and forced on all user/health tables. Policies are applied per request based on `app.subject_id` and `app.role` context variables.

**How it works:**

1. Before each query, the API sets `app.subject_id` and `app.role` via `SET LOCAL`:
   ```sql
   SET LOCAL app.subject_id = '550e8400-e29b-41d4-a716-446655440000';
   SET LOCAL app.role = 'app_user';
   ```

2. PostgreSQL evaluates RLS policies. Example policy:
   ```sql
   CREATE POLICY subjects_user_isolation ON subjects
     FOR SELECT
     USING (subject_id = current_setting('app.subject_id')::UUID);
   ```

3. The `USING` clause filters: app_user can only see rows where their `subject_id` matches.

**Policy matrix (subjects, vaults, vault_items, consents):**

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| `app_user` | Own rows only | Own rows only | Own rows only | No |
| `app_worker` | Explicit grants | Explicit grants | Explicit grants | No |
| `app_reviewer` | Assigned items | No | No | No |
| `app_official` | None (aggregates only) | No | No | No |

---

## Encryption & Decryption

### Encrypt (Client Side or API)

```typescript
import { encrypt, VaultCrypto } from 'common/crypto';

// 1. Generate a DEK (Data Encryption Key, 256 bits)
const dek = CryptoUtils.generateDEK();

// 2. Create vault crypto instance
const vault = new VaultCrypto(dek);

// 3. Encrypt a vault item with AAD (Additional Authenticated Data)
const itemKey = 'identity';
const plaintext = { name: 'Alice', email: 'alice@example.com' };
const subjectId = '550e8400-e29b-41d4-a716-446655440000';

const encrypted = vault.encrypt(itemKey, plaintext, subjectId);
// Returns: { ciphertext, nonce }

// 4. Store ciphertext and nonce in vault_items table
```

### Decrypt (Server Side)

```typescript
import { unwrapDEK, VaultCrypto } from 'common/crypto';

// 1. Retrieve wrapped DEK from vaults table
const { wrapped_dek, dek_nonce } = await db.query(
  'SELECT wrapped_dek, dek_nonce FROM vaults WHERE subject_id = $1',
  [subjectId]
);

// 2. Unwrap DEK with KEK (from AJNA_KEK_BASE64)
const dek = unwrapDEK(wrapped_dek, dek_nonce);

// 3. Create vault crypto and decrypt
const vault = new VaultCrypto(dek);
const plaintext = vault.decrypt(itemKey, ciphertext, nonce, subjectId);
// Returns: { name: 'Alice', email: 'alice@example.com' }
```

### Key Points

- **Nonces:** Random 96-bit, unique per encryption (test: 100k samples, zero collisions)
- **AAD (Additional Authenticated Data):** Includes both `item_key` and `subject_id` to prevent cross-contamination
- **Tampering detection:** Any bit flip in ciphertext or AAD fails decryption
- **KEK access:** Only `common/crypto.ts` reads `AJNA_KEK_BASE64`; never logged

---

## Setup Steps

### 1. Create Render PostgreSQL Instance

Via Render dashboard:
- Create new PostgreSQL database
- PostgreSQL 16
- Region: Oregon
- Auto-increment backups enabled
- VPC: default

Capture the connection string: `postgres://user:password@host:port/dbname`

### 2. Set Environment Variables

```bash
# In Render dashboard, set secrets:
DATABASE_URL=postgres://user:password@host:port/ajna
AJNA_KEK_BASE64=<32-byte key in base64>
AJNA_JWT_SECRET=<change-in-production>
```

To generate KEK:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Run Migrations

```bash
# In apps/api, run migrations programmatically or via CLI
npm run migrate:up

# Or seed test data (20 subjects)
npm run seed
```

### 4. Test Database Connectivity

```bash
npm run db:test
```

This queries `subjects` table via RLS context and verifies:
- Connection works
- Extensions (pgcrypto, pgvector) loaded
- Roles created
- RLS policies active

---

## Testing

### Crypto Tests

```bash
npm test -- crypto.spec.ts
```

Validates:
- ✓ Encrypt/decrypt round trip (1000 payloads)
- ✓ AAD enforcement (tampering detected)
- ✓ Nonce uniqueness (100k samples)
- ✓ DEK wrap/unwrap
- ✓ Error handling (invalid sizes, tampering)

### RLS Matrix Test

```bash
npm run test:rls-matrix
```

For each table and each role, tests all operations (SELECT, INSERT, UPDATE, DELETE) and verifies:
- `app_user`: sees only own rows
- `app_worker`: can read/write with explicit grants
- `app_reviewer`: sees assigned items only
- `app_official`: access denied on row-level tables

Report: Pass/fail per role × table × operation.

### Schema Validation

```bash
npm test -- schema.spec.ts
```

Verifies:
- ✓ No plaintext PHI columns (name, email, phone, ssn, medical, etc.)
- ✓ RLS enabled and forced on all sensitive tables
- ✓ All tables have `created_at` timestamps
- ✓ Cascade deletes configured
- ✓ Indexes defined for performance

### Cross-Subject Isolation

```bash
npm run test:cross-subject
```

Verifies that subject A cannot read or update subject B's vault rows:
- Connect as `app_user` with subject A's ID
- Try to SELECT subject B's vaults → Access denied ✓
- Try to UPDATE subject B's vault_items → Access denied ✓

---

## KEK Rotation

For KMS rotation (production), use the rotation script:

```bash
# Generate new KEK in KMS, get new version
export AJNA_KEK_BASE64=<new key>
export KEK_VERSION=2

npm run kek:rotate
```

Script:
1. Queries all vaults
2. Unwraps each DEK with old KEK
3. Re-wraps each DEK with new KEK
4. Updates `kek_version` and `updated_at`
5. All vault_items decrypt correctly without changes

Report: Rotated count, failed count.

---

## Deployment Checklist

Before deploying to Render:

- [ ] Database created and connectivity verified
- [ ] Extensions (pgcrypto, pgvector) enabled
- [ ] Roles created with least-privilege grants
- [ ] Migrations run successfully
- [ ] RLS matrix test passes (0 mismatches)
- [ ] Cross-subject isolation test passes
- [ ] Crypto round-trip test passes (1000 payloads)
- [ ] Schema validation passes (no PHI columns)
- [ ] Nonce uniqueness test passes (100k samples)
- [ ] KEK rotation script tested
- [ ] Audit chain queries efficient (indexes present)
- [ ] Soft delete logic verified
- [ ] Cascade delete logic verified
- [ ] `GET /v1/ready` reports database status
- [ ] Environment variables set in Render

---

## Troubleshooting

### "permission denied for schema public"
**Cause:** Role not granted USAGE on schema.  
**Fix:** `GRANT USAGE ON SCHEMA public TO <role>;`

### "row-level security policy violated"
**Cause:** `app.subject_id` not set or mismatch with actual data.  
**Fix:** Verify `SET LOCAL app.subject_id = '...'` before query.

### "decryption failed"
**Cause:** Ciphertext tampered, nonce wrong, or AAD mismatch.  
**Fix:** Check logs for tampering pattern. If nonce issue, may indicate DEK rotation problem.

### "KEK not set"
**Cause:** `AJNA_KEK_BASE64` missing from environment.  
**Fix:** Set env var with 32-byte base64 key.

### Slow audit_chain queries
**Cause:** Missing indexes.  
**Fix:** Run migrations to create `idx_audit_chain_created_at`, `idx_audit_chain_subject_id`.

---

## References

- `src/db/schema.sql` - Full table and RLS definitions
- `src/common/crypto.ts` - Encryption/decryption implementation
- `src/common/vault.service.ts` - High-level vault API
- `src/db/migrations.ts` - Migration runner
- `src/db/kek-rotation.ts` - KEK rotation script
- `00-data-protection-model.md` - Privacy model and retention rules

---

## Next Steps

After B1.2 is deployed:
- B1.3 (Auth & Consent): Add JWT validation and consent checks
- B1.4 (Workers & Scoring): Set up BullMQ jobs and scoring service
- B2.1 (Wearable Ingest): First feature endpoint using vault storage
