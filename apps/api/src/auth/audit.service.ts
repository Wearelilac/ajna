/**
 * Audit Service (B1.3)
 * Append-only, hash-chained audit log.
 * Never edited, only inserted.
 * Every row: SHA-256(previous_hash || canonical_row)
 */

import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';

export interface AuditEntry {
  seq: number;
  at: string;
  actorSubjectId: string | null;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string | null;
  detail: Record<string, unknown>;
  hash: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger('AuditService');

  /**
   * Append an audit log entry.
   * Computes hash chain: SHA-256(previous_hash || canonical_row)
   *
   * @param db Database connection
   * @param action Action name (e.g., "PHI_READ", "CONSENT_GRANTED")
   * @param actorRole Actor role (e.g., "app_user", "app_reviewer")
   * @param detail Action-specific data (NO PHI values)
   * @param subjectId Optional subject being acted on
   * @param actorId Optional actor ID
   * @param targetType Optional target type
   * @param targetId Optional target ID
   */
  async append(
    db: any,
    action: string,
    actorRole: string,
    detail: Record<string, unknown>,
    subjectId?: string,
    actorId?: string,
    targetType?: string,
    targetId?: string,
  ): Promise<AuditEntry> {
    // Get previous hash
    const lastRow = await db.query(
      `SELECT seq, hash FROM audit_log ORDER BY seq DESC LIMIT 1`,
    );

    const prevHash = lastRow && lastRow.length > 0 ? lastRow[0].hash : '0';

    // Construct canonical row (deterministic order for hashing)
    const now = new Date().toISOString();
    const canonical = JSON.stringify({
      at: now,
      actor_subject_id: actorId || null,
      actor_role: actorRole,
      action,
      target_type: targetType || null,
      target_id: targetId || null,
      detail,
      subject_id: subjectId || null,
    });

    // Compute hash
    const hash = this.computeHash(prevHash, canonical);

    // Insert row
    const result = await db.query(
      `INSERT INTO audit_log (
         at, actor_subject_id, actor_role, action, target_type, target_id,
         detail, subject_id, prev_hash, hash, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       RETURNING seq, at, actor_subject_id as "actorSubjectId", actor_role as "actorRole",
                 action, target_type as "targetType", target_id as "targetId",
                 detail, hash`,
      [
        now,
        actorId || null,
        actorRole,
        action,
        targetType || null,
        targetId || null,
        JSON.stringify(detail),
        subjectId || null,
        prevHash,
        hash,
      ],
    );

    if (!result || result.length === 0) {
      throw new Error('Audit append failed');
    }

    this.logger.debug(`Audit logged: ${action} by ${actorRole}`, { seq: result[0].seq });

    return result[0];
  }

  /**
   * Verify the entire audit chain.
   * Recomputes all hashes and detects tampering.
   *
   * @param db Database connection
   * @returns { valid: boolean, firstInvalidSeq?: number, message: string }
   */
  async verifyChain(db: any): Promise<{ valid: boolean; firstInvalidSeq?: number; message: string }> {
    const rows = await db.query(`SELECT seq, at, actor_subject_id, actor_role, action,
                                         target_type, target_id, detail, prev_hash, hash
                                  FROM audit_log
                                  ORDER BY seq ASC`);

    if (!rows || rows.length === 0) {
      return { valid: true, message: 'Audit chain empty (no tampering possible)' };
    }

    let prevHash = '0';

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Reconstruct canonical row
      const canonical = JSON.stringify({
        at: row.at,
        actor_subject_id: row.actor_subject_id,
        actor_role: row.actor_role,
        action: row.action,
        target_type: row.target_type,
        target_id: row.target_id,
        detail: typeof row.detail === 'string' ? JSON.parse(row.detail) : row.detail,
        subject_id: row.subject_id,
      });

      // Compute expected hash
      const expectedHash = this.computeHash(prevHash, canonical);

      if (expectedHash !== row.hash) {
        this.logger.error(`Audit chain broken at seq ${row.seq}`, {
          expectedHash,
          actualHash: row.hash,
        });
        return {
          valid: false,
          firstInvalidSeq: row.seq,
          message: `Audit chain broken at seq ${row.seq}: hash mismatch`,
        };
      }

      prevHash = row.hash;
    }

    this.logger.log(`Audit chain verified: ${rows.length} entries, all valid`);

    return {
      valid: true,
      message: `Audit chain valid: ${rows.length} entries verified`,
    };
  }

  /**
   * Query audit logs by subject (admin/reviewers only).
   *
   * @param db Database connection
   * @param subjectId Subject UUID to query
   * @param limit Max records to return
   */
  async getBySubject(db: any, subjectId: string, limit: number = 100): Promise<AuditEntry[]> {
    const result = await db.query(
      `SELECT seq, at, actor_subject_id as "actorSubjectId", actor_role as "actorRole",
              action, target_type as "targetType", target_id as "targetId",
              detail, hash
       FROM audit_log
       WHERE subject_id = $1
       ORDER BY seq DESC
       LIMIT $2`,
      [subjectId, limit],
    );

    return result || [];
  }

  /**
   * Query audit logs by action type (admin only).
   *
   * @param db Database connection
   * @param action Action to query
   * @param limit Max records to return
   */
  async getByAction(db: any, action: string, limit: number = 100): Promise<AuditEntry[]> {
    const result = await db.query(
      `SELECT seq, at, actor_subject_id as "actorSubjectId", actor_role as "actorRole",
              action, target_type as "targetType", target_id as "targetId",
              detail, hash
       FROM audit_log
       WHERE action = $1
       ORDER BY seq DESC
       LIMIT $2`,
      [action, limit],
    );

    return result || [];
  }

  /**
   * Get recent audit entries (admin only).
   *
   * @param db Database connection
   * @param limit Max records to return
   */
  async getRecent(db: any, limit: number = 100): Promise<AuditEntry[]> {
    const result = await db.query(
      `SELECT seq, at, actor_subject_id as "actorSubjectId", actor_role as "actorRole",
              action, target_type as "targetType", target_id as "targetId",
              detail, hash
       FROM audit_log
       ORDER BY seq DESC
       LIMIT $1`,
      [limit],
    );

    return result || [];
  }

  // ===== Private Helpers =====

  private computeHash(prevHash: string, canonical: string): string {
    const data = prevHash + canonical;
    return createHash('sha256').update(data).digest('hex');
  }
}
