/**
 * Consent Service (B1.3)
 * Grant, revoke, and query consent scopes.
 * Scopes: wearable, monitor_me, population_use
 * Default: not granted
 * Revocation: takes effect immediately
 */

import { Injectable, Logger } from '@nestjs/common';
import { Errors } from '../common/errors';
import { auditLog } from '../common/db.transaction';
import { ConsentScope } from './dto/consent.dto';

export interface ConsentRecord {
  scope: ConsentScope;
  granted: boolean;
  textVersion: string;
  grantedAt: string | null;
  revokedAt: string | null;
}

@Injectable()
export class ConsentService {
  private readonly logger = new Logger('ConsentService');

  /**
   * Grant consent for a scope.
   * Requires current textVersion to prevent outdated grants.
   *
   * @param subjectId Subject UUID
   * @param scope Consent scope (wearable, monitor_me, population_use)
   * @param textVersion Version hash of consent text (must match current version)
   * @param db Database connection
   * @param requestId For audit logging
   */
  async grant(
    subjectId: string,
    scope: ConsentScope,
    textVersion: string,
    db: any,
    requestId: string,
  ): Promise<ConsentRecord> {
    // Verify textVersion exists and is current
    const textRow = await db.query(
      `SELECT body, published_at FROM consent_texts
       WHERE scope = $1 AND version = $2
       ORDER BY published_at DESC LIMIT 1`,
      [scope, textVersion],
    );

    if (!textRow || textRow.length === 0) {
      throw Errors.validationFailed('CONSENT_TEXT_OUTDATED');
    }

    // Insert consent record (append-only: always insert new row, don't update)
    const result = await db.query(
      `INSERT INTO consents (subject_id, scope, granted, text_version, at, created_at)
       VALUES ($1, $2, true, $3, NOW(), NOW())
       RETURNING scope, granted, text_version as "textVersion", at as "grantedAt", null as "revokedAt"`,
      [subjectId, scope, textVersion],
    );

    if (!result || result.length === 0) {
      throw Errors.internalServerError();
    }

    const record = result[0];

    // Audit log
    await auditLog(
      db,
      'CONSENT_GRANTED',
      subjectId,
      'app_user',
      subjectId,
      { scope, textVersion },
      requestId,
    );

    this.logger.log(`Consent granted: ${subjectId} for ${scope}`);

    return record;
  }

  /**
   * Revoke consent for a scope.
   * Takes effect immediately (ConsentGuard checks at request time).
   *
   * @param subjectId Subject UUID
   * @param scope Consent scope
   * @param db Database connection
   * @param requestId For audit logging
   */
  async revoke(
    subjectId: string,
    scope: ConsentScope,
    db: any,
    requestId: string,
  ): Promise<ConsentRecord> {
    // Insert revocation record (granted = false, revokedAt = now)
    const result = await db.query(
      `INSERT INTO consents (subject_id, scope, granted, text_version, at, created_at)
       VALUES ($1, $2, false, '', NOW(), NOW())
       RETURNING scope, granted, text_version as "textVersion", null as "grantedAt", at as "revokedAt"`,
      [subjectId, scope],
    );

    if (!result || result.length === 0) {
      throw Errors.internalServerError();
    }

    const record = result[0];

    // Emit event for cleanup job (handled in B1.4)
    this.logger.log(`Consent revoked: ${subjectId} for ${scope}`);
    // TODO: Emit consent.revoked event → B1.4 cleanup job

    // Audit log
    await auditLog(
      db,
      'CONSENT_REVOKED',
      subjectId,
      'app_user',
      subjectId,
      { scope },
      requestId,
    );

    return record;
  }

  /**
   * Get current consent status for all scopes.
   * Returns the latest (most recent) consent record for each scope.
   *
   * @param subjectId Subject UUID
   * @param db Database connection
   */
  async getAll(subjectId: string, db: any): Promise<ConsentRecord[]> {
    // Get latest consent record per scope
    const result = await db.query(
      `WITH latest_per_scope AS (
         SELECT DISTINCT ON (scope) scope, granted, text_version, at, created_at
         FROM consents
         WHERE subject_id = $1
         ORDER BY scope, at DESC
       )
       SELECT 
         scope,
         granted,
         text_version as "textVersion",
         CASE WHEN granted THEN at ELSE NULL END as "grantedAt",
         CASE WHEN NOT granted THEN at ELSE NULL END as "revokedAt"
       FROM latest_per_scope
       ORDER BY scope`,
      [subjectId],
    );

    return result || [];
  }

  /**
   * Get consent status for a specific scope.
   *
   * @param subjectId Subject UUID
   * @param scope Consent scope
   * @param db Database connection
   */
  async getOne(subjectId: string, scope: ConsentScope, db: any): Promise<ConsentRecord | null> {
    const result = await db.query(
      `SELECT 
         scope,
         granted,
         text_version as "textVersion",
         CASE WHEN granted THEN at ELSE NULL END as "grantedAt",
         CASE WHEN NOT granted THEN at ELSE NULL END as "revokedAt"
       FROM consents
       WHERE subject_id = $1 AND scope = $2
       ORDER BY at DESC
       LIMIT 1`,
      [subjectId, scope],
    );

    return result && result.length > 0 ? result[0] : null;
  }

  /**
   * Check if a subject has active (granted) consent for a scope.
   * Used by ConsentGuard to enforce consent requirement.
   *
   * @param subjectId Subject UUID
   * @param scope Consent scope
   * @param db Database connection
   */
  async isGranted(subjectId: string, scope: ConsentScope, db: any): Promise<boolean> {
    const record = await this.getOne(subjectId, scope, db);
    return record ? record.granted : false;
  }

  /**
   * Get consent history for auditing.
   *
   * @param subjectId Subject UUID
   * @param scope Consent scope
   * @param db Database connection
   * @param limit Max records to return
   */
  async getHistory(
    subjectId: string,
    scope: ConsentScope,
    db: any,
    limit: number = 10,
  ): Promise<ConsentRecord[]> {
    const result = await db.query(
      `SELECT 
         scope,
         granted,
         text_version as "textVersion",
         CASE WHEN granted THEN at ELSE NULL END as "grantedAt",
         CASE WHEN NOT granted THEN at ELSE NULL END as "revokedAt"
       FROM consents
       WHERE subject_id = $1 AND scope = $2
       ORDER BY at DESC
       LIMIT $3`,
      [subjectId, scope, limit],
    );

    return result || [];
  }
}
