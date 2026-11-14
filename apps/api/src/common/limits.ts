/**
 * Application limits from P0.1, P0.2, P0.3, P0.4 findings.
 * Configured at runtime, read by all feature files.
 * 00-data-protection-model.md, section 5 (retention defaults).
 */
export const LIMITS = {
  // P0.1: Wearable Ingestion
  WEARABLE: {
    BATCH_MAX_DAYS: 60, // Max days per batch (from B2.1 spec)
    JOBS_PER_MINUTE_MAX: 1000, // Conservative estimate for BullMQ free tier
    METRICS_BATCH_MAX: 1000, // Max wearable records per request
  },

  // P0.1: Baseline Computation
  BASELINE: {
    MIN_VALID_DAYS: 14, // Minimum days before first flag
    WINDOW_DAYS: 30, // Trailing baseline window
    Z_THRESHOLD: 3, // Deviation detection threshold (|z| > 3)
    SD_FLOOR: 0.001, // Standard deviation floor
  },

  // P0.1: Personal Resilience Index
  PRI: {
    WEIGHTS: {
      hrv_rmssd_ms: 2.0,
      resting_hr_bpm: 1.5,
      sleep_efficiency: 2.0,
      activity_recovery_ratio: 1.0,
    },
  },

  // P0.2: Acoustic Inference
  ACOUSTIC: {
    AUDIO_SAMPLE_RATE: 16000, // Hz
    AUDIO_CHANNELS: 1, // Mono
    RING_BUFFER_DURATION_SEC: 10, // Seconds
    INFERENCE_LATENCY_P95_MS: 20, // Milliseconds
    SESSION_CAP_SEC: 600, // 10 minutes
    FLAGS_PER_SESSION_MAX: 100,
    CONFIDENCE_THRESHOLD: 0.5,
    BATTERY_DRAIN_PER_HOUR_PERCENT: 10, // Estimated
    MIC_PERMISSION_NAME: 'android.permission.RECORD_AUDIO', // Android
  },

  // P0.3: pgvector Population Aggregation (populated after P0.3)
  POPULATION: {
    SMALL_CELL_K: 10, // Minimum group size for reporting
    AGGREGATION_WINDOW_DAYS: 7, // Weekly aggregates
  },

  // P0.4: Care-Gap Routing (populated after P0.4)
  CARE_GAPS: {
    PATHWAYS_MAX: 50, // Max care pathways
    OUTREACH_DRAFT_MAX_CHAR: 5000, // Max chars per draft
  },

  // Data retention (00-data-protection-model.md, section 5)
  RETENTION: {
    RAW_AUDIO_SEC: 0, // Never persisted
    FLAGS_ROW_LEVEL_DAYS: 30, // Then aggregated
    CRISIS_REVIEW_MONTHS: 12,
    WEARABLE_METRICS_MONTHS: 13,
    OUTREACH_DRAFTS_MONTHS: 12,
    AUDIT_CHAIN_MONTHS: 24,
  },

  // Rate limiting (default, per-route overridable)
  RATE_LIMIT: {
    MAX_REQUESTS_PER_MINUTE: 60,
    MAX_BATCH_REQUESTS_PER_HOUR: 100,
  },
} as const;

export type Limits = typeof LIMITS;
