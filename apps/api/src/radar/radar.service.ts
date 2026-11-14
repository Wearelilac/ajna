import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { RadarSummaryDto, PriPointDto, DeviationFlagDto } from './dto/radar.dto';

@Injectable()
export class RadarService {
  constructor(private readonly pool: Pool) {}

  /**
   * Get radar summary (latest PRI, trend, active flags)
   */
  async getSummary(
    subjectId: string,
    rlsContext: { subject_id: string; role: string },
  ): Promise<RadarSummaryDto> {
    const client = await this.pool.connect();
    try {
      await client.query(`SET LOCAL app.subject_id = $1`, [rlsContext.subject_id]);
      await client.query(`SET LOCAL app.role = $1`, [rlsContext.role]);

      // Get latest PRI
      const latestResult = await client.query(
        `
        SELECT date, pri
        FROM pri_daily
        WHERE subject_id = $1
        ORDER BY date DESC
        LIMIT 1
        `,
        [subjectId],
      );

      if (latestResult.rows.length === 0) {
        // No PRI data yet (user just joined, or < 14 days of data)
        return {
          latest_pri: 50, // Neutral
          latest_date: new Date().toISOString().split('T')[0],
          trend_7d: 0,
          trend_30d: 0,
          active_flags: [],
          is_stale: false,
        };
      }

      const latest = latestResult.rows[0];

      // Get 7-day trend
      const trend7Result = await client.query(
        `
        SELECT pri FROM pri_daily
        WHERE subject_id = $1 AND date = (SELECT date FROM pri_daily WHERE subject_id = $1 ORDER BY date DESC LIMIT 1 OFFSET 7)
        `,
        [subjectId],
      );

      const trend7 = trend7Result.rows.length > 0 ? latest.pri - trend7Result.rows[0].pri : 0;

      // Get 30-day trend
      const trend30Result = await client.query(
        `
        SELECT pri FROM pri_daily
        WHERE subject_id = $1 AND date = (SELECT date FROM pri_daily WHERE subject_id = $1 ORDER BY date DESC LIMIT 1 OFFSET 30)
        `,
        [subjectId],
      );

      const trend30 = trend30Result.rows.length > 0 ? latest.pri - trend30Result.rows[0].pri : 0;

      // Get active flags (last 7 days)
      const flagsResult = await client.query(
        `
        SELECT id, date, metric, z, direction, status, flagged_at
        FROM deviation_flags
        WHERE subject_id = $1
          AND date >= (SELECT date FROM pri_daily WHERE subject_id = $1 ORDER BY date DESC LIMIT 1) - INTERVAL '7 days'
        ORDER BY date DESC
        `,
        [subjectId],
      );

      const active_flags: DeviationFlagDto[] = flagsResult.rows.map((row) => ({
        id: row.id,
        date: row.date,
        metric: row.metric,
        z: parseFloat(row.z),
        direction: row.direction,
        status: row.status,
        flagged_at: row.flagged_at.toISOString(),
      }));

      return {
        latest_pri: latest.pri,
        latest_date: latest.date,
        trend_7d: Math.round(trend7),
        trend_30d: Math.round(trend30),
        active_flags,
        is_stale: false, // TODO: Check if scoring service is unavailable
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get PRI history for a date range
   */
  async getPriHistory(
    subjectId: string,
    fromDate: string,
    toDate: string,
    rlsContext: { subject_id: string; role: string },
  ): Promise<PriPointDto[]> {
    const client = await this.pool.connect();
    try {
      await client.query(`SET LOCAL app.subject_id = $1`, [rlsContext.subject_id]);
      await client.query(`SET LOCAL app.role = $1`, [rlsContext.role]);

      const result = await client.query(
        `
        SELECT date, pri, deviation_count
        FROM pri_daily
        WHERE subject_id = $1
          AND date >= $2
          AND date <= $3
        ORDER BY date ASC
        `,
        [subjectId, fromDate, toDate],
      );

      return result.rows.map((row) => ({
        date: row.date,
        pri: row.pri,
        deviation_count: row.deviation_count,
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Get deviation flags for a date range
   */
  async getDeviations(
    subjectId: string,
    fromDate: string,
    toDate: string,
    rlsContext: { subject_id: string; role: string },
  ): Promise<DeviationFlagDto[]> {
    const client = await this.pool.connect();
    try {
      await client.query(`SET LOCAL app.subject_id = $1`, [rlsContext.subject_id]);
      await client.query(`SET LOCAL app.role = $1`, [rlsContext.role]);

      const result = await client.query(
        `
        SELECT id, date, metric, z, direction, status, flagged_at
        FROM deviation_flags
        WHERE subject_id = $1
          AND date >= $2
          AND date <= $3
        ORDER BY date DESC, metric ASC
        `,
        [subjectId, fromDate, toDate],
      );

      return result.rows.map((row) => ({
        id: row.id,
        date: row.date,
        metric: row.metric,
        z: parseFloat(row.z),
        direction: row.direction,
        status: row.status,
        flagged_at: row.flagged_at.toISOString(),
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Delete radar data for a subject (called on consent revocation)
   */
  async deleteSubjectData(subjectId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Set RLS context (app_worker role for delete access)
      await client.query(`SET LOCAL app.subject_id = $1`, [subjectId]);
      await client.query(`SET LOCAL app.role = 'worker'`);

      // Delete baselines
      await client.query(`DELETE FROM baselines WHERE subject_id = $1`, [subjectId]);

      // Delete PRI
      await client.query(`DELETE FROM pri_daily WHERE subject_id = $1`, [subjectId]);

      // Delete deviation flags
      await client.query(`DELETE FROM deviation_flags WHERE subject_id = $1`, [subjectId]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
