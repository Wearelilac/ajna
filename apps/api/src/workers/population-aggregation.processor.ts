/**
 * Population aggregation processor (B4.1)
 * Consumes ajna.population.aggregate jobs
 * Aggregates consented subject data into community-level summaries
 * with K-anonymity enforcement (K≥10)
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { LIMITS } from '../common/limits';

interface AggregationJobPayload {
  week_start?: string; // YYYY-MM-DD (Monday)
  month_start?: string; // YYYY-MM-DD (first of month)
  granularity: 'week' | 'month';
}

interface CommunityAggregate {
  community_id: string;
  age_band: string;
  subjects_n: number;
  flag_count: number;
  pri_values: number[];
  deviation_count: number;
}

@Injectable()
@Processor('ajna.population.aggregate')
export class PopulationAggregationProcessor extends WorkerHost {
  private readonly logger = new Logger(PopulationAggregationProcessor.name);

  constructor(private readonly pool: Pool) {
    super();
  }

  async process(job: Job<AggregationJobPayload>): Promise<void> {
    const { week_start, month_start, granularity } = job.data;

    this.logger.log(
      `Processing population aggregation job ${job.id} (${granularity}, ` +
        `period: ${week_start || month_start})`,
    );

    try {
      if (granularity === 'week') {
        if (!week_start) {
          throw new Error('week_start required for weekly aggregation');
        }
        await this.aggregateWeek(week_start);
      } else {
        if (!month_start) {
          throw new Error('month_start required for monthly aggregation');
        }
        await this.aggregateMonth(month_start);
      }

      this.logger.log(`Population aggregation job ${job.id} complete`);
    } catch (error) {
      this.logger.error(`Population aggregation job ${job.id} failed: ${error.message}`);
      throw error; // Rethrow for BullMQ retry logic
    }
  }

  /**
   * Aggregate data for a week (Monday - Sunday)
   * Only includes subjects with active population_use consent
   */
  private async aggregateWeek(weekStart: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Set RLS context (app_worker role for write access)
      await client.query(`SET LOCAL app.role = 'worker'`);

      // Compute week end (Sunday)
      const weekEndResult = await client.query(
        `SELECT $1::date + INTERVAL '6 days' AS week_end`,
        [weekStart],
      );
      const weekEnd = weekEndResult.rows[0].week_end;

      // Query: aggregate by community + age_band for this week
      // Only subjects with population_use=true consent
      const result = await client.query(
        `
        WITH consented_subjects AS (
          SELECT s.subject_id, s.community_id, s.age_band
          FROM subjects s
          INNER JOIN consents c ON s.subject_id = c.subject_id
          WHERE c.population_use = TRUE
            AND c.revoked_at IS NULL
            AND s.community_id IS NOT NULL
            AND s.age_band IS NOT NULL
        ),
        week_data AS (
          SELECT
            cs.community_id,
            cs.age_band,
            COUNT(DISTINCT cs.subject_id) AS subjects_n,
            COUNT(df.flag_id) AS flag_count,
            COALESCE(ARRAY_AGG(p.pri) FILTER (WHERE p.pri IS NOT NULL), ARRAY[]::integer[]) AS pri_values,
            COUNT(df.flag_id) AS deviation_count
          FROM consented_subjects cs
          LEFT JOIN deviation_flags df ON cs.subject_id = df.subject_id
            AND df.date >= $1::date
            AND df.date <= $2::date
          LEFT JOIN pri_daily p ON cs.subject_id = p.subject_id
            AND p.date >= $1::date
            AND p.date <= $2::date
          GROUP BY cs.community_id, cs.age_band
        )
        SELECT * FROM week_data
        `,
        [weekStart, weekEnd],
      );

      // Insert aggregates (with K-anonymity suppression)
      for (const row of result.rows) {
        const agg: CommunityAggregate = {
          community_id: row.community_id,
          age_band: row.age_band,
          subjects_n: parseInt(row.subjects_n),
          flag_count: parseInt(row.flag_count),
          pri_values: row.pri_values || [],
          deviation_count: parseInt(row.deviation_count),
        };

        // Apply K-anonymity suppression (K≥10)
        const suppressed = agg.subjects_n < LIMITS.POPULATION.MIN_K;

        // Compute PRI statistics (if not suppressed)
        let meanPri = null;
        let medianPri = null;
        let p10Pri = null;
        let p90Pri = null;
        let deviationShare = null;

        if (!suppressed && agg.pri_values.length > 0) {
          meanPri = this.mean(agg.pri_values);
          medianPri = this.median(agg.pri_values);
          p10Pri = this.percentile(agg.pri_values, 10);
          p90Pri = this.percentile(agg.pri_values, 90);
          deviationShare = agg.deviation_count / agg.subjects_n;
        }

        // Insert (upsert for idempotency)
        await client.query(
          `
          INSERT INTO community_week_agg (
            community_id, week_start, age_band,
            subjects_n, flag_count,
            mean_pri, median_pri, p10_pri, p90_pri,
            deviation_share,
            suppressed
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (community_id, week_start, age_band)
          DO UPDATE SET
            subjects_n = EXCLUDED.subjects_n,
            flag_count = EXCLUDED.flag_count,
            mean_pri = EXCLUDED.mean_pri,
            median_pri = EXCLUDED.median_pri,
            p10_pri = EXCLUDED.p10_pri,
            p90_pri = EXCLUDED.p90_pri,
            deviation_share = EXCLUDED.deviation_share,
            suppressed = EXCLUDED.suppressed,
            created_at = NOW()
          `,
          [
            agg.community_id,
            weekStart,
            agg.age_band,
            suppressed ? null : agg.subjects_n, // NULL if suppressed
            suppressed ? null : agg.flag_count,
            suppressed ? null : meanPri,
            suppressed ? null : medianPri,
            suppressed ? null : p10Pri,
            suppressed ? null : p90Pri,
            suppressed ? null : deviationShare,
            suppressed,
          ],
        );
      }

      await client.query('COMMIT');

      this.logger.log(
        `Week aggregation complete: ${result.rows.length} groups, ` +
          `${result.rows.filter((r) => parseInt(r.subjects_n) >= LIMITS.POPULATION.MIN_K).length} released, ` +
          `${result.rows.filter((r) => parseInt(r.subjects_n) < LIMITS.POPULATION.MIN_K).length} suppressed`,
      );
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Aggregate data for a month (first to last day)
   */
  private async aggregateMonth(monthStart: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Set RLS context (app_worker role for write access)
      await client.query(`SET LOCAL app.role = 'worker'`);

      // Compute month end (last day of month)
      const monthEndResult = await client.query(
        `SELECT ($1::date + INTERVAL '1 month' - INTERVAL '1 day')::date AS month_end`,
        [monthStart],
      );
      const monthEnd = monthEndResult.rows[0].month_end;

      // Query: aggregate by community + age_band for this month
      const result = await client.query(
        `
        WITH consented_subjects AS (
          SELECT s.subject_id, s.community_id, s.age_band
          FROM subjects s
          INNER JOIN consents c ON s.subject_id = c.subject_id
          WHERE c.population_use = TRUE
            AND c.revoked_at IS NULL
            AND s.community_id IS NOT NULL
            AND s.age_band IS NOT NULL
        ),
        month_data AS (
          SELECT
            cs.community_id,
            cs.age_band,
            COUNT(DISTINCT cs.subject_id) AS subjects_n,
            COUNT(df.flag_id) AS flag_count,
            COALESCE(ARRAY_AGG(p.pri) FILTER (WHERE p.pri IS NOT NULL), ARRAY[]::integer[]) AS pri_values,
            COUNT(df.flag_id) AS deviation_count
          FROM consented_subjects cs
          LEFT JOIN deviation_flags df ON cs.subject_id = df.subject_id
            AND df.date >= $1::date
            AND df.date <= $2::date
          LEFT JOIN pri_daily p ON cs.subject_id = p.subject_id
            AND p.date >= $1::date
            AND p.date <= $2::date
          GROUP BY cs.community_id, cs.age_band
        )
        SELECT * FROM month_data
        `,
        [monthStart, monthEnd],
      );

      // Insert aggregates (same pattern as weekly)
      for (const row of result.rows) {
        const agg: CommunityAggregate = {
          community_id: row.community_id,
          age_band: row.age_band,
          subjects_n: parseInt(row.subjects_n),
          flag_count: parseInt(row.flag_count),
          pri_values: row.pri_values || [],
          deviation_count: parseInt(row.deviation_count),
        };

        const suppressed = agg.subjects_n < LIMITS.POPULATION.MIN_K;

        let meanPri = null;
        let medianPri = null;
        let p10Pri = null;
        let p90Pri = null;
        let deviationShare = null;

        if (!suppressed && agg.pri_values.length > 0) {
          meanPri = this.mean(agg.pri_values);
          medianPri = this.median(agg.pri_values);
          p10Pri = this.percentile(agg.pri_values, 10);
          p90Pri = this.percentile(agg.pri_values, 90);
          deviationShare = agg.deviation_count / agg.subjects_n;
        }

        await client.query(
          `
          INSERT INTO community_month_agg (
            community_id, month_start, age_band,
            subjects_n, flag_count,
            mean_pri, median_pri, p10_pri, p90_pri,
            deviation_share,
            suppressed
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (community_id, month_start, age_band)
          DO UPDATE SET
            subjects_n = EXCLUDED.subjects_n,
            flag_count = EXCLUDED.flag_count,
            mean_pri = EXCLUDED.mean_pri,
            median_pri = EXCLUDED.median_pri,
            p10_pri = EXCLUDED.p10_pri,
            p90_pri = EXCLUDED.p90_pri,
            deviation_share = EXCLUDED.deviation_share,
            suppressed = EXCLUDED.suppressed,
            created_at = NOW()
          `,
          [
            agg.community_id,
            monthStart,
            agg.age_band,
            suppressed ? null : agg.subjects_n,
            suppressed ? null : agg.flag_count,
            suppressed ? null : meanPri,
            suppressed ? null : medianPri,
            suppressed ? null : p10Pri,
            suppressed ? null : p90Pri,
            suppressed ? null : deviationShare,
            suppressed,
          ],
        );
      }

      await client.query('COMMIT');

      this.logger.log(
        `Month aggregation complete: ${result.rows.length} groups, ` +
          `${result.rows.filter((r) => parseInt(r.subjects_n) >= LIMITS.POPULATION.MIN_K).length} released, ` +
          `${result.rows.filter((r) => parseInt(r.subjects_n) < LIMITS.POPULATION.MIN_K).length} suppressed`,
      );
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // Statistical helpers
  // ============================================================================

  private mean(values: number[]): number {
    return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100;
  }

  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    }
    return sorted[mid];
  }

  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
}
