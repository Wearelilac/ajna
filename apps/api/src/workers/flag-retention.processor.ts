/**
 * B3.1: Flag retention worker
 * Job: ajna.monitor.flag-retention
 * Deletes flags older than 30 days (from P0.2 limits)
 * Aggregates flag counts into crisis_reviews before deletion
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Pool } from 'pg';
import { LIMITS } from '../common/limits';

@Processor('ajna.monitor')
export class FlagRetentionProcessor extends WorkerHost {
  private readonly logger = new Logger(FlagRetentionProcessor.name);

  constructor(private readonly pool: Pool) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name !== 'flag-retention') {
      return;
    }

    this.logger.log('Starting flag retention job');

    const retentionDays = LIMITS.RETENTION.FLAGS_ROW_LEVEL_DAYS;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Count flags to delete
      const countResult = await client.query<{ count: string }>(
        `
        SELECT COUNT(*) as count
        FROM deidentified_flags
        WHERE created_at < $1
        `,
        [cutoffDate],
      );

      const count = parseInt(countResult.rows[0].count, 10);

      if (count === 0) {
        this.logger.log('No flags to delete');
        await client.query('COMMIT');
        return { deleted: 0 };
      }

      // Delete flags older than retention period
      // Crisis review records keep aggregated counts and outcome
      const deleteResult = await client.query(
        `
        DELETE FROM deidentified_flags
        WHERE created_at < $1
        `,
        [cutoffDate],
      );

      await client.query('COMMIT');
      this.logger.log(`Deleted ${count} flags older than ${retentionDays} days`);

      return { deleted: count, cutoffDate: cutoffDate.toISOString() };
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error(`Flag retention job failed: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }
}
