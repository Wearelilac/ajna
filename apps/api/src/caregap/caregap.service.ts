/**
 * B4.2: Care-Gap Service
 * Detects overdue screenings, routes to approved pathways, generates outreach drafts
 * NO automatic sending - human review required
 */

import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { AppError, ERROR_CODES } from '../common/errors';
import {
  CareGapDto,
  PathwayMatchDto,
  OutreachDraftDto,
  CarePathwayDto,
  DraftTransitionDto,
} from './dto/caregap.dto';

@Injectable()
export class CareGapService {
  private readonly logger = new Logger(CareGapService.name);

  constructor(private readonly pool: Pool) {}

  /**
   * List care gaps (with filters)
   * Returns: gaps with consent-filtered subject data
   */
  async listGaps(params: {
    gapType?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<CareGapDto[]> {
    const conditions: string[] = ['1=1'];
    const queryParams: any[] = [];

    if (params.gapType) {
      queryParams.push(params.gapType);
      conditions.push(`gap_type = $${queryParams.length}`);
    }

    if (params.status) {
      queryParams.push(params.status);
      conditions.push(`status = $${queryParams.length}`);
    }

    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;
    queryParams.push(limit, offset);

    const client = await this.pool.connect();
    try {
      // Set RLS context (app_reviewer for read access)
      await client.query(`SET LOCAL app.role = 'reviewer'`);

      const result = await client.query<{
        id: string;
        subject_id: string;
        gap_type: string;
        due_date: Date | null;
        indicator_summary: any;
        status: string;
        created_at: Date;
      }>(
        `
        SELECT id, subject_id, gap_type, due_date, indicator_summary, status, created_at
        FROM care_gaps
        WHERE ${conditions.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
        `,
        queryParams,
      );

      return result.rows.map((row) => ({
        id: row.id,
        subjectId: row.subject_id,
        gapType: row.gap_type,
        dueDate: row.due_date ? row.due_date.toISOString().split('T')[0] : null,
        indicatorSummary: row.indicator_summary,
        status: row.status,
        createdAt: row.created_at.toISOString(),
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Get care gap by ID
   */
  async getGapById(id: string): Promise<CareGapDto> {
    const client = await this.pool.connect();
    try {
      // Set RLS context (app_reviewer for read access)
      await client.query(`SET LOCAL app.role = 'reviewer'`);

      const result = await client.query<{
        id: string;
        subject_id: string;
        gap_type: string;
        due_date: Date | null;
        indicator_summary: any;
        status: string;
        created_at: Date;
      }>(
        `
        SELECT id, subject_id, gap_type, due_date, indicator_summary, status, created_at
        FROM care_gaps
        WHERE id = $1
        `,
        [id],
      );

      if (result.rows.length === 0) {
        throw new AppError(404, ERROR_CODES.REVIEW_NOT_FOUND, `Care gap ${id} not found`);
      }

      const row = result.rows[0];
      return {
        id: row.id,
        subjectId: row.subject_id,
        gapType: row.gap_type,
        dueDate: row.due_date ? row.due_date.toISOString().split('T')[0] : null,
        indicatorSummary: row.indicator_summary,
        status: row.status,
        createdAt: row.created_at.toISOString(),
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get pathway matches for a care gap
   * Returns: top-k pathways ranked by similarity
   */
  async getMatches(gapId: string): Promise<PathwayMatchDto[]> {
    const client = await this.pool.connect();
    try {
      // Set RLS context (app_reviewer for read access)
      await client.query(`SET LOCAL app.role = 'reviewer'`);

      const result = await client.query<{
        id: string;
        pathway_id: string;
        rank: number;
        similarity: number;
        filtered_by: any;
        title: string;
        description: string;
      }>(
        `
        SELECT
          pm.id,
          pm.pathway_id,
          pm.rank,
          pm.similarity,
          pm.filtered_by,
          cp.title,
          cp.description
        FROM pathway_matches pm
        INNER JOIN care_pathways cp ON pm.pathway_id = cp.id
        WHERE pm.care_gap_id = $1
        ORDER BY pm.rank ASC
        `,
        [gapId],
      );

      return result.rows.map((row) => ({
        id: row.id,
        pathwayId: row.pathway_id,
        rank: row.rank,
        similarity: parseFloat(row.similarity.toString()),
        filteredBy: row.filtered_by,
        pathwayTitle: row.title,
        pathwayDescription: row.description,
      }));
    } finally {
      client.release();
    }
  }

  /**
   * List outreach drafts (with filters)
   */
  async listDrafts(params: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<OutreachDraftDto[]> {
    const conditions: string[] = ['1=1'];
    const queryParams: any[] = [];

    if (params.status) {
      queryParams.push(params.status);
      conditions.push(`status = $${queryParams.length}`);
    }

    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;
    queryParams.push(limit, offset);

    const client = await this.pool.connect();
    try {
      // Set RLS context (app_reviewer for read access)
      await client.query(`SET LOCAL app.role = 'reviewer'`);

      const result = await client.query<{
        id: string;
        care_gap_id: string;
        pathway_id: string;
        body: string;
        language: string;
        reading_level: string | null;
        status: string;
        generated_by: string;
        created_at: Date;
        updated_at: Date;
      }>(
        `
        SELECT id, care_gap_id, pathway_id, body, language, reading_level, status, generated_by, created_at, updated_at
        FROM outreach_drafts
        WHERE ${conditions.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
        `,
        queryParams,
      );

      return result.rows.map((row) => ({
        id: row.id,
        careGapId: row.care_gap_id,
        pathwayId: row.pathway_id,
        body: row.body,
        language: row.language,
        readingLevel: row.reading_level,
        status: row.status,
        generatedBy: row.generated_by,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Get outreach draft by ID
   */
  async getDraftById(id: string): Promise<OutreachDraftDto> {
    const client = await this.pool.connect();
    try {
      // Set RLS context (app_reviewer for read access)
      await client.query(`SET LOCAL app.role = 'reviewer'`);

      const result = await client.query<{
        id: string;
        care_gap_id: string;
        pathway_id: string;
        body: string;
        language: string;
        reading_level: string | null;
        status: string;
        generated_by: string;
        created_at: Date;
        updated_at: Date;
      }>(
        `
        SELECT id, care_gap_id, pathway_id, body, language, reading_level, status, generated_by, created_at, updated_at
        FROM outreach_drafts
        WHERE id = $1
        `,
        [id],
      );

      if (result.rows.length === 0) {
        throw new AppError(404, ERROR_CODES.REVIEW_NOT_FOUND, `Outreach draft ${id} not found`);
      }

      const row = result.rows[0];
      return {
        id: row.id,
        careGapId: row.care_gap_id,
        pathwayId: row.pathway_id,
        body: row.body,
        language: row.language,
        readingLevel: row.reading_level,
        status: row.status,
        generatedBy: row.generated_by,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      };
    } finally {
      client.release();
    }
  }

  /**
   * Update draft body (editorial changes)
   */
  async updateDraftBody(id: string, body: string, reviewerId: string): Promise<void> {
    // Validate banned wording
    const violations = this.lintDraft(body);
    if (violations.length > 0) {
      throw new AppError(
        400,
        ERROR_CODES.FLAG_FIELD_NOT_ALLOWED, // Reuse for draft lint
        `Draft contains banned wording: ${violations.join(', ')}`,
      );
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Set RLS context (app_reviewer for write access)
      await client.query(`SET LOCAL app.role = 'reviewer'`);

      // Update body
      await client.query(
        `
        UPDATE outreach_drafts
        SET body = $1, updated_at = NOW()
        WHERE id = $2
        `,
        [body, id],
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Transition draft status (state machine enforcement)
   */
  async transitionDraft(
    id: string,
    toStatus: string,
    reviewerId: string,
    reviewerRole: string,
    reason?: string,
    editedBody?: string,
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Set RLS context (app_reviewer for write access)
      await client.query(`SET LOCAL app.role = 'reviewer'`);

      // Get current status
      const result = await client.query<{ status: string }>(
        `SELECT status FROM outreach_drafts WHERE id = $1`,
        [id],
      );

      if (result.rows.length === 0) {
        throw new AppError(404, ERROR_CODES.REVIEW_NOT_FOUND, `Outreach draft ${id} not found`);
      }

      const fromStatus = result.rows[0].status;

      // Validate transition
      if (!this.isValidTransition(fromStatus, toStatus, reviewerRole)) {
        throw new AppError(
          400,
          ERROR_CODES.REVIEW_TRANSITION_INVALID,
          `Invalid transition: ${fromStatus} → ${toStatus} (role: ${reviewerRole})`,
        );
      }

      // Update status
      await client.query(
        `
        UPDATE outreach_drafts
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        `,
        [toStatus, id],
      );

      // Apply edited body if provided
      if (editedBody) {
        const violations = this.lintDraft(editedBody);
        if (violations.length > 0) {
          throw new AppError(
            400,
            ERROR_CODES.FLAG_FIELD_NOT_ALLOWED,
            `Edited draft contains banned wording: ${violations.join(', ')}`,
          );
        }

        await client.query(
          `UPDATE outreach_drafts SET body = $1 WHERE id = $2`,
          [editedBody, id],
        );
      }

      // Record review in audit chain
      await client.query(
        `
        INSERT INTO draft_reviews (draft_id, reviewer_id, reviewer_role, from_status, to_status, reason, edited_body, prev_hash, row_hash, at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, gen_random_uuid()::text, NOW())
        `,
        [id, reviewerId, reviewerRole, fromStatus, toStatus, reason, editedBody],
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * List care pathways (approved only)
   */
  async listPathways(): Promise<CarePathwayDto[]> {
    const client = await this.pool.connect();
    try {
      // Set RLS context (app_reviewer for read access)
      await client.query(`SET LOCAL app.role = 'reviewer'`);

      const result = await client.query<{
        id: string;
        title: string;
        eligibility: any;
        description: string;
        wording_snippets: any;
        owner_role: string;
        approved_by: string;
        approved_on: Date;
        active: boolean;
      }>(
        `
        SELECT id, title, eligibility, description, wording_snippets, owner_role, approved_by, approved_on, active
        FROM care_pathways
        WHERE active = TRUE
        ORDER BY title
        `,
      );

      return result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        eligibility: row.eligibility,
        description: row.description,
        wordingSnippets: row.wording_snippets,
        ownerRole: row.owner_role,
        approvedBy: row.approved_by,
        approvedOn: row.approved_on.toISOString().split('T')[0],
        active: row.active,
      }));
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // State Machine
  // ============================================================================

  private isValidTransition(
    fromStatus: string,
    toStatus: string,
    reviewerRole: string,
  ): boolean {
    const transitions: Record<string, string[]> = {
      draft: ['in_review'],
      in_review: ['approved', 'edited_approved', 'rejected'],
      approved: ['closed'],
      edited_approved: ['closed'],
      rejected: ['closed', 'in_review'],
      closed: [], // Terminal state
    };

    // Check if transition is allowed
    if (!transitions[fromStatus]?.includes(toStatus)) {
      return false;
    }

    // Role checks: only reviewer/clinical_supervisor can approve
    if (
      (toStatus === 'approved' || toStatus === 'edited_approved') &&
      reviewerRole !== 'reviewer' &&
      reviewerRole !== 'clinical_supervisor'
    ) {
      return false;
    }

    return true;
  }

  // ============================================================================
  // Banned-Wording Lint
  // ============================================================================

  private lintDraft(body: string): string[] {
    const bannedWords = [
      // Diagnostic
      'diagnosed',
      'diagnosis',
      'disorder',
      'disease',
      'condition',
      // Detection
      'detected',
      'flagged',
      'identified',
      'abnormal',
      'alert',
      // Technical
      'risk score',
      'distress signature',
      'acoustic pattern',
      'voice analysis',
      'AI detected',
      'algorithm found',
      'system identified',
      'automated screening',
      'audio analysis',
      'vocal biomarker',
    ];

    const violations: string[] = [];
    const lowerBody = body.toLowerCase();

    for (const word of bannedWords) {
      if (lowerBody.includes(word)) {
        violations.push(word);
      }
    }

    return violations;
  }
}
