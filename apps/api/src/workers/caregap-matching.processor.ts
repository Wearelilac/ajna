/**
 * Care-gap matching processor (B4.2)
 * Consumes ajna.caregap.match jobs
 * Routes care gaps to approved pathways via eligibility filters + pgvector similarity
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';

interface MatchingJobPayload {
  care_gap_id: string;
  top_k?: number; // Default: 3
}

interface PathwayMatch {
  pathway_id: string;
  similarity: number;
  filtered_by: Record<string, any>;
}

@Injectable()
@Processor('ajna.caregap.match')
export class CareGapMatchingProcessor extends WorkerHost {
  private readonly logger = new Logger(CareGapMatchingProcessor.name);

  private readonly DEFAULT_TOP_K = 3;
  private readonly MIN_SIMILARITY = 0.5; // Minimum cosine similarity threshold

  constructor(private readonly pool: Pool) {
    super();
  }

  async process(job: Job<MatchingJobPayload>): Promise<void> {
    const { care_gap_id, top_k } = job.data;

    this.logger.log(`Processing care-gap matching job ${job.id} (gap: ${care_gap_id})`);

    try {
      // Load care gap
      const gap = await this.loadGap(care_gap_id);

      if (!gap) {
        this.logger.warn(`Care gap ${care_gap_id} not found, skipping`);
        return;
      }

      // Apply eligibility filters
      const eligiblePathways = await this.applyEligibilityFilters(gap);

      if (eligiblePathways.length === 0) {
        this.logger.log(`No eligible pathways for gap ${care_gap_id}, marking as no_suitable_pathway`);
        await this.markGapStatus(care_gap_id, 'no_suitable_pathway');
        return;
      }

      // Compute similarity scores (pgvector)
      const matches = await this.computeSimilarity(gap, eligiblePathways, top_k || this.DEFAULT_TOP_K);

      // Store matches
      await this.storeMatches(care_gap_id, matches);

      // Update gap status
      await this.markGapStatus(care_gap_id, 'matched');

      this.logger.log(
        `Care-gap matching job ${job.id} complete: ${matches.length} matches found`,
      );
    } catch (error) {
      this.logger.error(`Care-gap matching job ${job.id} failed: ${error.message}`);
      throw error; // Rethrow for BullMQ retry logic
    }
  }

  /**
   * Load care gap by ID
   */
  private async loadGap(gapId: string): Promise<{
    id: string;
    subject_id: string;
    gap_type: string;
    indicator_summary: any;
  } | null> {
    const client = await this.pool.connect();
    try {
      // Set RLS context (app_worker role for read access)
      await client.query(`SET LOCAL app.role = 'worker'`);

      const result = await client.query<{
        id: string;
        subject_id: string;
        gap_type: string;
        indicator_summary: any;
      }>(
        `
        SELECT id, subject_id, gap_type, indicator_summary
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
   * Apply hard eligibility filters (age band, gap type)
   */
  private async applyEligibilityFilters(gap: {
    gap_type: string;
    indicator_summary: any;
  }): Promise<string[]> {
    const client = await this.pool.connect();
    try {
      // Set RLS context (app_worker role for read access)
      await client.query(`SET LOCAL app.role = 'worker'`);

      const ageBand = gap.indicator_summary.age_band;
      const screeningType = gap.indicator_summary.screening_type;
      const daysOverdue = gap.indicator_summary.days_overdue;
      const flagCount = gap.indicator_summary.flag_count;

      // Build eligibility filters
      const conditions: string[] = ['active = TRUE'];

      // Age band filter (required)
      if (ageBand) {
        conditions.push(`eligibility->>'age_bands' @> $1`);
      }

      // Gap type filter
      conditions.push(`eligibility->>'gap_types' @> $2`);

      const queryParams: any[] = [];
      if (ageBand) {
        queryParams.push(JSON.stringify([ageBand]));
      }
      queryParams.push(JSON.stringify([gap.gap_type]));

      // Query eligible pathways
      const result = await client.query<{ id: string }>(
        `
        SELECT id
        FROM care_pathways
        WHERE ${conditions.join(' AND ')}
        ORDER BY title
        `,
        queryParams,
      );

      // Further filter based on screening_type, days_overdue, flag_count
      const eligibleIds: string[] = [];

      for (const row of result.rows) {
        const pathway = await this.loadPathway(row.id);
        if (!pathway) continue;

        let eligible = true;

        // Screening type filter (if specified)
        if (screeningType && pathway.eligibility.screening_types) {
          const types = pathway.eligibility.screening_types as string[];
          if (!types.includes(screeningType)) {
            eligible = false;
          }
        }

        // Days overdue filter (if specified)
        if (daysOverdue && pathway.eligibility.max_days_overdue) {
          if (daysOverdue > pathway.eligibility.max_days_overdue) {
            eligible = false;
          }
        }

        // Flag count filter (if specified)
        if (flagCount && pathway.eligibility.min_flag_count) {
          if (flagCount < pathway.eligibility.min_flag_count) {
            eligible = false;
          }
        }

        if (eligible) {
          eligibleIds.push(row.id);
        }
      }

      return eligibleIds;
    } finally {
      client.release();
    }
  }

  /**
   * Load pathway by ID
   */
  private async loadPathway(pathwayId: string): Promise<{
    id: string;
    eligibility: any;
    embedding: any;
  } | null> {
    const client = await this.pool.connect();
    try {
      // Set RLS context (app_worker role for read access)
      await client.query(`SET LOCAL app.role = 'worker'`);

      const result = await client.query<{
        id: string;
        eligibility: any;
        embedding: any;
      }>(
        `
        SELECT id, eligibility, embedding
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
   * Compute similarity scores (pgvector cosine similarity)
   */
  private async computeSimilarity(
    gap: { gap_type: string; indicator_summary: any },
    eligiblePathwayIds: string[],
    topK: number,
  ): Promise<PathwayMatch[]> {
    const client = await this.pool.connect();
    try {
      // Set RLS context (app_worker role for read access)
      await client.query(`SET LOCAL app.role = 'worker'`);

      // Generate gap embedding (simple feature-based for MVP)
      const gapEmbedding = this.generateGapEmbedding(gap);

      // Convert to pgvector format
      const vectorStr = `[${gapEmbedding.join(',')}]`;

      // Query: cosine similarity with eligible pathways
      const result = await client.query<{
        id: string;
        similarity: number;
      }>(
        `
        SELECT
          id,
          1 - (embedding <=> $1::vector) AS similarity
        FROM care_pathways
        WHERE id = ANY($2)
          AND embedding IS NOT NULL
        ORDER BY similarity DESC
        LIMIT $3
        `,
        [vectorStr, eligiblePathwayIds, topK],
      );

      // Filter by minimum similarity threshold
      return result.rows
        .filter((row) => row.similarity >= this.MIN_SIMILARITY)
        .map((row) => ({
          pathway_id: row.id,
          similarity: parseFloat(row.similarity.toFixed(4)),
          filtered_by: {
            age_band: gap.indicator_summary.age_band,
            gap_type: gap.gap_type,
          },
        }));
    } finally {
      client.release();
    }
  }

  /**
   * Generate gap embedding from indicator summary
   * (Simple feature-based approach for MVP)
   */
  private generateGapEmbedding(gap: {
    gap_type: string;
    indicator_summary: any;
  }): number[] {
    // Placeholder: 384-dim embedding (matches care_pathways.embedding)
    // In production, use sentence-transformer (all-MiniLM-L6-v2)
    const embedding = new Array(384).fill(0);

    // Encode gap_type
    const gapTypeMap: Record<string, number> = {
      overdue_screening: 0.8,
      frequent_flags: 0.6,
      sustained_low_pri: 0.4,
      sudden_decline: 0.2,
    };
    const gapTypeValue = gapTypeMap[gap.gap_type] || 0.5;

    // Encode age_band
    const ageBandMap: Record<string, number> = {
      '0-18': 0.2,
      '19-50': 0.5,
      '51+': 0.8,
    };
    const ageBandValue = ageBandMap[gap.indicator_summary.age_band] || 0.5;

    // Fill embedding with simple pattern (placeholder)
    for (let i = 0; i < 384; i++) {
      const phase = (i / 384) * 2 * Math.PI;
      embedding[i] = gapTypeValue * Math.cos(phase) + ageBandValue * Math.sin(phase);
    }

    // Normalize to unit length
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    return embedding.map((v) => v / (magnitude || 1.0));
  }

  /**
   * Store pathway matches (upsert for idempotency)
   */
  private async storeMatches(gapId: string, matches: PathwayMatch[]): Promise<void> {
    if (matches.length === 0) {
      return;
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Set RLS context (app_worker role for write access)
      await client.query(`SET LOCAL app.role = 'worker'`);

      // Delete old matches
      await client.query(`DELETE FROM pathway_matches WHERE care_gap_id = $1`, [gapId]);

      // Insert new matches
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        await client.query(
          `
          INSERT INTO pathway_matches (care_gap_id, pathway_id, rank, similarity, filtered_by, created_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          `,
          [gapId, match.pathway_id, i + 1, match.similarity, JSON.stringify(match.filtered_by)],
        );
      }

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
}
