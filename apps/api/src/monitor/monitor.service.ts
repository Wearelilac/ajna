/**
 * B3.1: Monitor session service
 * Manages acoustic monitoring sessions (metadata only, NO audio)
 * Enforces session caps and consent-gating server-side
 */

import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { AppError, ERROR_CODES } from '../common/errors';
import { LIMITS } from '../common/limits';
import {
  MonitorSessionDto,
  EndMonitorSessionDto,
  DeIdentifiedFlagInputDto,
  DeIdentifiedFlagDto,
} from './dto/monitor.dto';

@Injectable()
export class MonitorService {
  private readonly logger = new Logger(MonitorService.name);

  constructor(private readonly pool: Pool) {}

  /**
   * Start a new monitor session
   * Requires: monitor_me consent (checked by AuthGuard)
   * Returns: sessionId and server-side maxDurationSec
   */
  async startSession(subjectId: string): Promise<MonitorSessionDto> {
    this.logger.log(`Starting monitor session for subject ${subjectId}`);

    // Check for existing open session
    const existingCheck = await this.pool.query<{ id: string; started_at: Date }>(
      `
      SELECT id, started_at
      FROM monitor_sessions
      WHERE subject_id = $1 AND ended_at IS NULL
      ORDER BY started_at DESC
      LIMIT 1
      `,
      [subjectId],
    );

    if (existingCheck.rows.length > 0) {
      const existing = existingCheck.rows[0];
      const elapsed = Date.now() - existing.started_at.getTime();
      const maxDurationMs = LIMITS.ACOUSTIC.SESSION_CAP_SEC * 1000;

      if (elapsed >= maxDurationMs) {
        // Auto-close expired session
        await this.pool.query(
          `
          UPDATE monitor_sessions
          SET ended_at = NOW(), end_reason = 'timeout'
          WHERE id = $1
          `,
          [existing.id],
        );
      } else {
        // Return existing open session
        return {
          id: existing.id,
          subjectId,
          startedAt: existing.started_at.toISOString(),
          maxDurationSec: LIMITS.ACOUSTIC.SESSION_CAP_SEC,
        };
      }
    }

    // Create new session
    const result = await this.pool.query<{
      id: string;
      subject_id: string;
      started_at: Date;
      max_duration_sec: number;
    }>(
      `
      INSERT INTO monitor_sessions (subject_id, max_duration_sec)
      VALUES ($1, $2)
      RETURNING id, subject_id, started_at, max_duration_sec
      `,
      [subjectId, LIMITS.ACOUSTIC.SESSION_CAP_SEC],
    );

    const row = result.rows[0];
    return {
      id: row.id,
      subjectId: row.subject_id,
      startedAt: row.started_at.toISOString(),
      maxDurationSec: row.max_duration_sec,
    };
  }

  /**
   * End a monitor session
   */
  async endSession(
    sessionId: string,
    subjectId: string,
    dto: EndMonitorSessionDto,
  ): Promise<MonitorSessionDto> {
    this.logger.log(`Ending session ${sessionId} with reason: ${dto.endReason}`);

    const result = await this.pool.query<{
      id: string;
      subject_id: string;
      started_at: Date;
      ended_at: Date;
      end_reason: string;
      max_duration_sec: number;
    }>(
      `
      UPDATE monitor_sessions
      SET ended_at = NOW(), end_reason = $1
      WHERE id = $2 AND subject_id = $3 AND ended_at IS NULL
      RETURNING id, subject_id, started_at, ended_at, end_reason, max_duration_sec
      `,
      [dto.endReason, sessionId, subjectId],
    );

    if (result.rows.length === 0) {
      throw new AppError(
        404,
        ERROR_CODES.MONITOR_SESSION_NOT_FOUND,
        'Session not found or already ended',
      );
    }

    const row = result.rows[0];
    return {
      id: row.id,
      subjectId: row.subject_id,
      startedAt: row.started_at.toISOString(),
      endedAt: row.ended_at?.toISOString(),
      maxDurationSec: row.max_duration_sec,
      endReason: row.end_reason,
    };
  }

  /**
   * Get active session for subject
   */
  async getActiveSession(subjectId: string): Promise<MonitorSessionDto | null> {
    const result = await this.pool.query<{
      id: string;
      subject_id: string;
      started_at: Date;
      max_duration_sec: number;
    }>(
      `
      SELECT id, subject_id, started_at, max_duration_sec
      FROM monitor_sessions
      WHERE subject_id = $1 AND ended_at IS NULL
      ORDER BY started_at DESC
      LIMIT 1
      `,
      [subjectId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const elapsed = Date.now() - row.started_at.getTime();
    const maxDurationMs = row.max_duration_sec * 1000;

    if (elapsed >= maxDurationMs) {
      // Session expired
      await this.pool.query(
        `
        UPDATE monitor_sessions
        SET ended_at = NOW(), end_reason = 'timeout'
        WHERE id = $1
        `,
        [row.id],
      );
      return null;
    }

    return {
      id: row.id,
      subjectId: row.subject_id,
      startedAt: row.started_at.toISOString(),
      maxDurationSec: row.max_duration_sec,
    };
  }

  /**
   * Store a de-identified flag (7-field allow-list ONLY)
   * Unknown fields rejected by class-validator + explicit check
   * Truncates time_bucket to hour server-side
   */
  async storeFlag(
    subjectId: string,
    dto: DeIdentifiedFlagInputDto,
  ): Promise<DeIdentifiedFlagDto> {
    // Verify session exists and is open
    const session = await this.pool.query<{
      id: string;
      started_at: Date;
      max_duration_sec: number;
    }>(
      `
      SELECT id, started_at, max_duration_sec
      FROM monitor_sessions
      WHERE id = $1 AND subject_id = $2
      `,
      [dto.sessionId, subjectId],
    );

    if (session.rows.length === 0) {
      throw new AppError(
        404,
        ERROR_CODES.MONITOR_SESSION_REQUIRED,
        'Monitor session not found',
      );
    }

    const sessionRow = session.rows[0];
    const elapsed = Date.now() - sessionRow.started_at.getTime();
    const maxDurationMs = sessionRow.max_duration_sec * 1000;

    if (elapsed >= maxDurationMs) {
      throw new AppError(
        422,
        ERROR_CODES.MONITOR_SESSION_EXPIRED,
        'Monitor session has expired',
      );
    }

    // Truncate time_bucket to hour (server-side)
    const timeBucket = new Date(dto.timeBucket);
    timeBucket.setMinutes(0, 0, 0);

    // Insert flag
    const result = await this.pool.query<{
      id: string;
      session_id: string;
      signature: string;
      confidence: number;
      time_bucket: Date;
      model_version: string;
      session_duration_sec: number | null;
      energy_db: number | null;
      created_at: Date;
    }>(
      `
      INSERT INTO deidentified_flags (
        subject_id, session_id, signature, confidence, time_bucket,
        model_version, session_duration_sec, energy_db
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, session_id, signature, confidence, time_bucket,
                model_version, session_duration_sec, energy_db, created_at
      `,
      [
        subjectId,
        dto.sessionId,
        dto.signature,
        dto.confidence,
        timeBucket,
        dto.modelVersion,
        dto.sessionDurationSec ?? null,
        dto.energyDb ?? null,
      ],
    );

    const row = result.rows[0];
    this.logger.log(
      `Stored flag ${row.id}: ${row.signature} (confidence: ${row.confidence})`,
    );

    return {
      id: row.id,
      sessionId: row.session_id,
      signature: row.signature,
      confidence: row.confidence,
      timeBucket: row.time_bucket.toISOString(),
      modelVersion: row.model_version,
      sessionDurationSec: row.session_duration_sec ?? undefined,
      energyDb: row.energy_db ?? undefined,
      createdAt: row.created_at.toISOString(),
    };
  }

  /**
   * Consent revocation handler: end open sessions and delete flags
   */
  async handleConsentRevoked(subjectId: string): Promise<void> {
    this.logger.warn(`Consent revoked for subject ${subjectId}, cleaning up monitor data`);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // End open sessions
      await client.query(
        `
        UPDATE monitor_sessions
        SET ended_at = NOW(), end_reason = 'consent_revoked'
        WHERE subject_id = $1 AND ended_at IS NULL
        `,
        [subjectId],
      );

      // Delete flags (cascade to crisis reviews handled by aggregation cleanup)
      await client.query(
        `
        DELETE FROM deidentified_flags
        WHERE subject_id = $1
        `,
        [subjectId],
      );

      await client.query('COMMIT');
      this.logger.log(`Cleaned up monitor data for subject ${subjectId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
