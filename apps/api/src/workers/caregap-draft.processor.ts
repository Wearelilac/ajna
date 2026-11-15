/**
 * Care-gap draft generation processor (B4.2)
 * Consumes ajna.caregap.draft jobs
 * Generates template-based outreach drafts (NO LLM for v1)
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';

interface DraftJobPayload {
  care_gap_id: string;
  pathway_id: string;
  language?: string; // Default: 'en'
  reading_level?: string; // Default: 'standard'
}

@Injectable()
@Processor('ajna.caregap.draft')
export class CareGapDraftProcessor extends WorkerHost {
  private readonly logger = new Logger(CareGapDraftProcessor.name);

  constructor(private readonly pool: Pool) {
    super();
  }

  async process(job: Job<DraftJobPayload>): Promise<void> {
    const { care_gap_id, pathway_id, language, reading_level } = job.data;

    this.logger.log(
      `Processing care-gap draft job ${job.id} ` +
        `(gap: ${care_gap_id}, pathway: ${pathway_id})`,
    );

    try {
      // Load care gap and pathway
      const gap = await this.loadGap(care_gap_id);
      const pathway = await this.loadPathway(pathway_id);

      if (!gap || !pathway) {
        this.logger.warn(
          `Gap or pathway not found (gap: ${care_gap_id}, pathway: ${pathway_id}), skipping`,
        );
        return;
      }

      // Generate draft body (template-only for v1)
      const body = this.generateDraftBody(gap, pathway, reading_level || 'standard');

      // Validate banned wording
      const violations = this.lintDraft(body);
      if (violations.length > 0) {
        this.logger.error(
          `Draft generation failed: banned wording detected (${violations.join(', ')})`,
        );
        throw new Error(`Banned wording: ${violations.join(', ')}`);
      }

      // Store draft
      await this.storeDraft(care_gap_id, pathway_id, body, language || 'en', reading_level);

      // Update gap status
      await this.markGapStatus(care_gap_id, 'draft_generated');

      this.logger.log(`Care-gap draft job ${job.id} complete (${body.length} chars)`);
    } catch (error) {
      this.logger.error(`Care-gap draft job ${job.id} failed: ${error.message}`);
      throw error; // Rethrow for BullMQ retry logic
    }
  }

  /**
   * Load care gap by ID
   */
  private async loadGap(gapId: string): Promise<{
    id: string;
    gap_type: string;
    indicator_summary: any;
  } | null> {
    const client = await this.pool.connect();
    try {
      // Set RLS context (app_worker role for read access)
      await client.query(`SET LOCAL app.role = 'worker'`);

      const result = await client.query<{
        id: string;
        gap_type: string;
        indicator_summary: any;
      }>(
        `
        SELECT id, gap_type, indicator_summary
        FROM care_gaps
        WHERE id = $1
        `,
        [gapId],
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } finally {
      client.release();
    }
  }

  /**
   * Load pathway by ID
   */
  private async loadPathway(pathwayId: string): Promise<{
    id: string;
    title: string;
    wording_snippets: any;
  } | null> {
    const client = await this.pool.connect();
    try {
      // Set RLS context (app_worker role for read access)
      await client.query(`SET LOCAL app.role = 'worker'`);

      const result = await client.query<{
        id: string;
        title: string;
        wording_snippets: any;
      }>(
        `
        SELECT id, title, wording_snippets
        FROM care_pathways
        WHERE id = $1
        `,
        [pathwayId],
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } finally {
      client.release();
    }
  }

  /**
   * Generate draft body (template-only, no LLM)
   */
  private generateDraftBody(
    gap: { gap_type: string; indicator_summary: any },
    pathway: { title: string; wording_snippets: any },
    readingLevel: string,
  ): string {
    const snippets = pathway.wording_snippets;

    // Select greeting based on reading level
    const greeting =
      readingLevel === 'simple'
        ? snippets.greeting_simple || 'Hello!'
        : snippets.greeting || 'Hello,';

    // Build body based on gap type
    let body = `${greeting}\n\n`;

    if (gap.gap_type === 'overdue_screening') {
      const screeningType = gap.indicator_summary.screening_type || 'screening';
      const daysOverdue = gap.indicator_summary.days_overdue || 0;

      body += snippets.overdue_intro || 'We would like to remind you about an upcoming screening.';
      body += '\n\n';
      body += `Screening: ${pathway.title}\n`;
      body += `Status: ${daysOverdue} days overdue\n\n`;
      body += snippets.benefit_statement || 'This screening may benefit your health.';
    } else if (gap.gap_type === 'frequent_flags') {
      const flagCount = gap.indicator_summary.flag_count || 0;

      body += snippets.wellness_check_intro || 'We would like to offer you a wellness check.';
      body += '\n\n';
      body += `Programme: ${pathway.title}\n\n`;
      body +=
        snippets.benefit_statement ||
        'This programme may help support your wellbeing and resilience.';
    } else if (gap.gap_type === 'sustained_low_pri') {
      const avgPri = gap.indicator_summary.avg_pri || 50;

      body +=
        snippets.support_intro || 'We would like to offer you additional support resources.';
      body += '\n\n';
      body += `Programme: ${pathway.title}\n\n`;
      body +=
        snippets.benefit_statement || 'This programme may help improve your overall wellbeing.';
    } else {
      body += snippets.general_intro || 'We would like to offer you a health programme.';
      body += '\n\n';
      body += `Programme: ${pathway.title}\n\n`;
      body += snippets.benefit_statement || 'This programme may benefit your health.';
    }

    // Add call-to-action
    body += '\n\n';
    body +=
      snippets.call_to_action ||
      'Please contact us to schedule an appointment or learn more about this programme.';

    // Add closing
    body += '\n\n';
    body += snippets.closing || 'Thank you,\nYour Care Team';

    return body;
  }

  /**
   * Store draft (upsert for idempotency)
   */
  private async storeDraft(
    gapId: string,
    pathwayId: string,
    body: string,
    language: string,
    readingLevel?: string,
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Set RLS context (app_worker role for write access)
      await client.query(`SET LOCAL app.role = 'worker'`);

      await client.query(
        `
        INSERT INTO outreach_drafts (care_gap_id, pathway_id, body, language, reading_level, status, generated_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'draft', 'template_only', NOW(), NOW())
        ON CONFLICT (care_gap_id, pathway_id)
        DO UPDATE SET
          body = EXCLUDED.body,
          language = EXCLUDED.language,
          reading_level = EXCLUDED.reading_level,
          updated_at = NOW()
        `,
        [gapId, pathwayId, body, language, readingLevel],
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
   * Mark gap status
   */
  private async markGapStatus(gapId: string, status: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Set RLS context (app_worker role for write access)
      await client.query(`SET LOCAL app.role = 'worker'`);

      await client.query(`UPDATE care_gaps SET status = $1 WHERE id = $2`, [status, gapId]);
    } finally {
      client.release();
    }
  }

  /**
   * Banned-wording lint (same as CareGapService)
   */
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
