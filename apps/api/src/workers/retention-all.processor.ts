/**
 * B5.1: Comprehensive Retention Processor
 * Enforces all retention policies (flags, reviews, metrics, audit)
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { LIMITS } from '../common/limits';

interface RetentionJobPayload {
  type: 'flags' | 'crisis-reviews' | 'wearable-metrics' | 'audit-logs';
}

@Injectable()
@Processor('ajna.retention.all')
export class RetentionAllProcessor extends WorkerHost {
  private readonly logger = new Logger(RetentionAllProcessor.name);

  constructor(private readonly pool: Pool) {
    super();
  }

  async process(job: Job<RetentionJobPayload>): Promise<void> {
    const { type } = job.data;

    this.logger.log(`Processing retention job ${job.id} (type: ${type})`);

    try {
      let deletedCount = 0;

      switch (type) {
        case 'flags':
          deletedCount = await this.deleteExpiredFlags();
          break;
        case 'crisis-reviews':
          deletedCount = await this.deleteExpiredCrisisReviews();
          break;
        case 'wearable-metrics':
          deletedCount = await this.deleteExpiredWearableMetrics();
          break;
        case 'audit-logs':
          deletedCount = await this.deleteExpiredAuditLogs();
          break;
      }

      this.logger.log(`Retention job ${job.id} complete: ${deletedCount} rows deleted`);
    } catch (error) {
      this.logger.error(`Retention job ${job.id} failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete deidentified_flags > 30 days old
   */
  private async deleteExpiredFlags(): Promise<number> {
    const client = await this.pool.connect();
    try {
      // Set RLS context (app_worker role for write access)
      await client.query(`SET LOCAL app.role = 'worker'`);

      const result = await client.query(`
        DELETE FROM deidentified_flags
        WHERE created_at < NOW() - INTERVAL '${LIMITS.RETENTION.FLAGS_ROW_LEVEL_DAYS} days'
      `);

      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  /**
   * Delete crisis_reviews > 12 months old
   */
  private async deleteExpiredCrisisReviews(): Promise<number> {
    const client = await this.pool.connect();
    try {
      // Set RLS context (app_worker role for write access)
      await client.query(`SET LOCAL app.role = 'worker'`);

      const result = await client.query(`
        DELETE FROM crisis_reviews
        WHERE created_at < NOW() - INTERVAL '${LIMITS.RETENTION.CRISIS_REVIEW_MONTHS} months'
      `);

      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  /**
   * Delete wearable_daily > 13 months old
   */
  private async deleteExpiredWearableMetrics(): Promise<number> {
    const client = await this.pool.connect();
    try {
      // Set RLS context (app_worker role for write access)
      await client.query(`SET LOCAL app.role = 'worker'`);

      const result = await client.query(`
        DELETE FROM wearable_daily
        WHERE date < CURRENT_DATE - INTERVAL '${LIMITS.RETENTION.WEARABLE_METRICS_MONTHS} months'
      `);

      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  /**
   * Delete audit logs > 24 months old
   */
  private async deleteExpiredAuditLogs(): Promise<number> {
    const client = await this.pool.connect();
    try {
      // Set RLS context (app_worker role for write access)
      await client.query(`SET LOCAL app.role = 'worker'`);

      let totalDeleted = 0;

      // consent_events
      const consentResult = await client.query(`
        DELETE FROM consent_events
        WHERE at < NOW() - INTERVAL '${LIMITS.RETENTION.AUDIT_CHAIN_MONTHS} months'
      `);
      totalDeleted += consentResult.rowCount || 0;

      // crisis_review_events
      const crisisResult = await client.query(`
        DELETE FROM crisis_review_events
        WHERE at < NOW() - INTERVAL '${LIMITS.RETENTION.AUDIT_CHAIN_MONTHS} months'
      `);
      totalDeleted += crisisResult.rowCount || 0;

      // draft_reviews
      const draftResult = await client.query(`
        DELETE FROM draft_reviews
        WHERE at < NOW() - INTERVAL '${LIMITS.RETENTION.AUDIT_CHAIN_MONTHS} months'
      `);
      totalDeleted += draftResult.rowCount || 0;

      return totalDeleted;
    } finally {
      client.release();
    }
  }
}
