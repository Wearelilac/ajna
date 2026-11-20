import { Injectable, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { VaultService } from '../common/vault.service';
import { WearableDailyInputDto, WearableMetrics } from './dto/wearable-daily-input.dto';
import { WearableDailyDto } from './dto/wearable-daily-output.dto';
import { ErrorCode } from '../common/errors';
import { LIMITS } from '../common/limits';

@Injectable()
export class WearableService {
  constructor(
    private readonly pool: Pool,
    private readonly vaultService: VaultService,
  ) {}

  /**
   * Store a single day of wearable metrics
   * Encrypts metrics, stores in wearable_daily, enqueues baseline job
   */
  async storeDaily(
    subjectId: string,
    input: WearableDailyInputDto,
    rlsContext: { subject_id: string; role: string },
  ): Promise<{ id: string; date: string }> {
    // Validate date constraints
    this.validateDate(input.date);

    // Validate metrics (at least one non-null metric beyond required fields)
    this.validateMetrics(input.metrics);

    // Encrypt metrics
    const metricsJson = JSON.stringify(input.metrics);
    const { ciphertext, nonce } = await this.vaultService.encrypt(metricsJson, subjectId);

    // Store in database (with RLS context)
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL app.subject_id = $1`, [rlsContext.subject_id]);
      await client.query(`SET LOCAL app.role = $1`, [rlsContext.role]);

      // Upsert (idempotent per subject, date, source)
      const result = await client.query(
        `
        INSERT INTO wearable_daily (subject_id, date, source, ciphertext, nonce, dek_version)
        VALUES ($1, $2, $3, $4, $5, 1)
        ON CONFLICT (subject_id, date, source)
        DO UPDATE SET
          ciphertext = EXCLUDED.ciphertext,
          nonce = EXCLUDED.nonce,
          received_at = NOW()
        RETURNING id
        `,
        [subjectId, input.date, input.source, ciphertext, nonce],
      );

      await client.query('COMMIT');

      const id = result.rows[0].id;

      // Enqueue baseline computation job
      // TODO: Integrate BullMQ queue (from B1.4)
      // await this.queueService.add('ajna.wearable.compute-baseline', {
      //   subject_id: subjectId,
      //   date: input.date,
      // });

      return { id, date: input.date };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Store multiple days of wearable metrics (batch)
   */
  async storeBatch(
    subjectId: string,
    days: WearableDailyInputDto[],
    rlsContext: { subject_id: string; role: string },
  ): Promise<number> {
    // Validate batch size (from P0.1 limits)
    if (days.length > LIMITS.WEARABLE.BATCH_MAX_DAYS) {
      throw new BadRequestException({
        code: ErrorCode.WEARABLE_BATCH_TOO_LARGE,
        message: `Batch too large (max ${LIMITS.WEARABLE.BATCH_MAX_DAYS} days)`,
        details: { received: days.length, max: LIMITS.WEARABLE.BATCH_MAX_DAYS },
      });
    }

    let storedCount = 0;
    for (const day of days) {
      try {
        await this.storeDaily(subjectId, day, rlsContext);
        storedCount++;
      } catch (error) {
        // Continue on validation errors (partial success allowed)
        if (error instanceof BadRequestException) {
          continue;
        }
        throw error;
      }
    }

    return storedCount;
  }

  /**
   * Get wearable metrics for a date range (decrypted)
   */
  async getDaily(
    subjectId: string,
    fromDate: string,
    toDate: string,
    rlsContext: { subject_id: string; role: string },
  ): Promise<WearableDailyDto[]> {
    const client = await this.pool.connect();
    try {
      await client.query(`SET LOCAL app.subject_id = $1`, [rlsContext.subject_id]);
      await client.query(`SET LOCAL app.role = $1`, [rlsContext.role]);

      const result = await client.query(
        `
        SELECT id, subject_id, date, source, ciphertext, nonce, received_at
        FROM wearable_daily
        WHERE subject_id = $1
          AND date >= $2
          AND date <= $3
        ORDER BY date DESC
        `,
        [subjectId, fromDate, toDate],
      );

      // Decrypt each row
      const decrypted: WearableDailyDto[] = [];
      for (const row of result.rows) {
        const plaintext = await this.vaultService.decrypt(row.ciphertext, row.nonce, subjectId);
        const metrics = JSON.parse(plaintext) as WearableMetrics;

        decrypted.push({
          id: row.id,
          subject_id: row.subject_id,
          date: row.date,
          source: row.source,
          metrics,
          received_at: row.received_at.toISOString(),
        });
      }

      return decrypted;
    } finally {
      client.release();
    }
  }

  /**
   * Generate demo seed data (60 days, 3 scenarios)
   */
  async generateDemoSeed(
    subjectId: string,
    scenario: string = 'steady',
    rlsContext: { subject_id: string; role: string },
  ): Promise<number> {
    // Check demo mode (from config)
    const demoMode = process.env.AJNA_DEMO_MODE === 'true' || process.env.AJNA_ENV !== 'production';
    if (!demoMode) {
      throw new BadRequestException({
        code: ErrorCode.DEMO_MODE_DISABLED,
        message: 'Demo mode is disabled in production',
      });
    }

    // Generate 60 days of synthetic data (based on P0.1 simulator)
    const days: WearableDailyInputDto[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 60);

    for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + dayOffset);

      // Skip ~5% of days (missing data)
      if (Math.random() < 0.05) {
        continue;
      }

      // Scenario-based modulation
      let hrvFactor = 1.0;
      let rhrOffset = 0;

      if (scenario === 'gradual_decline' && dayOffset >= 30) {
        // Gradual HRV decline over last 30 days
        const daysIntoDecline = dayOffset - 30;
        hrvFactor = 1.0 - (daysIntoDecline / 30) * 0.3; // 30% drop by day 60
        rhrOffset = (daysIntoDecline / 30) * 8; // +8 bpm by day 60
      } else if (scenario === 'acute_deviation' && dayOffset >= 50 && dayOffset < 57) {
        // Acute 7-day drop
        hrvFactor = 0.70; // 30% drop
        rhrOffset = 5; // +5 bpm
      }

      // Weekly rhythm (from P0.1)
      const dow = date.getDay();
      const weeklyFactor = 1.0 + 0.08 * Math.sin((2 * Math.PI * dow) / 7);

      // Generate metrics with noise
      const hrv = Math.max(1, Math.min(300, 50 * weeklyFactor * hrvFactor + this.gaussian(0, 10)));
      const rhr = Math.max(30, Math.min(120, 65 * weeklyFactor + rhrOffset + this.gaussian(0, 5)));
      const sleepTotal = Math.max(0, Math.min(1440, 480 + this.gaussian(0, 45)));
      const sleepDeep = sleepTotal * 0.2;
      const sleepRem = sleepTotal * 0.25;
      const sleepLight = sleepTotal * 0.45;
      const sleepAwake = sleepTotal * 0.1;
      const skinTempDev = Math.max(-10, Math.min(10, this.gaussian(0, 0.4)));
      const activityRecovery = Math.max(0, Math.min(2, 1.0 + this.gaussian(0, 0.2)));

      days.push({
        source: 'simulator',
        date: date.toISOString().split('T')[0],
        metrics: {
          hrv_rmssd_ms: Math.round(hrv * 10) / 10,
          skin_temp_dev_c: Math.round(skinTempDev * 100) / 100,
          resting_hr_bpm: Math.round(rhr * 10) / 10,
          sleep_total_min: Math.round(sleepTotal),
          sleep_deep_min: Math.round(sleepDeep),
          sleep_rem_min: Math.round(sleepRem),
          sleep_light_min: Math.round(sleepLight),
          sleep_awake_min: Math.round(sleepAwake),
          sleep_efficiency: Math.round((sleepTotal / 1440) * 100) / 100,
          activity_recovery_ratio: Math.round(activityRecovery * 100) / 100,
        },
      });
    }

    // Store batch
    const stored = await this.storeBatch(subjectId, days, rlsContext);
    return stored;
  }

  // ============================================================================
  // Validation helpers
  // ============================================================================

  private validateDate(dateStr: string): void {
    const date = new Date(dateStr);
    const now = new Date();
    const thirteenMonthsAgo = new Date();
    thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);

    // No future dates
    if (date > now) {
      throw new BadRequestException({
        code: ErrorCode.WEARABLE_PAYLOAD_INVALID,
        message: 'Date cannot be in the future',
        details: { date: dateStr },
      });
    }

    // No dates older than 13 months (from P0.1 retention policy)
    if (date < thirteenMonthsAgo) {
      throw new BadRequestException({
        code: ErrorCode.WEARABLE_PAYLOAD_INVALID,
        message: 'Date older than 13 months (retention policy)',
        details: { date: dateStr, oldest_allowed: thirteenMonthsAgo.toISOString().split('T')[0] },
      });
    }
  }

  private validateMetrics(metrics: WearableMetrics): void {
    // At least one metric must be present (required fields are validated by DTO)
    const optionalFields = [
      'skin_temp_dev_c',
      'sleep_deep_min',
      'sleep_rem_min',
      'sleep_light_min',
      'sleep_awake_min',
      'sleep_efficiency',
      'activity_recovery_ratio',
    ];

    // Check that not all optional fields are null
    const hasAtLeastOneOptional = optionalFields.some((field) => (metrics as any)[field] != null);

    // Required fields: hrv_rmssd_ms, resting_hr_bpm, sleep_total_min (validated by DTO)
    // This is just a sanity check
    if (!metrics.hrv_rmssd_ms || !metrics.resting_hr_bpm || metrics.sleep_total_min == null) {
      throw new BadRequestException({
        code: ErrorCode.WEARABLE_PAYLOAD_INVALID,
        message: 'Missing required metrics (hrv_rmssd_ms, resting_hr_bpm, sleep_total_min)',
      });
    }
  }

  // Gaussian random (Box-Muller transform)
  private gaussian(mean: number, stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
  }
}
