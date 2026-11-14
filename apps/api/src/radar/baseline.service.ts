import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { VaultService } from '../common/vault.service';
import { LIMITS } from '../common/limits';

interface WearableMetrics {
  hrv_rmssd_ms?: number;
  skin_temp_dev_c?: number;
  resting_hr_bpm?: number;
  sleep_total_min?: number;
  sleep_deep_min?: number;
  sleep_rem_min?: number;
  sleep_light_min?: number;
  sleep_awake_min?: number;
  sleep_efficiency?: number;
  activity_recovery_ratio?: number;
}

interface DailyData {
  date: string;
  metrics: WearableMetrics;
}

interface Baseline {
  metric: string;
  mean: number;
  sd: number;
  median: number;
  mad: number;
  n_valid_days: number;
}

interface DeviationFlag {
  metric: string;
  z: number;
  direction: 'high' | 'low';
  current_value: number;
  baseline_mean: number;
  baseline_sd: number;
}

@Injectable()
export class BaselineService {
  // Metrics to compute baselines for (from P0.1)
  private readonly METRICS = [
    'hrv_rmssd_ms',
    'resting_hr_bpm',
    'sleep_total_min',
    'sleep_efficiency',
    'activity_recovery_ratio',
  ];

  // PRI weights (from P0.1 findings)
  private readonly PRI_WEIGHTS = LIMITS.PRI.WEIGHTS;

  constructor(
    private readonly pool: Pool,
    private readonly vaultService: VaultService,
  ) {}

  /**
   * Compute baseline for a subject on a given date
   * Loads last 31 days (30-day window + current day), computes baselines, detects deviations
   */
  async computeBaseline(subjectId: string, targetDate: string): Promise<void> {
    // Load last 31 days (encrypted)
    const dailyData = await this.loadDailyData(subjectId, targetDate, 31);

    // Filter to window (excludes target date)
    const windowData = dailyData.filter((d) => d.date < targetDate);

    // Need at least MIN_VALID_DAYS
    if (windowData.length < LIMITS.BASELINE.MIN_VALID_DAYS) {
      return; // Not enough data, skip
    }

    // Compute baselines per metric
    const baselines: Baseline[] = [];
    for (const metric of this.METRICS) {
      const values = windowData
        .map((d) => d.metrics[metric])
        .filter((v) => v != null) as number[];

      if (values.length === 0) {
        continue;
      }

      const mean = this.mean(values);
      const sd = this.stdDev(values, mean);
      const median = this.median(values);
      const mad = this.mad(values, median);

      baselines.push({
        metric,
        mean,
        sd,
        median,
        mad,
        n_valid_days: values.length,
      });
    }

    // Get current day metrics (for deviation detection)
    const currentDay = dailyData.find((d) => d.date === targetDate);
    if (!currentDay) {
      return; // No data for target date
    }

    // Detect deviations (|z| > Z_THRESHOLD)
    const deviations: DeviationFlag[] = [];
    for (const baseline of baselines) {
      const currentValue = currentDay.metrics[baseline.metric];
      if (currentValue == null) {
        continue;
      }

      // Skip if SD too small (prevent division by near-zero)
      if (baseline.sd < LIMITS.BASELINE.SD_FLOOR) {
        continue;
      }

      const z = (currentValue - baseline.mean) / baseline.sd;

      // Flag if |z| > Z_THRESHOLD
      if (Math.abs(z) > LIMITS.BASELINE.Z_THRESHOLD) {
        deviations.push({
          metric: baseline.metric,
          z: Math.round(z * 100) / 100, // 2 decimal places
          direction: z > 0 ? 'high' : 'low',
          current_value: currentValue,
          baseline_mean: baseline.mean,
          baseline_sd: baseline.sd,
        });
      }
    }

    // Compute PRI (Personal Resilience Index 0-100)
    const pri = this.computePRI(currentDay.metrics, baselines);

    // Store results (upsert for idempotency)
    await this.storeResults(subjectId, targetDate, baselines, deviations, pri);
  }

  /**
   * Load last N days of daily data (encrypted), decrypt
   */
  private async loadDailyData(
    subjectId: string,
    targetDate: string,
    days: number,
  ): Promise<DailyData[]> {
    const client = await this.pool.connect();
    try {
      // Set RLS context (app_worker role for read access)
      await client.query(`SET LOCAL app.subject_id = $1`, [subjectId]);
      await client.query(`SET LOCAL app.role = 'worker'`);

      // Query last N days
      const result = await client.query(
        `
        SELECT date, ciphertext, nonce
        FROM wearable_daily
        WHERE subject_id = $1
          AND date <= $2
        ORDER BY date DESC
        LIMIT $3
        `,
        [subjectId, targetDate, days],
      );

      // Decrypt each row
      const dailyData: DailyData[] = [];
      for (const row of result.rows) {
        try {
          const plaintext = await this.vaultService.decrypt(
            row.ciphertext,
            row.nonce,
            subjectId,
          );
          const metrics = JSON.parse(plaintext) as WearableMetrics;

          dailyData.push({
            date: row.date,
            metrics,
          });
        } catch (error) {
          // Skip rows that fail to decrypt (corrupted data, key rotation issues)
          console.error(`Failed to decrypt wearable_daily for subject ${subjectId}, date ${row.date}`);
          continue;
        }
      }

      // Sort ascending (oldest first)
      dailyData.sort((a, b) => (a.date < b.date ? -1 : 1));

      return dailyData;
    } finally {
      client.release();
    }
  }

  /**
   * Store baselines, deviations, PRI (upsert for idempotency)
   */
  private async storeResults(
    subjectId: string,
    date: string,
    baselines: Baseline[],
    deviations: DeviationFlag[],
    pri: number,
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Set RLS context (app_worker role for write access)
      await client.query(`SET LOCAL app.subject_id = $1`, [subjectId]);
      await client.query(`SET LOCAL app.role = 'worker'`);

      // Store baselines (upsert)
      for (const baseline of baselines) {
        await client.query(
          `
          INSERT INTO baselines (subject_id, date, metric, mean, sd, median, mad, n_valid_days, model_version)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pri-1.0')
          ON CONFLICT (subject_id, date, metric)
          DO UPDATE SET
            mean = EXCLUDED.mean,
            sd = EXCLUDED.sd,
            median = EXCLUDED.median,
            mad = EXCLUDED.mad,
            n_valid_days = EXCLUDED.n_valid_days,
            computed_at = NOW()
          `,
          [
            subjectId,
            date,
            baseline.metric,
            baseline.mean,
            baseline.sd,
            baseline.median,
            baseline.mad,
            baseline.n_valid_days,
          ],
        );
      }

      // Store deviations (upsert)
      for (const deviation of deviations) {
        await client.query(
          `
          INSERT INTO deviation_flags (subject_id, date, metric, z, direction, current_value, baseline_mean, baseline_sd, model_version)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pri-1.0')
          ON CONFLICT (subject_id, date, metric)
          DO UPDATE SET
            z = EXCLUDED.z,
            direction = EXCLUDED.direction,
            current_value = EXCLUDED.current_value,
            baseline_mean = EXCLUDED.baseline_mean,
            baseline_sd = EXCLUDED.baseline_sd,
            flagged_at = NOW()
          `,
          [
            subjectId,
            date,
            deviation.metric,
            deviation.z,
            deviation.direction,
            deviation.current_value,
            deviation.baseline_mean,
            deviation.baseline_sd,
          ],
        );
      }

      // Store PRI (upsert)
      await client.query(
        `
        INSERT INTO pri_daily (subject_id, date, pri, deviation_count, model_version)
        VALUES ($1, $2, $3, $4, 'pri-1.0')
        ON CONFLICT (subject_id, date)
        DO UPDATE SET
          pri = EXCLUDED.pri,
          deviation_count = EXCLUDED.deviation_count,
          computed_at = NOW()
        `,
        [subjectId, date, pri, deviations.length],
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
   * Compute PRI (Personal Resilience Index 0-100)
   * Based on weighted z-scores from P0.1 findings
   */
  private computePRI(metrics: WearableMetrics, baselines: Baseline[]): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const baseline of baselines) {
      const currentValue = metrics[baseline.metric];
      if (currentValue == null || baseline.sd < LIMITS.BASELINE.SD_FLOOR) {
        continue;
      }

      const z = (currentValue - baseline.mean) / baseline.sd;
      const weight = this.PRI_WEIGHTS[baseline.metric] || 1.0;

      // For metrics where higher is better (HRV, sleep efficiency, activity recovery):
      // PRI contribution increases with positive z
      // For metrics where lower is better (RHR):
      // PRI contribution increases with negative z
      let normalizedZ = z;
      if (baseline.metric === 'resting_hr_bpm') {
        normalizedZ = -z; // Flip for RHR (lower is better)
      }

      weightedSum += normalizedZ * weight;
      totalWeight += weight;
    }

    if (totalWeight === 0) {
      return 50; // Neutral PRI if no valid baselines
    }

    // Convert weighted z-score to 0-100 scale
    // z = 0 → PRI = 50 (at baseline)
    // z = +1 → PRI = 60 (1 SD above)
    // z = +2 → PRI = 70
    // z = +3 → PRI = 80
    // z = -3 → PRI = 20
    const avgZ = weightedSum / totalWeight;
    const pri = 50 + avgZ * 10; // Scale: 10 points per SD

    // Clamp to 0-100
    return Math.max(0, Math.min(100, Math.round(pri)));
  }

  // ============================================================================
  // Statistical helpers
  // ============================================================================

  private mean(values: number[]): number {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private stdDev(values: number[], mean: number): number {
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  private mad(values: number[], median: number): number {
    const deviations = values.map((v) => Math.abs(v - median));
    return this.median(deviations);
  }
}
