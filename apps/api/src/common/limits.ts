/**
 * common/limits.ts
 *
 * P0.1 throughput limits from the wearable ingestion prototype.
 * These constraints are read from environment and enforced at request time.
 *
 * Source: findings/P0.1-findings.md
 */

export const LIMITS = {
  // From P0.1 wearable ingestion sim
  WEARABLE: {
    // Maximum days in a single batch ingest
    BATCH_SIZE_MAX: parseInt(process.env.AJNA_WEARABLE_BATCH_SIZE_MAX || '60', 10),
    // Queue jobs per minute (from P0.1 BullMQ testing on free tiers)
    JOBS_PER_MINUTE_MAX: 1000, // Will be updated after P0.1 runs
  },

  // From P0.2 monitor session limits
  MONITOR_ME: {
    // Maximum session duration in seconds (from P0.2 OS limits testing)
    SESSION_CAP_SEC: parseInt(process.env.AJNA_MONITOR_SESSION_CAP_SEC || '600', 10),
    // Maximum flags per session to prevent spam
    FLAGS_PER_SESSION_MAX: parseInt(process.env.AJNA_MONITOR_FLAGS_PER_SESSION_MAX || '100', 10),
  },

  // Retention windows (from 00-data-protection-model.md)
  RETENTION: {
    // Raw audio: 0 (ephemeral only)
    AUDIO_BUFFER_SEC: 10,
    // De-identified flags: 30 days
    FLAGS_DAYS: 30,
    // Crisis reviews: 12 months
    CRISIS_REVIEW_DAYS: 365,
    // Wearable metrics: 13 months
    WEARABLE_METRICS_DAYS: 13 * 30,
    // Audit log: 24 months
    AUDIT_LOG_DAYS: 24 * 30,
  },

  // Population aggregation (from 00-data-protection-model.md)
  POPULATION: {
    // Minimum group size for suppression (K)
    SUPPRESSION_K: parseInt(process.env.AJNA_POPULATION_SUPPRESSION_K || '10', 10),
  },

  // Baseline computation (from P0.1)
  BASELINE: {
    // Minimum valid days before first flag can be raised
    MIN_VALID_DAYS: 14,
    // Trailing window for baseline (excluding current day)
    WINDOW_DAYS: 30,
    // Z-score threshold for deviation flag
    Z_THRESHOLD: 3,
    // Standard deviation floor (below this, no z-score computed)
    SD_FLOOR: 0.001,
  },
};

export const validateLimits = (): void => {
  if (LIMITS.WEARABLE.BATCH_SIZE_MAX < 1 || LIMITS.WEARABLE.BATCH_SIZE_MAX > 365) {
    throw new Error('AJNA_WEARABLE_BATCH_SIZE_MAX must be between 1 and 365');
  }
  if (LIMITS.MONITOR_ME.SESSION_CAP_SEC < 60 || LIMITS.MONITOR_ME.SESSION_CAP_SEC > 3600) {
    throw new Error('AJNA_MONITOR_SESSION_CAP_SEC must be between 60 and 3600 seconds');
  }
  if (LIMITS.POPULATION.SUPPRESSION_K < 5) {
    throw new Error('AJNA_POPULATION_SUPPRESSION_K must be at least 5');
  }
};
