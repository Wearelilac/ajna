# B1.3 Auth Module (In Progress)

This module implements authentication, JWT tokens, consent management, and audit logging.

## Files Needed for B1.3 Complete

### DTOs (Partially done)
- ✅ `auth.dto.ts` - Register, login, refresh DTOs
- ✅ `consent.dto.ts` - Consent DTOs
- ⏳ `me.dto.ts` - Current user info

### Services
- ✅ `auth.service.ts` - Register, login, refresh, logout, token verification
- ⏳ `consent.service.ts` - Grant, revoke, get consents
- ⏳ `audit.service.ts` - Append audit logs, verify chain

### Guards & Decorators
- ⏳ `auth.guard.ts` - `@UseGuards(AuthGuard)` - validates JWT
- ⏳ `roles.guard.ts` - `@UseGuards(RolesGuard)` - checks role
- ⏳ `requires-consent.decorator.ts` - `@RequiresConsent('scope')` - checks active consent

### Controllers
- ⏳ `auth.controller.ts` - POST /v1/auth/register, login, refresh, logout, DELETE /v1/auth/logout
- ⏳ `consent.controller.ts` - GET /v1/consents, PUT /v1/consents/{scope}
- ⏳ `user.controller.ts` - GET /v1/me

### Database Migrations
- ⏳ Add to B1.2 migrations:
  - `auth_accounts(subject_id, email_hash, password_hash, role, created_at, disabled_at)`
  - `refresh_tokens(id, subject_id, token_hash, expires_at, revoked_at, replaced_by)`
  - `consent_texts(scope, version, body, published_at)`
  - `consents(id, subject_id, scope, granted, text_version, at)` - append-only
  - `audit_log(seq, at, actor_subject_id, actor_role, action, target_type, target_id, detail, prev_hash, hash)`

### Tests
- ⏳ `auth.service.spec.ts` - Register, login, refresh, logout flows
- ⏳ `auth.guard.spec.ts` - JWT validation
- ⏳ `roles.guard.spec.ts` - Role-based access control
- ⏳ `consent.guard.spec.ts` - Consent requirement checking
- ⏳ `audit.service.spec.ts` - Hash chain verification, tampering detection

## Implementation Notes

### Password Hashing
- Algorithm: scrypt (from Node crypto)
- Salt: random 16 bytes
- In production: use bcrypt or argon2

### JWT Tokens
- Access token: 15 minutes
- Refresh token: 30 days
- Secret: `AJNA_JWT_SECRET` from env
- Payload: `{ subjectId, email, role, iat, exp }`

### Refresh Token Rotation
- On each refresh, issue new refresh token
- Mark old token as `replaced_by`
- If old token is reused → revoke entire family (security)

### Consent Flow
- Scopes: `wearable`, `monitor_me`, `population_use`
- Default: not granted
- Granting: requires current `textVersion`
- Revoking: takes effect immediately
- ConsentGuard checks at request time

### Audit Chain
- Append-only table (no UPDATE/DELETE)
- Hash-chained: `hash = SHA-256(prev_hash || canonical_row)`
- Every row signed by `verifyChain()` test
- Can detect tampering of any row

### Guards

```typescript
// Check if user is authenticated
@UseGuards(AuthGuard)

// Check if user has role
@UseGuards(AuthGuard, RolesGuard)
@SetMetadata('roles', ['app_reviewer', 'app_official'])

// Check if user has granted consent
@UseGuards(AuthGuard, ConsentGuard)
@RequiresConsent('wearable')
```

## B1.3 Completion Tasks

Priority order:
1. Finish `consent.service.ts` (grant, revoke, get, list)
2. Finish `audit.service.ts` (append, verify chain, read events decorator)
3. Add all guards and decorators
4. Create auth.controller, consent.controller, user.controller
5. Update migrations with 5 new tables
6. Add comprehensive tests
7. Update OpenAPI contract
8. Write B1.3 findings note

Estimated time: 3-4 hours for full completion
