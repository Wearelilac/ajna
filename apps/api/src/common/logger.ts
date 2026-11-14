import pino from 'pino';

/**
 * Structured logger with redaction rules (00-stack-and-conventions.md, section 5).
 * Never logs: PHI, audio data, tokens, keys, passwords, full request bodies.
 */
export function createLogger() {
  return pino({
    level: process.env.LOG_LEVEL || 'info',
    redact: {
      paths: [
        // Authentication
        '*.authorization',
        '*.token',
        '*.jwt',
        '*.password',
        '*.secret',
        '*.key',

        // Personal info
        '*.email',
        '*.phone',
        '*.ssn',
        '*.name',

        // Health data (PHI)
        '*.hrv_rmssd_ms',
        '*.resting_hr_bpm',
        '*.skin_temp_dev_c',
        '*.sleep_duration_min',
        '*.activity_recovery_ratio',
        '*.metric_*',

        // Audio (class 1)
        '*.audio',
        '*.audio_samples',
        '*.waveform',
        '*.spectrogram',
        '*.embedding',

        // Encryption keys
        '*.kek',
        '*.dek',
        '*.ciphertext',

        // Full bodies
        'req.body',
        'reqBody',
      ],
      remove: true,
    },
    transport:
      process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: false,
              translateTime: 'SYS:standard',
            },
          }
        : undefined,
  });
}

export const logger = createLogger();
