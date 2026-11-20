/**
 * B3.1: Crisis review service
 * Human workflow queue with state machine validation
 * State: new → assigned → in_review → closed
 * Outcomes: no_action | routine_follow_up_requested | escalated_to_clinical_lead
 */

import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import * as crypto from 'crypto';
import { AppError, ERROR_CODES } from '../common/errors';
import {
  CrisisReviewDto,
  CrisisReviewState,
  CrisisOutcome,
  CrisisReviewQueryDto,
  AssignCrisisReviewDto,
  TransitionCrisisReviewDto,
  RevealContactDto,
  RevealedContactDto,
  CrisisReviewEventDto,
  DeIdentifiedFlagSummaryDto,
} from './dto/crisis.dto';

const STATE_MACHINE: Record<CrisisReviewState, CrisisReviewState[]> = {
  new: ['assigned'],
  assigned: ['in_review', 'new'], // Can unassign
  in_review: ['closed', 'assigned'], // Can reassign
  closed: [], // Terminal state
};

@Injectable()
export class CrisisService {
  private readonly logger = new Logger(CrisisService.name);

  constructor(private readonly pool: Pool) {}

  /**
   * Create or update crisis review for a flag
   * Groups repeated flags within a rolling window
   */
  async createOrUpdateReview(
    subjectId: string,
    flagId: string,
    signature: string,
    confidence: number,
  ): Promise<string> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Check for existing open review within 24h window
      const existing = await client.query<{
        id: string;
        flag_count: number;
        last_flag_at: Date;
      }>(
        `
        SELECT id, flag_count, last_flag_at
        FROM crisis_reviews
        WHERE subject_id = $1
          AND state IN ('new', 'assigned', 'in_review')
          AND last_flag_at > NOW() - INTERVAL '24 hours'
        ORDER BY last_flag_at DESC
        LIMIT 1
        `,
        [subjectId],
      );

      let reviewId: string;

      if (existing.rows.length > 0) {
        // Update existing review
        const review = existing.rows[0];
        await client.query(
          `
          UPDATE crisis_reviews
          SET last_flag_at = NOW(), flag_count = flag_count + 1
          WHERE id = $1
          `,
          [review.id],
        );
        reviewId = review.id;
        this.logger.log(
          `Updated crisis review ${reviewId} (now ${review.flag_count + 1} flags)`,
        );
      } else {
        // Create new review
        const result = await client.query<{ id: string }>(
          `
          INSERT INTO crisis_reviews (subject_id, first_flag_at, last_flag_at, flag_count)
          VALUES ($1, NOW(), NOW(), 1)
          RETURNING id
          `,
          [subjectId],
        );
        reviewId = result.rows[0].id;
        this.logger.log(`Created crisis review ${reviewId} for subject ${subjectId}`);
      }

      await client.query('COMMIT');
      return reviewId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * List crisis reviews with filters
   */
  async listReviews(query: CrisisReviewQueryDto): Promise<CrisisReviewDto[]> {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];

    if (query.state) {
      params.push(query.state);
      conditions.push(`state = $${params.length}`);
    }

    if (query.ownerId) {
      params.push(query.ownerId);
      conditions.push(`owner_id = $${params.length}`);
    }

    if (query.escalatedToLead === 'true') {
      conditions.push(`escalated_to_lead = TRUE`);
    } else if (query.escalatedToLead === 'false') {
      conditions.push(`escalated_to_lead = FALSE`);
    }

    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    params.push(limit, offset);

    const result = await this.pool.query<{
      id: string;
      state: CrisisReviewState;
      owner_id: string | null;
      outcome: CrisisOutcome | null;
      first_flag_at: Date;
      last_flag_at: Date;
      flag_count: number;
      created_at: Date;
      assigned_at: Date | null;
      closed_at: Date | null;
      escalated_to_lead: boolean;
    }>(
      `
      SELECT id, state, owner_id, outcome, first_flag_at, last_flag_at,
             flag_count, created_at, assigned_at, closed_at, escalated_to_lead
      FROM crisis_reviews
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
      `,
      params,
    );

    return result.rows.map((row) => ({
      id: row.id,
      state: row.state,
      ownerId: row.owner_id ?? undefined,
      outcome: row.outcome ?? undefined,
      firstFlagAt: row.first_flag_at.toISOString(),
      lastFlagAt: row.last_flag_at.toISOString(),
      flagCount: row.flag_count,
      createdAt: row.created_at.toISOString(),
      assignedAt: row.assigned_at?.toISOString(),
      closedAt: row.closed_at?.toISOString(),
      escalatedToLead: row.escalated_to_lead,
    }));
  }

  /**
   * Get single crisis review by ID (with flags)
   */
  async getReview(reviewId: string): Promise<CrisisReviewDto> {
    const result = await this.pool.query<{
      id: string;
      subject_id: string;
      state: CrisisReviewState;
      owner_id: string | null;
      outcome: CrisisOutcome | null;
      first_flag_at: Date;
      last_flag_at: Date;
      flag_count: number;
      created_at: Date;
      assigned_at: Date | null;
      closed_at: Date | null;
      escalated_to_lead: boolean;
    }>(
      `
      SELECT id, subject_id, state, owner_id, outcome, first_flag_at, last_flag_at,
             flag_count, created_at, assigned_at, closed_at, escalated_to_lead
      FROM crisis_reviews
      WHERE id = $1
      `,
      [reviewId],
    );

    if (result.rows.length === 0) {
      throw new AppError(404, ERROR_CODES.REVIEW_NOT_FOUND, 'Crisis review not found');
    }

    const review = result.rows[0];

    // Get associated flags (de-identified, limited fields)
    const flags = await this.pool.query<{
      id: string;
      signature: string;
      confidence: number;
      time_bucket: Date;
      model_version: string;
      created_at: Date;
    }>(
      `
      SELECT f.id, f.signature, f.confidence, f.time_bucket, f.model_version, f.created_at
      FROM deidentified_flags f
      JOIN monitor_sessions s ON f.session_id = s.id
      WHERE s.subject_id = $1
        AND f.created_at >= $2
        AND f.created_at <= $3
      ORDER BY f.created_at DESC
      LIMIT 100
      `,
      [review.subject_id, review.first_flag_at, review.last_flag_at],
    );

    return {
      id: review.id,
      // subject_id is HIDDEN unless reveal-contact is used
      state: review.state,
      ownerId: review.owner_id ?? undefined,
      outcome: review.outcome ?? undefined,
      firstFlagAt: review.first_flag_at.toISOString(),
      lastFlagAt: review.last_flag_at.toISOString(),
      flagCount: review.flag_count,
      createdAt: review.created_at.toISOString(),
      assignedAt: review.assigned_at?.toISOString(),
      closedAt: review.closed_at?.toISOString(),
      escalatedToLead: review.escalated_to_lead,
      flags: flags.rows.map((f) => ({
        id: f.id,
        signature: f.signature,
        confidence: f.confidence,
        timeBucket: f.time_bucket.toISOString(),
        modelVersion: f.model_version,
        createdAt: f.created_at.toISOString(),
      })),
    };
  }

  /**
   * Assign a crisis review to a Reviewer
   */
  async assignReview(
    reviewId: string,
    dto: AssignCrisisReviewDto,
    actorId: string,
  ): Promise<CrisisReviewDto> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get current state
      const current = await client.query<{
        state: CrisisReviewState;
        owner_id: string | null;
      }>(
        `SELECT state, owner_id FROM crisis_reviews WHERE id = $1 FOR UPDATE`,
        [reviewId],
      );

      if (current.rows.length === 0) {
        throw new AppError(404, ERROR_CODES.REVIEW_NOT_FOUND, 'Crisis review not found');
      }

      const currentState = current.rows[0].state;

      // Validate transition: new → assigned
      if (currentState !== 'new' && currentState !== 'assigned') {
        throw new AppError(
          422,
          ERROR_CODES.REVIEW_TRANSITION_INVALID,
          `Cannot assign from state: ${currentState}`,
        );
      }

      // Update review
      await client.query(
        `
        UPDATE crisis_reviews
        SET owner_id = $1, state = 'assigned', assigned_at = NOW()
        WHERE id = $2
        `,
        [dto.ownerId, reviewId],
      );

      // Record event
      await this.recordEvent(
        client,
        reviewId,
        currentState,
        'assigned',
        actorId,
        `Assigned to ${dto.ownerId}`,
      );

      await client.query('COMMIT');
      this.logger.log(`Assigned review ${reviewId} to ${dto.ownerId}`);

      return await this.getReview(reviewId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Transition a crisis review (with state machine validation)
   */
  async transitionReview(
    reviewId: string,
    dto: TransitionCrisisReviewDto,
    actorId: string,
  ): Promise<CrisisReviewDto> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get current state
      const current = await client.query<{
        state: CrisisReviewState;
        owner_id: string | null;
      }>(
        `SELECT state, owner_id FROM crisis_reviews WHERE id = $1 FOR UPDATE`,
        [reviewId],
      );

      if (current.rows.length === 0) {
        throw new AppError(404, ERROR_CODES.REVIEW_NOT_FOUND, 'Crisis review not found');
      }

      const currentState = current.rows[0].state;
      const toState = dto.toState;

      // Validate transition
      const allowedTransitions = STATE_MACHINE[currentState];
      if (!allowedTransitions.includes(toState)) {
        throw new AppError(
          422,
          ERROR_CODES.REVIEW_TRANSITION_INVALID,
          `Cannot transition from ${currentState} to ${toState}`,
        );
      }

      // Validate outcome for closed state
      if (toState === 'closed' && !dto.outcome) {
        throw new AppError(
          422,
          ERROR_CODES.REVIEW_TRANSITION_INVALID,
          'Outcome is required when closing',
        );
      }

      // Update review
      const updateFields: string[] = [`state = $1`];
      const updateParams: any[] = [toState];

      if (toState === 'closed') {
        updateParams.push(dto.outcome);
        updateFields.push(`outcome = $${updateParams.length}`);
        updateFields.push(`closed_at = NOW()`);
      }

      updateParams.push(reviewId);

      await client.query(
        `
        UPDATE crisis_reviews
        SET ${updateFields.join(', ')}
        WHERE id = $${updateParams.length}
        `,
        updateParams,
      );

      // Record event
      await this.recordEvent(
        client,
        reviewId,
        currentState,
        toState,
        actorId,
        dto.reason ?? `Transitioned to ${toState}`,
      );

      await client.query('COMMIT');
      this.logger.log(`Transitioned review ${reviewId} from ${currentState} to ${toState}`);

      return await this.getReview(reviewId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reveal contact info for a crisis review (with audit)
   */
  async revealContact(
    reviewId: string,
    dto: RevealContactDto,
    actorId: string,
  ): Promise<RevealedContactDto> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get subject_id from review
      const review = await client.query<{ subject_id: string }>(
        `SELECT subject_id FROM crisis_reviews WHERE id = $1`,
        [reviewId],
      );

      if (review.rows.length === 0) {
        throw new AppError(404, ERROR_CODES.REVIEW_NOT_FOUND, 'Crisis review not found');
      }

      const subjectId = review.rows[0].subject_id;

      // TODO: Fetch from vault (placeholder for now)
      // In production: call VaultService.revealContact(subjectId)
      const emergencyContact = 'Emergency contact (from vault)';
      const emergencyPhone = '+1-555-0100';

      // Record audit event
      await client.query(
        `
        INSERT INTO crisis_review_events (review_id, from_state, to_state, actor_id, reason, row_hash)
        VALUES ($1, 'reveal_contact', 'reveal_contact', $2, $3, $4)
        `,
        [reviewId, actorId, dto.reason, this.hash('reveal_contact')],
      );

      await client.query('COMMIT');
      this.logger.warn(
        `Contact revealed for review ${reviewId} by ${actorId}: ${dto.reason}`,
      );

      return {
        subjectId,
        emergencyContact,
        emergencyPhone,
        revealedAt: new Date().toISOString(),
        reason: dto.reason,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Record a state transition event (audit trail)
   */
  private async recordEvent(
    client: any,
    reviewId: string,
    fromState: string,
    toState: string,
    actorId: string,
    reason: string,
  ): Promise<void> {
    // Get previous hash
    const prev: any = await client.query(
      `
      SELECT row_hash
      FROM crisis_review_events
      WHERE review_id = $1
      ORDER BY at DESC
      LIMIT 1
      `,
      [reviewId],
    );

    const prevHash = prev.rows.length > 0 ? prev.rows[0].row_hash : null;

    // Compute new hash (chain)
    const rowHash = this.hash(
      `${reviewId}|${fromState}|${toState}|${actorId}|${reason}|${prevHash ?? ''}`,
    );

    await client.query(
      `
      INSERT INTO crisis_review_events (review_id, from_state, to_state, actor_id, reason, prev_hash, row_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [reviewId, fromState, toState, actorId, reason, prevHash, rowHash],
    );
  }

  /**
   * Hash helper for audit chain
   */
  private hash(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  /**
   * Verify audit chain integrity
   */
  async verifyChain(reviewId: string): Promise<boolean> {
    const events = await this.pool.query<{
      id: string;
      review_id: string;
      from_state: string;
      to_state: string;
      actor_id: string;
      reason: string;
      prev_hash: string | null;
      row_hash: string;
    }>(
      `
      SELECT id, review_id, from_state, to_state, actor_id, reason, prev_hash, row_hash
      FROM crisis_review_events
      WHERE review_id = $1
      ORDER BY at ASC
      `,
      [reviewId],
    );

    for (let i = 0; i < events.rows.length; i++) {
      const event = events.rows[i];
      const expectedHash = this.hash(
        `${event.review_id}|${event.from_state}|${event.to_state}|${event.actor_id}|${event.reason}|${event.prev_hash ?? ''}`,
      );

      if (event.row_hash !== expectedHash) {
        this.logger.error(`Audit chain broken at event ${event.id}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Escalate unassigned reviews past SLA
   */
  async escalateUnassigned(slaMinutes: number): Promise<number> {
    const result = await this.pool.query<{ id: string }>(
      `
      UPDATE crisis_reviews
      SET escalated_to_lead = TRUE
      WHERE state = 'new'
        AND escalated_to_lead = FALSE
        AND created_at < NOW() - INTERVAL '${slaMinutes} minutes'
      RETURNING id
      `,
    );

    const count = result.rows.length;
    if (count > 0) {
      this.logger.warn(`Escalated ${count} unassigned reviews past SLA`);
    }

    return count;
  }
}
