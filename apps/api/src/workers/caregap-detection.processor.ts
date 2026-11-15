/**
 * Care-gap detection processor (B4.2)
 * Consumes ajna.caregap.detect jobs
 * Detects overdue screenings, frequent flags, sustained low PRI
 * Only includes subjects with active population_use consent
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';

interface DetectionJobPayload {
  subject_id?: string; // If omitted, detect for all consented subjects
  gap_types?: string[]; // If omitted, detect all types
}

interface CareGap {
  subject_id: string;
  gap_type: string;
  due_date: string | null;
  indicator_summary: Record<string, any>;
}

@Injectable()
@Processor('ajna.caregap.detect')
export class CareGapDetectionProcessor extends WorkerHost {
  private readonly logger = new Logger(CareGapDetectionProcessor.name);

  constructor(private readonly pool: Pool) {
    super();
  }

  async process(job: Job<DetectionJobPayload>): Promise<void> {
    const { subject_id, gap_types } = job.data;

    this.logger.log(
      `Processing care-gap detection job ${job.id} ` +
        `(subject: ${subject_id || 'all'}, types: ${gap_types?.join(',') || 'all'})`,
    );

    try {
      const gaps: CareGap[] = [];

      // Detect overdue screenings
      if (!gap_types || gap_types.includes('overdue_screening')) {
        const overdueGaps = await this.detectOverdueScreenings(subject_id);
        gaps.push(...overdueGaps);
      }

      // Detect frequent flags
      if (!gap_types || gap_types.includes('frequent_flags')) {
        const flagGaps = await this.detectFrequentFlags(subject_id);
        gaps.push(...flagGaps);
      }

      // Detect sustained low PRI
      if (!gap_types || gap_types.includes('sustained_low_pri')) {
        const priGaps = await this.detectSustainedLowPRI(subject_id);
        gaps.push(...priGaps);
      }

      // Store gaps
      await this.storeGaps(gaps);

      this.logger.log(
        `Care-gap detection job ${job.id} complete: ${gaps.length} gaps detected`,
      );
    } catch (error) {
      this.logger.error(`Care-gap detection job ${job.id} failed: ${error.message}`);
      throw error; // Rethrow for BullMQ retry logic
    }
  }

  /**
   * Detect overdue screenings (well-child visits, adult screenings)
   */
  private async detectOverdueScreenings(subjectId?: string): Promise<CareGap[]> {
    const client = await this.pool.connect();
    try {
      // Set RLS context (app_worker role for read access)
      await client.query(`SET LOCAL app.role = 'worker'`);

      const conditions: string[] = ['c.population_use = TRUE', 'c.revoked_at IS NULL'];
      const queryParams: any[] = [];

      if (subjectId) {
        queryParams.push(subjectId);
        conditions.push(`s.subject_id = $${queryParams.length}`);
      }

      // Query: Find subjects with overdue screenings
      // Note: care_history table doesn't exist yet (placeholder for demo)
      // For MVP, we'll use a synthetic approach based on age_band
      const result = await client.query<{
        subject_id: string;
        age_band: string;
        screening_type: string;
        due_date: string;
        days_overdue: number;
      }>(
        `
        WITH consented_subjects AS (
          SELECT s.subject_id, s.age_band, s.date_of_birth
          FROM subjects s
          INNER JOIN consents c ON s.subject_id = c.subject_id
          WHERE ${conditions.join(' AND ')}
        ),
        screening_schedule AS (
          -- Well-child visits (age 0-18)
          SELECT
            cs.subject_id,
            cs.age_band,
            'well_child_18m' AS screening_type,
            (cs.date_of_birth + INTERVAL '18 months')::date AS due_date
          FROM consented_subjects cs
          WHERE cs.age_band = '0-18'
            AND EXTRACT(YEAR FROM AGE(NOW(), cs.date_of_birth)) < 2
          
          UNION ALL
          
          SELECT
            cs.subject_id,
            cs.age_band,
            'well_child_3y' AS screening_type,
            (cs.date_of_birth + INTERVAL '3 years')::date AS due_date
          FROM consented_subjects cs
          WHERE cs.age_band = '0-18'
            AND EXTRACT(YEAR FROM AGE(NOW(), cs.date_of_birth)) BETWEEN 2 AND 4
          
          UNION ALL
          
          -- Adult comprehensive screenings (age 19-50)
          SELECT
            cs.subject_id,
            cs.age_band,
            'adult_comprehensive_30s' AS screening_type,
            (cs.date_of_birth + INTERVAL '30 years')::date AS due_date
          FROM consented_subjects cs
          WHERE cs.age_band = '19-50'
            AND EXTRACT(YEAR FROM AGE(NOW(), cs.date_of_birth)) BETWEEN 30 AND 39
          
          UNION ALL
          
          -- Senior wellness (age 51+)
          SELECT
            cs.subject_id,
            cs.age_band,
            'senior_wellness_70' AS screening_type,
            (cs.date_of_birth + INTERVAL '70 years')::date AS due_date
          FROM consented_subjects cs
          WHERE cs.age_band = '51+'
            AND EXTRACT(YEAR FROM AGE(NOW(), cs.date_of_birth)) >= 70
        )
        SELECT
          subject_id,
          age_band,
          screening_type,
          due_date::text,
          (CURRENT_DATE - due_date) AS days_overdue
        FROM screening_schedule
        WHERE due_date < CURRENT_DATE
        ORDER BY days_overdue DESC
        `,
        queryParams,
      );

      return result.rows.map((row) => ({
        subject_id: row.subject_id,
        gap_type: 'overdue_screening',
        due_date: row.due_date,
        indicator_summary: {
          screening_type: row.screening_type,
          age_band: row.age_band,
          days_overdue: row.days_overdue,
        },
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Detect frequent flags (5+ flags in 30 days)
   */
  private async detectFrequentFlags(subjectId?: string): Promise<CareGap[]> {
    const client = await this.pool.connect();
    try {
      // Set RLS context (app_worker role for read access)
      await client.query(`SET LOCAL app.role = 'worker'`);

      const conditions: string[] = ['c.population_use = TRUE', 'c.revoked_at IS NULL'];
      const queryParams: any[] = [];

      if (subjectId) {
        queryParams.push(subjectId);
        conditions.push(`s.subject_id = $${queryParams.length}`);
      }

      // Query: Find subjects with 5+ flags in last 30 days
      const result = await client.query<{
        subject_id: string;
        age_band: string;
        flag_count: number;
      }>(
        `
        WITH consented_subjects AS (
          SELECT s.subject_id, s.age_band
          FROM subjects s
          INNER JOIN consents c ON s.subject_id = c.subject_id
          WHERE ${conditions.join(' AND ')}
        ),
        recent_flags AS (
          SELECT
            cs.subject_id,
            cs.age_band,
            COUNT(df.flag_id) AS flag_count
          FROM consented_subjects cs
          INNER JOIN deviation_flags df ON cs.subject_id = df.subject_id
          WHERE df.date >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY cs.subject_id, cs.age_band
          HAVING COUNT(df.flag_id) >= 5
        )
        SELECT subject_id, age_band, flag_count
        FROM recent_flags
        ORDER BY flag_count DESC
        `,
        queryParams,
      );

      return result.rows.map((row) => ({
        subject_id: row.subject_id,
        gap_type: 'frequent_flags',
        due_date: null,
        indicator_summary: {
          age_band: row.age_band,
          flag_count: row.flag_count,
          window_days: 30,
        },
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Detect sustained low PRI (PRI < 40 for 14+ days)
   */
  private async detectSustainedLowPRI(subjectId?: string): Promise<CareGap[]> {
    const client = await this.pool.connect();
    try {
      // Set RLS context (app_worker role for read access)
      await client.query(`SET LOCAL app.role = 'worker'`);

      const conditions: string[] = ['c.population_use = TRUE', 'c.revoked_at IS NULL'];
      const queryParams: any[] = [];

      if (subjectId) {
        queryParams.push(subjectId);
        conditions.push(`s.subject_id = $${queryParams.length}`);
      }

      // Query: Find subjects with PRI < 40 for 14+ consecutive days
      const result = await client.query<{
        subject_id: string;
        age_band: string;
        avg_pri: number;
        days_below_40: number;
      }>(
        `
        WITH consented_subjects AS (
          SELECT s.subject_id, s.age_band
          FROM subjects s
          INNER JOIN consents c ON s.subject_id = c.subject_id
          WHERE ${conditions.join(' AND ')}
        ),
        low_pri_streak AS (
          SELECT
            cs.subject_id,
            cs.age_band,
            AVG(p.pri) AS avg_pri,
            COUNT(*) FILTER (WHERE p.pri < 40) AS days_below_40
          FROM consented_subjects cs
          INNER JOIN pri_daily p ON cs.subject_id = p.subject_id
          WHERE p.date >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY cs.subject_id, cs.age_band
          HAVING COUNT(*) FILTER (WHERE p.pri < 40) >= 14
        )
        SELECT subject_id, age_band, avg_pri, days_below_40
        FROM low_pri_streak
        ORDER BY avg_pri ASC
        `,
        queryParams,
      );

      return result.rows.map((row) => ({
        subject_id: row.subject_id,
        gap_type: 'sustained_low_pri',
        due_date: null,
        indicator_summary: {
          age_band: row.age_band,
          avg_pri: Math.round(row.avg_pri),
          days_below_40: row.days_below_40,
          window_days: 30,
        },
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Store detected gaps (upsert for idempotency)
   */
  private async storeGaps(gaps: CareGap[]): Promise<void> {
    if (gaps.length === 0) {
      return;
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Set RLS context (app_worker role for write access)
      await client.query(`SET LOCAL app.role = 'worker'`);

      for (const gap of gaps) {
        await client.query(
          `
          INSERT INTO care_gaps (subject_id, gap_type, due_date, indicator_summary, status, created_at)
          VALUES ($1, $2, $3, $4, 'detected', NOW())
          ON CONFLICT (subject_id, gap_type)
          DO UPDATE SET
            due_date = EXCLUDED.due_date,
            indicator_summary = EXCLUDED.indicator_summary,
            created_at = NOW()
          `,
          [gap.subject_id, gap.gap_type, gap.due_date, JSON.stringify(gap.indicator_summary)],
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
}
