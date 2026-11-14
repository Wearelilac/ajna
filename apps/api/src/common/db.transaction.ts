/**
 * Database Transaction Helper
 * Sets app.subject_id and app.role context for RLS (00-data-protection-model.md, section 7).
 * Ensures every query runs with correct row-level security policies.
 */

import { Logger } from '@nestjs/common';

export type DBRole = 'app_user' | 'app_reviewer' | 'app_official' | 'app_worker' | 'app_admin';

export interface TransactionContext {
  subjectId?: string; // User's UUID (for RLS)
  role: DBRole;
  requestId: string; // For audit logging
}

const logger = new Logger('DbTransaction');

/**
 * Execute a database query within an RLS context.
 * Sets LOCAL app.subject_id and app.role, which apply only to this transaction.
 * Automatically rolls back on error.
 *
 * @param context RLS context (role, subjectId, requestId)
 * @param callback Function to execute (receives db connection)
 * @param db Database connection or pool
 */
export async function withRLSContext<T>(
  context: TransactionContext,
  callback: (db: any) => Promise<T>,
  db: any,
): Promise<T> {
  const client = await db.connect();

  try {
    // Begin transaction
    await client.query('BEGIN');

    // Set LOCAL app.subject_id (RLS context variable)
    // LOCAL means it applies only to this transaction and is cleared on commit/rollback
    if (context.subjectId) {
      await client.query(`SELECT set_config('app.subject_id', $1, true)`, [context.subjectId]);
    }

    // Set LOCAL app.role
    await client.query(`SELECT set_config('app.role', $1, true)`, [context.role]);

    // Execute user callback
    const result = await callback(client);

    // Commit
    await client.query('COMMIT');

    logger.debug(
      {
        event: 'transaction_committed',
        requestId: context.requestId,
        role: context.role,
        subjectId: context.subjectId,
      },
      'Transaction committed',
    );

    return result;
  } catch (err) {
    // Rollback on error
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      logger.error('Rollback failed', rollbackErr);
    }

    logger.error(
      {
        event: 'transaction_failed',
        requestId: context.requestId,
        role: context.role,
        subjectId: context.subjectId,
        error: err instanceof Error ? err.message : String(err),
      },
      'Transaction failed',
    );

    throw err;
  } finally {
    // Release connection
    client.release();
  }
}

/**
 * Execute a read-only query within RLS context.
 * Sets role context but doesn't require writable privileges.
 */
export async function withRLSContextRead<T>(
  context: TransactionContext,
  callback: (db: any) => Promise<T>,
  db: any,
): Promise<T> {
  return withRLSContext(context, callback, db);
}

/**
 * Execute a write operation within RLS context.
 * Sets role context for INSERT/UPDATE/DELETE.
 */
export async function withRLSContextWrite<T>(
  context: TransactionContext,
  callback: (db: any) => Promise<T>,
  db: any,
): Promise<T> {
  return withRLSContext(context, callback, db);
}

/**
 * Create audit log entry (append-only, hash-chained).
 * Called after significant operations (PHI read, state change, decision).
 *
 * @param db Database connection
 * @param eventType e.g., "PHI_READ", "CONSENT_GRANTED", "CRISIS_OPENED"
 * @param subjectId Optional subject ID
 * @param actorRole e.g., "app_user", "app_reviewer"
 * @param actorId Optional actor ID (user or worker)
 * @param actionDetail Action-specific JSON (NO PHI VALUES)
 * @param requestId From request context
 */
export async function auditLog(
  db: any,
  eventType: string,
  subjectId: string | undefined,
  actorRole: DBRole,
  actorId: string | undefined,
  actionDetail: Record<string, unknown>,
  requestId: string,
): Promise<void> {
  try {
    // Get previous hash for chain
    const lastRow = await db.query(
      `SELECT canonical_hash FROM audit_chain ORDER BY created_at DESC LIMIT 1`,
    );

    const previousHash = lastRow && lastRow.length > 0 ? lastRow[0].canonical_hash : null;

    // Create canonical row data (deterministic serialization)
    const canonicalData = {
      event_type: eventType,
      subject_id: subjectId || null,
      actor_role: actorRole,
      actor_id: actorId || null,
      action_detail: actionDetail,
      request_id: requestId,
    };

    // Note: In production, compute actual SHA-256 hash
    // For now, generate a placeholder
    const canonicalHash = Buffer.from(eventType + Date.now()); // Placeholder

    // Insert audit row
    await db.query(
      `INSERT INTO audit_chain (
         previous_hash, event_type, subject_id, actor_role, actor_id,
         action_detail, request_id, canonical_hash, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        previousHash,
        eventType,
        subjectId || null,
        actorRole,
        actorId || null,
        JSON.stringify(actionDetail),
        requestId,
        canonicalHash,
      ],
    );

    logger.debug(
      {
        event: 'audit_logged',
        eventType,
        subjectId,
        requestId,
      },
      'Audit logged',
    );
  } catch (err) {
    logger.error('Audit log failed', err);
    // Don't throw; audit failure shouldn't block the operation
  }
}
